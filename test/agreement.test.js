import {test} from 'node:test';
import assert from 'node:assert/strict';
import {agreementDefinition,agreementHtml} from '../dist/agreement.js';
test('web agreement renders all sections safely without an embedded PDF',()=>{
 const p=example();p.title='<script>alert(1)</script>';
 const html=agreementHtml(p);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<iframe'));
 for(const label of ['Deliverables','Reviews &amp; timing','Client materials','Payments','Working agreement','Changes &amp; delays','Signature:'])assert.ok(html.includes(label),label);
});
import {example,stages} from '../dist/model.js';

test('agreement carries the complete client scope and excludes private estimates',()=>{
  const p=example();p.rate=987654.321;p.days=543.21;p.costs=87654.321;
  p.deliverableItems=[{name:'Custom master',specs:'Square pixels / 4:2:2 / Rec.709'}];
  p.terms='Custom agreed terms';p.rights='Custom usage rights';p.inputs='Custom client materials';
  const doc=agreementDefinition(p,new Date('2026-10-12T00:00:00Z'));
  const text=JSON.stringify(doc);
  for(const value of [p.title,p.client,p.inputs,p.terms,p.rights,p.paymentNote,'Changes & delays','If Roll is running late','Custom master','Square pixels / 4:2:2 / Rec.709','Signature:','Name:','Date:'])assert.ok(text.includes(value),value);
  for(const stage of stages(p))assert.ok(text.includes(stage.name));
  for(const amount of [p.rate,p.days,p.costs])assert.ok(!text.includes(String(amount)));
});

test('older agreements do not acquire a changes policy retroactively',()=>{
  const p=example();delete p.changesPolicy;
  const text=JSON.stringify(agreementDefinition(p));
  assert.ok(text.includes('No separate changes policy was specified'));
  assert.ok(!text.includes('If Roll is running late'));
});

test('legacy deliverables appear in the printable agreement',()=>{
  const p=example();delete p.deliverableItems;p.deliverables='Legacy film master\nLegacy still';
  const text=JSON.stringify(agreementDefinition(p));
  assert.ok(text.includes('Legacy film master'));assert.ok(text.includes('Legacy still'));
});
