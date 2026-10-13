import {loadEnvFile} from 'node:process';
import {writeFile} from 'node:fs/promises';
loadEnvFile('.env.local');
const key=process.env.GEMINI_API_KEY;
if(!key)throw new Error('GEMINI_API_KEY is not configured');
const start=Date.now();
try{
 const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts:[{text:'Reply with only OK.'}]}],generationConfig:{maxOutputTokens:256}}),signal:AbortSignal.timeout(30000)});
 const data=await response.json();
 const result={httpStatus:response.status,elapsedMs:Date.now()-start,response:data};
 await writeFile('analysis/gemini-38-connection-test.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
}catch(e){const result={elapsedMs:Date.now()-start,error:e.message,cause:e.cause?{code:e.cause.code,message:e.cause.message}:undefined};await writeFile('analysis/gemini-38-connection-test.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exitCode=1;}
