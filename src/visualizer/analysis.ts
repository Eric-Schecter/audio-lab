export type VisualEvent={n:number;at:number;power:number};
const cache=new Map<string,Promise<VisualEvent[]>>();
export function prepareVisuals(url:string){
 const found=cache.get(url);if(found)return found;
 const task=(async()=>{
  const response=await fetch(url);if(!response.ok)throw Error('音频分析加载失败');
  const context=new AudioContext({sampleRate:22050});
  let samples:Float32Array,sampleRate:number;
  try{const buffer=await context.decodeAudioData(await response.arrayBuffer());sampleRate=buffer.sampleRate;samples=new Float32Array(buffer.length);for(let ch=0;ch<buffer.numberOfChannels;ch++){const input=buffer.getChannelData(ch);for(let i=0;i<samples.length;i++)samples[i]+=input[i]/buffer.numberOfChannels;}}finally{await context.close();}
  return new Promise<VisualEvent[]>((resolve,reject)=>{
   const worker=new Worker(new URL('./analyse.worker.ts',import.meta.url),{type:'module'});
   const timer=setTimeout(()=>{worker.terminate();reject(Error('音频分析超时'));},120000);
   worker.onmessage=e=>{clearTimeout(timer);worker.terminate();resolve(e.data);};
   worker.onerror=()=>{clearTimeout(timer);worker.terminate();reject(Error('音频分析失败'));};
   worker.postMessage({samples,sampleRate},[samples.buffer]);
  });
 })();cache.set(url,task);return task;
}
