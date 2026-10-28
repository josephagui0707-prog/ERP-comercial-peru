/** Distribuidor de vistas. Cada módulo comercial tiene su propio archivo. */
import Quotes from '../features/commerce/Quotes';
import Orders from '../features/commerce/Orders';
import Sales from '../features/commerce/Sales';
import Vouchers from '../features/commerce/Vouchers';
import Payments from '../features/commerce/Payments';
import Returns from '../features/commerce/Returns';
import Clients from '../features/commerce/Clients';
export default function Commerce({section}:{section:string}){
 switch(section){
 case 'cotizaciones':return <Quotes/>;
 case 'pedidos':return <Orders/>;
 case 'ventas':return <Sales/>;
 case 'comprobantes':return <Vouchers/>;
 case 'cobros':return <Payments/>;
 case 'devoluciones':return <Returns/>;
 case 'clientes':return <Clients/>;
 default:return null;
 }
}
