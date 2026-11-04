export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function requireThat(condition, status, message) {
  if (!condition) throw new ApiError(status, message);
}
export function field(value, label, max = 100) {
  requireThat(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max, 422, 'Revisa el campo ' + label + '.');
  return value.trim();
}
export function transaction(db, work) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = work(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function audit(db, user, action, ref) {
  db.prepare('INSERT INTO events (tenant, actor, action, ref, at) VALUES (?, ?, ?, ?, ?)').run(user.tenant, user.id, action, ref, Date.now());
}
