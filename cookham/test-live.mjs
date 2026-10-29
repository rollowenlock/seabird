import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';

import {createCloud} from '../dist/cloud.js';
import {example} from '../dist/model.js';
const url='https://khkzewmiymzgicnjaimr.supabase.co',key=process.env.COOKHAM_PUBLIC_KEY,operator=process.env.COOKHAM_OPERATOR_KEY;
const headers={apikey:operator,Authorization:'Bearer '+operator,'Content-Type':'application/json'};
const users=[],clients=[];
try{
 for(let i=0;i<2;i++){
 const email='seabird-qa-'+randomBytes(10).toString('hex')+'@cookham.co.nz',password=randomBytes(30).toString('base64url');
 const r=await fetch(url+'/auth/v1/admin/users',{method:'POST',headers,body:JSON.stringify({email,password,email_confirm:true})});assert.equal(r.status,200);users.push((await r.json()).id);
 const client=createCloud({url,key,schema:'seabird'});await client.signIn(email,password);clients.push(client);await client.join();
 }
 const [a,b]=clients;
 const draft={...example(),title:'TEST ONLY — no real agreement',terms:'Disposable software test. No contract, service or payment.',fee:0};
 assert.deepEqual(await a.listProjects(),[]);assert.deepEqual(await b.listProjects(),[]);
 const saved=await a.saveProject(draft,null);assert.equal(saved.revision,1);
 assert.deepEqual(await b.listProjects(),[]);
 const second=await a.saveProject({...draft,title:'Updated fixture'},1);assert.equal(second.revision,2);
 await assert.rejects(a.saveProject({...draft,title:'Stale'},1),/changed/);
 const anon=await fetch(url+'/rest/v1/projects?select=*',{headers:{apikey:key,'Accept-Profile':'seabird'}});assert.equal(anon.ok,false);
 const publicClient=createCloud({url,key,schema:'seabird'});
 const link=await a.publish(draft.id,draft,0);assert.equal(link.version,1);
 const viewed=await publicClient.read(link.token);assert.equal(viewed.project.title,draft.title);assert.equal(viewed.project.rate,undefined);
 assert.equal(await b.proposal(draft.id),null);
 await assert.rejects(b.manage(draft.id,'revoke'));
 const acceptance=await publicClient.accept(link.token,1,'Test Client','fixture@example.test',true);assert.ok(acceptance.accepted_at);
 const version2=await a.publish(draft.id,{...draft,description:'Second test version'},1);assert.equal(version2.token,link.token);assert.equal(version2.version,2);
 await assert.rejects(publicClient.accept(link.token,1,'Test Client','fixture@example.test',true),/changed/);
 const history=await a.proposal(draft.id);assert.equal(history.proposal_versions.length,2);assert.equal(history.acceptances.length,1);
 await a.manage(draft.id,'revoke');assert.equal(await publicClient.read(link.token),null);
 await assert.rejects(publicClient.accept(link.token,2,'Test Client','fixture@example.test',true));
 await a.manage(draft.id,'replace');assert.equal(await publicClient.read(link.token),null);
 console.log('PASS: hosted publication, safe anonymous read, owner isolation, exact-version acceptance, history, stale-page rejection and revocation.');
 await a.remove();assert.deepEqual(await a.listProjects(),[]);
 assert.equal((await fetch(url+'/auth/v1/admin/users/'+users[0],{headers})).ok,true);
 const other={...example(),id:crypto.randomUUID(),title:'Other user intact'};
 assert.equal((await b.saveProject(other,null)).revision,1);
 console.log('PASS: real sign-in, membership, cloud save/load, two-user isolation, stale-write conflict, anonymous denial, app deletion and shared identity retention.');
}finally{
 for(const client of clients){await client.remove();await client.signOut().catch(()=>{});}
 for(const id of users){const r=await fetch(url+'/auth/v1/admin/users/'+id,{method:'DELETE',headers});assert.equal(r.ok,true);}
 console.log('Temporary identities and workspaces removed.');
}

