import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloud} from '../dist/cloud.js';
const settings={url:'https://example.supabase.co',key:'sb_publishable_test',schema:'seabird'};
test('cloud writes are schema scoped and reject a stale revision',async()=>{
  const calls=[];
  const cloud=createCloud(settings,async(url,options)=>{
    calls.push({url,...options});
    return Response.json(url.includes('/auth/')?{user:{id:'a',email:'a@example.com'},access_token:'test',expires_at:Date.now()/1000+3600}:[]);
  });
  await cloud.signIn('a@example.com','password');
  await assert.rejects(cloud.save([{title:'Test'}],3),/changed/);
  assert.match(calls[1].url,/revision=eq.3$/);
  assert.equal(calls[1].headers['Content-Profile'],'seabird');
  assert.deepEqual(JSON.parse(calls[1].body),{projects:[{title:'Test'}]});
});
test('cloud deletion targets own app membership only',async()=>{
  const calls=[];
  const cloud=createCloud(settings,async(url,options)=>{
    calls.push({url,...options});
    return Response.json(url.includes('/auth/')?{user:{id:'own-id'},access_token:'test',expires_at:Date.now()/1000+3600}:[]);
  });
  await cloud.signIn('a@example.com','password');await cloud.remove();
  assert.match(calls[1].url,/rest\/v1\/profiles\?user_id=eq.own-id$/);
  assert.equal(calls[1].method,'DELETE');
});
