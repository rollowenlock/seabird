import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addWorkingDays,clientProject,completeStage,currentStageStatus,example,
  refreshUnstartedPlan,scheduleDatePosition,setStageWaiting,shiftRemainingStages,stages,startTracking,
  todayInTimeZone,validate,validStagePlan,workingDaysBetween
} from '../dist/model.js';

test('working-day countdowns cross weekends and preserve direction',()=>{
  assert.equal(addWorkingDays('2026-10-30',1),'2026-11-02');
  assert.equal(addWorkingDays('2026-11-02',-1),'2026-10-30');
  assert.equal(workingDaysBetween('2026-10-30','2026-11-03'),2);
  assert.equal(workingDaysBetween('2026-11-03','2026-10-30'),-2);
  assert.equal(todayInTimeZone('Pacific/Auckland',new Date('2026-10-29T12:30:00Z')),'2026-10-30');
});

test('today has a stable proportional position across the visual schedule',()=>{
  assert.equal(scheduleDatePosition('2026-11-01','2026-11-11','2026-10-30'),0);
  assert.equal(scheduleDatePosition('2026-11-01','2026-11-11','2026-11-06'),50);
  assert.equal(scheduleDatePosition('2026-11-01','2026-11-11','2026-11-20'),100);
  assert.throws(()=>scheduleDatePosition('2026-11-11','2026-11-01','2026-11-06'),/schedule date/);
});

test('tracking setup records prior stages without invented actual dates',()=>{
  const project=example(),plan=stages(project);
  startTracking(project,{currentStageKey:'review-1',timeZone:'Pacific/Auckland',today:'2026-11-09'});
  assert.equal(project.workflow.states.kickoff.status,'complete-before-tracking');
  assert.equal(project.workflow.states.direction.completedOn,undefined);
  assert.equal(project.workflow.states['review-1'].status,'incomplete');
  assert.equal(currentStageStatus(project,'2026-11-09').current.key,'review-1');
  assert.deepEqual(project.workflow.plan.map(stage=>stage.key),plan.map(stage=>stage.key));
  assert.throws(()=>refreshUnstartedPlan(project),/Change plan/);
});

test('tracking rejects invalid timezones and overlapping or duplicate plans',()=>{
  assert.throws(()=>startTracking(example(),{timeZone:'Not/A_Timezone',today:'2026-11-02'}),/timezone/);
  const project=example();startTracking(project,{timeZone:'Pacific/Auckland',today:'2026-11-02'});
  const overlap=structuredClone(project.workflow.plan);overlap[1].start='2026-11-01';
  const duplicate=structuredClone(project.workflow.plan);duplicate[1].key=duplicate[0].key;
  assert.equal(validStagePlan(overlap),false);assert.equal(validStagePlan(duplicate),false);
  project.workflow.timeZone='Not/A_Timezone';assert.equal(validate(project),false);
});

test('stage state moves from upcoming to due and overdue until confirmed complete',()=>{
  const project=example();startTracking(project,{timeZone:'Pacific/Auckland',today:'2026-10-30'});
  assert.equal(currentStageStatus(project,'2026-10-30').state,'upcoming');
  assert.equal(currentStageStatus(project,'2026-11-02').state,'due');
  assert.equal(currentStageStatus(project,'2026-11-03').state,'overdue');
  completeStage(project,'kickoff','2026-11-03');
  assert.equal(currentStageStatus(project,'2026-11-03').current.key,'direction');
  assert.throws(()=>completeStage(project,'review-1','2026-11-03'),/current stage/);
});

test('waiting explains delay without moving dates',()=>{
  const project=example();startTracking(project,{timeZone:'Pacific/Auckland',today:'2026-11-02'});
  const end=project.workflow.plan[0].end;
  setStageWaiting(project,'kickoff','client','Source files','2026-11-02');
  const status=currentStageStatus(project,'2026-11-04');
  assert.equal(status.state,'waiting');assert.equal(status.overdue,true);
  assert.equal(project.workflow.plan[0].end,end);
  assert.match(status.label,/client/);
});

test('replanning extends the current stage and shifts only incomplete downstream stages',()=>{
  const project=example();startTracking(project,{timeZone:'Pacific/Auckland',today:'2026-11-02'});
  completeStage(project,'kickoff','2026-11-02');
  const before=structuredClone(project.workflow.plan),directionIndex=before.findIndex(stage=>stage.key==='direction');
  shiftRemainingStages(project,'direction',3,{party:'client',reason:'Feedback arrived late',on:'2026-11-10'});
  assert.deepEqual(project.workflow.plan[0],before[0]);
  assert.equal(project.workflow.plan[directionIndex].start,before[directionIndex].start);
  assert.equal(project.workflow.plan[directionIndex].end,addWorkingDays(before[directionIndex].end,3));
  assert.equal(project.workflow.plan[directionIndex+1].start,addWorkingDays(before[directionIndex+1].start,3));
  assert.equal(project.workflow.activity.at(-1).type,'schedule_shifted');
});

test('client versions freeze forecast dates and exclude private progress history',()=>{
  const project=example();startTracking(project,{timeZone:'Pacific/Auckland',today:'2026-11-02'});
  setStageWaiting(project,'kickoff','client','Private delay note','2026-11-02');
  const shared=clientProject(project);
  assert.equal(shared.workflow,undefined);assert.ok(shared.stagePlan.length>2);
  assert.ok(!JSON.stringify(shared).includes('Private delay note'));
  assert.deepEqual(stages(shared).map(stage=>stage.end),shared.stagePlan.map(stage=>stage.end));
});
