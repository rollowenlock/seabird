import {clientProject,validate} from './model.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const when=s=>new Date(s).toLocaleString('en-NZ',{dateStyle:'medium',timeStyle:'short'});
export const acceptanceStatement='I have reviewed and accept this version of the scope, fee, schedule and terms, and am authorised to accept on behalf of the client.';

function changeSummary(previous,next){
  if(!previous)return[];const changes=[];
  if(JSON.stringify(previous.stagePlan)!==JSON.stringify(next.stagePlan))changes.push('schedule');
  if(previous.fee!==next.fee||previous.currency!==next.currency||previous.deposit!==next.deposit||previous.paymentNote!==next.paymentNote)changes.push('price & payment');
  if(JSON.stringify(previous.deliverableItems??previous.deliverables)!==JSON.stringify(next.deliverableItems??next.deliverables))changes.push('deliverables');
  if(previous.terms!==next.terms||previous.rights!==next.rights||previous.changesPolicy!==next.changesPolicy)changes.push('terms');
  return changes;
}

export async function shareProject({workspace,project,open,toast,download,onPublished}){
  if(!workspace?.cloud.user){workspace?.focus();toast('Sign in to your workspace to publish a client link.');return;}
  const cloud=workspace.cloud, snapshot=clientProject(structuredClone(project));
  if(!validate(snapshot)||!snapshot.title.trim()||!snapshot.client.trim()){toast('Add a project name and client before publishing.');return;}
  let row;
  try{row=await cloud.proposal(project.id);}catch(e){toast(e.message);return;}
  const current=row?.proposal_versions.find(v=>v.version===row.version);
  const same=current && JSON.stringify(clientProject(current.project))===JSON.stringify(snapshot);
  const changes=changeSummary(current?.project,snapshot);
  const url=row?location.origin+location.pathname+'#proposal='+row.token:'';
  const acceptances=[...(row?.acceptances??[])].sort((a,b)=>b.version-a.version);
  const accepted=acceptances.find(a=>a.version===row.version);
  open('Your client link',`<p class="hint">Publish the scope, fee, schedule and terms for your client. Your working rates, progress history and delay notes stay private. Anyone with the link can view and accept it; keep it with the intended client.</p>${row?`<div class="share-status"><b>${row.revoked?'Link revoked':`Published · version ${row.version}`}</b><p>${accepted?`Accepted ${esc(when(accepted.accepted_at))} by ${esc(accepted.name)}`:'Awaiting client acceptance'}</p></div>${!row.revoked?`<label for="share-link">Client link</label><textarea id="share-link" readonly>${esc(url)}</textarea><div class="share-buttons"><button type="button" id="copy-link">Copy link</button><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open client page ↗</a><button type="button" id="revoke-link">Revoke link</button></div>`:'<p>The old link is unavailable. A replacement gets a new address.</p><button type="button" id="replace-link">Create replacement link</button>'}`:'<p>No client link yet. Publishing also saves your draft to cloud.</p>'}${changes.length?`<div class="change-summary"><b>Working plan differs</b><p>This version changes: ${esc(changes.join(', '))}.</p></div>`:''}<p class="hint">${row?.revoked?'':same?'The published version matches this draft.':'Publishing makes this draft the current version at the same link. Previous versions and their acceptances stay in your records.'}</p>${acceptances.length?`<details class="acceptance-history"><summary>Acceptance history (${acceptances.length})</summary>${acceptances.map(a=>`<p><b>Version ${a.version}</b> · ${esc(a.name)}<br>${esc(a.email)}<br>${esc(when(a.accepted_at))}</p>`).join('')}<button type="button" id="download-records">Download acceptance records</button><p class="hint">Names and emails are supplied by the person using the link; their identity is not independently verified.</p></details>`:''}<p id="sharing-error" role="status"></p>`,row?.revoked?null:async()=>{
    await run(async()=>{
      await workspace.save();
      const result=await cloud.publish(project.id,snapshot,row?.version??0);
      if(onPublished&&!same)await onPublished(result);
      document.querySelector('#dialog').close();toast(`Version ${result.version} published.`);
      await shareProject({workspace,project,open,toast,download,onPublished});
    });
  },same?'Keep published version':'Publish client version');
  async function run(fn){
    const dialog=document.querySelector('#dialog'),buttons=[...dialog.querySelectorAll('button')];
    if(dialog.dataset.busy==='yes')return;
    dialog.dataset.busy='yes';buttons.forEach(b=>b.disabled=true);
    try{await fn();}catch(e){const status=document.querySelector('#sharing-error');if(status)status.textContent=e.message;}
    finally{dialog.dataset.busy='no';buttons.forEach(b=>b.disabled=false);}
  }
  const copy=document.querySelector('#copy-link');if(copy)copy.onclick=()=>run(async()=>{try{await navigator.clipboard.writeText(url);toast('Client link copied.');}catch{document.querySelector('#share-link').select();toast('Select and copy the link.');}});
  const revoke=document.querySelector('#revoke-link');if(revoke)revoke.onclick=()=>run(async()=>{
    if(!confirm('Revoke this client link? It will no longer open or accept responses. Saved acceptance records stay.'))return;
    await cloud.manage(project.id,'revoke');document.querySelector('#dialog').close();await shareProject({workspace,project,open,toast,download});
  });
  const replace=document.querySelector('#replace-link');if(replace)replace.onclick=()=>run(async()=>{await cloud.manage(project.id,'replace');document.querySelector('#dialog').close();await shareProject({workspace,project,open,toast,download});});
  const records=document.querySelector('#download-records');if(records)records.onclick=()=>download('seabird-acceptance-records.json',JSON.stringify({project:project.title,records:acceptances.map(a=>({...a,published:row.proposal_versions.find(v=>v.version===a.version)}))},null,2));
}

export function acceptancePanel({cloud,token,record,reload}){
  const panel=document.createElement('section');panel.className='acceptance-panel';panel.setAttribute('aria-label','Client acceptance');
  panel.innerHTML=`<span class="section-label">VERSION ${record.version} · PUBLISHED ${esc(when(record.published_at))}</span><h2>${record.accepted_at?'Acceptance recorded':'Ready to go ahead?'}</h2>${record.accepted_at?`<p>This version was accepted on ${esc(when(record.accepted_at))}. Keep a PDF of the agreement for your records.</p>`:`<p>Review the agreement and all project details above before accepting.</p><form><div class="pair"><label>Your full name<input name="name" maxlength="200" autocomplete="name" required></label><label>Your email<input name="email" type="email" maxlength="254" autocomplete="email" required></label></div><label class="acceptance-check"><input name="agreed" type="checkbox" required><span>${acceptanceStatement}</span></label><button class="primary">Accept version ${record.version}</button><p class="hint">Your name, email, the version and acceptance time will be recorded for Roll. No payment is taken.</p><p role="status"></p></form>`}`;
  const form=panel.querySelector('form');
  if(form)form.onsubmit=async e=>{
    e.preventDefault();const button=form.querySelector('button');if(button.disabled)return;button.disabled=true;
    const status=form.querySelector('[role="status"]');status.textContent='Recording acceptance…';
    try{await cloud.accept(token,record.version,form.elements.name.value.trim(),form.elements.email.value.trim(),form.elements.agreed.checked);await reload();}
    catch(error){status.textContent=error.message;button.disabled=false;}
  };
  return panel;
}
