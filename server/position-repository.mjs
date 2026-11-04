// TIERRA. Only the tracking service passes authorized trip IDs to this repository.
export function positionRepository(db) {
  const columns='seq,lat,lng,at,accuracy';
  const last=db.prepare('SELECT '+columns+' FROM points WHERE trip_id=? ORDER BY seq DESC LIMIT 1');
  const history=db.prepare('SELECT '+columns+' FROM points WHERE trip_id=? AND seq>? ORDER BY seq');
  const atTime=db.prepare('SELECT '+columns+' FROM points WHERE trip_id=? AND at=?');
  const insert=db.prepare('INSERT INTO points(trip_id,seq,lat,lng,at,accuracy) VALUES(?,?,?,?,?,?)');
  return {
    last:tripId=>last.get(tripId),
    after:(tripId,seq)=>history.all(tripId,seq),
    atTime:(tripId,at)=>atTime.get(tripId,at),
    append(tripId,{seq,lat,lng,at,accuracy}) {insert.run(tripId,seq,lat,lng,at,accuracy);}
  };
}
