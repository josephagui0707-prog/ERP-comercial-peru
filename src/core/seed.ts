import type {State,Item} from './types';
import {sumItems,calcBase,calcIGV} from './types';
export function makeSeed():State{
const categories=['Laptops','Componentes','Redes','Seguridad CCTV','Periféricos','Almacenamiento','Impresión','Accesorios'];
const names=['Laptop Ryzen 5','Monitor IPS 24','Teclado mecánico','Mouse inalámbrico','SSD NVMe 1TB','Memoria DDR5 16GB','Router WiFi 6','Switch 8 puertos','Cámara IP 4MP','DVR 8 canales','UPS 1000VA','Impresora láser','Disco externo 2TB','Webcam Full HD','Auriculares USB','Cable HDMI 2m','Access Point','Fuente 650W','Mini PC Core i5','Kit CCTV 4 cámaras'];
const clients=Array.from({length:30},(_,i)=>({id:`CLI-${String(i+1).padStart(3,'0')}`,name:`${['Tecnored','Andes Digital','Grupo Sol','Comercial Pacifico','Innova Lima','Servicios Delta'][i%6]} ${i+1} SAC`,document:`20${String(100000000+i*137).padStart(9,'0')}`,email:`contacto${i+1}@ejemplo.demo`,phone:`9${String(10000000+i*59).padStart(8,'0')}`,segment:['Empresa','Mayorista','Minorista'][i%3],active:true}));
const products=Array.from({length:40},(_,i)=>({id:`PRO-${String(i+1).padStart(3,'0')}`,sku:`EC-${String(i+1).padStart(4,'0')}`,name:`${names[i%names.length]} ${i>=20?'Pro':'Standard'}`,category:categories[i%8],price:Math.round((75+(i*79)%2400)*100)/100,cost:Math.round((45+(i*57)%1550)*100)/100,min:5+i%5,active:true}));
const warehouses=[{id:'ALM-01',name:'Almacén central',city:'Lima'},{id:'ALM-02',name:'Sucursal Norte',city:'Los Olivos'},{id:'ALM-03',name:'Sucursal Sur',city:'Surco'},{id:'ALM-04',name:'Tienda San Isidro',city:'San Isidro'}];
const inventory=products.flatMap(p=>warehouses.map((w,i)=>({productId:p.id,warehouseId:w.id,quantity:30+i*9})));
const movements=inventory.map((x,i)=>({id:`MOV-${i+1}`,date:'2026-08-01',productId:x.productId,warehouseId:x.warehouseId,qty:x.quantity,type:'Apertura',reason:'Stock inicial de demostración',reference:'SEED'}));
const sales:State['sales']=[];const payments:State['payments']=[];const orders:State['orders']=[];const quotes:State['quotes']=[];
for(let i=0;i<50;i++){
 const items:Item[]=[{productId:products[i%40].id,qty:1+i%3,price:products[i%40].price,discount:i%7===0?5:0},{productId:products[(i+7)%40].id,qty:1,price:products[(i+7)%40].price,discount:0}];
 const date=`2026-${String(6+Math.floor(i/12)).padStart(2,'0')}-${String(1+i%25).padStart(2,'0')}`;
 const saleId=`VEN-${String(i+1).padStart(4,'0')}`;
 const client=clients[i%30];
 const total=sumItems(items);
 const baseImponible=calcBase(total);
 const igv=calcIGV(total);
 const isFactura=i%2===0;
 const tipoComprobante=isFactura?'factura' as const:'boleta' as const;
 const serie=isFactura?'F001':'B001';
 const correlativo=i+1;
 const compradorNombre=client.name;
 const compradorDoc=isFactura?client.document:('4'+String(10000000+i*7)).slice(0,8);
 const compradorTipoDoc=isFactura?'RUC' as const:'DNI' as const;
 sales.push({id:saleId,clientId:client.id,items,date,status:'vigente',warehouseId:'ALM-01',paymentMethod:'Pendiente',tipoComprobante,serie,correlativo,compradorNombre,compradorDoc,compradorTipoDoc,igv,baseImponible,total});
 for(const item of items){const stock=inventory.find(x=>x.productId===item.productId&&x.warehouseId==='ALM-01')!;stock.quantity-=item.qty;movements.push({id:`MOV-S${i}-${item.productId}`,date,productId:item.productId,warehouseId:'ALM-01',qty:-item.qty,type:'Venta',reason:'Venta de demostración',reference:saleId});}
 if(i%3!==0){payments.push({id:`PAG-${i+1}`,saleId,amount:sumItems(items)*(i%4===0?0.5:1),date,method:['Yape demo','Transferencia demo','Tarjeta demo'][i%3],status:'aprobado',reference:`DEMO-${i+1000}`});}
}
for(let i=0;i<25;i++){const item:Item={productId:products[(i+3)%40].id,qty:2,price:products[(i+3)%40].price,discount:0};orders.push({id:`PED-${i+1}`,clientId:clients[i%30].id,items:[item],status:i%3===0?'pendiente':'confirmado',date:'2026-10-05'});}
for(let i=0;i<14;i++){quotes.push({id:`COT-${i+1}`,clientId:clients[(i+2)%30].id,items:[{productId:products[(i+4)%40].id,qty:1,price:products[(i+4)%40].price,discount:0}],status:i%2?'aprobada':'borrador',date:'2026-10-06'});}
const suppliers=Array.from({length:10},(_,i)=>({id:`PRV-${i+1}`,name:`Distribuidora Tecnológica ${i+1} SAC`,ruc:`20${String(200000000+i*91).padStart(9,'0')}`}));
const purchases=Array.from({length:12},(_,i)=>({id:`COM-${i+1}`,supplierId:suppliers[i%10].id,date:'2026-10-01',status:(i%2===0?'borrador':'ordenada') as 'borrador'|'ordenada',amount:1200+i*115}));
return {version:2,clients,products,warehouses,inventory,quotes,orders,sales,payments,returns:[],movements,expenses:[{id:'EGR-1',date:'2026-10-02',amount:850,type:'egreso',category:'Operación',description:'Servicios de oficina'}],suppliers,purchases,audit:[{id:'AUD-SEED',date:'2026-10-01',action:'Inicialización',description:'Datos simulados generados'}]};
}
