import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const css=await readFile(new URL('../dist/style.css',import.meta.url),'utf8');
const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');

test('the complete timeline fits its card instead of becoming horizontally scrollable',()=>{
  assert.match(css,/\.timeline-scroll\{[^}]*width:100%[^}]*min-width:0[^}]*overflow:visible/);
  assert.match(css,/\.timeline\{[^}]*width:100%[^}]*min-width:0/);
  assert.doesNotMatch(css,/\.timeline-scroll\{[^}]*overflow-x:auto/);
  assert.doesNotMatch(css,/\.timeline\{[^}]*min-width:670px/);
  assert.match(app,/--stage-count:\$\{plan\.length\}/);
  assert.match(app,/class="today-marker\$\{edge\}\$\{outside\}"/);
  assert.match(css,/\.today-marker\{[^}]*position:absolute[^}]*left:var\(--today\)/);
  assert.match(css,/\.today-marker\.is-before::after,.today-marker\.is-after::after\{display:none\}/);
});

test('mobile keeps the project program compact and usable without widening the page',()=>{
  assert.doesNotMatch(app,/class="mobile-stage-picker"/);
  assert.doesNotMatch(app,/id="timeline-stage-select"/);
  assert.match(css,/@media\(max-width:600px\)\{body\{overflow-x:hidden\}/);
  assert.match(css,/\.pair\{grid-template-columns:1fr\}/);
  assert.match(app,/v\.start===v\.end\?' is-point'/);
  assert.match(css,/\.stage\.is-point \.stage-label-compact\{display:none\}/);
  assert.match(app,/class="onboarding-card"/);
  assert.match(css,/\.choice-grid\{grid-template-columns:1fr 1fr\}/);
  assert.match(css,/\.onboarding-numbers\{grid-template-columns:1fr\}/);
  assert.match(css,/\.auth-home\{margin-top:7vh;padding:34px 22px\}/);
  assert.match(css,/\.auth-home \.google-signin\{[^}]*color:var\(--ink\)/);
  assert.match(app,/<div class="project-heading">[\s\S]*\$\{timelineMarkup\(s,end,progress,client\)\}/);
  assert.match(app,/class="project-actions-menu"/);
  assert.match(css,/\.project-actions-wide\{display:none\}\.project-actions-menu\{display:block/);
  assert.match(app,/class="timeline-labels" aria-hidden="true"/);
  assert.match(app,/\.timeline-labels'\)\?\.querySelectorAll\('\.timeline-label'\)/);
  assert.match(css,/\.timeline-labels\{display:flex;gap:clamp\(2px,\.5vw,5px\)/);
  assert.match(css,/@media\(max-width:760px\)\{\.timeline-labels\{display:none\}\}/);
  assert.match(app,/class="program-progress is-\$\{status\.state\}/);
  assert.match(app,/class="program-actions"/);
  assert.match(app,/button\.closest\('details'\)\?\.removeAttribute\('open'\)/);
  assert.match(css,/\.program-actions\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/\.project-heading \.intro p\{display:none\}/);
  assert.match(app,/name="project-sections"/);
  assert.match(app,/Fee to agree/);
  assert.match(app,/deliverablesToAgree\?'To agree'/);
  assert.doesNotMatch(app,/class="card-icon"/);
  assert.doesNotMatch(app,/class="card-description"/);
  assert.doesNotMatch(app,/class="overview"/);
  assert.match(css,/\.project-card summary,.project-card\[open\] summary\{grid-template-columns:minmax\(105px,.85fr\)/);
});
