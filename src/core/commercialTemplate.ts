import * as XLSX from 'xlsx';
import {today} from './types';
import {importOptionalColumns,importSchema} from './importXlsx';
import type {SheetName} from './importXlsx';

/** Datos ficticios basados en el escenario AULA (CLI-001, PRO-001, ALM-01).
 * Se genera en el navegador, sin servicio, sin fórmulas y sin subir archivos. */
export function makeCommercialExampleXlsx():ArrayBuffer{
  const day=(offset:number)=>today(new Date(Date.now()+offset*86400000));
  const quoteDate=day(-2),orderDate=day(-1),now=day(0);
  type Row=Record<string,string|number>;
  const data:Partial<Record<SheetName,Row[]>>={
    Cotizaciones:[
      {id:'COT-XL26-001',cliente_id:'CLI-001',producto_id:'PRO-001',cantidad:1,precio:75,descuento:0,estado:'aprobada',fecha:quoteDate,vigencia_hasta:day(14),observaciones:'Kit de oficina · documento de muestra'},
      {id:'COT-XL26-001',cliente_id:'CLI-001',producto_id:'PRO-002',cantidad:1,precio:154,descuento:0,estado:'aprobada',fecha:quoteDate,vigencia_hasta:day(14),observaciones:'Kit de oficina · documento de muestra'},
      {id:'COT-XL26-002',cliente_id:'CLI-002',producto_id:'PRO-003',cantidad:2,precio:233,descuento:5,estado:'borrador',fecha:orderDate,vigencia_hasta:day(21),observaciones:'Pendiente de revisión comercial'}
    ],
    Pedidos:[
      {id:'PED-XL26-001',cliente_id:'CLI-001',producto_id:'PRO-001',cantidad:1,precio:75,descuento:0,estado:'preparando',fecha:orderDate,cotizacion_id:'COT-XL26-001',fecha_entrega:day(4),observaciones:'Convertido desde cotización'},
      {id:'PED-XL26-001',cliente_id:'CLI-001',producto_id:'PRO-002',cantidad:1,precio:154,descuento:0,estado:'preparando',fecha:orderDate,cotizacion_id:'COT-XL26-001',fecha_entrega:day(4),observaciones:'Convertido desde cotización'},
      {id:'PED-XL26-002',cliente_id:'CLI-003',producto_id:'PRO-004',cantidad:1,precio:312,descuento:0,estado:'confirmado',fecha:now,cotizacion_id:'',fecha_entrega:day(5),observaciones:'Despacho programado'}
    ],
    Ventas:[
      {id:'VEN-XL26-001',cliente_id:'CLI-001',almacen_id:'ALM-01',producto_id:'PRO-001',cantidad:1,precio:75,descuento:0,tipo:'factura',fecha:now,pedido_id:'PED-XL26-001',metodo_pago:'Transferencia demo',comprador_nombre:'Tecnored Lima SAC',comprador_documento:'20100000000',comprador_tipo_documento:'RUC',comprador_direccion:'Av. Demostración 100, Lima',serie:'F009',correlativo:101,fecha_emision:now,observaciones:'Venta desde pedido'},
      {id:'VEN-XL26-001',cliente_id:'CLI-001',almacen_id:'ALM-01',producto_id:'PRO-002',cantidad:1,precio:154,descuento:0,tipo:'factura',fecha:now,pedido_id:'PED-XL26-001',metodo_pago:'Transferencia demo',comprador_nombre:'Tecnored Lima SAC',comprador_documento:'20100000000',comprador_tipo_documento:'RUC',comprador_direccion:'Av. Demostración 100, Lima',serie:'F009',correlativo:101,fecha_emision:now,observaciones:'Venta desde pedido'},
      {id:'VEN-XL26-002',cliente_id:'CLI-004',almacen_id:'ALM-01',producto_id:'PRO-005',cantidad:1,precio:391,descuento:0,tipo:'boleta',fecha:now,pedido_id:'',metodo_pago:'Yape demo',comprador_nombre:'Cliente de demostración',comprador_documento:'48123456',comprador_tipo_documento:'DNI',comprador_direccion:'Lima',serie:'B009',correlativo:201,fecha_emision:now,observaciones:'Venta directa'}
    ],
    Cobros:[
      {id:'PAG-XL26-001',venta_id:'VEN-XL26-001',importe:100,metodo:'Transferencia demo',fecha:now,referencia:'REF-TRANSFER-001'},
      {id:'PAG-XL26-002',venta_id:'VEN-XL26-002',importe:391,metodo:'Yape demo',fecha:now,referencia:'REF-YAPE-002'}
    ],
    Caja:[
      {id:'EGR-XL26-001',tipo:'egreso',categoria:'Movilidad',descripcion:'Gasto logístico de demostración',importe:25,fecha:now,referencia:'GASTO-LOG-001'},
      {id:'ING-XL26-001',tipo:'ingreso',categoria:'Otros ingresos',descripcion:'Servicio complementario demo',importe:40,fecha:now,referencia:'SERV-OTR-001'}
    ]
  };
  const book=XLSX.utils.book_new();
  const instructions=XLSX.utils.aoa_to_sheet([
    ['ERP COMERCIAL PERÚ · DOCUMENTOS COMERCIALES'],
    ['Importa desde Datos maestros > Importación centralizada.'],
    ['Los IDs corresponden al escenario de demostración AULA.'],
    ['Un ID repetido es un documento con varias líneas de productos.'],
    ['La fecha se expresa como AAAA-MM-DD. Cambia los IDs si vuelves a importar.'],
    ['La aplicación valida todo antes de guardar en este navegador.'],
    ['Esta muestra es académica; no emite comprobantes tributarios reales.']
  ]);
  instructions['!cols']=[{wch:88}];XLSX.utils.book_append_sheet(book,instructions,'Instrucciones');
  for(const [name,rows] of Object.entries(data) as [SheetName,Row[]][]){
    const headers=[...importSchema[name],...(importOptionalColumns[name]??[])];
    const sheet=XLSX.utils.aoa_to_sheet([headers,...rows.map(row=>headers.map(h=>row[h]??''))]);
    sheet['!cols']=headers.map(h=>({wch:h==='observaciones'||h==='comprador_direccion'?38:Math.max(13,h.length+3)}));
    XLSX.utils.book_append_sheet(book,sheet,name);
  }
  return XLSX.write(book,{bookType:'xlsx',type:'array'}) as ArrayBuffer;
}
