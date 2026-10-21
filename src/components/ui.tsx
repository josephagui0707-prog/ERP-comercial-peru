import type {ReactNode} from 'react';
import type {LucideIcon} from 'lucide-react';
export function Panel({title,children,actions}:{title?:string;children:ReactNode;actions?:ReactNode}){return <section className="panel card shadow-sm fade-up border-0">{(title||actions)&&<div className="panel-header card-header border-0 bg-transparent"><h3>{title}</h3><div>{actions}</div></div>}{children}</section>}
export function Field({label,children}:{label:string;children:ReactNode}){return <label className="field form-label"><span>{label}</span>{children}</label>}
export function Empty({message='No hay registros para mostrar.'}:{message?:string}){return <div className="empty alert alert-light">{message}</div>}
export function Badge({value}:{value:string}){return <span className={'badge rounded-pill '+(/aprob|pagad|complet|vigente|confirm|activo|recibid/i.test(value)?'ok':/rechaz|anulad|cancel/i.test(value)?'bad':'')}>{value}</span>}
export function Stat({label,value,hint,icon:Icon}:{label:string;value:string|number;hint?:string;icon?:LucideIcon}){return <div className="stat card shadow-sm fade-up border-0"><div className="erp-kpi-head"><small>{label}</small>{Icon&&<Icon size={18} strokeWidth={1.7} aria-hidden="true"/>}</div><strong><StatValue v={value}/></strong>{hint&&<span>{hint}</span>}</div>}
import {useEffect,useRef,useState} from 'react';
import {Smartphone,Landmark,CreditCard,Banknote,ShieldCheck,Wallet,Globe,Check} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
/* Métodos de pago de demostración con logos integrados. */
export type PayMethod={name:string;label:string;sub:string;icon:LucideIcon;a:string;b:string;logo?:string};
export const PAY_METHODS:PayMethod[]=[
{name:'Yape demo',label:'Yape',sub:'Billetera móvil (Perú)',icon:Smartphone,a:'#742284',b:'#892c9b',logo:'/logos/yape.png'},
{name:'Plin demo',label:'Plin',sub:'Billetera móvil (Perú)',icon:Wallet,a:'#00b4d8',b:'#0077b6',logo:'/logos/plin.png'},
{name:'Mercado Pago demo',label:'Mercado Pago',sub:'Billetera digital / QR',icon:ShieldCheck,a:'#009ee3',b:'#ffe600',logo:'/logos/mercadopago.png'},
{name:'PayPal demo',label:'PayPal',sub:'Pago internacional',icon:Globe,a:'#003087',b:'#0079c1',logo:'/logos/paypal.png'},
{name:'Transferencia demo',label:'Transferencia',sub:'BCP / BBVA / Interbank',icon:Landmark,a:'#1e40af',b:'#3b82f6',logo:'/logos/transferencia.png'},
{name:'Tarjeta demo',label:'Pago seguro',sub:'Crédito / débito',icon:CreditCard,a:'#059669',b:'#34d399'},
{name:'Efectivo demo',label:'Efectivo',sub:'Pago en caja',icon:Banknote,a:'#d97706',b:'#fbbf24'}];
export function MethodMark({m,size=40}:{m:PayMethod;size?:number}){const [err,setErr]=useState(false);const Icon=m.icon;if(m.logo&&!err){return <span className="pay-mark has-logo" style={{width:size,height:size}}><img src={m.logo} alt={m.label} onError={()=>setErr(true)} loading="lazy"/></span>}return <span className="pay-mark" style={{width:size,height:size,background:`linear-gradient(135deg,${m.a},${m.b})`}}><Icon size={size*.5} color="#fff" strokeWidth={2.2}/></span>}
export function MethodPicker({value,onChange}:{value:string;onChange:(v:string)=>void}){return <div className="pay-grid" role="radiogroup" aria-label="Método de pago">{PAY_METHODS.map((m,i)=>{const on=value===m.name;return <button type="button" role="radio" aria-checked={on} key={m.name} className={'pay-card'+(on?' selected':'')} style={{animationDelay:i*55+'ms'}} onClick={()=>onChange(m.name)}><MethodMark m={m}/><span className="pay-text"><b>{m.label}</b><small>{m.sub}</small></span>{on&&<span className="pay-check"><Check size={14}/></span>}</button>})}</div>}
export function MethodChip({name}:{name:string}){const m=PAY_METHODS.find(x=>x.name===name);if(!m)return <>{name}</>;return <span className="pay-chip"><MethodMark m={m} size={24}/>{m.label}</span>}
export function ComprobanteBadge({tipo,serie,correlativo}:{tipo:'boleta'|'factura';serie:string;correlativo:number}){const isF=tipo==='factura';return <span className={`comprobante-badge ${isF?'factura':'boleta'}`}><span className="comp-tipo">{isF?'FAC':'BOL'}</span> <span className="comp-num">{serie}-{String(correlativo).padStart(8,'0')}</span></span>}
/* Contador animado para KPIs: "S/ 1,234.50" -> sube desde 0 */
export function useCountUp(text:string){const [out,setOut]=useState(text);const raf=useRef(0);useEffect(()=>{const mm=text.match(/-?[\d,]+(\.\d+)?/);if(!mm||window.matchMedia('(prefers-reduced-motion: reduce)').matches){setOut(text);return}const target=parseFloat(mm[0].replace(/,/g,''));const dec=(mm[1]||'').length-(mm[1]?1:0);const start=performance.now();const dur=900;const tick=(t:number)=>{const k=Math.min(1,(t-start)/dur);const e=1-Math.pow(1-k,3);const v=(target*e).toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec});setOut(text.replace(mm[0],v));if(k<1)raf.current=requestAnimationFrame(tick)};raf.current=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf.current)},[text]);return out}
function StatValue({v}:{v:string|number}){return <>{useCountUp(String(v))}</>}
