PRAGMA foreign_keys=ON;
PRAGMA journal_mode=WAL;
PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS tenants(id TEXT PRIMARY KEY, demo INTEGER NOT NULL CHECK(demo IN(0,1)));
CREATE TABLE IF NOT EXISTS users(
 id TEXT PRIMARY KEY, tenant TEXT NOT NULL REFERENCES tenants(id), name TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE,
 role TEXT NOT NULL CHECK(role IN('admin','ventas','almacen','finanzas','repartidor','monitor')), phone TEXT NOT NULL DEFAULT '',
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)), hash TEXT NOT NULL, UNIQUE(tenant,email), UNIQUE(tenant,id));
CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
CREATE TABLE IF NOT EXISTS trips(
 id TEXT PRIMARY KEY, tenant TEXT NOT NULL REFERENCES tenants(id), driver TEXT NOT NULL, viewer TEXT NOT NULL, created_by TEXT NOT NULL,
 title TEXT NOT NULL, order_ref TEXT NOT NULL DEFAULT '', mode TEXT NOT NULL CHECK(mode IN('gps','demo')),
 origin TEXT NOT NULL, destination TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'lista' CHECK(status IN('lista','en_ruta','entregada','cancelada')),
 created INTEGER NOT NULL, started INTEGER, ended INTEGER, CHECK(driver<>viewer),
 FOREIGN KEY(tenant,created_by) REFERENCES users(tenant,id), FOREIGN KEY(tenant,driver) REFERENCES users(tenant,id), FOREIGN KEY(tenant,viewer) REFERENCES users(tenant,id));
CREATE INDEX IF NOT EXISTS trip_driver ON trips(tenant,driver,created);
CREATE INDEX IF NOT EXISTS trip_viewer ON trips(tenant,viewer,created);
CREATE UNIQUE INDEX IF NOT EXISTS trip_open_order ON trips(tenant,order_ref) WHERE order_ref<>'' AND status<>'cancelada';
CREATE UNIQUE INDEX IF NOT EXISTS trip_active_driver ON trips(tenant,driver) WHERE status='en_ruta';
CREATE TABLE IF NOT EXISTS points(
 trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE, seq INTEGER NOT NULL,
 lat REAL NOT NULL CHECK(lat BETWEEN -85 AND 85), lng REAL NOT NULL CHECK(lng BETWEEN -180 AND 180),
 at INTEGER NOT NULL, accuracy REAL NOT NULL CHECK(accuracy>=0),
 PRIMARY KEY(trip_id,seq), UNIQUE(trip_id,at));
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, tenant TEXT NOT NULL REFERENCES tenants(id), actor TEXT NOT NULL, action TEXT NOT NULL, ref TEXT NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS events_tenant ON events(tenant,id);
CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY, tenant TEXT NOT NULL, actor TEXT NOT NULL, body TEXT NOT NULL, expires INTEGER NOT NULL, FOREIGN KEY(tenant,actor) REFERENCES users(tenant,id));
