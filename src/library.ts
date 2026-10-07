import generated from './generated-sounds.json';
export type Sound = { id:string; title:string; kind:'bgm'|'water'|'wind'|'hull'; source:string; prompt:string; status:string; note:string; date:string; license:string; themes?:string[]; styles?:string[]; moods?:string[]; blob?:Blob; url?:string };
export const kinds = {bgm:'BGM',water:'破水与海浪',wind:'海风与帆布',hull:'船体细节'};
export const prompts = {
 bgm:'为古典手绘航海地图创作纯器乐背景音乐。历史商船缓慢穿越海洋，氛围平静、开阔、温暖，带轻微探索感。以柔和弦乐、木管和轻拨弦为主，节奏舒缓，旋律克制，动态稳定。无人声，不包含海浪或船只音效，避免突然高潮。目标时长约两分钟，适合循环播放。',
 water:'历史木制帆船正常航行时，船艏切开海水的连续水流声，小浪轻拍船舷。平静海面，稳定近景，无音乐、无人声、无发动机、无海鸟。30–60 秒，适合无缝循环，避免突然的大浪和响亮冲击。',
 wind:'历史帆船甲板上的柔和海风，风穿过索具，帆布偶尔轻轻扑动。平稳自然，无音乐、无人声、无发动机、无雷雨。30–60 秒，适合无缝循环。',
 hull:'历史木制帆船缓慢航行中的木板轻微吱呀与绳索受力声，稀疏克制，近距离细节。无音乐、无人声、无发动机、无破裂声。短音效，干净背景。'
};
const samples:Sound[] = [
 ['voyage','向远方 · 合成小样','bgm','voyage.wav'],['water','船艏破水 · 合成小样','water','bow-water.wav'],['wind','海风与帆布 · 合成小样','wind','wind-sails.wav'],['hull','木船轻响 · 合成小样','hull','hull.wav']
].map(([id,title,kind,file])=>({id,title,kind:kind as Sound['kind'],url:'/audio/'+file,source:'程序合成 · 非 AI 生成',prompt:prompts[kind as keyof typeof prompts],status:'待试听',note:'',date:'2026-10-07',license:'项目内程序生成样音'}));
export const initial:Sound[] = [...samples, ...generated as Sound[]].map(s=>s.kind==='bgm'?{...s,themes:['voyage'],styles:['管弦'],moods:['平静','探索']}:{...s,themes:['voyage'],styles:[s.kind==='hull'?'短音效':'环境音'],moods:['自然']});
function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open('yuyin-voyage',1);r.onupgradeneeded=()=>r.result.createObjectStore('sounds',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function readSounds():Promise<Sound[]>{const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('sounds');const r=tx.objectStore('sounds').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();});}
export async function saveSound(sound:Sound){const db=await database();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('sounds','readwrite');tx.objectStore('sounds').put({...sound,url:sound.blob?undefined:sound.url});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();}
