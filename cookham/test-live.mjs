import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';

import {createCloud} from '../dist/cloud.js';
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
 assert.equal(await a.load(),null);assert.equal(await b.load(),null);
 const saved=await a.save([{title:'Private fixture'}],null);assert.equal(saved.revision,1);
 assert.equal(await b.load(),null);await assert.rejects(b.save([{title:'Attack'}],1),/changed/);
 const second=await a.save([{title:'Updated fixture'}],1);assert.equal(second.revision,2);
 await assert.rejects(a.save([{title:'Stale'}],1),/changed/);
 const anon=await fetch(url+'/rest/v1/workspaces?select=*',{headers:{apikey:key,'Accept-Profile':'seabird'}});assert.equal(anon.ok,false);
 await a.remove();assert.equal(await a.load(),null);
 assert.equal((await fetch(url+'/auth/v1/admin/users/'+users[0],{headers})).ok,true);
 assert.equal((await b.save([{title:'Other user intact'}],null)).revision,1);
 console.log('PASS: real sign-in, membership, cloud save/load, two-user isolation, stale-write conflict, anonymous denial, app deletion and shared identity retention.');
}finally{
 for(const client of clients){await client.remove();await client.signOut().catch(()=>{});}
 for(const id of users){const r=await fetch(url+'/auth/v1/admin/users/'+id,{method:'DELETE',headers});assert.equal(r.ok,true);}
 console.log('Temporary identities and workspaces removed.');
}

