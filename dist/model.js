export const defaultChangesPolicy="Changes to deliverables\nIf either party requests a change to the agreed items, specifications or review rounds, Roll will outline the effect on the fee and timing. Both parties will confirm the change in writing before the extra or revised work begins.\n\nChanges to the schedule\nIf either party needs to move a date, they will let the other know as soon as possible. We will agree a revised schedule, including any effect on reviews, delivery and payment dates. A requested date is not confirmed until both parties agree.\n\nLate materials, feedback or payments\nRoll will flag what is missing and how it affects the work. Affected work may pause, and later milestones may move according to the delay and Roll's availability. Any additional cost will be quoted and agreed in writing before it is incurred.\n\nIf Roll is running late\nRoll will notify the client promptly, explain the impact and propose a revised delivery plan. Both parties will confirm the new dates in writing.\n\nKeeping one agreed version\nRoll will publish a new version for confirmation. The client link shows the latest published version; previous acceptances remain attached to the version reviewed. Downloaded PDFs and older snapshot links remain copies of their original version.";

export const example=()=>({id:crypto.randomUUID(),changesPolicy:defaultChangesPolicy,title:'The space between',client:'Northlight Films',description:'A title sequence that sets the tone before the story begins.',deliverableItems:[{name:'Opening title sequence — 4K master',specs:'30 seconds · 3840 × 2160 · Square pixels · 4:2:2 · Rec.709'},{name:'Opening title sequence — HD master',specs:'30 seconds · 1920 × 1080 · Square pixels · 4:2:2 · Rec.709'}],deliverables:'One 30-second opening title sequence\nCreative direction, design & animation\n4K master + 1080p delivery',currency:'NZD',tax:'Excludes any applicable tax',rate:1200,days:12,costs:600,fee:15000,deposit:50,start:'2026-11-02',conceptDays:5,animationDays:8,reviewDays:2,reviews:2,finishDays:2,inputs:'Logo files in vector format\nFinal title and credit list\nPicture reference and technical delivery specs',terms:'The fee covers the deliverables and review rounds listed on this page.\nAdditional work or a change of direction will be quoted and agreed before proceeding.\nPlease send one consolidated set of feedback per review round.\nThe schedule depends on receiving materials, feedback and payments on time. If something moves, we will agree revised dates together.',paymentNote:'Deposit to book the project. Balance before release of final masters.',rights:'Usage rights, source files and any third-party licences to be agreed before work begins.'});

const datePattern=/^\d{4}-\d{2}-\d{2}$/;
const parties=['studio','client','shared','third-party'];
const eventTypes=['tracking_started','stage_completed','waiting_started','waiting_cleared','schedule_shifted','variation_started','variation_published'];
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
export function todayInTimeZone(timeZone,now=new Date()){
  try{const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),get=type=>parts.find(part=>part.type===type)?.value,result=`${get('year')}-${get('month')}-${get('day')}`;if(!isoDate(result))throw new Error();return result;}catch{return now.toISOString().slice(0,10);}
}

function generatedStages(p){
  let cursor=p.start;
  const list=[{key:'kickoff',name:'Kick-off',start:cursor,end:cursor,owner:'Together',color:'#bdd39d',body:`${p.client} supplies:\n${p.inputs}\n\nRoll confirms the brief and receives the ${p.deposit}% deposit.`}];
  function add(key,name,days,owner,color,body){const start=cursor;cursor=addWorkingDays(cursor,days);list.push({key,name,start,end:cursor,owner,color,body});}
  add('direction','Direction',p.conceptDays,'Roll','#c6d8ac','Creative exploration, design and a proposed visual direction.');
  for(let i=0;i<p.reviews;i++){
    const review=i+1;
    add(`review-${review}`,`Review ${review}`,p.reviewDays,p.client,'#c6cced',`Send one consolidated set of feedback within ${p.reviewDays} working day${p.reviewDays===1?'':'s'}.\n${i===0?'Approve the creative direction before animation begins.':'Review the animation and flag adjustments within the agreed scope.'}`);
    if(i===0)add('animation','Animation',p.animationDays,'Roll','#b8cec5','Bring the approved direction to life through motion, timing and finishing.');
    else if(i<p.reviews-1)add(`refinement-${review}`,`Refinements ${review-1}`,p.finishDays,'Roll','#b8cec5','Apply the consolidated feedback before the next review.');
  }
  add('final-delivery','Final delivery',p.finishDays,'Roll','#e2c39d','Apply final agreed refinements and deliver the listed masters once the balance is paid.');return list;
}
const publicStage=stage=>({key:stage.key,name:stage.name,owner:stage.owner,start:stage.start,end:stage.end});
export function validStagePlan(plan){return Array.isArray(plan)&&plan.length>=2&&plan.length<=20&&plan.every((stage,index)=>stage&&typeof stage.key==='string'&&/^[a-z0-9-]{1,64}$/.test(stage.key)&&typeof stage.name==='string'&&stage.name.length>0&&stage.name.length<=100&&typeof stage.owner==='string'&&stage.owner.length>0&&stage.owner.length<=200&&isoDate(stage.start)&&isoDate(stage.end)&&stage.start<=stage.end&&(index===0||stage.start>=plan[index-1].end))&&new Set(plan.map(stage=>stage.key)).size===plan.length;}
export function stages(p){const generated=generatedStages(p),source=p.stagePlan??p.workflow?.plan;if(!validStagePlan(source))return generated;const metadata=new Map(generated.map(stage=>[stage.key,stage]));return source.map(item=>({...metadata.get(item.key),...item,color:metadata.get(item.key)?.color??'#c6d8ac',body:metadata.get(item.key)?.body??''}));}
export const stagePlan=p=>stages(p).map(publicStage);

function validEvent(item){return item&&typeof item.id==='string'&&item.id.length<=100&&eventTypes.includes(item.type)&&isoDate(item.on)&&typeof item.createdAt==='string'&&item.createdAt.length<=50&&(item.stageKey===undefined||(typeof item.stageKey==='string'&&item.stageKey.length<=64))&&(item.party===undefined||parties.includes(item.party))&&(item.reason===undefined||(typeof item.reason==='string'&&item.reason.length<=1000))&&(item.workingDays===undefined||(Number.isInteger(item.workingDays)&&Math.abs(item.workingDays)<=3650))&&(item.beforeEnd===undefined||isoDate(item.beforeEnd))&&(item.afterEnd===undefined||isoDate(item.afterEnd));}
function validWorkflow(workflow){
  if(workflow===undefined)return true;
  if(!workflow||workflow.version!==1||!validTimeZone(workflow.timeZone)||typeof workflow.startedAt!=='string'||!validStagePlan(workflow.plan)||!workflow.states||typeof workflow.states!=='object'||Array.isArray(workflow.states)||!Array.isArray(workflow.activity)||workflow.activity.length>500||!workflow.activity.every(validEvent))return false;
  const keys=new Set(workflow.plan.map(stage=>stage.key));return Object.entries(workflow.states).every(([key,state])=>keys.has(key)&&state&&['incomplete','complete','complete-before-tracking'].includes(state.status)&&(state.completedOn===undefined||state.completedOn===null||isoDate(state.completedOn))&&(state.waiting===undefined||state.waiting===null||(isoDate(state.waiting.since)&&parties.includes(state.waiting.party)&&typeof state.waiting.reason==='string'&&state.waiting.reason.length<=1000)));
}
function activity(type,on,details={}){return{id:crypto.randomUUID(),type,on,createdAt:new Date().toISOString(),...details};}
function appendActivity(workflow,item){if(workflow.activity.length>=500)throw new Error('This project activity history is full. Export a backup before continuing.');workflow.activity.push(item);}
function firstIncomplete(p){return stages(p).find(stage=>!['complete','complete-before-tracking'].includes(p.workflow?.states?.[stage.key]?.status));}

export function startTracking(p,{currentStageKey='kickoff',timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',today=todayInTimeZone(timeZone)}={}){
  if(!validTimeZone(timeZone)||!isoDate(today))throw new Error('Choose a valid timezone and tracking date.');const plan=generatedStages(p).map(publicStage),index=plan.findIndex(stage=>stage.key===currentStageKey);if(index<0)throw new Error('Choose a valid current stage.');
  const states=Object.fromEntries(plan.map((stage,i)=>[stage.key,{status:i<index?'complete-before-tracking':'incomplete'}]));
  p.workflow={version:1,timeZone,startedAt:new Date().toISOString(),plan,states,activity:[]};appendActivity(p.workflow,activity('tracking_started',today,{stageKey:currentStageKey}));return p.workflow;
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

export function clientProject(p){const result=Object.fromEntries(['id','title','client','description','deliverables','deliverableItems','currency','tax','fee','deposit','start','conceptDays','animationDays','reviewDays','reviews','finishDays','inputs','terms','paymentNote','rights','changesPolicy'].filter(key=>p[key]!==undefined).map(key=>[key,p[key]]));result.stagePlan=stagePlan(p);return result;}
export function validate(p){return p&&typeof p.title==='string'&&p.title.length<=200&&typeof p.client==='string'&&['description','deliverables','inputs','terms','paymentNote','rights','tax'].every(key=>typeof p[key]==='string'&&p[key].length<=10000)&&(p.changesPolicy===undefined||(typeof p.changesPolicy==='string'&&p.changesPolicy.length<=10000))&&(p.deliverableItems===undefined||(Array.isArray(p.deliverableItems)&&p.deliverableItems.length>0&&p.deliverableItems.length<=30&&p.deliverableItems.every(value=>value&&typeof value.name==='string'&&value.name.trim().length>0&&value.name.length<=200&&typeof value.specs==='string'&&value.specs.length<=2000)))&&['NZD','USD','AUD','GBP','EUR'].includes(p.currency)&&Number.isFinite(p.fee)&&p.fee>=0&&p.fee<=1e9&&Number.isFinite(p.deposit)&&p.deposit>=0&&p.deposit<=100&&isoDate(p.start)&&['conceptDays','animationDays','reviewDays','finishDays','reviews'].every(key=>Number.isInteger(p[key])&&p[key]>=1&&p[key]<=90)&&p.reviews<=6&&(p.stagePlan===undefined||validStagePlan(p.stagePlan))&&validWorkflow(p.workflow);}
export function encode(p){const bytes=new TextEncoder().encode(JSON.stringify(clientProject(p)));return btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join('')).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
export function decode(value){if(value.length>100000)throw Error('Too large');const p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),character=>character.charCodeAt(0))));if(!validate(p))throw Error('Invalid project');return p;}
export function deliverableItems(p){return p.deliverableItems??p.deliverables.split('\n').filter(value=>value.trim()).map(name=>({name,specs:''}));}
