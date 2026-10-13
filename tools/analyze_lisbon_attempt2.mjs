import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {loadEnvFile} from 'node:process';
loadEnvFile('.env.local');
const key=process.env.GEMINI_API_KEY;
if(!key)throw new Error('GEMINI_API_KEY is not configured');
const log='analysis/lisbon-gemini-attempt-2.json';
if(existsSync(log))throw new Error('An attempt is already recorded. No automatic retry.');
const file='/Users/eric/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_dq9sd21xw2kd22_6f31/msg/file/2026-10/岩崎琢 - Lisbon.mp3';
const audio=await readFile(file);
const prompt=`Analyze ONLY the attached music audio, not its filename or a remembered soundtrack. Respond in Chinese. Identify overall character, leading and accompanying instruments with confidence and alternative identifications when uncertain, perceived pulse/tempo/meter (estimates, never claim measured BPM), arrangement changes with approximate timestamps for this 93-second clip, and dynamics. Distinguish audible evidence from interpretation. Do not transcribe or recreate the melody or lyrics. Then provide an English Suno style prompt under 900 characters for an ORIGINAL instrumental historical Lisbon port-city BGM inspired only by broad instrumentation, rhythm and mood of this audio, not its melody. No vocals, no sound effects, no modern epic climax. Explain what differs from a gentle open-sea sailing BGM. Avoid generic invented nautical associations if they are not audible.`;
await mkdir('analysis',{recursive:true});
await writeFile(log,JSON.stringify({model:'gemini-2.5-flash',started:new Date().toISOString(),status:'started',requests:1},null,2));
try{
 const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{role:'user',parts:[{inlineData:{mimeType:'audio/mpeg',data:audio.toString('base64')}},{text:prompt}]}],generationConfig:{maxOutputTokens:5000,temperature:.2,thinkingConfig:{thinkingBudget:1024}}}),signal:AbortSignal.timeout(90000)});
 const data=await response.json();
 await writeFile('analysis/lisbon-gemini-response-2.json',JSON.stringify(data,null,2));
 await writeFile(log,JSON.stringify({model:'gemini-2.5-flash',status:response.ok?'completed':'failed',httpStatus:response.status,requests:1},null,2));
 if(!response.ok){console.log('HTTP '+response.status+' '+JSON.stringify(data.error));process.exitCode=1;}
 else{const text=data.candidates?.[0]?.content?.parts?.filter(p=>p.text&&!p.thought).map(p=>p.text).join('\n')||'';await writeFile('analysis/lisbon-gemini-2.md',text);console.log(text);}
}catch(e){await writeFile(log,JSON.stringify({status:'failed',requests:1,error:e.message},null,2));console.log('Request failed: '+e.message);process.exitCode=1;}
