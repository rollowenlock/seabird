import {example,startTracking,validate,providerIdentity,defaultChangesPolicy,upgradeProject} from './model.js';

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

const projectKinds=[
  {match:/\b(opening|title sequence|titles?)\b/i,title:'Opening title sequence'},
  {match:/\b(website|web site|landing page)\b/i,title:'Website design and build'},
  {match:/\b(brand|branding|identity|logo)\b/i,title:'Brand identity'},
  {match:/\b(film|video|documentary|commercial)\b/i,title:'Film / video deliverable'},
  {match:/\b(illustration|illustrated)\b/i,title:'Illustration set'},
  {match:/\b(photography|photos?|shoot)\b/i,title:'Photography selection'},
  {match:/\b(product|app|digital)\b/i,title:'Digital product design'}
];

const sentence=value=>String(value||'').replace(/\s+/g,' ').trim().split(/(?<=[.!?])\s+/)[0]?.replace(/[.!?]+$/,'').trim()||'';
const titleCase=value=>value?value[0].toUpperCase()+value.slice(1):value;
export function suggestProjectDraft(brief,{profile={},defaults=profile.project_defaults,now=new Date()}={}){
  const clean=String(brief||'').replace(/\s+/g,' ').trim().slice(0,10000),preferences=normaliseProjectDefaults(defaults);
  const workType=Array.isArray(profile.work_types)?profile.work_types.find(value=>typeof value==='string'&&value.trim())?.trim():'';
  const first=sentence(clean),kind=projectKinds.find(value=>value.match.test(clean));
  const clientMatch=clean.match(/\bfor\s+([A-Z][A-Za-z0-9&'’ .-]{1,70}?)(?=\s+(?:with|to|by|due|launching|delivering)\b|[,.;]|$)/);
  const totalDays=preferences.conceptDays+preferences.animationDays+(preferences.reviews*preferences.reviewDays)+preferences.finishDays;
  const fee=preferences.rate?Math.round((preferences.rate*totalDays)/100)*100:0;
  const fallbackType=workType?`${workType} project`:'New project';
  const deliverable=kind?.title||(workType?`${workType} deliverable`:'Deliverables to be agreed');
  const specs=/website|digital product/i.test(deliverable)?'Responsive desktop and mobile requirements to confirm':'Final format and technical delivery requirements to confirm';
  return{
    title:titleCase((first||fallbackType).slice(0,80)),
    client:clientMatch?.[1]?.trim()||'Client to confirm',
    description:clean||`A new ${workType||'creative'} project. Deliverables and timing to agree.`,
    start:[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-'),
    deliverableItems:[{name:deliverable,specs}],
    fee,days:totalDays,defaults:preferences,paymentNote:preferences.paymentNote,
    terms:'The fee covers the agreed deliverables and review rounds. Extra work or changes are agreed before they begin. The programme depends on receiving materials, feedback and payments on time.'
  };
}

export function newProject({title,client,description='',start},{defaults={},provider,now=new Date()}={}){
  const base=example();
  const preferences=normaliseProjectDefaults(defaults),identity=providerIdentity(provider);
  const project={...base,id:crypto.randomUUID(),title:title.trim(),client:client.trim(),description:description.trim(),start,
    deliverables:'Deliverables to be agreed',deliverableItems:[{name:'Deliverables to be agreed',specs:''}],
    ...preferences,changesPolicy:defaultChangesPolicy,rate:preferences.rate,days:1,costs:0,fee:0,
    inputs:'Client materials to be agreed.',rights:'Usage rights and handover to be agreed.',
    lifecycle:'draft',createdAt:now.toISOString(),updatedAt:now.toISOString()};
  if(identity)project.provider=identity;
  startTracking(project);upgradeProject(project);
  if(!project.title||!project.client||project.client.length>200||!validate(project))throw new Error('Add a project name, client and valid kick-off date.');
  return project;
}
