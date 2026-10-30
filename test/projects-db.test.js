import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {example} from '../dist/model.js';

test('project rows migrate existing drafts and enforce owner isolation with revisions',async()=>{
  const db=new PGlite();
  const alice='11111111-1111-4111-8111-111111111111',bob='22222222-2222-4222-8222-222222222222';
  async function as(role,id,sql,args=[]){
    await db.exec('set role '+role);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
    try{return (await db.query(sql,args)).rows;}finally{await db.exec('reset role');}
  }
  try{
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
      grant usage on schema auth to authenticated;
      create table auth.users(id uuid primary key);
      create table storage.buckets(id text primary key,name text not null,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id bigint generated always as identity primary key,bucket_id text not null,name text not null);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
      insert into auth.users values('${alice}'),('${bob}');`);
    const dir=new URL('../cookham/supabase/migrations/',import.meta.url);
    const files=(await readdir(dir)).filter(file=>file.endsWith('.sql')).sort();
    for(const file of files.filter(file=>!file.includes('add_project_records')))await db.exec(await readFile(new URL(file,dir),'utf8'));
    for(const id of [alice,bob])await as('authenticated',id,'insert into seabird.profiles(user_id) values($1)',[id]);
    const profile=(await as('authenticated',alice,"update seabird.profiles set display_name='Northlight Films',organisation_type='studio',work_types=array['Motion design','Animation'] where user_id=$1 returning display_name,organisation_type,work_types",[alice]))[0];
    assert.equal(profile.display_name,'Northlight Films');assert.equal(profile.organisation_type,'studio');assert.deepEqual(profile.work_types,['Motion design','Animation']);
    const onboarded=(await as('authenticated',alice,"update seabird.profiles set provider_label='Studio',project_defaults=$2,onboarding_completed_at=now() where user_id=$1 returning provider_label,project_defaults,onboarding_completed_at",[alice,JSON.stringify({currency:'AUD',rate:900,makingStageName:'Production',reviews:3})]))[0];
    assert.equal(onboarded.provider_label,'Studio');assert.equal(onboarded.project_defaults.makingStageName,'Production');assert.ok(onboarded.onboarding_completed_at);
    assert.equal((await as('authenticated',bob,'select user_id from seabird.profiles where user_id=$1',[alice])).length,0);
    await assert.rejects(as('authenticated',alice,"update seabird.profiles set organisation_type='agency' where user_id=$1",[alice]));
    await assert.rejects(as('authenticated',alice,"update seabird.profiles set work_types=array_fill('x'::text,array[13]) where user_id=$1",[alice]));
    await assert.rejects(as('authenticated',alice,"update seabird.profiles set project_defaults='{\"currency\":\"BTC\"}'::jsonb where user_id=$1",[alice]));
    await assert.rejects(as('authenticated',alice,"update seabird.profiles set project_defaults='{\"unknown\":true}'::jsonb where user_id=$1",[alice]));

    const legacy={...example(),id:'legacy-project',title:'Existing workspace project'};
    await as('authenticated',alice,'insert into seabird.workspaces(user_id,projects) values($1,$2)',[alice,JSON.stringify([legacy])]);
    await db.exec(await readFile(new URL(files.find(file=>file.includes('add_project_records')),dir),'utf8'));

    const migrated=await as('authenticated',alice,'select id,project,revision from seabird.projects');
    assert.equal(migrated.length,1);assert.equal(migrated[0].id,legacy.id);assert.equal(migrated[0].project.title,legacy.title);assert.equal(Number(migrated[0].revision),1);
    assert.equal((await as('authenticated',bob,'select * from seabird.projects')).length,0);
    await assert.rejects(as('anon',null,'select * from seabird.projects'));

    const created={...example(),id:'alice-project',title:'Alice project'};
    await as('authenticated',alice,'insert into seabird.projects(user_id,id,project) values($1,$2,$3)',[alice,created.id,JSON.stringify(created)]);
    await assert.rejects(as('authenticated',bob,'insert into seabird.projects(user_id,id,project) values($1,$2,$3)',[alice,'attack',JSON.stringify({...created,id:'attack'})]));
    await assert.rejects(as('authenticated',alice,'insert into seabird.projects(user_id,id,project) values($1,$2,$3)',[alice,'wrong-id',JSON.stringify(created)]));
    await assert.rejects(as('authenticated',alice,'insert into seabird.projects(user_id,id,project) values($1,$2,$3)',[alice,'missing-title',JSON.stringify({...created,id:'missing-title',title:''})]));

    const updated={...created,title:'Alice project revised'};
    const changed=await as('authenticated',alice,'update seabird.projects set project=$1 where id=$2 and revision=1 returning revision,project',[JSON.stringify(updated),created.id]);
    assert.equal(Number(changed[0].revision),2);assert.equal(changed[0].project.title,updated.title);
    assert.equal((await as('authenticated',alice,'update seabird.projects set project=$1 where id=$2 and revision=1 returning id',[JSON.stringify(created),created.id])).length,0);
    assert.equal((await as('authenticated',bob,'delete from seabird.projects where id=$1 returning id',[created.id])).length,0);

    const mirrored={...example(),id:'bob-workspace-project',title:'Made by the old client'};
    await as('authenticated',bob,'insert into seabird.workspaces(user_id,projects) values($1,$2)',[bob,JSON.stringify([mirrored])]);
    assert.equal((await as('authenticated',bob,'select id from seabird.projects where id=$1',[mirrored.id]))[0].id,mirrored.id);
    await as('authenticated',alice,'delete from seabird.profiles where user_id=$1',[alice]);
    assert.equal((await db.query('select * from seabird.projects where user_id=$1',[alice])).rows.length,0);
  }finally{await db.close();}
});
