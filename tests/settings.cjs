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
 assert.equal(JSON.parse(a.storage['lints-tuner-v1']).texture,42);
 a.elements.get('volume').oninput({target:{value:'7'}});
 assert.equal(JSON.parse(a.storage['lints-tuner-v1']).volume,7);
 const restored=app(a.storage);assert.equal(restored.elements.get('volume-number').value,7);assert.equal(restored.run('playing'),false);
 const config=a.run('JSON.stringify(configuration())');
 assert.equal(a.run(`parseConfiguration(${JSON.stringify(config)}).pitch`),6500);
 for(const bad of ['null','{}','{','{"app":"Other","version":1,"settings":{}}',config.replace('6500','99999'),config.replace('6500','"6500"'),config.replace('"version":1','"version":2')])assert.throws(()=>a.run(`parseConfiguration(${JSON.stringify(bad)})`));
 const imported=JSON.parse(config);imported.settings.pitch=8100;
 const event={target:{files:[{size:100,text:async()=>JSON.stringify(imported)}],value:'config.txt'}};
 await a.elements.get('config-file').onchange(event);
 assert.equal(a.run('state.pitch'),8100);assert.equal(event.target.value,'');
 const before=a.run('JSON.stringify(state)');event.target.files=[{size:100,text:async()=>'invalid'}];
 await a.elements.get('config-file').onchange(event);assert.equal(a.run('JSON.stringify(state)'),before);
 assert.match(a.elements.get('config-status').textContent,/Import failed/);
 assert.match(app({},true).elements.get('config-status').textContent,/storage is unavailable/);
 a.run("playing=true;ctx={state:'running'}");a.box.document.hidden=true;a.events.visibilitychange();assert.equal(a.run('playing'),true);
 a.actions.pause();assert.equal(a.run('playing'),false);assert.equal(a.box.navigator.mediaSession.playbackState,'paused');
 console.log('Settings migration, persistence, configuration round-trip, invalid import, storage failure, hidden-tab state and media pause checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
