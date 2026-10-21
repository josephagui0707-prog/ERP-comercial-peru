import {useEffect,useRef,useState} from 'react';
import type {PDFDocumentLoadingTask,RenderTask} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
/** Render actual PDF pages locally, independent of a browser's built-in PDF plugin. */
export function PdfPreview({dataUrl}:{dataUrl:string}) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const [page,setPage]=useState(1),[pages,setPages]=useState(1),[loading,setLoading]=useState(true),[error,setError]=useState('');
  useEffect(()=>{
    let cancelled=false,task:PDFDocumentLoadingTask|undefined,render:RenderTask|undefined;
    setLoading(true);setError('');
    void (async()=>{
      try{
        const pdfjs=await import('pdfjs-dist');if(cancelled)return;
        pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
        const bytes=atob(dataUrl.split(',')[1]);
        task=pdfjs.getDocument({data:Uint8Array.from(bytes,c=>c.charCodeAt(0)),isEvalSupported:false});
        const pdf=await task.promise;if(cancelled)return;setPages(pdf.numPages);
        const current=await pdf.getPage(Math.min(page,pdf.numPages));if(cancelled)return;
        const element=canvas.current!;const base=current.getViewport({scale:1});
        const viewport=current.getViewport({scale:560/base.width});
        const ratio=Math.min(window.devicePixelRatio||1,2);
        element.width=Math.ceil(viewport.width*ratio);element.height=Math.ceil(viewport.height*ratio);
        render=current.render({canvasContext:element.getContext('2d')!,viewport,transform:ratio===1?undefined:[ratio,0,0,ratio,0,0]});
        await render.promise;if(!cancelled)setLoading(false);
      }catch(e){if(!cancelled){setLoading(false);setError(e instanceof Error&&e.name==='PasswordException'?'Este PDF está protegido con contraseña. Usa una copia sin protección para revisarlo.':'No se pudo mostrar este PDF. Comprueba que el archivo sea válido.');}}
    })();
    return ()=>{cancelled=true;render?.cancel();void task?.destroy();};
  },[dataUrl,page]);
  return <div className="inv-pdf-preview">
    {loading&&<p role="status">Cargando página del PDF…</p>}
    {error&&<p className="alert alert-danger" role="alert">{error}</p>}
    <div className="inv-pdf-scroll" hidden={!!error}><canvas ref={canvas} hidden={loading} role="img" aria-label={`Página ${page} del documento PDF`}/></div>
    {!error&&<div className="inv-pdf-navigation"><button type="button" className="btn mini" disabled={page<=1||loading} onClick={()=>setPage(page-1)}>Página anterior</button><span>Página {page} de {pages}</span><button type="button" className="btn mini" disabled={page>=pages||loading} onClick={()=>setPage(page+1)}>Página siguiente</button></div>}
  </div>;
}
