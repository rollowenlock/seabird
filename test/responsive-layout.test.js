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
  assert.match(app,/--stage-count:\$\{s\.length\}/);
});

test('mobile keeps stage details and forms usable without widening the page',()=>{
  assert.match(app,/class="mobile-stage-picker"/);
  assert.match(app,/id="timeline-stage-select"/);
  assert.match(css,/@media\(max-width:600px\)\{body\{overflow-x:hidden\}/);
  assert.match(css,/\.pair\{grid-template-columns:1fr\}/);
  assert.match(css,/\.mobile-stage-picker select\{width:100%\}/);
});
