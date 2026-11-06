export const defaultChangesPolicy="Changes to deliverables\nIf either party requests a change to the agreed items, specifications or review rounds, the provider will outline the effect on the fee and timing. Both parties will confirm the change in writing before the extra or revised work begins.\n\nChanges to the schedule\nIf either party needs to move a date, they will let the other know as soon as possible. We will agree a revised schedule, including any effect on reviews, delivery and payment dates. A requested date is not confirmed until both parties agree.\n\nLate materials, feedback or payments\nThe provider will flag what is missing and how it affects the work. Affected work may pause, and later milestones may move according to the delay and the provider's availability. Any additional cost will be quoted and agreed in writing before it is incurred.\n\nIf the provider is running late\nThe provider will notify the client promptly, explain the impact and propose a revised delivery plan. Both parties will confirm the new dates in writing.\n\nKeeping one agreed version\nThe provider will publish a new version for confirmation. The client link shows the latest published version; previous acceptances remain attached to the version reviewed. Downloaded PDFs and older snapshot links remain copies of their original version.";

export const example=()=>({id:crypto.randomUUID(),changesPolicy:defaultChangesPolicy,title:'The space between',client:'Northlight Films',description:'A title sequence that sets the tone before the story begins.',deliverableItems:[{name:'Opening title sequence — 4K master',specs:'30 seconds · 3840 × 2160 · Square pixels · 4:2:2 · Rec.709'},{name:'Opening title sequence — HD master',specs:'30 seconds · 1920 × 1080 · Square pixels · 4:2:2 · Rec.709'}],deliverables:'One 30-second opening title sequence\nCreative direction, design & animation\n4K master + 1080p delivery',currency:'NZD',tax:'Excludes any applicable tax',rate:1200,days:12,costs:600,fee:15000,deposit:50,start:'2026-11-02',conceptDays:5,animationDays:8,reviewDays:2,reviews:2,finishDays:2,inputs:'Logo files in vector format\nFinal title and credit list\nPicture reference and technical delivery specs',terms:'The fee covers the deliverables and review rounds listed on this page.\nAdditional work or a change of direction will be quoted and agreed before proceeding.\nPlease send one consolidated set of feedback per review round.\nThe schedule depends on receiving materials, feedback and payments on time. If something moves, we will agree revised dates together.',paymentNote:'Deposit to book the project. Balance before release of final masters.',rights:'Usage rights, source files and any third-party licences to be agreed before work begins.'});

const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const parties=['studio','client','shared','third-party'];
const eventTypes=['tracking_started','stage_completed','waiting_started','waiting_cleared','schedule_shifted','variation_started','variation_published','deliverable_status','payment_status','project_completed','project_reopened'];
const lifecycleStates=['draft','active','completed'];
const deliverableStates=['planned','ready','delivered','approved'];
const paymentStates=['planned','requested','paid'];
const isoDate=value=>typeof value==='string'&&datePattern.test(value)&&!Number.isNaN(Date.parse(value));
const validTimeZone=value=>{if(typeof value!=='string'||value.length<1||value.length>100)return false;try{new Intl.DateTimeFormat('en',{timeZone:value}).format();return true}catch{return false}};

export function addWorkingDays(date,n){
  if(!isoDate(date)||!Number.isInteger(n))throw new Error('Invalid working-day calculation.');
  const d=new Date(date+'T12:00:00Z'),direction=Math.sign(n);let count=0;
  while(count!==Math.abs(n)){d.setUTCDate(d.getUTCDate()+direction);if(d.getUTCDay()!==0&&d.getUTCDay()!==6)count++;}
  return d.toISOString().slice(0,10);
}
export const addDays=addWorkingDays;
export function workingDaysBetween(from,to){
  if(!isoDate(from)||!isoDate(to))throw new Error('Invalid schedule date.');
  if(from===to)return 0;if(from>to)return-workingDaysBetween(to,from);
  let cursor=from,count=0;while(cursor<to){cursor=addWorkingDays(cursor,1);count++;}return count;
}
export function scheduleDatePosition(start,end,today){
  if(!isoDate(start)||!isoDate(end)||!isoDate(today)||start>end)throw new Error('Invalid schedule date.');
  if(today<=start)return 0;if(today>=end)return 100;
  const first=Date.parse(start+'T12:00:00Z'),last=Date.parse(end+'T12:00:00Z'),current=Date.parse(today+'T12:00:00Z');
  return Math.max(0,Math.min(100,(current-first)/(last-first)*100));
}
export function todayInTimeZone(timeZone,now=new Date()){
  try{const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),get=type=>parts.find(part=>part.type===type)?.value,result=`${get('year')}-${get('month')}-${get('day')}`;if(!isoDate(result))throw new Error();return result;}catch{return now.toISOString().slice(0,10);}
}

function generatedStages(p){
  let cursor=p.start;const provider=p.provider?.displayName||'Provider',making=typeof p.makingStageName==='string'&&p.makingStageName.trim()?p.makingStageName.trim():'Animation';
  const list=[{key:'kickoff',name:'Kick-off',start:cursor,end:cursor,owner:'Together',color:'#bdd39d',body:`${p.client} supplies:\n${p.inputs}\n\n${provider} confirms the brief and receives the ${p.deposit}% deposit.`}];
  function add(key,name,days,owner,color,body){const start=cursor;cursor=addWorkingDays(cursor,days);list.push({key,name,start,end:cursor,owner,color,body});}
  add('direction','Direction',p.conceptDays,provider,'#c6d8ac','Explore the brief and agree the direction for the work.');
  for(let i=0;i<p.reviews;i++){
    const review=i+1;
    add(`review-${review}`,`Review ${review}`,p.reviewDays,p.client,'#c6cced',`Send one consolidated set of feedback within ${p.reviewDays} working day${p.reviewDays===1?'':'s'}.\n${i===0?`Approve the direction before ${making.toLowerCase()} begins.`:'Review the work and flag adjustments within the agreed scope.'}`);
    if(i===0)add('animation',making,p.animationDays,provider,'#b8cec5','Develop the approved direction into the agreed deliverables.');
    else if(i<p.reviews-1)add(`refinement-${review}`,`Refinements ${review-1}`,p.finishDays,provider,'#b8cec5','Apply the consolidated feedback before the next review.');
  }
  add('final-delivery','Final delivery',p.finishDays,provider,'#e2c39d','Apply final agreed refinements and deliver the listed items once the balance is paid.');return list;
}
const publicStage=stage=>({key:stage.key,name:stage.name,owner:stage.owner,start:stage.start,end:stage.end});
export function validStagePlan(plan){return Array.isArray(plan)&&plan.length>=2&&plan.length<=20&&plan.every((stage,index)=>stage&&typeof stage.key==='string'&&/^[a-z0-9-]{1,64}$/.test(stage.key)&&typeof stage.name==='string'&&stage.name.length>0&&stage.name.length<=100&&typeof stage.owner==='string'&&stage.owner.length>0&&stage.owner.length<=200&&isoDate(stage.start)&&isoDate(stage.end)&&stage.start<=stage.end&&(index===0||stage.start>=plan[index-1].end))&&new Set(plan.map(stage=>stage.key)).size===plan.length;}
export function stages(p){const generated=generatedStages(p),source=p.stagePlan??p.workflow?.plan;if(!validStagePlan(source))return generated;const metadata=new Map(generated.map(stage=>[stage.key,stage]));return source.map(item=>({...metadata.get(item.key),...item,color:metadata.get(item.key)?.color??'#c6d8ac',body:metadata.get(item.key)?.body??''}));}
export const stagePlan=p=>stages(p).map(publicStage);

function validEvent(item){return item&&typeof item.id==='string'&&item.id.length<=100&&eventTypes.includes(item.type)&&isoDate(item.on)&&typeof item.createdAt==='string'&&item.createdAt.length<=50&&(item.stageKey===undefined||(typeof item.stageKey==='string'&&item.stageKey.length<=64))&&(item.itemId===undefined||(typeof item.itemId==='string'&&item.itemId.length<=100))&&(item.status===undefined||(typeof item.status==='string'&&item.status.length<=30))&&(item.party===undefined||parties.includes(item.party))&&(item.reason===undefined||(typeof item.reason==='string'&&item.reason.length<=1000))&&(item.workingDays===undefined||(Number.isInteger(item.workingDays)&&Math.abs(item.workingDays)<=3650))&&(item.beforeEnd===undefined||isoDate(item.beforeEnd))&&(item.afterEnd===undefined||isoDate(item.afterEnd));}
function validWorkflow(workflow){
  if(workflow===undefined)return true;
  if(!workflow||![1,2].includes(workflow.version)||!validTimeZone(workflow.timeZone)||typeof workflow.startedAt!=='string'||!validStagePlan(workflow.plan)||!workflow.states||typeof workflow.states!=='object'||Array.isArray(workflow.states)||!Array.isArray(workflow.activity)||workflow.activity.length>500||!workflow.activity.every(validEvent))return false;
  const keys=new Set(workflow.plan.map(stage=>stage.key));return Object.entries(workflow.states).every(([key,state])=>keys.has(key)&&state&&['incomplete','complete','complete-before-tracking'].includes(state.status)&&(state.completedOn===undefined||state.completedOn===null||isoDate(state.completedOn))&&(state.waiting===undefined||state.waiting===null||(isoDate(state.waiting.since)&&parties.includes(state.waiting.party)&&typeof state.waiting.reason==='string'&&state.waiting.reason.length<=1000)));
}
function activity(type,on,details={}){return{id:crypto.randomUUID(),type,on,createdAt:new Date().toISOString(),...details};}
function appendActivity(workflow,item){if(workflow.activity.length>=500)throw new Error('This project activity history is full. Export a backup before continuing.');workflow.activity.push(item);}
function firstIncomplete(p){return stages(p).find(stage=>!['complete','complete-before-tracking'].includes(p.workflow?.states?.[stage.key]?.status));}

export function startTracking(p,{currentStageKey='kickoff',timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',today=todayInTimeZone(timeZone)}={}){
  if(!validTimeZone(timeZone)||!isoDate(today))throw new Error('Choose a valid timezone and tracking date.');const plan=generatedStages(p).map(publicStage),index=plan.findIndex(stage=>stage.key===currentStageKey);if(index<0)throw new Error('Choose a valid current stage.');
  const states=Object.fromEntries(plan.map((stage,i)=>[stage.key,{status:i<index?'complete-before-tracking':'incomplete'}]));
  p.workflow={version:2,timeZone,startedAt:new Date().toISOString(),plan,states,activity:[]};appendActivity(p.workflow,activity('tracking_started',today,{stageKey:currentStageKey}));return p.workflow;
}
export function refreshUnstartedPlan(p){if(!p.workflow)return;if(p.workflow.activity.some(item=>item.type!=='tracking_started')||Object.values(p.workflow.states).some(state=>state.status!=='incomplete'))throw new Error('Use Change plan after progress has been recorded.');p.workflow.plan=generatedStages(p).map(publicStage);p.workflow.states=Object.fromEntries(p.workflow.plan.map(stage=>[stage.key,{status:'incomplete'}]));}
export function currentStageStatus(p,today=p.workflow?todayInTimeZone(p.workflow.timeZone):new Date().toISOString().slice(0,10)){
  if(!p.workflow)return{tracking:false};const current=firstIncomplete(p);
  if(!current){const completed=p.workflow.activity.filter(item=>item.type==='stage_completed').at(-1);return{tracking:true,state:'complete',label:completed?.on?`Completed ${completed.on}`:'Project complete',current:null,days:0};}
  const state=p.workflow.states[current.key],startsIn=workingDaysBetween(today,current.start),remaining=workingDaysBetween(today,current.end);
  if(state.waiting){const waitingDays=Math.abs(workingDaysBetween(state.waiting.since,today));return{tracking:true,state:'waiting',current,days:remaining,overdue:remaining<0,label:`Waiting on ${state.waiting.party} for ${waitingDays} working day${waitingDays===1?'':'s'}`};}
  if(today<current.start)return{tracking:true,state:'upcoming',current,days:startsIn,label:`Starts in ${startsIn} working day${startsIn===1?'':'s'}`};
  if(remaining<0)return{tracking:true,state:'overdue',current,days:remaining,label:`${Math.abs(remaining)} working day${Math.abs(remaining)===1?'':'s'} overdue`};
  if(remaining===0)return{tracking:true,state:'due',current,days:0,label:'Due today'};
  return{tracking:true,state:'active',current,days:remaining,label:`${remaining} working day${remaining===1?'':'s'} remaining`};
}
export function completeStage(p,stageKey,on=todayInTimeZone(p.workflow?.timeZone||'UTC')){if(!p.workflow)throw new Error('Start tracking this project first.');const current=firstIncomplete(p);if(!current||current.key!==stageKey)throw new Error('Complete the current stage before later stages.');p.workflow.states[stageKey]={status:'complete',completedOn:on};appendActivity(p.workflow,activity('stage_completed',on,{stageKey}));return currentStageStatus(p,on);}
export function setStageWaiting(p,stageKey,party,reason='',on=todayInTimeZone(p.workflow?.timeZone||'UTC')){if(!p.workflow||firstIncomplete(p)?.key!==stageKey||!parties.includes(party))throw new Error('Choose the current stage and who it is waiting on.');p.workflow.states[stageKey].waiting={since:on,party,reason:String(reason).trim().slice(0,1000)};appendActivity(p.workflow,activity('waiting_started',on,{stageKey,party,reason:String(reason).trim().slice(0,1000)}));return currentStageStatus(p,on);}
export function clearStageWaiting(p,stageKey,on=todayInTimeZone(p.workflow?.timeZone||'UTC')){if(!p.workflow?.states?.[stageKey]?.waiting)throw new Error('This stage is not waiting.');delete p.workflow.states[stageKey].waiting;appendActivity(p.workflow,activity('waiting_cleared',on,{stageKey}));return currentStageStatus(p,on);}
export function shiftRemainingStages(p,stageKey,workingDays,{party='shared',reason='',on=todayInTimeZone(p.workflow?.timeZone||'UTC')}={}){
  if(!p.workflow||!Number.isInteger(workingDays)||workingDays===0||Math.abs(workingDays)>3650||!parties.includes(party))throw new Error('Choose a valid schedule change.');const index=p.workflow.plan.findIndex(stage=>stage.key===stageKey);if(index<0||p.workflow.states[stageKey]?.status!=='incomplete')throw new Error('Only an incomplete stage can move.');
  const before=p.workflow.plan.map(stage=>({...stage}));p.workflow.plan=p.workflow.plan.map((stage,i)=>{if(i<index||p.workflow.states[stage.key]?.status!=='incomplete')return stage;if(i===index)return{...stage,end:addWorkingDays(stage.end,workingDays)};return{...stage,start:addWorkingDays(stage.start,workingDays),end:addWorkingDays(stage.end,workingDays)};});
  if(!validStagePlan(p.workflow.plan)){p.workflow.plan=before;throw new Error('That change would make the schedule invalid.');}appendActivity(p.workflow,activity('schedule_shifted',on,{stageKey,party,reason:String(reason).trim().slice(0,1000),workingDays,beforeEnd:before[index].end,afterEnd:p.workflow.plan[index].end}));return currentStageStatus(p,on);
}
export function recordVariation(p,area,reason,on=todayInTimeZone(p.workflow?.timeZone||'UTC')){if(p.workflow)appendActivity(p.workflow,activity('variation_started',on,{reason:`${area}: ${String(reason).trim()}`.slice(0,1000)}));}
export function recordVariationPublished(p,version,on=todayInTimeZone(p.workflow?.timeZone||'UTC')){if(p.workflow)appendActivity(p.workflow,activity('variation_published',on,{reason:`Published version ${version}`}));}

const stableId=(prefix,value,index)=>`${prefix}-${String(value||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'item'}-${index+1}`;
function milestoneDefaults(p){const deposit=Math.round((Number(p.fee)||0)*(Number(p.deposit)||0))/100;return[
  {id:'payment-deposit',label:'Deposit to book the project',amount:deposit,dueOn:p.start,status:'planned'},
  {id:'payment-balance',label:'Before final delivery',amount:Math.max(0,(Number(p.fee)||0)-deposit),dueOn:stagePlan(p).at(-1)?.end||p.start,status:'planned'}
];}
export function upgradeProject(p){
  if(!p||typeof p!=='object')return p;
  p.lifecycle=lifecycleStates.includes(p.lifecycle)?p.lifecycle:'active';
  if(p.archivedOn!==undefined&&!isoDate(p.archivedOn))delete p.archivedOn;
  if(p.workflow?.version===1)p.workflow.version=2;
  p.deliverableItems=deliverableItems(p).map((item,index)=>({id:typeof item.id==='string'&&item.id?item.id:stableId('deliverable',item.name,index),name:item.name,specs:item.specs||'',status:deliverableStates.includes(item.status)?item.status:'planned',...(isoDate(item.statusOn)?{statusOn:item.statusOn}:{})}));
  p.deliverables=p.deliverableItems.map(item=>item.name).join('\n');
  const existing=Array.isArray(p.paymentMilestones)?p.paymentMilestones:milestoneDefaults(p);
  p.paymentMilestones=existing.slice(0,20).map((item,index)=>({id:typeof item.id==='string'&&item.id?item.id:`payment-${index+1}`,label:String(item.label||`Payment ${index+1}`).slice(0,200),amount:Math.max(0,Number(item.amount)||0),dueOn:isoDate(item.dueOn)?item.dueOn:p.start,status:paymentStates.includes(item.status)?item.status:'planned',...(isoDate(item.statusOn)?{statusOn:item.statusOn}:{})}));
  if(!Array.isArray(p.privateNotes))p.privateNotes=[];
  return p;
}
export function setDeliverableStatus(p,itemId,status,on=todayInTimeZone(p.workflow?.timeZone||'UTC')){upgradeProject(p);if(!deliverableStates.includes(status)||!isoDate(on))throw new Error('Choose a valid deliverable status.');const item=p.deliverableItems.find(value=>value.id===itemId);if(!item)throw new Error('Deliverable not found.');item.status=status;item.statusOn=on;appendActivity(p.workflow,activity('deliverable_status',on,{itemId,status}));return item;}
export function setPaymentStatus(p,itemId,status,on=todayInTimeZone(p.workflow?.timeZone||'UTC')){upgradeProject(p);if(!paymentStates.includes(status)||!isoDate(on))throw new Error('Choose a valid payment status.');const item=p.paymentMilestones.find(value=>value.id===itemId);if(!item)throw new Error('Payment milestone not found.');item.status=status;item.statusOn=on;appendActivity(p.workflow,activity('payment_status',on,{itemId,status}));return item;}
export function completeProject(p,on=todayInTimeZone(p.workflow?.timeZone||'UTC')){upgradeProject(p);if(p.lifecycle==='completed')return p;p.lifecycle='completed';p.completedOn=on;appendActivity(p.workflow,activity('project_completed',on));return p;}
export function reopenProject(p,on=todayInTimeZone(p.workflow?.timeZone||'UTC')){upgradeProject(p);if(p.lifecycle!=='completed')return p;p.lifecycle='active';delete p.completedOn;appendActivity(p.workflow,activity('project_reopened',on));return p;}
export function addPrivateNote(p,note,on=todayInTimeZone(p.workflow?.timeZone||'UTC')){upgradeProject(p);const text=String(note||'').trim();if(!text||text.length>2000)throw new Error('Add a note under 2,000 characters.');p.privateNotes.push({id:crypto.randomUUID(),on,createdAt:new Date().toISOString(),text});if(p.privateNotes.length>200)p.privateNotes.shift();return p.privateNotes.at(-1);}
export function publicProgress(p,baselineVersion=null){upgradeProject(p);const publicEvents=new Set(['stage_completed','schedule_shifted','variation_published','deliverable_status','payment_status','project_completed','project_reopened']);return{baselineVersion,lifecycle:p.lifecycle,completedOn:p.completedOn??null,stages:p.workflow.plan.map(stage=>({key:stage.key,status:p.workflow.states[stage.key]?.status||'incomplete',completedOn:p.workflow.states[stage.key]?.completedOn??null})),deliverables:p.deliverableItems.map(({id,status,statusOn})=>({id,status,statusOn:statusOn??null})),payments:p.paymentMilestones.map(({id,status,statusOn})=>({id,status,statusOn:statusOn??null})),events:p.workflow.activity.filter(item=>publicEvents.has(item.type)).map(({id,type,on,stageKey,itemId,status,workingDays,beforeEnd,afterEnd,reason})=>Object.fromEntries(Object.entries({id,type,on,stageKey,itemId,status,workingDays,beforeEnd,afterEnd,reason}).filter(([,value])=>value!==undefined)))};}

const organisationTypes=['unspecified','individual','freelancer','studio','practice','company','other'];
const providerLabels={individual:'Individual',freelancer:'Freelancer',studio:'Studio',practice:'Practice',company:'Company',other:'Other',unspecified:'Provider'};
export function providerIdentity(profile){if(!profile)return undefined;const displayName=String(profile.displayName??profile.display_name??'').trim(),organisationType=profile.organisationType??profile.organisation_type??'unspecified',providerLabel=String(profile.providerLabel??profile.provider_label??providerLabels[organisationType]??'').trim();return displayName&&displayName.length<=120&&providerLabel&&providerLabel.length<=60&&organisationTypes.includes(organisationType)?{displayName,providerLabel,organisationType}:undefined;}
function validProvider(provider){return provider===undefined||(provider&&typeof provider.displayName==='string'&&provider.displayName.trim().length>0&&provider.displayName.length<=120&&organisationTypes.includes(provider.organisationType)&&(provider.providerLabel===undefined||(typeof provider.providerLabel==='string'&&provider.providerLabel.trim().length>0&&provider.providerLabel.length<=60)));}
export function clientProject(p){upgradeProject(p);const result=Object.fromEntries(['id','title','client','description','deliverables','currency','tax','fee','deposit','start','conceptDays','animationDays','makingStageName','reviewDays','reviews','finishDays','inputs','terms','paymentNote','rights','changesPolicy','provider'].filter(key=>p[key]!==undefined).map(key=>[key,p[key]]));result.deliverableItems=p.deliverableItems.map(({id,name,specs})=>({id,name,specs}));result.paymentMilestones=p.paymentMilestones.map(({id,label,amount,dueOn})=>({id,label,amount,dueOn}));result.stagePlan=stagePlan(p);return result;}
export function validate(p){return p&&typeof p.title==='string'&&p.title.length<=200&&typeof p.client==='string'&&['description','deliverables','inputs','terms','paymentNote','rights','tax'].every(key=>typeof p[key]==='string'&&p[key].length<=10000)&&(p.lifecycle===undefined||lifecycleStates.includes(p.lifecycle))&&(p.archivedOn===undefined||isoDate(p.archivedOn))&&(p.makingStageName===undefined||(typeof p.makingStageName==='string'&&p.makingStageName.trim().length>0&&p.makingStageName.length<=100))&&(p.changesPolicy===undefined||(typeof p.changesPolicy==='string'&&p.changesPolicy.length<=10000))&&validProvider(p.provider)&&(p.deliverableItems===undefined||(Array.isArray(p.deliverableItems)&&p.deliverableItems.length>0&&p.deliverableItems.length<=30&&p.deliverableItems.every(value=>value&&typeof value.name==='string'&&value.name.trim().length>0&&value.name.length<=200&&typeof value.specs==='string'&&value.specs.length<=2000&&(value.id===undefined||(typeof value.id==='string'&&value.id.length<=100))&&(value.status===undefined||deliverableStates.includes(value.status)))))&&(p.paymentMilestones===undefined||(Array.isArray(p.paymentMilestones)&&p.paymentMilestones.length>0&&p.paymentMilestones.length<=20&&p.paymentMilestones.every(value=>value&&typeof value.id==='string'&&value.id.length<=100&&typeof value.label==='string'&&value.label.length>0&&value.label.length<=200&&Number.isFinite(value.amount)&&value.amount>=0&&value.amount<=1e9&&isoDate(value.dueOn)&&(value.status===undefined||paymentStates.includes(value.status)))))&&['NZD','USD','AUD','GBP','EUR'].includes(p.currency)&&Number.isFinite(p.fee)&&p.fee>=0&&p.fee<=1e9&&Number.isFinite(p.deposit)&&p.deposit>=0&&p.deposit<=100&&isoDate(p.start)&&['conceptDays','animationDays','reviewDays','finishDays','reviews'].every(key=>Number.isInteger(p[key])&&p[key]>=1&&p[key]<=90)&&p.reviews<=6&&(p.stagePlan===undefined||validStagePlan(p.stagePlan))&&validWorkflow(p.workflow);}
export function encode(p){const bytes=new TextEncoder().encode(JSON.stringify(clientProject(p)));return btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join('')).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
export function decode(value){if(value.length>100000)throw Error('Too large');const p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),character=>character.charCodeAt(0))));if(!validate(p))throw Error('Invalid project');return p;}
export function deliverableItems(p){return p.deliverableItems??p.deliverables.split('\n').filter(value=>value.trim()).map(name=>({name,specs:''}));}
