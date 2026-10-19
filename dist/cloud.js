import config from './backend-config.js';
export function createCloud(settings=config, request=fetch) {
  let session=null;
  async function auth(path, body, token) {
    const r=await request(settings.url+'/auth/v1/'+path,{method:'POST',headers:{apikey:settings.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
    if(!r.ok)throw new Error('Sign-in failed. Check your Cookham email and password.');
    return r.status===204?null:r.json();
  }
  async function data(path, method='GET', body) {
    if(!session)throw new Error('Sign in first.');
    if(session.expires_at*1000 < Date.now()+60000){session=await auth('token?grant_type=refresh_token',{refresh_token:session.refresh_token});}
    const r=await request(settings.url+'/rest/v1/'+path,{method,headers:{apikey:settings.key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json','Accept-Profile':settings.schema,'Content-Profile':settings.schema,Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});
    if(r.status===409)throw new Error('Cloud workspace changed. Load the cloud version before saving.');
    if(!r.ok)throw new Error('Cloud request failed. Your local work is unchanged.');
    return r.status===204?[]:r.json();
  }
  return {
    enabled:!!settings,
    async signIn(email,password){session=await auth('token?grant_type=password',{email,password});return session.user.email;},
    async join(){const existing=await data('profiles?select=user_id');if(!existing.length)await data('profiles','POST',{user_id:session.user.id});},
    async load(){return (await data('workspaces?select=projects,revision,updated_at'))[0]||null;},
    async save(projects,revision){
      const result=revision===null?await data('workspaces','POST',{user_id:session.user.id,projects}):await data('workspaces?revision=eq.'+revision,'PATCH',{projects});
      if(result.length!==1)throw new Error('Cloud workspace changed. Load the cloud version before saving.');
      return result[0];
    },
    async remove(){await data('profiles?user_id=eq.'+session.user.id,'DELETE');},
    async signOut(){try{if(session)await auth('logout?scope=local',{},session.access_token);}finally{session=null;}}
  };
}

export function mountCloud({getProjects,setProjects,validate}) {
  const cloud=createCloud();if(!cloud.enabled)return;
  const panel=document.createElement('details');panel.className='cloud-panel';
  panel.innerHTML='<summary>Cloud workspace</summary><p>Private saving across devices. Sign in with your existing Cookham email and password. Changes save to this device until you choose Save to cloud.</p><form><label>Email <input name="email" type="email" autocomplete="username" required></label><label>Password <input name="password" type="password" autocomplete="current-password" required></label><button>Sign in</button></form><div class="cloud-controls" hidden><button data-cloud="save">Save to cloud</button><button data-cloud="load">Load from cloud</button><button data-cloud="out">Sign out</button><button data-cloud="delete">Delete Seabird cloud data</button></div><p role="status" class="cloud-status"></p>';
  document.querySelector('header').after(panel);
  const form=panel.querySelector('form'),controls=panel.querySelector('.cloud-controls'),status=panel.querySelector('.cloud-status');
  let revision=null,busy=false;
  async function run(fn){if(busy)return;busy=true;panel.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='Working…';try{await fn();}catch(e){status.textContent=e.message;}finally{busy=false;panel.querySelectorAll('button').forEach(b=>b.disabled=false);}}
  form.addEventListener('submit',e=>{e.preventDefault();run(async()=>{const email=await cloud.signIn(form.email.value,form.password.value);form.password.value='';await cloud.join();const row=await cloud.load();revision=row?.revision??null;form.hidden=true;controls.hidden=false;status.textContent=`Signed in as ${email}. ${row?'Load your cloud workspace before editing on this device.':'No cloud workspace yet. Save when ready.'}`;controls.querySelector('[data-cloud="save"]').dataset.needsLoad=row?'yes':'no';});});
  controls.addEventListener('click',e=>{const action=e.target.dataset.cloud;if(!action)return;run(async()=>{
    if(action==='save'){
      if(controls.querySelector('[data-cloud="save"]').dataset.needsLoad==='yes')throw new Error('Load your existing cloud workspace before saving from this device.');
      const projects=getProjects();if(!projects.every(validate))throw new Error('A proposal is invalid; cloud save stopped.');
      const row=await cloud.save(projects,revision);revision=row.revision;status.textContent='Saved to cloud.';
    }else if(action==='load'){
      if(!confirm('Replace this device’s workspace with your cloud workspace?')){status.textContent='Load cancelled.';return;}
      const row=await cloud.load();if(!row)throw new Error('No cloud workspace saved yet.');
      if(!Array.isArray(row.projects)||!row.projects.length||!row.projects.every(validate))throw new Error('Cloud workspace is empty or invalid.');
      setProjects(row.projects);revision=row.revision;controls.querySelector('[data-cloud="save"]').dataset.needsLoad='no';status.textContent='Cloud workspace loaded. New changes save locally until you choose Save to cloud.';
    }else if(action==='out'){await cloud.signOut();form.hidden=false;controls.hidden=true;revision=null;status.textContent='Signed out. Device copy remains.';}
    else if(action==='delete'){
      if(prompt('Type DELETE to remove your Seabird cloud workspace. Other apps and your shared sign-in remain.')!=='DELETE'){status.textContent='Deletion cancelled.';return;}
      await cloud.remove();await cloud.signOut();form.hidden=false;controls.hidden=true;revision=null;status.textContent='Seabird cloud data deleted. Device copy remains.';
    }
  });});
}
