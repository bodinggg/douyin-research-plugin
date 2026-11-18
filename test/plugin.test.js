import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, Config } from '../index.js';
import { validateSource } from '../lib/policy.js';
import { redact } from '../lib/privacy.js';
import { createAdapter } from '../lib/adapter.js';
import { createDyService } from '../lib/service.js';

test('Standard Schema validates config and rejects unsafe or unknown settings', () => {
  assert.equal(Config['~standard'].validate({ readOnly:true }).value.readOnly,true);
  assert.equal(Config['~standard'].vendor,'schemastery');
  assert.equal(Config.toJSON().refs[Config.toJSON().uid].type,'object');
  for(const value of [{readOnly:false},{channel:{timeoutMs:-1}},{unknown:true}]) assert.ok(Config['~standard'].validate(value).issues.length);
});
test('tool registration survives effect setup, renders content blocks, and unloads', async () => {
  const tools=new Map(); let cleanup;
  apply({get:()=>({register:d=>{tools.set(d.name,d);return ()=>tools.delete(d.name);}}),effect:setup=>{cleanup=setup();}},{});
  assert.equal(tools.size,10);
  const def=tools.get('dy_login_status');
  assert.deepEqual(def.output.render({}, {state:'unknown'}),[{type:'text',text:'{\n  "state": "unknown"\n}'}]);
  cleanup();assert.equal(tools.size,0);
});
test('URL boundary rejects protocols, credentials, untrusted hosts and non-video paths', () => {
  for(const url of ['ftp://www.douyin.com/video/1','https://u:p@www.douyin.com/video/1','https://evil.douyin.com/video/1','https://www.douyin.com/user/self']) assert.throws(()=>validateSource({url},{}));
  assert.equal(validateSource({url:'https://www.douyin.com/video/123?tracking=1'},{}).canonical,'https://www.douyin.com/video/123');
});
test('redaction omits frames comments and identity keys recursively',()=>{
  assert.deepEqual(redact({frames:['x'],comments:['x'],username:'name',nested:{token:'secret',count:2}},{redactUserNames:true}),{nested:{count:2}});
});
test('browser adapter preserves handoff and rejects unissued work references',async()=>{
  const calls=[];
  const adapter=createAdapter({}, {runBrowser:async(op,input)=>{calls.push({op,input});return {status:'awaiting_user',spaceId:12,state:'user_control'};}});
  assert.equal((await adapter.beginLogin({surface:'public_site'})).spaceId,12);
  assert.equal((await adapter.loginStatus()).state,'user_control');
  await assert.rejects(()=>adapter.readComments({workRef:'bad',limit:2}),{code:'INVALID_WORK_REF'});
  assert.equal(calls[1].input.spaceId,12);
});
test('failed browser task is retained for recovery instead of creating another task', async () => {
  const inputs=[];
  const adapter=createAdapter({}, {runBrowser:async(_op,input)=>{
    inputs.push(input);
    if(inputs.length===1) throw Object.assign(new Error('Page timed out'),{code:'BROWSER_TIMEOUT',spaceId:42});
    return {spaceId:42,observed:{loggedIn:true,accountName:'test-account'}};
  }});
  await assert.rejects(()=>adapter.loginStatus(),{code:'BROWSER_TIMEOUT'});
  const status=await adapter.loginStatus();
  assert.equal(status.state,'ready');
  assert.deepEqual(JSON.parse(JSON.stringify(status)),status);
  assert.equal(inputs[1].spaceId,42);
  adapter.dispose();
});
test('unload prevents queued browser operations from starting',async()=>{
  let finish;let calls=0;
  const adapter=createAdapter({}, {runBrowser:async()=>{calls++;return new Promise(resolve=>{finish=resolve;});}});
  const first=adapter.loginStatus();const queued=adapter.loginStatus();
  const checks=[assert.rejects(first,{code:'PLUGIN_STOPPED'}),assert.rejects(queued,{code:'PLUGIN_STOPPED'})];
  await new Promise(resolve=>setImmediate(resolve));adapter.dispose();finish({spaceId:1,observed:{loggedIn:true}});
  await Promise.all(checks);assert.equal(calls,1);
});
test('persisted reports exclude source text and frames',async()=>{
  let saved;
  const service=createDyService({}, {adapter:{readVideo:async()=>({status:'partial',observed:{title:'private title',captions:['raw caption'],frames:['raw frame'],durationSeconds:15,videoPresent:true},findings:[],gaps:['metadata only']})},storage:{save:async value=>{saved=value;return {persisted:true};}}});
  const result=await service.interpret({source:{url:'https://www.douyin.com/video/123'}});
  assert.equal(result.status,'partial');assert.deepEqual(saved.observed,{durationSeconds:15,videoPresent:true});
  assert.ok(!JSON.stringify(saved).includes('private title'));
});
test('an unfinished works page is not reported as an empty successful list',async()=>{
  const adapter=createAdapter({}, {runBrowser:async()=>({spaceId:7,observed:{loggedIn:true,items:[],endObserved:false}})});
  await assert.rejects(()=>adapter.readWorks({limit:2}),{code:'PAGE_NOT_READY'});
  adapter.dispose();
});
test('default redaction masks mentions and invalid counts stop before browser access',async()=>{
  assert.equal(redact('@张三 日常'),'@[redacted] 日常');
  const service=createDyService({}, {adapter:{readWorks:()=>{throw new Error('should not be called');}}});
  assert.equal((await service.works({limit:-1})).error.code,'INVALID_LIMIT');
});
