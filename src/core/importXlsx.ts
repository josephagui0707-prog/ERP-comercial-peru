import * as XLSX from 'xlsx';
import type {State,Item} from './types';
import {today,uid} from './types';
import {createQuote,approveQuote,createOrder,advanceOrder,createSale,recordPayment,returnItem} from './operations';
import {savePurchase,transitionPurchase,payPurchase} from '../features/purchases/service';
import {finalizeInventory} from '../features/inventory/model';

export const importSchema={
  Categorias:['nombre'],
  Proveedores:['id','nombre','ruc'],
  Almacenes:['id','nombre','ciudad','direccion'],
  Clientes:['id','nombre','documento','email','telefono','segmento'],
  Productos:['id','sku','nombre','categoria','precio','costo','minimo','proveedor_id'],
  StockInicial:['producto_id','almacen_id','cantidad','fecha'],
  Compras:['id','proveedor_id','almacen_id','producto_id','cantidad','costo','estado','documento','pagada','fecha'],
  Cotizaciones:['id','cliente_id','producto_id','cantidad','precio','descuento','estado','fecha'],
  Pedidos:['id','cliente_id','producto_id','cantidad','precio','descuento','estado','fecha'],
  Ventas:['id','cliente_id','almacen_id','producto_id','cantidad','precio','descuento','tipo','fecha'],
  Cobros:['id','venta_id','importe','metodo','fecha'],
  Devoluciones:['id','venta_id','producto_id','cantidad','motivo','fecha'],
  Caja:['id','tipo','categoria','descripcion','importe','fecha']
} as const;
export type SheetName=keyof typeof importSchema;
export type ImportRow={sheet:SheetName;line:number;data:Record<string,unknown>};
export type ImportData={rows:ImportRow[];errors:string[];counts:Record<string,number>};
export type ImportPlan=ImportData & {next:State;newMovements:number};
const key=(x:string)=>x.trim().toLocaleLowerCase('es-PE');
const text=(r:ImportRow,c:string,optional=false)=>{const v=String(r.data[c]??'').trim();if(!v&&!optional)throw Error(`Falta ${c}.`);if(v.length>500)throw Error(`${c} supera 500 caracteres.`);return v;};
const number=(r:ImportRow,c:string,min=0,integer=false)=>{const raw=text(r,c);const n=Number(raw);if(!Number.isFinite(n)||n<min||n>1e9||(integer&&!Number.isSafeInteger(n)))throw Error(`${c}: número ${integer?'entero ':''}entre ${min} y 1 000 000 000.`);return n;};
const choice=(r:ImportRow,c:string,values:string[])=>{const v=key(text(r,c));if(!values.includes(v))throw Error(`${c}: utiliza ${values.join(', ')}.`);return v;};
const date=(r:ImportRow)=>{const raw=r.data.fecha;const v=typeof raw==='number'?XLSX.SSF.format('yyyy-mm-dd',raw):String(raw??'').trim();if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T12:00:00Z'))||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v||v>today())throw Error('fecha: utiliza una fecha válida (AAAA-MM-DD), no futura.');return v;};
const id=(r:ImportRow)=>{const v=text(r,'id');if(!/^[A-Za-z0-9_-]{1,40}$/.test(v))throw Error('id: utiliza hasta 40 letras, números, guiones o guiones bajos.');return v;};
const unique=(values:string[],value:string,label:string)=>{if(values.some(v=>key(v)===key(value)))throw Error(`${label} duplicado: ${value}.`);};
const ref=(values:string[],value:string,label:string)=>{if(!values.includes(value))throw Error(`${label} no existe: ${value}.`);return value;};

export function readImport(bytes:ArrayBuffer):ImportData{
  if(bytes.byteLength>5*1024*1024)throw Error('El archivo supera 5 MB. Divide la carga.');
  const wb=XLSX.read(bytes,{type:'array',cellFormula:true});
  const result:ImportData={rows:[],errors:[],counts:{}};
  for(const name of wb.SheetNames){
    if(name==='Instrucciones')continue;
    if(!(name in importSchema)){result.errors.push(`Hoja desconocida: ${name}. Utiliza los nombres de la plantilla.`);continue;}
    const sheet=name as SheetName,ws=wb.Sheets[name];
    const range=XLSX.utils.decode_range(ws['!ref']||'A1');
    if(range.e.r>10000||range.e.c>30)throw Error(`${name}: máximo 10 000 filas y 31 columnas.`);
    const matrix=XLSX.utils.sheet_to_json<unknown[]>(ws,{header:1,defval:'',blankrows:true,range:0});
    const headers=(matrix[0]??[]).map(v=>String(v).trim());
    const required=importSchema[sheet];
    if(required.some(h=>!headers.includes(h))||new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length||headers.some(h=>h&&!required.includes(h as never))){result.errors.push(`${name}: encabezados esperados: ${required.join(', ')}.`);continue;}
    result.counts[name]=0;
    for(let i=1;i<matrix.length;i++){
      const row=matrix[i];if(row.every(v=>v===''||v===null))continue;
      const data:Record<string,unknown>={};
      headers.forEach((h,j)=>{if(h)data[h]=row[j]??'';const cell=ws[XLSX.utils.encode_cell({r:i,c:j})];if(cell?.f)result.errors.push(`${name}, fila ${i+1}: no se admiten fórmulas; pega valores.`);});
      result.rows.push({sheet,line:i+1,data});result.counts[name]++;
    }
  }
  if(!result.rows.length)result.errors.push('El archivo no contiene registros para importar.');
  if(result.rows.length>10000)throw Error('Máximo 10 000 registros por carga.');
  return result;
}

/** Build on a clone, reuse operational rules, commit only after ALL checks succeed. */
export function planImport(input:ImportData,current:State):ImportPlan{
  let s=structuredClone(current);const errors=[...input.errors];
  const attempt=(r:ImportRow,fn:()=>void)=>{try{fn();}catch(e){errors.push(`${r.sheet}, fila ${r.line}: ${(e as Error).message}`);}};
  const rows=(sheet:SheetName)=>input.rows.filter(r=>r.sheet===sheet);
  const fresh=(collection:{id:string}[],r:ImportRow)=>{const v=id(r);unique(collection.map(x=>x.id),v,'ID');return v;};
  const product=(r:ImportRow)=>ref(s.products.map(p=>p.id),text(r,'producto_id'),'Producto');
  const warehouse=(r:ImportRow)=>ref(s.warehouses.map(w=>w.id),text(r,'almacen_id'),'Almacén');
  const client=(r:ImportRow)=>ref(s.clients.map(c=>c.id),text(r,'cliente_id'),'Cliente');
  const supplier=(r:ImportRow)=>ref(s.suppliers.map(c=>c.id),text(r,'proveedor_id'),'Proveedor');
  for(const r of rows('Categorias'))attempt(r,()=>{const name=text(r,'nombre');unique([...(s.categories??[]),...s.products.map(p=>p.category)],name,'Categoría');s.categories=[...(s.categories??[]),name];});
  for(const r of rows('Proveedores'))attempt(r,()=>{const v=fresh(s.suppliers,r),ruc=text(r,'ruc');if(!/^\d{11}$/.test(ruc))throw Error('RUC: requiere 11 dígitos (validación de formato, sin consulta SUNAT).');unique(s.suppliers.map(x=>x.ruc),ruc,'RUC');s.suppliers.push({id:v,name:text(r,'nombre'),ruc});});
  for(const r of rows('Almacenes'))attempt(r,()=>{const v=fresh(s.warehouses,r),name=text(r,'nombre');unique(s.warehouses.map(x=>x.name),name,'Almacén');s.warehouses.push({id:v,name,city:text(r,'ciudad'),address:text(r,'direccion',true),status:'Activo'});});
  for(const r of rows('Clientes'))attempt(r,()=>{const v=fresh(s.clients,r),document=text(r,'documento'),email=text(r,'email',true),phone=text(r,'telefono',true);if(!/^\d{8}$|^\d{11}$/.test(document))throw Error('Documento: DNI de 8 o RUC de 11 dígitos.');if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Email inválido.');if(phone&&!/^\+?[\d ()-]{7,20}$/.test(phone))throw Error('Teléfono inválido.');unique(s.clients.map(x=>x.document),document,'Documento');s.clients.push({id:v,name:text(r,'nombre'),document,email,phone,segment:text(r,'segmento'),active:true});});
  for(const r of rows('Productos'))attempt(r,()=>{const v=fresh(s.products,r),sku=text(r,'sku'),category=text(r,'categoria'),supplierId=text(r,'proveedor_id',true);unique(s.products.map(x=>x.sku),sku,'SKU');ref([...(s.categories??[]),...s.products.map(p=>p.category)],category,'Categoría');if(supplierId)ref(s.suppliers.map(x=>x.id),supplierId,'Proveedor');s.products.push({id:v,sku,name:text(r,'nombre'),category,supplierId:supplierId||undefined,price:number(r,'precio',0.01),cost:number(r,'costo'),min:number(r,'minimo',0,true),active:true});});
  // Complete the product/warehouse matrix for existing CRUDs and transfers.
  for(const p of s.products)for(const w of s.warehouses)if(!s.inventory.some(i=>i.productId===p.id&&i.warehouseId===w.id))s.inventory.push({productId:p.id,warehouseId:w.id,quantity:0});
  const openings=new Set<string>();
  for(const r of rows('StockInicial'))attempt(r,()=>{const productId=product(r),warehouseId=warehouse(r),pair=`${productId}/${warehouseId}`,quantity=number(r,'cantidad',0,true),d=date(r);if(openings.has(pair)||s.movements.some(m=>m.productId===productId&&m.warehouseId===warehouseId)||s.inventory.some(i=>i.productId===productId&&i.warehouseId===warehouseId&&i.quantity!==0))throw Error('Stock inicial duplicado o con historial. Usa una entrada o ajuste para existencias actuales.');openings.add(pair);s.inventory.find(i=>i.productId===productId&&i.warehouseId===warehouseId)!.quantity=quantity;if(quantity)s.movements.unshift({id:uid('MOV'),date:d,productId,warehouseId,qty:quantity,type:'Apertura',reason:'Importación XLSX · stock inicial',reference:'IMPORT-XLSX'});});
  const items=(group:ImportRow[],purchase=false):Item[]=>group.map(r=>({productId:product(r),qty:number(r,'cantidad',1,true),price:number(r,purchase?'costo':'precio',0.01),discount:purchase?0:number(r,'descuento')}));
  // Each ID groups document lines. Header values must agree on all lines.
  const documents=(sheet:SheetName,headers:string[],fn:(group:ImportRow[])=>void)=>{
    const groups=new Map<string,ImportRow[]>();for(const r of rows(sheet)){const v=String(r.data.id??'');groups.set(v,[...(groups.get(v)??[]),r]);}
    for(const group of groups.values())attempt(group[0],()=>{for(const r of group)for(const h of headers)if(String(r.data[h]??'')!==String(group[0].data[h]??''))throw Error(`Fila ${r.line}: ${h} debe coincidir en todas las líneas del documento.`);fn(group);});
  };
  const rename=(old:string,next:string)=>{for(const m of s.movements)if(m.reference===old)m.reference=next;for(const e of s.expenses)if(e.source===old)e.source=next;};
  const stamp=(before:State,d:string)=>{for(const k of ['movements','expenses','audit','payments','returns'] as const){const known=new Set(before[k].map(x=>x.id));for(const x of s[k])if(!known.has(x.id))x.date=d;}};
  documents('Compras',['proveedor_id','almacen_id','estado','documento','pagada','fecha'],group=>{const r=group[0],v=fresh(s.purchases,r),d=date(r),status=choice(r,'estado',['borrador','ordenada','recibida']),paid=choice(r,'pagada',['si','no']),before=structuredClone(s);if(paid==='si'&&status!=='recibida')throw Error('Solo una compra recibida puede estar pagada.');s=savePurchase(s,{supplierId:supplier(r),warehouseId:warehouse(r),items:items(group,true),notes:'Importación XLSX'});const p=s.purchases[0];p.id=v;p.date=d;if(status!=='borrador')s=transitionPurchase(s,v,'ordenar');if(status==='recibida'){s=transitionPurchase(s,v,'recibir',text(r,'documento'));s.purchases.find(p=>p.id===v)!.receivedAt=d;}if(paid==='si'){s=payPurchase(s,v);s.purchases.find(p=>p.id===v)!.paidAt=d;}stamp(before,d);});
  documents('Cotizaciones',['cliente_id','estado','fecha'],group=>{const r=group[0],v=fresh(s.quotes,r),d=date(r),status=choice(r,'estado',['borrador','aprobada']);s=createQuote(s,client(r),items(group));s.quotes[0].id=v;s.quotes[0].date=d;if(status==='aprobada')s=approveQuote(s,v);});
  documents('Pedidos',['cliente_id','estado','fecha'],group=>{const r=group[0],v=fresh(s.orders,r),d=date(r),status=choice(r,'estado',['pendiente','confirmado','preparando']);s=createOrder(s,client(r),items(group));s.orders[0].id=v;s.orders[0].date=d;if(status!=='pendiente')s=advanceOrder(s,v,'confirmado');if(status==='preparando')s=advanceOrder(s,v,'preparando');});
  documents('Ventas',['cliente_id','almacen_id','tipo','fecha'],group=>{const r=group[0],v=fresh(s.sales,r),d=date(r),tipo=choice(r,'tipo',['boleta','factura']) as 'boleta'|'factura',c=s.clients.find(c=>c.id===client(r))!,before=structuredClone(s);s=createSale(s,c.id,items(group),warehouse(r),undefined,{tipoComprobante:tipo,compradorNombre:c.name,compradorDoc:c.document,compradorTipoDoc:c.document.length===11?'RUC':'DNI'});const sale=s.sales[0];rename(sale.id,v);sale.id=v;sale.date=d;sale.fechaEmision=d;stamp(before,d);});
  for(const r of rows('Cobros'))attempt(r,()=>{const v=fresh(s.payments,r),d=date(r),saleId=ref(s.sales.map(x=>x.id),text(r,'venta_id'),'Venta');if(d<s.sales.find(x=>x.id===saleId)!.date)throw Error('El cobro no puede ser anterior a la venta.');s=recordPayment(s,saleId,number(r,'importe',0.01),text(r,'metodo'),'aprobado');s.payments[0].id=v;s.payments[0].date=d;});
  for(const r of rows('Devoluciones'))attempt(r,()=>{const v=fresh(s.returns,r),d=date(r),saleId=ref(s.sales.map(x=>x.id),text(r,'venta_id'),'Venta'),before=structuredClone(s);if(d<s.sales.find(x=>x.id===saleId)!.date)throw Error('La devolución no puede ser anterior a la venta.');s=returnItem(s,saleId,product(r),number(r,'cantidad',1,true),text(r,'motivo'));rename(s.returns[0].id,v);s.returns[0].id=v;stamp(before,d);});
  for(const r of rows('Caja'))attempt(r,()=>{const v=fresh(s.expenses,r),d=date(r),type=choice(r,'tipo',['ingreso','egreso']) as 'ingreso'|'egreso';s.expenses.push({id:v,date:d,type,category:text(r,'categoria'),description:text(r,'descripcion'),amount:number(r,'importe',0.01),source:'import-xlsx'});});
  // Validate chronological stock too, so a future receipt cannot cover an earlier sale.
  const known=new Set(current.movements.map(x=>x.id));const newMoves=s.movements.filter(x=>!known.has(x.id)).reverse();
  const balance=new Map(current.inventory.map(i=>[`${i.productId}/${i.warehouseId}`,i.quantity]));
  const latest=new Map<string,string>();for(const m of current.movements){const k=`${m.productId}/${m.warehouseId}`;latest.set(k,[latest.get(k)??'',m.date].sort().at(-1)!);}
  for(const m of [...newMoves].sort((a,b)=>a.date.localeCompare(b.date))){const k=`${m.productId}/${m.warehouseId}`,n=(balance.get(k)??0)+m.qty;balance.set(k,n);if(m.date<(latest.get(k)??''))errors.push(`Movimientos: ${m.reference} es anterior al historial existente de ${k}.`);if(n<0)errors.push(`Movimientos: stock insuficiente el ${m.date} para ${k}.`);}
  if(!errors.length){try{s=finalizeInventory(current,s,'Importación XLSX');s.audit.unshift({id:uid('AUD'),date:today(),action:'Importación XLSX',description:`${input.rows.length} filas importadas en una sola carga.`});}catch(e){errors.push((e as Error).message);}}
  return {...input,errors,next:s,newMovements:newMoves.length};
}
