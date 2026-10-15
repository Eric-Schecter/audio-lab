// @ts-nocheck
// Adapted from the sibling music-visualizer project.
// All particle positions and ribbon trajectories are evaluated in vertex shaders.
export function createRenderer(canvas){
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,powerPreference:'high-performance'});
 if(!gl)throw new Error('此浏览器无法启用 WebGL，请开启硬件加速或换用 Chrome / Safari。');
 function program(v,f){function shader(type,s){const x=gl.createShader(type);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(x));return x}const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
 const common=`precision highp float;attribute vec4 event;attribute vec2 shape;uniform vec2 resolution;uniform float time,curl,pixelRatio;varying float alpha;varying float edge;`;
 const ribbon=program(common+`
 float hash(float n){return fract(sin(n*127.1)*43758.5453);}
 float noise(float x){float i=floor(x),f=fract(x);f=f*f*f*(f*(f*6.-15.)+10.);return mix(hash(i),hash(i+1.),f)*2.-1.;}
 // Smooth multiscale drift: no hard left/right switch or repeating sine-wave arc.
 vec2 flow(float t,float seed,float strength){
 float lean=noise(seed*3.7)*.9;
 float large=noise(t*.85+seed*5.)-noise(seed*5.);
 float fine=noise(t*2.1+seed*5.+31.)-noise(seed*5.+31.);
 float damping=1.-exp(-t*1.15);
 float x=(lean*t*48.+large*65.+fine*12.)*curl;
 float y=-(100.+strength*85.)*damping+large*t*14.*curl;
 return vec2(x,y);
 }
 void main(){
 float age=time-event.y;float life=2.1+hash(event.z*17.)*1.25;float u=shape.x;
 if(age<0.||age>life){gl_Position=vec4(2.,2.,0.,1.);alpha=0.;edge=shape.y;return;}
 float trail=1.05+hash(event.z*23.)*.9;float t=max(0.,age-u*trail);float seed=event.z;
 vec2 center=flow(t,seed,event.w);
 vec2 tangent=flow(t+.012,seed,event.w)-center;
 vec2 normal=normalize(vec2(-tangent.y,tangent.x)+vec2(.0001));
 float taper=pow(max(.001,sin(u*3.14159)),.55);
 float width=(2.8+event.w*1.2)*mix(.3,1.,1.-smoothstep(life*.45,life,age))*taper*(.75+.25*noise(t*2.+seed*5.));
 vec2 pos=vec2(event.x,resolution.y*.78)+center+normal*shape.y*width;
 gl_Position=vec4(pos.x/resolution.x*2.-1.,1.-pos.y/resolution.y*2.,0.,1.);
 float attack=smoothstep(0.,.08,age);float fade=1.-smoothstep(life*.25,life,age);
 alpha=attack*fade*pow(max(0.,sin(u*3.14159)),.45)*smoothstep(0.,.08,age-u*trail);edge=shape.y;
 }`,
 `precision mediump float;uniform vec3 color;varying float alpha;varying float edge;
 void main(){float core=exp(-edge*edge*18.);float halo=exp(-edge*edge*2.8);gl_FragColor=vec4(mix(color,vec3(.86,.97,1.),core*.88),alpha*(core*.9+halo*.22));}`);
 const points=program(common+`
 void main(){float age=time-event.y;float life=1.6+shape.x;
 if(age<0.||age>life){gl_Position=vec4(2.,2.,0.,1.);gl_PointSize=1.;alpha=0.;return;}
 float a=event.z;float speed=event.w;
 float wind=sin(event.y*.31)*.65+sin(event.y*.13+2.)*.35;
 float spread=age*wind*(22.+speed*18.)+sin(a+age*.9)*age*14.;
 float swirl=(sin(a*3.7+age*.7)-sin(a*3.7))*age*18.*curl;
 float x=event.x+spread+swirl;
 float y=resolution.y*.78-age*(18.+speed*38.)+sin(a+age*1.2)*age*6.;
 gl_Position=vec4(x/resolution.x*2.-1.,1.-y/resolution.y*2.,0.,1.);
 gl_PointSize=(1.+shape.y*2.5)*pixelRatio*mix(.3,1.,1.-smoothstep(life*.3,life,age));
 alpha=smoothstep(0.,.04,age)*(1.-smoothstep(life*.15,life,age))*(.35+shape.y*.6);edge=0.;}`,
 `precision mediump float;uniform vec3 color;varying float alpha;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(mix(color,vec3(.9,.98,1.),.3),alpha*exp(-r*r*6.));}`);
 const N=180,S=20,P=1800,rv=new Float32Array(N*S*6*6),pv=new Float32Array(P*6);let ri=0,pi=0,dirty=true;const ribbonUntil=new Float64Array(N),pointUntil=new Float64Array(P);
 function reserve(until,t,start){for(let j=0;j<until.length;j++){const slot=(start+j)%until.length;if(until[slot]<=t)return slot;}return -1;}
 for(let i=0;i<N;i++)for(let j=0;j<S;j++)for(let k=0;k<6;k++){const q=(i*S*6+j*6+k)*6;rv[q+1]=-100;rv[q+4]=(j+([0,1,0,0,1,1][k]))/S;rv[q+5]=[-1,-1,1,1,-1,1][k];}
 for(let i=0;i<P;i++)pv[i*6+1]=-100;
 const rb=gl.createBuffer(),pb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,rb);gl.bufferData(gl.ARRAY_BUFFER,rv,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,pv,gl.DYNAMIC_DRAW);
 function emit(x,power,burst,t,density){
 // Shared seed and launch position form a coherent plume with fine neighboring filaments.
 const seed=Math.random()*6.283,amount=Math.max(1,Math.round((burst?3:2)*density));
 for(let i=0;i<amount;i++){
 const slot=reserve(ribbonUntil,t,ri);if(slot<0)break;ri=slot+1;ribbonUntil[slot]=t+3.6;const variation=(Math.random()-.5),xx=x+variation*(burst?38:12);
 const born=t+Math.random()*.12,strength=power*(.4+Math.random()*.95);for(let j=0;j<S*6;j++){const q=(slot*S*6+j)*6;rv[q]=xx;rv[q+1]=born;rv[q+2]=seed+variation*.65;rv[q+3]=strength;}
 }
 for(let i=0;i<Math.max(8,Math.round((burst?32:12)*density));i++){const slot=reserve(pointUntil,t,pi);if(slot<0)break;pi=slot+1;pointUntil[slot]=t+2.5;const q=slot*6;pv[q]=x+(Math.random()-.5)*(burst?65:20);pv[q+1]=t;pv[q+2]=Math.random()*6.283;pv[q+3]=(.2+Math.random()*.8)*power;pv[q+4]=Math.random()*.8;pv[q+5]=Math.random();}dirty=true;
 }
 const locations=new Map([ribbon,points].map(p=>[p,{event:gl.getAttribLocation(p,'event'),shape:gl.getAttribLocation(p,'shape'),resolution:gl.getUniformLocation(p,'resolution'),time:gl.getUniformLocation(p,'time'),curl:gl.getUniformLocation(p,'curl'),color:gl.getUniformLocation(p,'color'),pixelRatio:gl.getUniformLocation(p,'pixelRatio')}]));
 function draw(t,w,h,hue,curl){gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);const h6=hue/60,c=.7,x=c*(1-Math.abs(h6%2-1)),m=.3;const colors=h6<1?[c,x,0]:h6<2?[x,c,0]:h6<3?[0,c,x]:h6<4?[0,x,c]:h6<5?[x,0,c]:[c,0,x];
 for(const [p,b,data,mode,count]of [[ribbon,rb,rv,gl.TRIANGLES,N*S*6],[points,pb,pv,gl.POINTS,P]]){gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,b);if(dirty)gl.bufferSubData(gl.ARRAY_BUFFER,0,data);for(const [name,size,offset]of [['event',4,0],['shape',2,16]]){const a=locations.get(p)[name];if(a>=0){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,24,offset);}}gl.uniform2f(locations.get(p).resolution,w,h);gl.uniform1f(locations.get(p).time,t);gl.uniform1f(locations.get(p).curl,curl);gl.uniform1f(locations.get(p).pixelRatio,canvas.width/w);gl.uniform3f(locations.get(p).color,...colors.map(v=>v+m));gl.drawArrays(mode,0,count);}dirty=false;}
 const lost=e=>{e.preventDefault();};canvas.addEventListener('webglcontextlost',lost);
 const debug=gl.getExtension('WEBGL_debug_renderer_info');const device=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);function clear(){ribbonUntil.fill(0);pointUntil.fill(0);for(let i=0;i<N*S*6;i++)rv[i*6+1]=-100;for(let i=0;i<P;i++)pv[i*6+1]=-100;dirty=true;}return {emit,draw,device,clear,dispose(){canvas.removeEventListener('webglcontextlost',lost);gl.deleteBuffer(rb);gl.deleteBuffer(pb);gl.deleteProgram(ribbon);gl.deleteProgram(points);gl.getExtension('WEBGL_lose_context')?.loseContext();}};
}
