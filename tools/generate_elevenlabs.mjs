import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const env=await readFile(resolve(root,'.env.local'),'utf8');
const line=env.split(/\r?\n/).find(l=>/^\s*ELEVENLABS_API_KEY\s*=/.test(l));
const key=line?.slice(line.indexOf('=')+1).trim().replace(/^(['"])(.*)\1$/,'$2');
if(!key)throw new Error('ELEVENLABS_API_KEY is not configured');
const output=resolve(root,'public/audio/elevenlabs');await mkdir(output,{recursive:true});
const ledgerPath=resolve(output,'generation-log.json');
let ledger;try{ledger=JSON.parse(await readFile(ledgerPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;ledger={attempts:[]};}
const jobs=[
 {id:'voyage-bgm-30s-v1',title:'向远方 · AI 航海 BGM',kind:'bgm',path:'/v1/music',file:'voyage-bgm-30s.mp3',body:{prompt:'Instrumental background music for an antique hand-painted nautical world map. A historical wooden merchant sailing ship travelling across a calm open ocean. Peaceful, spacious, warm, a restrained sense of exploration and anticipation. Gentle orchestral strings, soft woodwinds and light plucked strings, slow steady pulse, understated melody, stable dynamics. No vocals, no speech, no ocean or ship sound effects, no dramatic climax. A coherent 30-second game background cue.',music_length_ms:30000,model_id:'music_v1',force_instrumental:true}},
 {id:'bow-water-10s-v1',title:'船艏破水 · AI 环境音',kind:'water',path:'/v1/sound-generation',file:'bow-water-10s.mp3',body:{text:'Close perspective of the bow of a historical wooden sailing ship steadily cutting through calm seawater. Continuous gentle rushing water with small waves softly lapping the wooden hull, natural detailed sea texture, stable loudness. Only water: no music, no voices, no engine, no birds, no storm, no impacts. Seamless looping sailing ambience.',duration_seconds:10,model_id:'eleven_text_to_sound_v2',loop:true,prompt_influence:.3}}
];
for(const job of jobs){
 if(ledger.attempts.some(a=>a.id===job.id)){console.log(job.id+': skipped (already attempted; no retries)');continue;}
 const attempt={id:job.id,title:job.title,kind:job.kind,model:job.body.model_id,prompt:job.body.prompt||job.body.text,request:job.body,date:new Date().toISOString(),status:'started'};
 ledger.attempts.push(attempt);await writeFile(ledgerPath,JSON.stringify(ledger,null,2));
 console.log(job.id+': sending one request');
 try{
 const response=await fetch('https://api.elevenlabs.io'+job.path+'?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(job.body),signal:AbortSignal.timeout(240000),redirect:'error'});
 attempt.httpStatus=response.status;attempt.requestId=response.headers.get('request-id');
 if(!response.ok){const raw=await response.text();attempt.status='failed';try{const parsed=JSON.parse(raw);attempt.error=parsed.detail||parsed;}catch{attempt.error=raw.slice(0,800);}console.log(job.id+': failed HTTP '+response.status+' '+JSON.stringify(attempt.error).replaceAll(key,'[redacted]'));}
 else{const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<1000)throw new Error('Audio response too small');await writeFile(resolve(output,job.file),bytes);attempt.status='complete';attempt.file=job.file;attempt.bytes=bytes.length;console.log(job.id+': saved '+bytes.length+' bytes');}
 }catch(e){attempt.status='uncertain';attempt.error=String(e.message).replaceAll(key,'[redacted]');console.log(job.id+': stopped without retry: '+attempt.error);}
 await writeFile(ledgerPath,JSON.stringify(ledger,null,2).replaceAll(key,'[redacted]'));
}
