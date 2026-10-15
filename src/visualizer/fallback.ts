// Bounded Canvas renderer: glow is pre-rendered rather than blurred per particle.
export function createFallback(canvas:HTMLCanvasElement){
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
 const glow=document.createElement('canvas');glow.width=glow.height=24;
 const g=glow.getContext('2d')!,gradient=g.createRadialGradient(12,12,0,12,12,12);
 gradient.addColorStop(0,'rgba(255,239,200,1)');gradient.addColorStop(.2,'rgba(245,216,162,.8)');gradient.addColorStop(1,'rgba(245,216,162,0)');g.fillStyle=gradient;g.fillRect(0,0,24,24);
 let events:{x:number;power:number;born:number;seed:number;retire?:number}[]=[];
 return {device:'Canvas 2D',
  emit(x:number,power:number,burst:boolean,t:number,density:number){for(let i=0;i<Math.max(1,Math.round((burst?4:2)*density));i++)events.push({x:x+(Math.random()-.5)*20,power,born:t,seed:Math.random()*20});if(events.length>160){let retiring=events.reduce((count,e)=>count+(e.retire===undefined?1:0),0)-160;for(const e of events){if(retiring<=0)break;if(e.retire===undefined){e.retire=t;retiring--;}}}},
  draw(t:number,w:number,h:number){const ratio=canvas.width/w;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);events=events.filter(e=>t-e.born<3.6&&(e.retire===undefined||t-e.retire<.45));ctx.globalCompositeOperation='lighter';
   for(const e of events){const age=t-e.born,fade=Math.sin(Math.min(1,age/.15)*Math.PI/2)*Math.max(0,1-age/3.6)*(e.retire===undefined?1:Math.max(0,1-(t-e.retire)/.45));if(age<0)continue;
    ctx.beginPath();for(let i=0;i<16;i++){const a=Math.max(0,age-i*.05),x=e.x+Math.sin(a*1.7+e.seed)*a*26,y=h*.78-(95+e.power*90)*(1-Math.exp(-a*1.15));if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
    ctx.lineWidth=4;ctx.strokeStyle=`rgba(224,187,122,${fade*.1})`;ctx.stroke();ctx.lineWidth=1.2;ctx.strokeStyle=`rgba(244,218,167,${fade*.6})`;ctx.stroke();
    ctx.globalAlpha=fade*.8;for(let i=0;i<4;i++){const x=e.x+age*(Math.sin(e.born*.31)*.65+Math.sin(e.born*.13+2)*.35)*28+Math.sin(e.seed+i+age*.8)*age*22,y=h*.78-age*(18+e.power*30)+Math.sin(e.seed+i+age)*age*5;ctx.drawImage(glow,x-4,y-4,8,8);}ctx.globalAlpha=1;
   }ctx.globalCompositeOperation='source-over';
  },clear(){events=[];},dispose(){events=[];}
 };
}
