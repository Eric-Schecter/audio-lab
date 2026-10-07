import {useEffect,useRef,useState} from 'react';
import {publicAsset,readRoute} from './paths';
import './preloader.css';
export const preloadedAudio=new Map<string,string>();
export default function Preloader({onEnter}:{onEnter:()=>void}){
 const onEnterRef=useRef(onEnter);onEnterRef.current=onEnter;
 const [progress,setProgress]=useState(0),[ready,setReady]=useState(false),[failed,setFailed]=useState(false),[leaving,setLeaving]=useState(false),[hidden,setHidden]=useState(false);
 useEffect(()=>{const controller=new AbortController();let cancelled=false;let timer:number|undefined;const started=performance.now();
 const sources=[import.meta.env.BASE_URL+'images/chart-candle.png',publicAsset(readRoute().startsWith('/sfx')?'/audio/elevenlabs/bow-water-10s.mp3':'/audio/suno/voyage-a.mp3')!];
 const load=async()=>{let errors=false;for(let i=0;i<sources.length;i++){const timeout=window.setTimeout(()=>controller.abort(),20000);try{const response=await fetch(sources[i],{signal:controller.signal});if(!response.ok||!response.body)throw new Error('load failed');const length=Number(response.headers.get('content-length')),reader=response.body.getReader();let received=0;const chunks:BlobPart[]=[];while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value as BlobPart);received+=value.length;if(length&&!cancelled)setProgress(Math.min(99,Math.round((i+Math.min(received/length,1))/sources.length*100)));}if(i===1&&!cancelled){preloadedAudio.set(sources[i],URL.createObjectURL(new Blob(chunks,{type:response.headers.get('content-type')||'audio/mpeg'})));}}catch{errors=true;}finally{clearTimeout(timeout);}if(cancelled)return;setProgress(Math.round((i+1)/sources.length*100));}setFailed(errors);timer=window.setTimeout(()=>{if(!cancelled)setReady(true);},Math.max(500,2400-(performance.now()-started)));};void load();return()=>{cancelled=true;controller.abort();clearTimeout(timer);};},[]);
 useEffect(()=>{if(!ready)return;onEnterRef.current();setLeaving(true);const timer=window.setTimeout(()=>{setHidden(true);},900);return()=>clearTimeout(timer);},[ready]);
 useEffect(()=>{
  if(hidden)return;
  const html=document.documentElement,body=document.body;
  const previous={htmlOverflow:html.style.overflow,bodyOverflow:body.style.overflow,htmlOverscroll:html.style.overscrollBehavior,bodyTouch:body.style.touchAction};
  html.style.overflow='hidden';body.style.overflow='hidden';html.style.overscrollBehavior='none';body.style.touchAction='none';
  return()=>{html.style.overflow=previous.htmlOverflow;body.style.overflow=previous.bodyOverflow;html.style.overscrollBehavior=previous.htmlOverscroll;body.style.touchAction=previous.bodyTouch;};
 },[hidden]);
 if(hidden)return null;
 return <section className={'preloader'+(leaving?' leaving':'')} aria-label="Audio Lab 预加载"><div className="load-overlay"><p className="load-kicker">Personal Projects</p><h1 className="load-title"><span className="load-line load-line-1">Audio</span><span className="load-line load-line-2">Lab</span></h1><div className="load-progress" role="progressbar" aria-label="资源加载进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="load-progress-fill" style={{transform:`scaleX(${progress/100})`}}/></div><p className="load-status" role="status">{failed?'部分资源未加载，可进入后继续使用':''}</p></div></section>;
}
