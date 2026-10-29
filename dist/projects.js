import {example,validate} from './model.js';
export function newProject({title,client,description='',start},now=new Date()){
  const base=example();
  const project={...base,id:crypto.randomUUID(),title:title.trim(),client:client.trim(),description:description.trim(),start,
    deliverables:'Deliverables to be agreed',deliverableItems:[{name:'Deliverables to be agreed',specs:''}],
    rate:0,days:1,costs:0,fee:0,inputs:'Client materials to be agreed.',rights:'Usage rights and handover to be agreed.',
    createdAt:now.toISOString(),updatedAt:now.toISOString()};
  if(!project.title||!project.client||project.client.length>200||!validate(project))throw new Error('Add a project name, client and valid kick-off date.');
  return project;
}
export function readProjects(storage,key){
  const items=JSON.parse(storage.getItem(key)||'[]');
  if(!Array.isArray(items))throw new Error('Invalid device workspace');
  return items.filter(validate).map(p=>({...p,id:typeof p.id==='string'&&p.id?p.id:crypto.randomUUID()}));
}
