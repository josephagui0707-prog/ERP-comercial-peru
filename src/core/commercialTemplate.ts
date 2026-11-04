import * as XLSX from 'xlsx';
import {today} from './types';
import {importOptionalColumns,importSchema} from './importXlsx';
import type {SheetName} from './importXlsx';

/** Plantilla AUTOCONTENIDA: no depende de CLI-001 ni de productos de la sesión.
 * Cada descarga genera IDs nuevos. El usuario puede importar aun sin catálogos. */
export function makeCommercialExampleXlsx():ArrayBuffer{
 const day=(offset:number)=>today(new Date(Date.now()+offset*86400000));
 const now=day(0),quoteDate=day(-5),orderDate=day(-3),saleDate=day(-1),stockDate=day(-12);
 const suffix=String(Math.floor(Math.random()*900000)+100000);
 const category='Equipos demo '+suffix,wh='ALM-X'+suffix,clientA='CLI-X'+suffix+'A',clientB='CLI-X'+suffix+'B';
 const [p1,p2,p3]=[1,2,3].map(i=>'PRO-X'+suffix+i);
 const quote1='COT-X'+suffix+'1',quote2='COT-X'+suffix+'2',order1='PED-X'+suffix+'1',order2='PED-X'+suffix+'2';
 const sale1='VEN-X'+suffix+'1',sale2='VEN-X'+suffix+'2';
 const documentA='20'+String(100000000+Number(suffix)),documentB='4'+suffix+'7';
 type Row=Record<string,string|number>;
 const data:Partial<Record<SheetName,Row[]>>={
  Categorias:[{nombre:category}],
  Almacenes:[{id:wh,nombre:'Almacén modelo '+suffix,ciudad:'Lima',direccion:'Dirección ficticia de demostración'}],
  Clientes:[
   {id:clientA,nombre:'Empresa Modelo '+suffix+' SAC',documento:documentA,email:'empresa'+suffix+'@ejemplo.demo',telefono:'900100200',segmento:'Empresa'},
   {id:clientB,nombre:'Cliente Modelo '+suffix,documento:documentB,email:'cliente'+suffix+'@ejemplo.demo',telefono:'900100201',segmento:'Minorista'}
  ],
  Productos:[
   {id:p1,sku:'DEMO-'+suffix+'-1',nombre:'Laptop empresarial de prueba',categoria:category,precio:1299,costo:900,minimo:5,proveedor_id:''},
   {id:p2,sku:'DEMO-'+suffix+'-2',nombre:'Monitor de prueba 24 pulgadas',categoria:category,precio:399,costo:275,minimo:5,proveedor_id:''},
   {id:p3,sku:'DEMO-'+suffix+'-3',nombre:'Teclado de prueba',categoria:category,precio:95,costo:50,minimo:5,proveedor_id:''}
  ],
  StockInicial:[
   {producto_id:p1,almacen_id:wh,cantidad:20,fecha:stockDate},
   {producto_id:p2,almacen_id:wh,cantidad:25,fecha:stockDate},
   {producto_id:p3,almacen_id:wh,cantidad:35,fecha:stockDate}
  ],
  Cotizaciones:[
   {id:quote1,cliente_id:clientA,producto_id:p1,cantidad:1,precio:1299,descuento:0,estado:'aprobada',fecha:quoteDate,vigencia_hasta:day(14),observaciones:'Cotización aprobada para simulación'},
   {id:quote1,cliente_id:clientA,producto_id:p2,cantidad:1,precio:399,descuento:0,estado:'aprobada',fecha:quoteDate,vigencia_hasta:day(14),observaciones:'Cotización aprobada para simulación'},
   {id:quote2,cliente_id:clientB,producto_id:p3,cantidad:2,precio:95,descuento:0,estado:'borrador',fecha:quoteDate,vigencia_hasta:day(10),observaciones:'Oferta por confirmar'}
  ],
  Pedidos:[
   {id:order1,cliente_id:clientA,producto_id:p1,cantidad:1,precio:1299,descuento:0,estado:'preparando',fecha:orderDate,cotizacion_id:quote1,fecha_entrega:day(2),observaciones:'Pedido derivado de cotización'},
   {id:order1,cliente_id:clientA,producto_id:p2,cantidad:1,precio:399,descuento:0,estado:'preparando',fecha:orderDate,cotizacion_id:quote1,fecha_entrega:day(2),observaciones:'Pedido derivado de cotización'},
   {id:order2,cliente_id:clientB,producto_id:p3,cantidad:1,precio:95,descuento:0,estado:'confirmado',fecha:orderDate,cotizacion_id:'',fecha_entrega:day(3),observaciones:'Pedido de mostrador'}
  ],
  Ventas:[
   {id:sale1,cliente_id:clientA,almacen_id:wh,producto_id:p1,cantidad:1,precio:1299,descuento:0,tipo:'factura',fecha:saleDate,pedido_id:order1,metodo_pago:'Transferencia demo',comprador_nombre:'Empresa Modelo '+suffix+' SAC',comprador_documento:documentA,comprador_tipo_documento:'RUC',comprador_direccion:'Dirección ficticia, Lima',serie:'F9'+suffix,correlativo:1,fecha_emision:saleDate,observaciones:'Venta vinculada a pedido'},
   {id:sale1,cliente_id:clientA,almacen_id:wh,producto_id:p2,cantidad:1,precio:399,descuento:0,tipo:'factura',fecha:saleDate,pedido_id:order1,metodo_pago:'Transferencia demo',comprador_nombre:'Empresa Modelo '+suffix+' SAC',comprador_documento:documentA,comprador_tipo_documento:'RUC',comprador_direccion:'Dirección ficticia, Lima',serie:'F9'+suffix,correlativo:1,fecha_emision:saleDate,observaciones:'Venta vinculada a pedido'},
   {id:sale2,cliente_id:clientB,almacen_id:wh,producto_id:p3,cantidad:2,precio:95,descuento:0,tipo:'boleta',fecha:saleDate,pedido_id:'',metodo_pago:'Yape demo',comprador_nombre:'Cliente Modelo '+suffix,comprador_documento:documentB,comprador_tipo_documento:'DNI',comprador_direccion:'Lima',serie:'B9'+suffix,correlativo:1,fecha_emision:saleDate,observaciones:'Venta directa de ejemplo'}
  ],
  Cobros:[
   {id:'PAG-X'+suffix+'1',venta_id:sale1,importe:500,metodo:'Transferencia demo',fecha:now,referencia:'TRANSFER-'+suffix},
   {id:'PAG-X'+suffix+'2',venta_id:sale2,importe:190,metodo:'Yape demo',fecha:now,referencia:'YAPE-'+suffix}
  ],
  Caja:[
   {id:'EGR-X'+suffix+'1',tipo:'egreso',categoria:'Movilidad',descripcion:'Gasto de entrega de demostración',importe:25,fecha:now,referencia:'MOVILIDAD-'+suffix}
  ]
 };
 const wb=XLSX.utils.book_new();
 const guide=XLSX.utils.aoa_to_sheet([
  ['ERP COMERCIAL PERÚ · DATOS DE DEMOSTRACIÓN AUTOCONTENIDOS'],
  ['Este libro incluye los clientes, productos, almacén y stock que necesitan sus documentos.'],
  ['No necesitas restaurar la base de ejemplo ni tener IDs CLI-001.'],
  ['Importa desde Datos maestros: Importar datos XLSX > Ver vista previa > Confirmar.'],
  ['Una misma ID repetida corresponde a varias líneas del mismo documento.'],
  ['Cada nueva descarga genera IDs diferentes. Para reimportar, utiliza otra descarga.'],
  ['No hay facturación real ni información bancaria. Los datos son ficticios.'],
  ['Almacén de práctica: '+wh],
  ['Cliente de prueba RUC: '+clientA+' / '+documentA],
  ['Cliente de prueba DNI: '+clientB+' / '+documentB],
 ]);
 guide['!cols']=[{wch:110}];
 XLSX.utils.book_append_sheet(wb,guide,'Instrucciones');
 for(const [name,rows] of Object.entries(data) as [SheetName,Row[]][]){
   const cols=[...importSchema[name],...(importOptionalColumns[name]||[])];
   const ws=XLSX.utils.aoa_to_sheet([cols,...rows.map(r=>cols.map(h=>r[h]??''))]);
   ws['!cols']=cols.map(h=>({wch:h==='observaciones'||h==='comprador_direccion'?42:Math.max(14,h.length+3)}));
   XLSX.utils.book_append_sheet(wb,ws,name);
 }
 return XLSX.write(wb,{type:'array',bookType:'xlsx'}) as ArrayBuffer;
}
