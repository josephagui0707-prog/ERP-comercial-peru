import {createPortal} from 'react-dom';
import {useEffect,useId,useRef} from 'react';
import type {ReactNode} from 'react';
/** Native dialog provides focus containment, Escape and return-to-trigger focus. */
export function Modal({title,children,onClose,busy=false}:{title:string;children:ReactNode;onClose:()=>void;busy?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null),id=useId();
  useEffect(()=>{const d=ref.current!;d.showModal();return ()=>d.close();},[]);
  return createPortal(<dialog className="inv-modal" ref={ref} aria-labelledby={id} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><header><div><span className="eyebrow">INVENTARIO · ERP</span><h2 id={id}>{title}</h2></div><button type="button" className="btn mini" aria-label="Cerrar ventana" disabled={busy} onClick={onClose}>✕</button></header>{children}</dialog>,document.body);
}
