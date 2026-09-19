const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function app(saved={},blocked=false){
 const elements=new Map(),events={},actions={},storage={...saved};
 const canvas=new Proxy({}, {get:()=>()=>{}});
 const document={hidden:false,activeElement:null,getElementById(id){if(!elements.has(id))elements.set(id,{value:'',textContent:'',clientWidth:600,setAttribute(){},getContext:()=>canvas});return elements.get(id);},querySelectorAll:()=>[],addEventListener:(name,fn)=>events[name]=fn};
 const box={document,window:{addEventListener:(name,fn)=>events[name]=fn},navigator:{mediaSession:{setActionHandler:(name,fn)=>actions[name]=fn}},localStorage:{getItem:key=>{if(blocked)throw Error('blocked');return storage[key]||null;},setItem:(key,value)=>{if(blocked)throw Error('blocked');storage[key]=value;}},requestAnimationFrame(){},setTimeout,clearTimeout,console};
 vm.createContext(box);vm.runInContext(source,box);return {box,elements,events,actions,storage,run:code=>vm.runInContext(code,box)};
}
(async()=>{
 const old={pitch:6500,width:.75,weight:32,texture:42,volume:9,randomnessVersion:1};
 const a=app({'tinnitus-matcher-standalone-v1':JSON.stringify(old)});
 assert.equal(a.elements.get('pitch-number').value,6500);
 assert.equal(JSON.parse(a.storage['lints-tuner-v1']).tones[0].texture,42);
 a.elements.get('volume').oninput({target:{value:'7'}});
 assert.equal(JSON.parse(a.storage['lints-tuner-v1']).tones[0].volume,7);
 const restored=app(a.storage);assert.equal(restored.elements.get('volume-number').value,7);assert.equal(restored.run('playing'),false);
 const config=a.run('JSON.stringify(configuration())');
 assert.equal(a.run(`parseConfiguration(${JSON.stringify(config)}).tones[0].pitch`),6500);
 for(const bad of ['null','{}','{','{"app":"Other","version":1,"settings":{}}',config.replace('6500','99999'),config.replace('6500','"6500"'),config.replace('"version":2','"version":3')])assert.throws(()=>a.run(`parseConfiguration(${JSON.stringify(bad)})`));
 const imported=JSON.parse(config);imported.tones[0].pitch=8100;
 const event={target:{files:[{size:100,text:async()=>JSON.stringify(imported)}],value:'config.txt'}};
 await a.elements.get('config-file').onchange(event);
 assert.equal(a.run('state.pitch'),8100);assert.equal(event.target.value,'');
 // Each tone keeps its own controls and enabled state through save/import.
 a.elements.get('add-tone').onclick();
 assert.equal(a.run('tones.length'),2);
 a.elements.get('pitch-number').oninput({target:{value:'2300',validity:{valid:true}}});
 a.elements.get('volume').oninput({target:{value:'11'}});
 a.elements.get('enable-tone-0').onchange({target:{checked:false}});
 a.elements.get('select-tone-0').onclick();
 assert.equal(a.run('state.pitch'),8100);
 a.elements.get('select-tone-1').onclick();assert.equal(a.run('state.pitch'),2300);
 const multi=app(a.storage);assert.equal(multi.run('tones.length'),2);assert.equal(multi.run('state.volume'),11);assert.equal(multi.run('tones[0].enabled'),false);
 a.elements.get('tone-name').oninput({target:{value:'Left <high> & soft'}});
 assert.equal(a.elements.get('select-tone-1').textContent,'Left <high> & soft (2300 Hz)');
 assert.equal(app(a.storage).run('state.name'),'Left <high> & soft');
 const roundTrip=a.run('JSON.stringify(parseConfiguration(JSON.stringify(configuration())))');
 assert.equal(JSON.parse(roundTrip).tones[1].pitch,2300);
 assert.equal(JSON.parse(roundTrip).tones[1].name,'Left <high> & soft');
 a.elements.get('tone-name').oninput({target:{value:'   '}});assert.equal(a.run('state.name'),'Tone 2');
 const legacy={app:'LINTS Tuner',version:1,settings:old};
 assert.equal(a.run(`parseConfiguration(${JSON.stringify(JSON.stringify(legacy))}).tones[0].pitch`),6500);
 for(const patch of [{tones:[]},{tones:[{...old,enabled:true,name:42}]},{tones:[{...old,enabled:true,name:'x'.repeat(81)}]},{selected:5},{tones:[{...old,enabled:'yes'}]}]){
 const invalid={...JSON.parse(a.run('JSON.stringify(configuration())')),...patch};
 assert.throws(()=>a.run(`parseConfiguration(${JSON.stringify(JSON.stringify(invalid))})`));
 }
 a.elements.get('remove-tone-0').onclick();assert.equal(a.run('tones.length'),1);assert.equal(a.run('state.pitch'),2300);
 a.elements.get('remove-tone-0').onclick();assert.equal(a.run('tones.length'),1);
 const before=a.run('JSON.stringify(state)');event.target.files=[{size:100,text:async()=>'invalid'}];
 await a.elements.get('config-file').onchange(event);assert.equal(a.run('JSON.stringify(state)'),before);
 assert.match(a.elements.get('config-status').textContent,/Import failed/);
 assert.match(app({},true).elements.get('config-status').textContent,/storage is unavailable/);
 a.run("playing=true;ctx={state:'running'}");a.box.document.hidden=true;a.events.visibilitychange();assert.equal(a.run('playing'),true);
 a.actions.pause();assert.equal(a.run('playing'),false);assert.equal(a.box.navigator.mediaSession.playbackState,'paused');
 // Simultaneous voices, independent tuning, mute and cleanup use production audio wiring.
 a.run(`
 let sources=[];
 ctx={currentTime:0,sampleRate:48000,state:'running',createOscillator(){const node={frequency:{},connect(){return this;},start(){},stop(){this.stopped=true;},disconnect(){}};sources.push(node);return node;},createGain(){return {gain:{value:0,linearRampToValueAtTime(){},cancelAndHoldAtTime(){}},connect(){return this;},disconnect(){}};}};
 master={gain:{setTargetAtTime(value){this.value=value;}}};
 tones=[{...defaults,pitch:2000,width:0,enabled:true},{...defaults,pitch:6000,width:0,enabled:true}];state=tones[0];selected=0;playing=true;refreshVoices();
 `);
 assert.equal(a.run('voices.size'),2);assert.equal(a.run('master.gain.value'),.5);
 assert.equal(a.run('sources[0].frequency.value'),2000);assert.equal(a.run('sources[1].frequency.value'),6000);
 a.run("tones[0].name='Renamed';refreshVoices()");assert.equal(a.run('sources.length'),2);
 a.run('tones[0].pitch=2500;refreshVoices()');assert.equal(a.run('sources.length'),3);assert.equal(a.run('sources[0].stopped'),true);assert.equal(a.run('sources[1].stopped'),undefined);
 a.run('tones[1].enabled=false;refreshVoices()');assert.equal(a.run('voices.size'),1);assert.equal(a.run('master.gain.value'),1);
 a.run('stop()');assert.equal(a.run('voices.size'),0);assert.equal(a.run('sources[2].stopped'),true);
 console.log('Multiple tones, independent voices, Settings migration, persistence, configuration round-trip, invalid import, storage failure, hidden-tab state and media pause checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
