import type {State} from '../../core/types';

export function projection(s:State, currentMonth:string) {
  const [y,m]=currentMonth.split('-').map(Number);
  const month=(offset:number)=>new Date(Date.UTC(y,m-1+offset,1)).toISOString().slice(0,7);
  const rows=[-3,-2,-1].map(offset=>{
    const key=month(offset), inMonth=(x:{date:string})=>x.date.slice(0,7)===key;
    const sales=s.sales.filter(x=>x.status==='vigente'&&inMonth(x)),returns=s.returns.filter(inMonth);
    const payments=s.payments.filter(x=>x.status==='aprobado'&&inMonth(x)),cash=s.expenses.filter(inMonth);
    return {key,hasSales:!!(sales.length||returns.length),hasCash:!!(payments.length||cash.length),
      sales:sales.reduce((n,x)=>n+x.total,0)-returns.reduce((n,x)=>n+x.amount,0),
      flow:payments.reduce((n,x)=>n+x.amount,0)+cash.reduce((n,x)=>n+(x.type==='ingreso'?x.amount:-x.amount),0)};
  });
  const mean=(key:'flow'|'sales')=>Math.round(rows.reduce((n,x)=>n+x[key],0)/3*100)/100;
  return {rows,month:currentMonth,sales:rows.every(r=>r.hasSales)?mean('sales'):null,flow:rows.every(r=>r.hasCash)?mean('flow'):null};
}
