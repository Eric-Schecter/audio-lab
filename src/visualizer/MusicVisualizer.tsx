import {useEffect,useRef,useState,type RefObject} from 'react';
import {createRenderer} from './renderer';
import {createFallback} from './fallback';
import './visualizer.css';
import {prepareVisuals,type VisualEvent} from './analysis';

type Props={audio:RefObject<HTMLAudioElement|null>;trackId:string;url:string;leadIn:RefObject<{started:number;position:number}|null>};
export default function MusicVisualizer({audio,trackId,url,leadIn}:Props){
 const canvas=useRef<HTMLCanvasElement>(null),backup=useRef<HTMLCanvasElement>(null),notes=useRef<HTMLCanvasElement>(null);
 const [error,setError]=useState(''),[mode,setMode]=useState<'gpu'|'fallback'>('gpu');
 useEffect(()=>{
  let element=canvas.current!;
  let renderer:ReturnType<typeof createRenderer>;
  try{renderer=createRenderer(element);setMode('gpu');}catch{try{element=backup.current!;renderer=createFallback(element);setMode('fallback');}catch{setError('当前浏览器无法绘制可视化，音乐仍可正常播放。');return;}}
  let frame=0,width=1,height=1,clock=0,last=-1,cursor=0,disposed=false,drawAt=-100,lastDrawClock=NaN;
  let events:VisualEvent[]=[];
  setError('');
  void prepareVisuals(url).then(result=>{if(!disposed){events=result;last=-1;}}).catch(()=>{if(!disposed)setError('音频可视化分析失败，请刷新重试。');});
  const overlay=notes.current!,ink=overlay.getContext('2d')!;
  const keys:{black:boolean;left:number;center:number}[]=[];let whites=0;
  for(let n=0;n<88;n++){const black=[1,3,6,8,10].includes((n+21)%12);keys.push({black,left:black?whites-.3:whites,center:black?whites:whites+.5});if(!black)whites++;}
  const resize=()=>{const rect=element.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);const ratio=Math.min(devicePixelRatio,1.25);element.width=Math.round(width*ratio);element.height=Math.round(height*ratio);overlay.width=element.width;overlay.height=element.height;renderer.clear();last=-1;lastDrawClock=NaN;};
  const observer=new ResizeObserver(resize);observer.observe(element);resize();
  const reset=()=>{renderer.clear();last=-1;lastDrawClock=NaN;};
  const player=audio.current;let hasStarted=false;
  const begin=()=>{hasStarted=true;};player?.addEventListener('play',begin);
  player?.addEventListener('seeking',reset);player?.addEventListener('emptied',reset);
  const lost=()=>setError('可视化暂时不可用，请刷新页面。');element.addEventListener('webglcontextlost',lost);
  const lowerBound=(at:number)=>{let lo=0,hi=events.length;while(lo<hi){const mid=(lo+hi)>>>1;if(events[mid].at<at)lo=mid+1;else hi=mid;}return lo;};
  const draw=(ms:number)=>{
   frame=requestAnimationFrame(draw);
   if(document.hidden||ms-drawAt<1000/65||element.getClientRects().length===0)return;
   drawAt=ms;
   const intro=leadIn.current;
   if(intro)hasStarted=true;
   clock=intro?intro.position-.85+Math.min(.85,(performance.now()-intro.started)/1000):(player?.currentTime||0);
   if(clock===lastDrawClock)return;lastDrawClock=clock;
   const enabled=hasStarted;
   const keyWidth=width*.9/52,origin=width*.05,line=height*.78;
   const rebuild=last<0||clock<last||clock-last>.25;
   if(rebuild){renderer.clear();cursor=lowerBound(clock-3.6);}
   while(enabled&&cursor<events.length&&events[cursor].at<=clock){const e=events[cursor++];renderer.emit(origin+keys[e.n].center*keyWidth,e.power,true,e.at,.55);}
   last=clock;
   const blocks=enabled?events.slice(lowerBound(clock-1.2),lowerBound(clock+.85)):[];
   renderer.draw(clock,width,height,39,1);
   ink.setTransform(overlay.width/width,0,0,overlay.height/height,0,0);ink.clearRect(0,0,width,height);
   ink.save();ink.beginPath();ink.rect(0,0,width,line);ink.clip();
   for(const b of blocks){const age=clock-(b.at-.85),y=line-(1-age/.85)*(line-35),bh=Math.max(10,Math.min(height*.32,(b.duration||.07)*(line-35)/.85));const strength=Math.min(1,b.power/.8);ink.globalAlpha=.35+strength*.65;ink.fillStyle='rgba(226,190,128,.12)';ink.strokeStyle='rgba(242,204,143,.8)';ink.lineWidth=1;ink.shadowColor='#e6bf80';ink.shadowBlur=0;ink.beginPath();ink.roundRect(origin+keys[b.n].center*keyWidth-keyWidth*.3,y-bh,keyWidth*.6,bh,2);ink.fill();ink.stroke();}ink.restore();ink.globalAlpha=1;
   const activeKeys=new Set(blocks.filter(b=>clock>=b.at&&clock-b.at<Math.max(.12,b.duration)).map(b=>b.n));
   for(const black of [false,true])for(let n=0;n<88;n++){const k=keys[n];if(k.black!==black)continue;const pressed=activeKeys.has(n);ink.fillStyle=pressed?(black?'#c49855':'#f2cf91'):(black?'#10191b':'#cec7b7');ink.strokeStyle='#263233';ink.lineWidth=.8;const x=origin+k.left*keyWidth,kw=keyWidth*(black?.6:1),kh=black?height*.12:height*.19;ink.fillRect(x,line,kw,kh);ink.strokeRect(x,line,kw,kh);}
   for(const b of blocks){const age=clock-b.at;if(age<0||age>.18)continue;const x=origin+keys[b.n].center*keyWidth;ink.fillStyle=`rgba(255,234,183,${1-age/.18})`;ink.shadowColor='#ffe4a4';ink.shadowBlur=0;for(let i=0;i<6;i++){const angle=i*Math.PI/3+b.n;ink.beginPath();ink.arc(x+Math.cos(angle)*age*65,line-3-Math.sin(angle)*age*45-age*22,1.5,0,Math.PI*2);ink.fill();}}ink.shadowBlur=0;

  };
  frame=requestAnimationFrame(draw);
  return()=>{disposed=true;player?.removeEventListener('play',begin);cancelAnimationFrame(frame);observer.disconnect();player?.removeEventListener('seeking',reset);player?.removeEventListener('emptied',reset);element.removeEventListener('webglcontextlost',lost);renderer.dispose();};
 },[audio,trackId,url,leadIn]);
 return <section className="music-visualizer" aria-label="音乐可视化"><canvas ref={canvas} style={{visibility:mode==='gpu'?'visible':'hidden'}} aria-label="随音乐变化的发光丝带与粒子"/><canvas ref={backup} style={{visibility:mode==='fallback'?'visible':'hidden'}} aria-hidden="true"/><canvas ref={notes} className="visualizer-notes" aria-label="频谱驱动的钢琴键盘与下落方块"/>{error&&<p className="visualizer-error" role="status">{error}</p>}</section>;
}
