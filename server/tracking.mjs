import {randomUUID} from 'node:crypto';
import {positionRepository} from './position-repository.mjs';
import {field, requireThat, audit, transaction} from './shared.mjs';

const route = [
 [-12.12555,-77.03535],[-12.12546,-77.03470],[-12.12535,-77.03405],[-12.12519,-77.03327],
 [-12.12503,-77.03248],[-12.12488,-77.03172],[-12.12425,-77.03185],[-12.12361,-77.03199],
 [-12.12299,-77.03213],[-12.12238,-77.03227],[-12.12194,-77.03236],[-12.12178,-77.03165],
 [-12.12162,-77.03092],[-12.12146,-77.03018],[-12.12129,-77.02944],[-12.12077,-77.02956]
];
const place = (name, [lat,lng]) => ({name,lat,lng});
// La simulación del escenario estándar recorre calles ilustrativas. Para puntos A/B
// personalizados se interpola una referencia en línea recta: NO es una ruta vial.
function simulationRoute(row) {
  const a=JSON.parse(row.origin),b=JSON.parse(row.destination);
  if(a.lat===route[0][0]&&a.lng===route[0][1]&&b.lat===route.at(-1)[0]&&b.lng===route.at(-1)[1]) return route;
  return Array.from({length:16},(_,i)=>[+(a.lat+(b.lat-a.lat)*i/15).toFixed(6),+(a.lng+(b.lng-a.lng)*i/15).toFixed(6)]);
}
export const scenario = {origin:place('Punto de despacho',route[0]), destination:place('Instituto de ejemplo',route.at(-1))};
const activeRoles = ['admin','ventas','repartidor','monitor'];
function coords(value) {
  requireThat(value && Number.isFinite(value.lat) && Math.abs(value.lat) <= 85 && Number.isFinite(value.lng) && Math.abs(value.lng) <= 180, 422, 'Revisa la latitud y la longitud.');
  return {lat:value.lat,lng:value.lng};
}
function endpoint(value) { return {...coords(value),name:field(value.name,'nombre de la ubicación',80)}; }
function meters(a,b) {
  const rad = Math.PI/180;
  const h = Math.sin((b.lat-a.lat)*rad/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lng-a.lng)*rad/2)**2;
  return 12742000*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function tracking(db, publish, {now = Date.now, interval = 2400} = {}) {
  const rowQuery = 'SELECT t.*, d.name AS driverName, v.name AS viewerName FROM trips t JOIN users d ON d.id=t.driver JOIN users v ON v.id=t.viewer';
  const summary = row => ({...row,origin:JSON.parse(row.origin),destination:JSON.parse(row.destination)});
  const findTrip = id => db.prepare(rowQuery+' WHERE t.id=?').get(id);
  const canSee = (user,row) => row && activeRoles.includes(user.role) && row.tenant === user.tenant && (user.role === 'admin' || row.driver === user.id || row.viewer === user.id || row.created_by === user.id);
  function get(user,id) {
    const row = findTrip(id);
    requireThat(canSee(user,row),404,'Entrega no encontrada.');
    return row;
  }
  const positions=positionRepository(db);
  function finish(row, actor, status) {
    db.prepare('UPDATE trips SET status=?,ended=? WHERE id=?').run(status,now(),row.id);
    audit(db,actor,'entrega.'+status,row.id);
  }
  function simulate(row) {
    const path=simulationRoute(row);
    const last = positions.last(row.id)?.seq || 0;
    const count = Math.min(path.length,1+Math.floor((now()-row.started)/interval));
    if (last >= count) return;
    transaction(db, () => {
      for (let i=last;i<count;i++) {
        const [lat,lng]=path[i];
        positions.append(row.id,{seq:i+1,lat,lng,at:row.started+i*interval,accuracy:0});
      }
      if (count === path.length) finish(row,{tenant:row.tenant,id:row.driver},'entregada');
    });
    publish(row);
  }
  function create(user, body, viaAssistant=false) {
    requireThat(['admin','ventas','repartidor'].includes(user.role),403,'Tu cuenta puede consultar sus entregas asignadas.');
    requireThat(['gps','demo'].includes(body.mode),422,'Selecciona el tipo de recorrido.');
    const id = field(body.id,'identificador',64);
    requireThat(/^[a-z0-9-]{8,64}$/i.test(id),422,'Identificador inválido.');
    const driver = user.role === 'repartidor' ? user.id : field(body.driver,'repartidor',64);
    const viewer = field(body.viewer,'quien recibe',64);
    const find = (uid,role) => db.prepare('SELECT 1 FROM users WHERE id=? AND tenant=? AND role=? AND active=1').get(uid,user.tenant,role);
    requireThat(find(driver,'repartidor') && find(viewer,'monitor'),422,'Selecciona un repartidor y un monitor activos de la misma organización.');
    const title = field(body.title,'entrega',90);
    const ref = body.order_ref ? field(body.order_ref,'pedido',64) : '';
    const a = body.origin ? endpoint(body.origin) : (body.mode === 'demo' ? scenario.origin : endpoint(body.origin));
    const b = body.destination ? endpoint(body.destination) : (body.mode === 'demo' ? scenario.destination : endpoint(body.destination));
    requireThat(meters(a,b) >= 10,422,'Elige ubicaciones A y B diferentes.');
    const previous = findTrip(id);
    if (previous) {
      requireThat(previous.created_by===user.id && previous.tenant===user.tenant && previous.driver===driver && previous.viewer===viewer && previous.title===title && previous.order_ref===ref && previous.mode===body.mode && previous.origin===JSON.stringify(a) && previous.destination===JSON.stringify(b),409,'Ya existe una entrega con esa referencia interna.');
      return summary(previous);
    }
    transaction(db, () => {
      if (ref) requireThat(!db.prepare("SELECT 1 FROM trips WHERE tenant=? AND order_ref=? AND status<>'cancelada'").get(user.tenant,ref),409,'Este pedido ya tiene una entrega. Búscala por su referencia.');
      db.prepare('INSERT INTO trips(id,tenant,driver,viewer,created_by,title,order_ref,mode,origin,destination,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
        .run(id,user.tenant,driver,viewer,user.id,title,ref,body.mode,JSON.stringify(a),JSON.stringify(b),now());
      audit(db,user,viaAssistant?'asistente.entrega.creada':'entrega.creada',id);
    });
    const row=findTrip(id); publish(row); return summary(row);
  }
  return {
    canSee, create,
    seed(tenant) {
      if (db.prepare('SELECT 1 FROM trips WHERE tenant=? LIMIT 1').get(tenant)) return;
      const people=db.prepare("SELECT * FROM users WHERE tenant=? AND role IN('repartidor','monitor')").all(tenant);
      const driver=people.find(x=>x.role==='repartidor'), viewer=people.find(x=>x.role==='monitor');
      if(driver && viewer) create(driver,{id:randomUUID(),mode:'demo',viewer:viewer.id,title:'Entrega al instituto'});
    },
    directory(user) {
      requireThat(['admin','ventas','repartidor'].includes(user.role),403,'Solo los coordinadores y repartidores preparan entregas.');
      return db.prepare("SELECT id,name,role FROM users WHERE tenant=? AND active=1 AND (role='monitor' OR (role='repartidor' AND (? IN ('admin','ventas') OR id=?))) ORDER BY name").all(user.tenant,user.role,user.id);
    },
    list(user) {
      requireThat(activeRoles.includes(user.role),403,'Tu rol no tiene acceso a Rutas.');
      return db.prepare(rowQuery+' WHERE t.tenant=? AND (?=\'admin\' OR t.driver=? OR t.viewer=? OR t.created_by=?) ORDER BY t.created DESC,t.id DESC').all(user.tenant,user.role,user.id,user.id,user.id).map(summary);
    },
    details(user,id,after=0) {
      const row=get(user,id);
      const points=positions.after(id,after);
      return {trip:summary(row),points};
    },
    transition(user,id,action) {
      const row=get(user,id);
      const canCancel = action==='cancelar' && (user.role==='admin'||row.created_by===user.id);
      const canDemoStart=action==='iniciar'&&row.mode==='demo'&&(user.role==='admin'||row.created_by===user.id);
      requireThat(canCancel || canDemoStart || (user.id===row.driver && user.role==='repartidor'),403,'Solo el repartidor asignado puede conducir esta entrega.');
      if (action==='iniciar') {
        requireThat(row.status==='lista'||row.status==='en_ruta',409,'El recorrido ya terminó.');
        if(row.status==='en_ruta') return summary(row);
        requireThat(!db.prepare("SELECT 1 FROM trips WHERE tenant=? AND driver=? AND status='en_ruta'").get(user.tenant,row.driver),409,'Finaliza o cancela tu otra entrega en curso.');
        transaction(db,()=>{
          db.prepare("UPDATE trips SET status='en_ruta',started=? WHERE id=?").run(now(),id);
          audit(db,user,'entrega.iniciada',id);
        });
        if(row.mode==='demo') simulate(findTrip(id));
      } else if(action==='finalizar') {
        if(row.status==='entregada') return summary(row);
        requireThat(row.mode==='gps' && row.status==='en_ruta',409,'La entrega no está en recorrido GPS.');
        const point=positions.last(id);
        requireThat(point && now()-point.at<120000 && point.accuracy<=100 && meters(point,JSON.parse(row.destination))<=150,409,'Para confirmar la llegada se necesita una lectura reciente, con precisión de hasta 100 m, a menos de 150 m de B.');
        transaction(db,()=>finish(row,user,'entregada'));
      } else {
        if(row.status==='cancelada') return summary(row);
        requireThat(action==='cancelar' && ['lista','en_ruta'].includes(row.status),409,'La entrega ya está cerrada.');
        transaction(db,()=>finish(row,user,'cancelada'));
      }
      publish(row); return summary(findTrip(id));
    },
    point(user,id,body) {
      const row=get(user,id);
      requireThat(user.id===row.driver && user.role==='repartidor',403,'Solo el repartidor asignado puede compartir su posición.');
      requireThat(row.mode==='gps' && row.status==='en_ruta',409,'El GPS solo se admite durante una entrega real en curso.');
      const {lat,lng}=coords(body), {accuracy,at}=body;
      requireThat(Number.isFinite(accuracy) && accuracy>=0 && accuracy<=10000 && Number.isSafeInteger(at),422,'Lectura GPS inválida.');
      const last=positions.last(id);
      if(last && at<=last.at) {
        const stored=positions.atTime(id,at);
        requireThat(stored && stored.lat===lat && stored.lng===lng && stored.accuracy===accuracy,409,'Lectura antigua o fuera de orden.');
        return {seq:stored.seq};
      }
      requireThat(at>=row.started-10000 && at>=now()-120000 && at<=now()+15000,422,'La lectura de ubicación ha caducado. Revisa la hora del dispositivo.');
      const seq=(last?.seq || 0)+1;
      requireThat(seq<=30000,422,'Se alcanzó el límite de muestras de esta entrega.');
      positions.append(id,{seq,lat,lng,at,accuracy});
      publish(row);
      return {seq};
    },
    tick() { for(const row of db.prepare("SELECT * FROM trips WHERE mode='demo' AND status='en_ruta'").all()) simulate(row); }
  };
}
