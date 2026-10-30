import {example,startTracking,validate,providerIdentity,defaultChangesPolicy} from './model.js';

export const defaultProjectDefaults=Object.freeze({
  currency:'NZD',tax:'Excludes any applicable tax',rate:0,deposit:50,
  paymentNote:'Deposit to book the project. Balance due before final delivery.',
  conceptDays:5,animationDays:8,reviews:2,reviewDays:2,finishDays:2,makingStageName:'Making'
});

const number=(value,fallback,min,max,integer=false)=>{
  const next=Number(value);return Number.isFinite(next)&&next>=min&&next<=max&&(!integer||Number.isInteger(next))?next:fallback;
};
export function normaliseProjectDefaults(value={}){
  const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  return{
    currency:['NZD','USD','AUD','GBP','EUR'].includes(source.currency)?source.currency:defaultProjectDefaults.currency,
    tax:typeof source.tax==='string'&&source.tax.trim()&&source.tax.length<=200?source.tax.trim():defaultProjectDefaults.tax,
    rate:number(source.rate,defaultProjectDefaults.rate,0,1000000),
    deposit:number(source.deposit,defaultProjectDefaults.deposit,0,100,true),
    paymentNote:typeof source.paymentNote==='string'&&source.paymentNote.trim()&&source.paymentNote.length<=10000?source.paymentNote.trim():defaultProjectDefaults.paymentNote,
    conceptDays:number(source.conceptDays,defaultProjectDefaults.conceptDays,1,90,true),
    animationDays:number(source.animationDays,defaultProjectDefaults.animationDays,1,90,true),
    reviews:number(source.reviews,defaultProjectDefaults.reviews,1,6,true),
    reviewDays:number(source.reviewDays,defaultProjectDefaults.reviewDays,1,90,true),
    finishDays:number(source.finishDays,defaultProjectDefaults.finishDays,1,90,true),
    makingStageName:typeof source.makingStageName==='string'&&source.makingStageName.trim()&&source.makingStageName.length<=100?source.makingStageName.trim():defaultProjectDefaults.makingStageName
  };
}

export function newProject({title,client,description='',start},{defaults={},provider,now=new Date()}={}){
  const base=example();
  const preferences=normaliseProjectDefaults(defaults),identity=providerIdentity(provider);
  const project={...base,id:crypto.randomUUID(),title:title.trim(),client:client.trim(),description:description.trim(),start,
    deliverables:'Deliverables to be agreed',deliverableItems:[{name:'Deliverables to be agreed',specs:''}],
    ...preferences,changesPolicy:defaultChangesPolicy,rate:preferences.rate,days:1,costs:0,fee:0,
    inputs:'Client materials to be agreed.',rights:'Usage rights and handover to be agreed.',
    createdAt:now.toISOString(),updatedAt:now.toISOString()};
  if(identity)project.provider=identity;
  startTracking(project);
  if(!project.title||!project.client||project.client.length>200||!validate(project))throw new Error('Add a project name, client and valid kick-off date.');
  return project;
}
