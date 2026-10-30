import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject,normaliseProjectDefaults} from '../dist/projects.js';
import {clientProject,providerIdentity,stages,validate} from '../dist/model.js';
const details={title:'  Film titles  ',client:'  Example Studio  ',start:'2026-11-02'};
test('new projects have unique IDs and blank commercial figures, without fictional sample deliverables',()=>{
  const a=newProject(details),b=newProject(details);assert.notEqual(a.id,b.id);
  assert.equal(a.title,'Film titles');assert.equal(a.client,'Example Studio');assert.equal(a.fee,0);assert.equal(a.rate,0);
  assert.equal(a.deliverableItems[0].name,'Deliverables to be agreed');assert.equal(clientProject(a).createdAt,undefined);
  assert.throws(()=>newProject({...details,title:'   '}));assert.throws(()=>newProject({...details,client:''}));
});

test('client versions freeze the selected provider identity',()=>{
  const project=newProject(details),provider=providerIdentity({display_name:'Example Studio',organisation_type:'studio'});
  project.provider=provider;const shared=clientProject(project);
  assert.deepEqual(shared.provider,{displayName:'Example Studio',providerLabel:'Studio',organisationType:'studio'});assert.equal(validate(shared),true);
  assert.equal(providerIdentity({display_name:'Example Studio',organisation_type:'agency'}),undefined);
  assert.equal(validate({...shared,provider:{displayName:'Example Studio',organisationType:'agency'}}),false);
});

test('new projects copy account defaults without inventing project-specific scope or fees',()=>{
  const defaults=normaliseProjectDefaults({currency:'AUD',tax:'Includes applicable tax',rate:950,deposit:25,paymentNote:'Balance due in 14 days.',conceptDays:3,animationDays:7,reviews:3,reviewDays:4,finishDays:2,makingStageName:'Production'});
  const project=newProject(details,{defaults,provider:{display_name:'Example Practice',organisation_type:'other',provider_label:'Collective'}});
  assert.equal(project.currency,'AUD');assert.equal(project.rate,950);assert.equal(project.deposit,25);assert.equal(project.fee,0);assert.equal(project.costs,0);
  assert.equal(project.makingStageName,'Production');assert.equal(stages(project).find(stage=>stage.key==='animation').name,'Production');
  assert.equal(project.provider.providerLabel,'Collective');assert.equal(project.deliverableItems[0].name,'Deliverables to be agreed');
});

test('legacy projects retain their original animation stage fallback',()=>{
  const project=newProject(details);delete project.makingStageName;delete project.stagePlan;delete project.workflow;
  assert.equal(stages(project).find(stage=>stage.key==='animation').name,'Animation');
});
