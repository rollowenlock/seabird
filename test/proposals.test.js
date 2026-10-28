import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {example} from '../dist/model.js';

test('published versions enforce ownership, privacy, stale acceptance and revocation in PostgreSQL',async()=>{
  const db=new PGlite();
  const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
  async function as(role,id,sql,args=[]){
    await db.exec('set role '+role);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
    try{return (await db.query(sql,args)).rows;}finally{await db.exec('reset role');}
  }
  const rpc=(role,id,name,args)=>as(role,id,`select seabird.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as result`,args).then(r=>r[0].result);
  try{
    await db.exec(`create role anon;create role authenticated;create schema auth;
      grant usage on schema auth to authenticated;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
      insert into auth.users values('${alice}'),('${bob}');`);
    const dir=new URL('../cookham/supabase/migrations/',import.meta.url);
    for(const f of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile(new URL(f,dir),'utf8'));
    for(const id of [alice,bob])await as('authenticated',id,'insert into seabird.profiles(user_id) values($1)',[id]);
    const project=example();project.privateNote='never publish this';
    const first=await rpc('authenticated',alice,'publish_proposal',[project.id,project,0]);
    assert.equal(first.version,1);
    const publicRead=()=>rpc('anon',null,'read_proposal',[first.token]);
    const read=await publicRead();assert.equal(read.project.title,project.title);
    for(const key of ['rate','days','costs','privateNote'])assert.equal(read.project[key],undefined);
    assert.equal((await as('authenticated',bob,'select * from seabird.proposals')).length,0);
    await assert.rejects(as('anon',null,'select * from seabird.proposals'));
    await assert.rejects(as('authenticated',alice,'update seabird.proposals set revoked=true'));
    await assert.rejects(rpc('anon',null,'publish_proposal',[project.id,project,1]));
    await assert.rejects(rpc('authenticated',bob,'manage_proposal',[project.id,'revoke']));
    const unchanged=await rpc('authenticated',alice,'publish_proposal',[project.id,project,1]);assert.equal(unchanged.version,1);
    await assert.rejects(rpc('anon',null,'accept_proposal',[first.token,1,'Client','client@example.test',false]));
    const accepted=await rpc('anon',null,'accept_proposal',[first.token,1,'Client','client@example.test',true]);assert.ok(accepted.accepted_at);
    const repeated=await rpc('anon',null,'accept_proposal',[first.token,1,'Other','other@example.test',true]);assert.equal(repeated.accepted_at,accepted.accepted_at);
    const v2=await rpc('authenticated',alice,'publish_proposal',[project.id,{...project,fee:12345},1]);assert.equal(v2.token,first.token);assert.equal(v2.version,2);
    await assert.rejects(rpc('anon',null,'accept_proposal',[first.token,1,'Client','client@example.test',true]),/changed/);
    await assert.rejects(rpc('authenticated',alice,'publish_proposal',[project.id,project,1]),/changed/);
    assert.equal((await publicRead()).accepted_at,null);
    const history=await as('authenticated',alice,'select * from seabird.acceptances');assert.equal(history.length,1);assert.equal(history[0].name,'Client');
    assert.equal((await as('authenticated',bob,'select * from seabird.acceptances')).length,0);
    await rpc('authenticated',alice,'manage_proposal',[project.id,'revoke']);assert.equal(await publicRead(),null);
    await assert.rejects(rpc('anon',null,'accept_proposal',[first.token,2,'Client','client@example.test',true]));
    await rpc('authenticated',alice,'manage_proposal',[project.id,'replace']);assert.equal(await publicRead(),null);
    assert.equal((await as('authenticated',alice,'select * from seabird.acceptances')).length,1);
    await as('authenticated',alice,'delete from seabird.profiles where user_id=$1',[alice]);
    assert.equal((await db.query('select * from seabird.proposal_versions')).rows.length,0);
    assert.equal((await db.query('select * from auth.users')).rows.length,2);
  }finally{await db.close();}
});
