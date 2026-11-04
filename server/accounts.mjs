import {randomBytes, randomUUID, scrypt, createHash, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {field, requireThat, transaction, audit} from './shared.mjs';

const derive = promisify(scrypt);
const cost = {N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024};
const digest = value => createHash('sha256').update(value).digest('hex');
const roles = ['admin', 'ventas', 'almacen', 'finanzas', 'repartidor', 'monitor'];
const publicColumns = 'id, tenant, name, email, role, phone, active';
const safe = row => row && ({...row, active: Boolean(row.active)});
const demoRows = [
  ['admin', 'Administrador Demo', 'Admin123!'], ['ventas', 'Asesor Comercial', 'Ventas123!'],
  ['almacen', 'Encargado de Almacén', 'Almacen123!'], ['finanzas', 'Analista Financiero', 'Finanzas123!'],
  ['repartidor', 'Camila · Reparto', 'Ruta1234!'], ['monitor', 'Diego · Instituto', 'Mapa1234!']
];
export function demoAccess() {
  return demoRows.map(([role, name, password]) => ({role, name, email: role + '@enterprisecloud.demo', password}));
}
async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const key = await derive(password, salt, 64, cost);
  return salt + '.' + key.toString('hex');
}
export async function bootstrap(db, {tenant, demo, adminEmail, adminPassword}) {
  const previous = db.prepare('SELECT demo FROM tenants WHERE id=?').get(tenant);
  if (previous) {
    requireThat(Boolean(previous.demo) === demo, 500, 'El modo de arranque no coincide con la base de datos. Usa otra ruta ERP_DB.');
    return;
  }
  const accounts = demo ? demoAccess() : [{role:'admin',name:'Administrador',email:adminEmail,password:adminPassword}];
  if (!demo) requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail || '') && typeof adminPassword === 'string' && adminPassword.length >= 12 && adminPassword.length <= 128, 500, 'Define ADMIN_EMAIL y ADMIN_PASSWORD (12–128 caracteres) para la primera cuenta.');
  const rows = [];
  for (const a of accounts) rows.push({...a, id:randomUUID(), hash:await hashPassword(a.password)});
  transaction(db, () => {
    db.prepare('INSERT INTO tenants(id,demo) VALUES(?,?)').run(tenant, Number(demo));
    const insert = db.prepare('INSERT INTO users(id,tenant,name,email,role,hash) VALUES(?,?,?,?,?,?)');
    for (const a of rows) insert.run(a.id, tenant, a.name, a.email.toLowerCase(), a.role, a.hash);
  });
}

export function accounts(db, {secure,demo}) {
  const lookup = db.prepare('SELECT ' + publicColumns + ' FROM users WHERE tenant=? AND id=?');
  const cookieName = secure ? '__Host-erp_session' : 'erp_session';
  const tokenFor = req => (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1) || '';
  const cookie = (token, age) => cookieName + '=' + token + '; Path=/; HttpOnly; SameSite=Strict' + (secure ? '; Secure' : '') + (age == null ? '' : '; Max-Age=' + age);
  const session = req => {
    const token = tokenFor(req);
    if (!/^[0-9a-f]{64}$/.test(token)) return null;
    const row = db.prepare('SELECT u.id, u.tenant, u.name, u.email, u.role, u.phone, u.active FROM sessions s JOIN users u ON u.id=s.user_id JOIN tenants t ON t.id=u.tenant WHERE s.hash=? AND s.expires>? AND u.active=1 AND t.demo=?').get(digest(token), Date.now(),Number(demo));
    return safe(row);
  };
  return {
    session,
    async login(body, req, res) {
      const email = field(body.email, 'correo', 150).toLowerCase();
      const password = field(body.password, 'contraseña', 128);
      const tenant = field(body.tenant || 'AULA', 'organización', 40).toUpperCase();
      const row = db.prepare('SELECT u.* FROM users u JOIN tenants t ON t.id=u.tenant WHERE u.tenant=? AND u.email=? AND u.active=1 AND t.demo=?').get(tenant,email,Number(demo));
      const [salt, key] = row ? row.hash.split('.') : ['0'.repeat(32), '0'.repeat(128)];
      const computed = await derive(password, salt, 64, cost);
      requireThat(timingSafeEqual(computed, Buffer.from(key, 'hex')) && row, 401, 'Organización, correo o contraseña incorrectos.');
      const token = randomBytes(32).toString('hex');
      const lifetime = body.remember === true ? 7 * 86400 : 12 * 3600;
      const actor = safe(lookup.get(tenant, row.id));
      transaction(db, () => {
        requireThat(db.prepare('SELECT 1 FROM users WHERE id=? AND active=1 AND hash=?').get(row.id, row.hash), 401, 'Vuelve a iniciar sesión.');
        db.prepare('DELETE FROM sessions WHERE expires<=? OR hash=?').run(Date.now(), digest(tokenFor(req)));
        db.prepare('INSERT INTO sessions(hash,user_id,expires) VALUES(?,?,?)').run(digest(token), row.id, Date.now() + lifetime * 1000);
        audit(db, actor, 'sesion.inicio', row.id);
      });
      res.setHeader('Set-Cookie', cookie(token, body.remember === true ? lifetime : null));
      return actor;
    },
    logout(req, res) {
      const actor=session(req);if(actor)audit(db,actor,'sesion.cierre',actor.id);
      db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(tokenFor(req)));
      res.setHeader('Set-Cookie', cookie('', 0));
    },
    list(actor) {
      requireThat(actor.role === 'admin', 403, 'Solo administración puede gestionar cuentas.');
      return db.prepare('SELECT ' + publicColumns + ' FROM users WHERE tenant=? ORDER BY name').all(actor.tenant).map(safe);
    },
    async save(actor, body) {
      requireThat(actor.role === 'admin', 403, 'Solo administración puede gestionar cuentas.');
      const id = field(body.id, 'identificador', 64), name = field(body.name, 'nombre');
      const email = field(body.email, 'correo', 150).toLowerCase();
      requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && roles.includes(body.role) && typeof body.active === 'boolean', 422, 'Correo, estado o rol inválido.');
      requireThat(id !== actor.id || (body.role === 'admin' && body.active), 409, 'Tu propia cuenta debe conservar acceso administrativo.');
      const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 25) : '';
      const old = db.prepare('SELECT * FROM users WHERE id=?').get(id);
      requireThat(!old || old.tenant === actor.tenant, 409, 'Identificador no disponible.');
      const pwd = body.password || '';
      requireThat(typeof pwd === 'string' && ((old && !pwd) || (pwd.length >= 8 && pwd.length <= 128 && pwd.trim() === pwd)), 422, 'Usa una contraseña de 8 a 128 caracteres sin espacios en los extremos.');
      const hash = pwd ? await hashPassword(pwd) : old.hash;
      return transaction(db, () => {
        requireThat(db.prepare("SELECT 1 FROM users WHERE id=? AND role='admin' AND active=1").get(actor.id), 403, 'Sesión sin permisos administrativos.');
        requireThat(!db.prepare('SELECT id FROM users WHERE tenant=? AND email=? AND id<>?').get(actor.tenant,email,id), 409, 'El correo ya pertenece a otra cuenta.');
        if (old) {
          const result = db.prepare('UPDATE users SET name=?,email=?,role=?,phone=?,active=?,hash=? WHERE id=? AND tenant=? AND hash=? AND role=? AND active=? AND email=? AND name=? AND phone=?').run(name,email,body.role,phone,Number(body.active),hash,id,actor.tenant,old.hash,old.role,old.active,old.email,old.name,old.phone);
          requireThat(result.changes, 409, 'La cuenta cambió. Actualiza e inténtalo otra vez.');
          if (pwd || body.role !== old.role || !body.active) db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
        } else {
          requireThat(!db.prepare('SELECT 1 FROM users WHERE id=?').get(id), 409, 'Identificador ya utilizado.');
          db.prepare('INSERT INTO users(id,tenant,name,email,role,phone,active,hash) VALUES(?,?,?,?,?,?,?,?)').run(id,actor.tenant,name,email,body.role,phone,Number(body.active),hash);
        }
        audit(db, actor, old ? 'cuenta.actualizada' : 'cuenta.creada', id);
        return safe(lookup.get(actor.tenant, id));
      });
    }
  };
}
