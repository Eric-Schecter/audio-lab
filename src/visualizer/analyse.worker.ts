/// <reference lib="webworker" />
export {};
self.onmessage=({data}:{data:{samples:Float32Array;sampleRate:number}})=>{
 const {samples,sampleRate}=data,N=4096,hop=512,re=new Float64Array(N),im=new Float64Array(N),previous=new Float32Array(88),last=new Float64Array(88);last.fill(-100);
 const events:{n:number;at:number;power:number}[]=[];
 for(let start=-N/2;start<samples.length;start+=hop){
  for(let i=0;i<N;i++){re[i]=(samples[start+i]||0)*(.5-.5*Math.cos(2*Math.PI*i/(N-1)));im[i]=0;}
  for(let i=1,j=0;i<N;i++){let bit=N>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];}}
  for(let len=2;len<=N;len*=2){const angle=-2*Math.PI/len,wr=Math.cos(angle),wi=Math.sin(angle);for(let i=0;i<N;i+=len){let cr=1,ci=0;for(let j=0;j<len/2;j++){const a=i+j,b=a+len/2,tr=re[b]*cr-im[b]*ci,ti=re[b]*ci+im[b]*cr;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const next=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=next;}}}
  const at=Math.max(0,(start+N/2)/sampleRate),hits:{n:number;power:number;rise:number}[]=[];
  for(let n=0;n<88;n++){const hz=440*2**((n+21-69)/12),lo=Math.max(1,Math.floor(hz*2**(-.5/12)*N/sampleRate)),hi=Math.min(N/2-1,Math.ceil(hz*2**(.5/12)*N/sampleRate));let amp=0;for(let k=lo;k<=hi;k++)amp=Math.max(amp,Math.hypot(re[k],im[k])*2/N);const value=Math.min(1.7,Math.sqrt(amp)*4),rise=value-previous[n];if(value>.13&&rise>.045&&at-last[n]>.2)hits.push({n,power:value,rise});previous[n]=value;}
  hits.sort((a,b)=>b.rise-a.rise);for(const h of hits.slice(0,5)){last[h.n]=at;events.push({n:h.n,at,power:h.power});}
 }
 self.postMessage(events);
};
