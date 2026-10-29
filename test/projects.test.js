import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,readProjects} from '../dist/projects.js';
import {clientProject} from '../dist/model.js';
const details={title:'  Film titles  ',client:'  Example Studio  ',start:'2026-11-02'};
test('new projects have unique IDs and blank commercial figures, without fictional sample deliverables',()=>{
  const a=newProject(details),b=newProject(details);assert.notEqual(a.id,b.id);
  assert.equal(a.title,'Film titles');assert.equal(a.client,'Example Studio');assert.equal(a.fee,0);assert.equal(a.rate,0);
  assert.equal(a.deliverableItems[0].name,'Deliverables to be agreed');assert.equal(clientProject(a).createdAt,undefined);
  assert.throws(()=>newProject({...details,title:'   '}));assert.throws(()=>newProject({...details,client:''}));
});
test('empty accounts stay empty and account project collections remain separate',()=>{
  const a=newProject(details),b=newProject({...details,title:'Another project'}),values=new Map([['account-a',JSON.stringify([a,b])]]);
  const storage={getItem:k=>values.get(k)??null};
  assert.deepEqual(readProjects(storage,'account-b'),[]);assert.equal(readProjects(storage,'account-a').length,2);
  assert.equal(readProjects(storage,'account-a')[1].id,b.id);
});
