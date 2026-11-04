import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from '../../core/api';
import type {Trip,Sample} from './types';

type Detail={trip:Trip;points:Sample[]};
export function useTrips(preferred:string) {
  const [trips,setTrips]=useState<Trip[]>([]),[selected,select]=useState(preferred),[detail,setDetail]=useState<Detail|null>(null);
  const [ready,setReady]=useState(false),[live,setLive]=useState(false),[error,setError]=useState('');
  const current=useRef(selected), cache=useRef<Detail|null>(null), revision=useRef(0), queue=useRef(false), busy=useRef(false), alive=useRef(false);
  current.current=selected;
  const refresh=useCallback(async()=>{
    queue.current=true;if(busy.current)return;busy.current=true;
    try{
      while(queue.current && alive.current){
        queue.current=false;const version=revision.current;
        try{
          const list=await api<Trip[]>('/trips');if(!alive.current || version!==revision.current)continue;
          setTrips(list);
          const id=list.some(t=>t.id===current.current)?current.current:list[0]?.id||'';
          if(id!==current.current){current.current=id;select(id);}
          if(!id){cache.current=null;setDetail(null);}else{
            const old=cache.current?.trip.id===id?cache.current:null;
            const result=await api<Detail>('/trips/'+id+'?after='+(old?.points.at(-1)?.seq||0));
            if(!alive.current || version!==revision.current || current.current!==id)continue;
            const merged={trip:result.trip,points:result.points.length?[...(old?.points||[]),...result.points]:(old?.points||[])};
            cache.current=merged;setDetail(merged);
          }
          setError('');
        }catch(e){if(alive.current)setError((e as Error).message);}
        if(alive.current)setReady(true);
      }
    }finally{busy.current=false;}
  },[]);
  const choose=useCallback((id:string)=>{current.current=id;revision.current++;cache.current=null;setDetail(null);select(id);void refresh();},[refresh]);
  useEffect(()=>{
    alive.current=true;void refresh();setLive(true);
    
    
    const timer=window.setInterval(()=>void refresh(),1800);
    return ()=>{alive.current=false;revision.current++;clearInterval(timer);};
  },[refresh]);
  useEffect(()=>{if(preferred)choose(preferred);},[preferred,choose]);
  return {trips,selected,choose,detail:detail?.trip.id===selected?detail:null,ready,live,error,refresh};
}
