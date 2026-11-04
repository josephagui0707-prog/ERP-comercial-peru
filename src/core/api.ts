/** API local para publicación estática: datos de demostración por navegador. */
export class HttpError extends Error {constructor(readonly status:number,message:string){super(message);}}
export function newId(){return crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');}
type Account={id:string;tenant:string;name:string;email:string;phone:string;role:string;active:boolean;password?:string};
const seed:[string,string,string][]=[['admin','Administrador Demo','Admin123!'],['ventas','Asesor Comercial','Ventas123!'],['almacen','Encargado de Almacén','Almacen123!'],['finanzas','Analista Financiero','Finanzas123!'],['repartidor','Camila · Reparto','Ruta1234!'],['monitor','Diego · Instituto','Mapa1234!']];
const key=(item:string)=>'erp_static_v1_'+item;
function read<T>(item:string,defaultValue:T):T{try{return JSON.parse(localStorage.getItem(key(item))||'null')??defaultValue;}catch{return defaultValue;}}
function write(item:string,value:unknown){localStorage.setItem(key(item),JSON.stringify(value));}
function users():Account[]{return read('users',seed.map(([role,name,password])=>({id:role+'-demo',tenant:'AULA',name,email:role+'@enterprisecloud.demo',phone:'',role,active:true,password})));}
function current():Account|null{const id=read<string|null>('session',null);return users().find(u=>u.id===id&&u.active)||null;}
function pub(a:Account){const {password:_,...account}=a;return account;}
function audit(action:string,ref:string){const events=read<any[]>('audit',[]);events.unshift({id:Date.now()+Math.random(),at:Date.now(),action,ref,actor:current()?.email||'Demo'});write('audit',events.slice(0,100));}
function trips(){return read<any[]>('trips',[]);}
function points(id:string){return read<any[]>('points_'+id,[]);}
export async function api<T>(path:string,method='GET',body?:unknown,signal?:AbortSignal):Promise<T>{
 if(signal?.aborted)throw new DOMException('Operación cancelada','AbortError');
 const input=(body||{}) as Record<string,any>, route=path.split('?')[0], parts=route.split('/').filter(Boolean);
 let result:any;
 if(route==='/info'){result={tenant:'AULA',accounts:users().filter(u=>u.active).map(u=>({role:u.role,name:u.name,email:u.email,password:u.password||''}))};}
 else if(route==='/login'&&method==='POST'){
  const user=users().find(u=>u.tenant===(input.tenant||'AULA').toUpperCase()&&u.email.toLowerCase()===String(input.email||'').toLowerCase()&&u.password===input.password&&u.active);
  if(!user)throw new HttpError(401,'Organización, correo o contraseña incorrectos.');write('session',user.id);audit('sesion.inicio',user.id);result=pub(user);
 }else if(route==='/logout'){audit('sesion.cierre',current()?.id||'');localStorage.removeItem(key('session'));result={ok:true};}
 else if(route==='/me'){const u=current();if(!u)throw new HttpError(401,'Sesión no iniciada.');result=pub(u);}
 else if(route==='/users'&&method==='GET'){if(current()?.role!=='admin')throw new HttpError(403,'Solo administración.');result=users().map(pub);}
 else if(route==='/users'&&method==='PUT'){
  if(current()?.role!=='admin')throw new HttpError(403,'Solo administración.');const list=users(),idx=list.findIndex(u=>u.id===input.id);
  if(idx>=0 && !input.password)input.password=list[idx].password;
  if(idx<0 && !input.password)throw new HttpError(422,'Indica una contraseña para la nueva cuenta.');
  const u={id:input.id||newId(),tenant:'AULA',name:input.name,email:input.email,phone:input.phone||'',role:input.role,active:input.active,password:input.password};
  if(idx>=0)list[idx]=u;else list.push(u);write('users',list);audit(idx>=0?'cuenta.actualizada':'cuenta.creada',u.id);result=pub(u);
 }else if(route==='/directory'){result=users().filter(u=>u.active&&['monitor','repartidor'].includes(u.role)).map(u=>({id:u.id,name:u.name,role:u.role}));}
 else if(route==='/audit'){result=read('audit',[]);}
 else if(route==='/trips'&&method==='GET'){const u=current();result=trips().filter(t=>u?.role==='admin'||!['repartidor','monitor'].includes(u?.role||'')||t.driver===u?.id||t.viewer===u?.id);}
 else if(route==='/trips'&&method==='POST'){
  const list=trips(),all=users();const t={id:input.id||newId(),title:input.title,mode:input.mode,status:'lista',driver:input.driver,viewer:input.viewer,created_by:current()?.id||'',driverName:all.find(u=>u.id===input.driver)?.name||'Repartidor',viewerName:all.find(u=>u.id===input.viewer)?.name||'Monitor',order_ref:input.order_ref||'',origin:input.origin,destination:input.destination,created:Date.now(),started:null,ended:null};
  list.unshift(t);write('trips',list);audit('entrega.creada',t.id);result=t;
 }else if(parts[0]==='trips'&&parts[1]){
  const list=trips(),i=list.findIndex(t=>t.id===parts[1]);if(i<0)throw new HttpError(404,'Entrega no encontrada.');const trip=list[i];
  if(method==='GET'){const after=Number(new URLSearchParams(path.split('?')[1]||'').get('after')||0);result={trip,points:points(trip.id).filter(p=>p.seq>after)};}
  else if(parts[2]==='points'&&method==='POST'){const samples=points(trip.id);samples.push({...input,seq:samples.length+1});write('points_'+trip.id,samples);result={ok:true};}
  else if(method==='POST'){
   if(parts[2]==='iniciar'){trip.status='en_ruta';trip.started??=Date.now();audit('entrega.iniciada',trip.id);}
   else if(parts[2]==='finalizar'){trip.status='entregada';trip.ended=Date.now();audit('entrega.entregada',trip.id);}
   else if(parts[2]==='cancelar'){trip.status='cancelada';trip.ended=Date.now();audit('entrega.cancelada',trip.id);}
   else throw new HttpError(404,'Acción no disponible');list[i]=trip;write('trips',list);result=trip;
  }
 }else if(route==='/assistant'&&method==='POST'){
  result={mode:'local',answer:'Estoy funcionando sin servidor ni Gemini. Puedo consultar ventas, inventario, pedidos, clientes y crear cotizaciones con comandos locales. Escribe «ayuda» para conocer los comandos disponibles. Los datos están guardados solo en este navegador.',fallback:true};
 }else if(route==='/assistant/confirm')throw new HttpError(422,'Utiliza el módulo Rutas para crear entregas en modo local.');
 else throw new HttpError(404,'Función local no disponible: '+route);
 return result as T;
}
