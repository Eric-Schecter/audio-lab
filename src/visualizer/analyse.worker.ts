/// <reference lib="webworker" />
export {};
self.onmessage=({data}:{data:{samples:Float32Array;sampleRate:number}})=>{
 const {samples,sampleRate}=data,N=4096,hop=512,re=new Float64Array(N),im=new Float64Array(N),previous=new Float32Array(88),last=new Float64Array(88);last.fill(-100);
 const events:{n:number;at:number;power:number;duration:number}[]=[];
 const amplitudes=new Float32Array(88),active=new Int32Array(88),heldUntil=new Float64Array(88);active.fill(-1);let groupAt=-1;
 for(let start=-N/2;start<samples.length;start+=hop){
  for(let i=0;i<N;i++){re[i]=(samples[start+i]||0)*(.5-.5*Math.cos(2*Math.PI*i/(N-1)));im[i]=0;}
  for(let i=1,j=0;i<N;i++){let bit=N>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];}}
  for(let len=2;len<=N;len*=2){const angle=-2*Math.PI/len,wr=Math.cos(angle),wi=Math.sin(angle);for(let i=0;i<N;i+=len){let cr=1,ci=0;for(let j=0;j<len/2;j++){const a=i+j,b=a+len/2,tr=re[b]*cr-im[b]*ci,ti=re[b]*ci+im[b]*cr;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const next=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=next;}}}
  const at=Math.max(0,(start+N/2)/sampleRate),hits:{n:number;power:number;rise:number}[]=[];
  let strongest=0;
  for(let n=0;n<88;n++){
   const hz=440*2**((n+21-69)/12),lo=Math.max(2,Math.ceil(hz*2**(-.48/12)*N/sampleRate)),hi=Math.min(N/2-2,Math.floor(hz*2**(.48/12)*N/sampleRate));let amp=0;
   for(let k=lo;k<=hi;k++){const value=Math.hypot(re[k],im[k])*2/N;if(value>Math.hypot(re[k-1],im[k-1])*2/N&&value>=Math.hypot(re[k+1],im[k+1])*2/N)amp=Math.max(amp,value);}
   amplitudes[n]=amp;strongest=Math.max(strongest,amp);
  }
  for(let n=0;n<88;n++){
   let amp=amplitudes[n];
   for(const [interval,weight]of [[12,.8],[19,.55],[24,.4],[28,.25]])if(n>=interval&&amplitudes[n-interval]>amp*.65)amp=Math.max(0,amp-amplitudes[n-interval]*weight);
   const value=Math.min(1.7,Math.sqrt(amp)*4),rise=value-previous[n],event=active[n]>=0?events[active[n]]:undefined;
   if(event&&at-heldUntil[n]<.09&&value>Math.max(.17,event.power*.5)){
    event.duration=Math.min(1.2,Math.max(.07,at-event.at));heldUntil[n]=at;
   }
   const held=event&&at-heldUntil[n]<.12;
   if(value>.22&&amp>strongest*.2&&rise>.065&&(!held||value>previous[n]*1.85)&&at-last[n]>.38)hits.push({n,power:value,rise});
   previous[n]=value;
  }
  if(at-groupAt>=.14){
   hits.sort((a,b)=>b.power+b.rise-a.power-a.rise);
   const selected:number[]=[];
   for(const h of hits){
    if(selected.some(n=>Math.abs(n-h.n)<3))continue;
    let recent=0;for(let i=events.length-1;i>=0&&events[i].at>at-.85;i--)recent++;
    if(recent>=8)break;
    last[h.n]=at;active[h.n]=events.length;heldUntil[h.n]=at;events.push({n:h.n,at,power:h.power,duration:.07});selected.push(h.n);
    if(selected.length===2)break;
   }
   if(selected.length)groupAt=at;
  }
 }
 self.postMessage(events);
};
