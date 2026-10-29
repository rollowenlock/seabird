import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloud,fingerprint} from '../dist/cloud.js';
test('cloud dirty state ignores JSON key ordering but preserves ordered deliverables',()=>{
  assert.equal(fingerprint({a:1,b:[{z:2,x:3}]}),fingerprint({b:[{x:3,z:2}],a:1}));
  assert.notEqual(fingerprint([1,2]),fingerprint([2,1]));
});
const settings={url:'https://example.supabase.co',key:'sb_publishable_test',schema:'seabird'};
test('sessions survive reload, normalise expires_in and never store passwords',async()=>{
  const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  const user={id:'a',email:'a@example.test'};
  const request=async url=>Response.json(url.endsWith('/user')?user:{user,access_token:'access',refresh_token:'refresh',expires_in:3600});
  const first=createCloud(settings,request,storage);await first.signIn(user.email,'secret-password');
  assert.ok(![...values.values()].join('').includes('secret-password'));
  const next=createCloud(settings,request,storage);assert.equal((await next.restore()).id,'a');
  await next.signOut();assert.equal(values.size,0);assert.equal(next.user,null);
});
test('Google OAuth returns safely to Seabird and persists only the Supabase session',async()=>{
  const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  const calls=[],cloud=createCloud(settings,async(url,options)=>{calls.push({url,options});return Response.json({id:'google-user',email:'person@example.test'});},storage);
  const redirect='https://seabird-cookham-preview.vercel.app/';
  const authorize=new URL(cloud.googleAuthorizeUrl(redirect));
  assert.equal(authorize.origin,'https://example.supabase.co');
  assert.equal(authorize.pathname,'/auth/v1/authorize');
  assert.equal(authorize.searchParams.get('provider'),'google');
  assert.equal(authorize.searchParams.get('redirect_to'),redirect);
  assert.equal(await cloud.consumeOAuthFragment('#access_token=access&refresh_token=refresh&expires_in=3600&provider_token=do-not-store'),true);
  assert.equal(cloud.user.email,'person@example.test');
  assert.match(calls[0].url,/\/auth\/v1\/user$/);
  assert.equal(calls[0].options.headers.Authorization,'Bearer access');
  const saved=[...values.values()].join('');
  assert.match(saved,/refresh/);assert.ok(!saved.includes('do-not-store'));
  assert.equal(await cloud.consumeOAuthFragment('#project=client-share'),false);
});
test('parallel requests share a single refresh and public links never send a user token',async()=>{
  let refreshes=0;const calls=[];
  const cloud=createCloud(settings,async(url,options)=>{
    calls.push({url,options});
    if(url.includes('grant_type=password'))return Response.json({user:{id:'a'},access_token:'old',refresh_token:'r',expires_at:1});
    if(url.includes('refresh_token')){refreshes++;await new Promise(r=>setTimeout(r,10));return Response.json({user:{id:'a'},access_token:'new',refresh_token:'r2',expires_in:3600});}
    return Response.json([]);
  });
  await cloud.signIn('a','b');await Promise.all([cloud.listProjects(),cloud.listProjects()]);assert.equal(refreshes,1);
  await cloud.read('token');assert.equal(calls.at(-1).options.headers.Authorization,undefined);
});
test('project writes are schema scoped and reject a stale revision',async()=>{
  const calls=[];
  const cloud=createCloud(settings,async(url,options)=>{
    calls.push({url,...options});
    return Response.json(url.includes('/auth/')?{user:{id:'a',email:'a@example.com'},access_token:'test',expires_at:Date.now()/1000+3600}:[]);
  });
  await cloud.signIn('a@example.com','password');
  await assert.rejects(cloud.saveProject({id:'project-a',title:'Test'},3),/changed/);
  assert.match(calls[1].url,/projects\?id=eq.project-a&revision=eq.3$/);
  assert.equal(calls[1].headers['Content-Profile'],'seabird');
  assert.deepEqual(JSON.parse(calls[1].body),{project:{id:'project-a',title:'Test'}});
});
test('new project rows carry the signed-in owner and stable project ID',async()=>{
  const calls=[];
  const cloud=createCloud(settings,async(url,options)=>{
    calls.push({url,...options});
    if(url.includes('/auth/'))return Response.json({user:{id:'owner-a'},access_token:'test',expires_at:Date.now()/1000+3600});
    return Response.json([{id:'project-a',project:{id:'project-a'},revision:1}]);
  });
  await cloud.signIn('a@example.com','password');const row=await cloud.saveProject({id:'project-a'},null);
  assert.equal(row.revision,1);assert.match(calls[1].url,/rest\/v1\/projects$/);
  assert.deepEqual(JSON.parse(calls[1].body),{user_id:'owner-a',id:'project-a',project:{id:'project-a'}});
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
