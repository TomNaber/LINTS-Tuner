// Run with node tests/audio-steady.cjs. Uses the production synthesis functions.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
new Function(source);
const box={ctx:{sampleRate:48000},state:{mode:'match',pitch:4000,width:1/3,weight:0,center:4000,notch:.75}};
vm.createContext(box);
let code='let steadyCache; const EDGE_ORDER=16;\n';
for(const name of ['notchEdges','amplitude','inverseFFT','steadySamples']){const start=source.indexOf('function '+name+'(');const end=source.indexOf('\nfunction ',start+1);code+=source.slice(start,name==='steadySamples'?source.indexOf('// Fresh Gaussian',start):end)+'\n';}
vm.runInContext(code,box);
function spectrum(data,offset){const n=8192,re=new Float64Array(n),im=new Float64Array(n);for(let i=0;i<n;i++){const w=.42-.5*Math.cos(2*Math.PI*i/n)+.08*Math.cos(4*Math.PI*i/n);re[i]=data[(i+offset)%data.length]*w;}box.inverseFFT(re,im);return Float64Array.from(re,(r,i)=>Math.hypot(r,im[i]/n));}
for(const rate of [44100,48000])for(const mode of ['match','zwicker']){
 box.ctx.sampleRate=rate;box.state.mode=mode;const data=box.steadySamples();assert(data.every(Number.isFinite));assert(data.some(v=>Math.abs(v)>.01));
 const first=spectrum(data,0);let drift=0;
 for(const offset of [127,1023,2741,7000]){const next=spectrum(data,offset);for(let k=1;k<4096;k++)if(first[k]>.001)drift=Math.max(drift,Math.abs(20*Math.log10(next[k]/first[k])));}
 assert(drift<.001,`FFT drift ${drift} dB`);
 let peak=0;for(const v of data)peak=Math.max(peak,Math.abs(v));assert(peak<=.851);
 console.log(`${rate} Hz ${mode}: FFT drift < ${Math.max(drift,.000001).toFixed(6)} dB; peak ${peak.toFixed(3)}`);
}
box.state.mode='match';box.state.pitch=100;box.state.width=.01;assert(box.steadySamples().some(v=>Math.abs(v)>.01),'Narrow passband must not become silent');
// The fully steady endpoint must use a native looping buffer, even without worklets.
box.ctx.createBufferSource=()=>({});box.ctx.createBuffer=(_,n)=>{const data=new Float32Array(n);return {getChannelData:()=>data};};
vm.runInContext(source.slice(source.indexOf('function createNoiseSource'),source.indexOf('function retire')),box);
const steady=box.steadySamples(),node=box.createNoiseSource({steady,mix:0});assert.equal(node.loop,true);assert(node.buffer.getChannelData(0).every((v,i)=>v===steady[i]));
console.log('Steady synthesis, narrow-band output, and native loop checks passed.');
