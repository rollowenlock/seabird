import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('project records use the backend without a browser persistence fallback',async()=>{
  const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  const cloud=await readFile(new URL('../dist/cloud.js',import.meta.url),'utf8');
  assert.doesNotMatch(app,/localStorage|readProjects|saved on this device|saved on this browser/i);
  assert.doesNotMatch(cloud,/localStorage|Save projects to cloud|Load cloud projects|device draft|device changes/i);
});

test('signed-out identity is Seabird and account language does not assume a company',async()=>{
  const index=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  const cloud=await readFile(new URL('../dist/cloud.js',import.meta.url),'utf8');
  assert.match(index,/>Seabird<\/a>/);assert.doesNotMatch(index,/>Roll<\/a>/);
  assert.match(cloud,/Your name, studio or practice/);assert.match(cloud,/How you work/);
  assert.match(app,/authState='loading'/);assert.match(app,/Sign in to Seabird/);assert.match(app,/Continue with Google/);
  assert.match(app,/authState='signed-in';save\(\)/);assert.match(app,/if\(a==='sign-in'\)workspace\?\.signInWithGoogle\(\)/);
});
