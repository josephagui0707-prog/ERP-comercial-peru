import * as XLSX from 'xlsx';
import {jsPDF} from 'jspdf';
import {numToLetras} from './types';
export type Row=Record<string,string|number>;
export function exportExcel(filename:string,rows:Row[]){const sheet=XLSX.utils.json_to_sheet(rows);const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Datos');XLSX.writeFile(book,`${filename}.xlsx`);}
export function exportPDF(title:string,rows:Row[]){const pdf=new jsPDF({orientation:'landscape'});pdf.setFontSize(17);pdf.text(title,14,17);pdf.setFontSize(9);pdf.text('ERP EnterpriseCloud · INFORME DEMOSTRATIVO SIN VALIDEZ TRIBUTARIA',14,24);const keys=rows.length?Object.keys(rows[0]):[];const width=(270/Math.max(1,keys.length));let y=34;for(const key of keys){pdf.text(key.slice(0,23),14+keys.indexOf(key)*width,y)}y+=8;for(const row of rows){if(y>185){pdf.addPage();y=20;}keys.forEach((key,i)=>pdf.text(String(row[key]??'').slice(0,25),14+i*width,y));y+=7;}pdf.save(`${title.toLowerCase().replace(/\s+/g,'-')}.pdf`);}
export function receiptPDF(sale:{id:string;tipoComprobante:'boleta'|'factura';serie:string;correlativo:number;date:string;compradorNombre:string;compradorDoc:string;compradorTipoDoc:string;compradorDireccion?:string;baseImponible:number;igv:number;total:number;paymentMethod:string;items:{name:string;qty:number;price:number;amount:number}[]}){
  const pdf=new jsPDF();
  const isFactura=sale.tipoComprobante==='factura';
  const tipoLabel=isFactura?'FACTURA ELECTRÓNICA':'BOLETA DE VENTA ELECTRÓNICA';
  const serieCorr=`${sale.serie} - ${String(sale.correlativo).padStart(8,'0')}`;
  const fmtDate=(d:string)=>{const [y,m,dd]=d.split('-');return `${dd}/${m}/${y}`;};
  const pageW=210;const margin=14;const rightX=pageW-margin;let y=15;
  pdf.setFont('helvetica','bold');pdf.setFontSize(13);pdf.text('ENTERPRISECLOUD SAC',margin,y);y+=6;
  pdf.setFont('helvetica','normal');pdf.setFontSize(8.5);
  pdf.text('RUC: 20601234567',margin,y);y+=5;
  pdf.text('Av. Javier Prado Este 4500, San Isidro - Lima',margin,y);y+=5;
  pdf.text('Tel: 01-234-5678 | www.enterprisecloud.demo',margin,y);y+=3;
  const boxX=120;const boxW=76;const boxH=28;const boxY=12;
  pdf.setDrawColor(50,50,50);pdf.setLineWidth(0.8);pdf.rect(boxX,boxY,boxW,boxH);
  pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.text(tipoLabel,boxX+boxW/2,boxY+7,{align:'center'});
  pdf.setFontSize(8);pdf.text('RUC: 20601234567',boxX+boxW/2,boxY+13,{align:'center'});
  pdf.setFontSize(10);pdf.text(serieCorr,boxX+boxW/2,boxY+22,{align:'center'});
  y=44;pdf.setLineWidth(0.5);pdf.setDrawColor(100,100,100);pdf.line(margin,y,rightX,y);y+=6;
  pdf.setFont('helvetica','normal');pdf.setFontSize(9);
  pdf.text(`Fecha de Emisión: ${fmtDate(sale.date)}`,margin,y);pdf.text('Moneda: PEN (Soles)',110,y);y+=5;
  pdf.text(`Forma de Pago: ${sale.paymentMethod.replace(' demo','')}`,margin,y);pdf.text('Tipo de Op.: Venta Interna',110,y);y+=2;
  pdf.line(margin,y+3,rightX,y+3);y+=8;
  pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.text('DATOS DEL CLIENTE / RECEPTOR:',margin,y);y+=5;
  pdf.setFont('helvetica','normal');pdf.text(`Nombre / Razón Social: ${sale.compradorNombre||'Consumidor Final'}`,margin,y);y+=5;
  if(sale.compradorDoc&&sale.compradorTipoDoc!=='-'){pdf.text(`${sale.compradorTipoDoc}: ${sale.compradorDoc}`,margin,y);y+=5;}
  if(isFactura&&sale.compradorDireccion){pdf.text(`Dirección: ${sale.compradorDireccion}`,margin,y);y+=5;}
  y+=2;pdf.line(margin,y,rightX,y);y+=6;
  pdf.setFont('helvetica','bold');pdf.setFontSize(8.5);
  pdf.text('CANT.',margin,y);pdf.text('DESCRIPCIÓN',margin+16,y);pdf.text('V. UNITARIO',140,y);pdf.text('TOTAL',178,y);y+=2;
  pdf.setLineWidth(0.3);pdf.line(margin,y,rightX,y);y+=5;
  pdf.setFont('helvetica','normal');pdf.setFontSize(8.5);
  for(const item of sale.items){
    if(y>240){pdf.addPage();y=20;}
    const desc=item.name.length>38?item.name.slice(0,37)+'…':item.name;
    pdf.text(String(item.qty),margin+3,y,{align:'center'});
    pdf.text(desc,margin+16,y);
    pdf.text(new Intl.NumberFormat('es-PE',{minimumFractionDigits:2}).format(item.price),158,y,{align:'right'});
    pdf.text(new Intl.NumberFormat('es-PE',{minimumFractionDigits:2}).format(item.amount),rightX,y,{align:'right'});
    y+=6;
  }
  y+=2;pdf.line(margin,y,rightX,y);y+=5;
  pdf.setFont('helvetica','italic');pdf.setFontSize(8);
  pdf.text(`SON: ${numToLetras(sale.total)}`,margin,y);y+=3;
  pdf.line(margin,y,rightX,y);y+=5;
  const col1=130;
  pdf.setFont('helvetica','normal');pdf.setFontSize(9);
  pdf.text('Op. Gravadas (Base Imponible):',col1,y);pdf.text(`S/ ${new Intl.NumberFormat('es-PE',{minimumFractionDigits:2}).format(sale.baseImponible)}`,rightX,y,{align:'right'});y+=6;
  pdf.text('IGV (18%):',col1,y);pdf.text(`S/ ${new Intl.NumberFormat('es-PE',{minimumFractionDigits:2}).format(sale.igv)}`,rightX,y,{align:'right'});y+=6;
  pdf.setFont('helvetica','bold');pdf.setFontSize(10);
  pdf.text('IMPORTE TOTAL:',col1,y);pdf.text(`S/ ${new Intl.NumberFormat('es-PE',{minimumFractionDigits:2}).format(sale.total)}`,rightX,y,{align:'right'});y+=4;
  pdf.setLineWidth(0.8);pdf.line(col1,y,rightX,y);y+=8;
  pdf.setFont('helvetica','italic');pdf.setFontSize(7.5);pdf.setDrawColor(150);
  pdf.line(margin,y,rightX,y);y+=5;
  pdf.text(`REPRESENTACIÓN IMPRESA DE ${tipoLabel}`,pageW/2,y,{align:'center'});y+=4;
  pdf.text('DOCUMENTO SIMULADO - SIN VALIDEZ TRIBUTARIA REAL',pageW/2,y,{align:'center'});y+=4;
  pdf.text('Puede verificar en: www.sunat.gob.pe (DEMO)',pageW/2,y,{align:'center'});y+=4;
  const hash=btoa(sale.id+sale.serie).replace(/[^A-Z0-9]/gi,'').slice(0,24).toUpperCase();
  pdf.text(`REF: ${sale.id} | HASH DEMO: ${hash}`,pageW/2,y,{align:'center'});
  pdf.save(`${sale.tipoComprobante}-${sale.serie}-${String(sale.correlativo).padStart(8,'0')}.pdf`);
}
