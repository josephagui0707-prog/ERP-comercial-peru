import {useEffect,useId,useRef} from 'react';
import type {ReactNode} from 'react';
import {X} from 'lucide-react';
import {createPortal} from 'react-dom';

/** Native modal: focus containment, Escape dismissal and focus restoration. */
export default function Dialog({title,children,onClose,confirm=false}:{title:string;children:ReactNode;onClose:()=>void;confirm?:boolean}){
  const ref=useRef<HTMLDialogElement>(null);
  const titleId=useId();
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;
    const dialog=ref.current;
    dialog?.showModal();document.body.style.overflow='hidden';
    return()=>{dialog?.close();document.body.style.overflow=overflow;previous?.focus();};
  },[]);
  useEffect(()=>{ref.current?.querySelector<HTMLElement>('[autofocus], input:not([disabled]), button')?.focus();},[confirm]);
  return createPortal(<dialog ref={ref} className={'user-dialog'+(confirm?' user-dialog-confirm':'')} aria-labelledby={titleId} onCancel={e=>{e.preventDefault();onClose();}}>
    <header className="user-dialog-header"><h2 id={titleId}>{title}</h2><button type="button" className="btn btn-sm btn-outline-secondary" aria-label="Cerrar diálogo" onClick={onClose}><X size={18}/></button></header>
    <div className="user-dialog-body">{children}</div>
  </dialog>,document.body);
}
