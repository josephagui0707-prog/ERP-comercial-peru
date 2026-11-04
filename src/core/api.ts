export class HttpError extends Error {
  constructor(readonly status:number, message:string) { super(message); }
}
export async function api<T>(path:string, method='GET', body?:unknown, signal?:AbortSignal):Promise<T> {
  let response:Response;
  try {
    response=await fetch('/api'+path,{method,credentials:'same-origin',cache:'no-store',signal:signal??AbortSignal.timeout(18000),
      ...(body!==undefined?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  } catch(error) {
    if(signal?.aborted) throw error;
    throw Error('No se pudo contactar con el servidor. Verifica la conexión y vuelve a intentar.');
  }
  const data=await response.json().catch(()=>null);
  if(!response.ok || data===null) {
    if(response.status===401 && !['/me','/login'].includes(path)) window.dispatchEvent(new Event('erp:sesion-caducada'));
    throw new HttpError(response.status,data?.error || 'Respuesta inesperada del servidor.');
  }
  return data as T;
}
export function newId() {
  if(crypto.randomUUID) return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
}
