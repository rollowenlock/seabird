import config from './backend-config.js';
export function fingerprint(value){return JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);}

export function createCloud(settings=config, request=fetch, storage=null) {
  let session=null, refreshing=null;
  const sessionKey='seabird-session:'+settings?.url;
  function persist(value) {
    session=value;
    if(storage) { if(value)storage.setItem(sessionKey,JSON.stringify(value));else storage.removeItem(sessionKey); }
  }
  async function auth(path, body, token, method='POST') {
    const r=await request(settings.url+'/auth/v1/'+path,{method,headers:{apikey:settings.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
    if(!r.ok)throw new Error('Sign-in expired or failed. Please sign in with your Cookham email and password.');
    const value=r.status===204?null:await r.json();
    if(value?.access_token && !value.expires_at)value.expires_at=Math.floor(Date.now()/1000)+(value.expires_in||3600);
    return value;
  }
  async function fresh() {
    if(!session)throw new Error('Sign in to your workspace first.');
    if(session.expires_at*1000 < Date.now()+60000){
      if(!refreshing)refreshing=auth('token?grant_type=refresh_token',{refresh_token:session.refresh_token}).then(persist).catch(e=>{persist(null);throw e;}).finally(()=>{refreshing=null;});
      await refreshing;
    }
  }
  async function data(path, method='GET', body, publicAccess=false) {
    if(!settings)throw new Error('Cloud sharing is available on the live Seabird app.');
    if(!publicAccess)await fresh();
    const r=await request(settings.url+'/rest/v1/'+path,{method,cache:'no-store',headers:{apikey:settings.key,...(!publicAccess?{Authorization:'Bearer '+session.access_token}:{}),'Content-Type':'application/json','Accept-Profile':settings.schema,'Content-Profile':settings.schema,Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});
    if(!r.ok){
      const error=await r.json().catch(()=>({}));
      if(error.code==='40001'||r.status===409)throw new Error(error.code==='40001'?error.message:'Cloud workspace changed. Load the cloud version before saving.');
      if(error.code==='P0001')throw new Error(error.message);
      if(r.status===401)throw new Error('Your session expired. Sign in again. Your device draft is safe.');
      throw new Error('Could not reach your cloud workspace. Your device draft is safe. Please retry.');
    }
    return r.status===204?[]:r.json();
  }
  return {
    enabled:!!settings,
    get user(){return session?.user??null;},
    async restore(){
      if(!settings||!storage)return null;
      try{session=JSON.parse(storage.getItem(sessionKey)||'null');if(!session)return null;await fresh();const user=await auth('user',null,session.access_token,'GET');persist({...session,user});return user;}catch{persist(null);return null;}
    },
    async signIn(email,password){persist(await auth('token?grant_type=password',{email,password}));return session.user.email;},
    async join(){const existing=await data('profiles?select=user_id');if(!existing.length)await data('profiles','POST',{user_id:session.user.id});},
    async load(){return (await data('workspaces?select=projects,revision,updated_at'))[0]||null;},
    async save(projects,revision){
      const result=revision===null?await data('workspaces','POST',{user_id:session.user.id,projects}):await data('workspaces?revision=eq.'+revision,'PATCH',{projects});
      if(result.length!==1)throw new Error('Cloud workspace changed. Load the cloud version before saving.');
      return result[0];
    },
    async proposal(id){
      const row=(await data('proposals?project_id=eq.'+encodeURIComponent(id)+'&select=*,proposal_versions(*)'))[0];
      if(!row)return null;
      row.acceptances=await data('acceptances?proposal_id=eq.'+encodeURIComponent(row.id)+'&order=version.desc');return row;
    },
    publish(id,project,version){return data('rpc/publish_proposal','POST',{project_id:id,project,expected_version:version});},
    manage(id,action){return data('rpc/manage_proposal','POST',{project_id:id,action});},
    read(token){return data('rpc/read_proposal','POST',{link_token:token},true);},
    accept(token,version,name,email,agreed){return data('rpc/accept_proposal','POST',{link_token:token,expected_version:version,client_name:name,client_email:email,agreed},true);},
    async remove(){await data('profiles?user_id=eq.'+session.user.id,'DELETE');},
    async signOut(){try{if(session)await auth('logout?scope=local',{},session.access_token);}finally{persist(null);}}
  };
}

export function mountCloud({getProjects,setProjects,setAccount,validate,onState=()=>{}}) {
  let storage;try{storage=sessionStorage;}catch{storage=null;}
  const cloud=createCloud(config,fetch,storage);
  const panel=document.createElement('details');panel.className='cloud-panel';
  panel.innerHTML='<summary>Workspace <span class="cloud-summary">· saved on this device</span></summary><p>Sign in to save across devices and publish a client link. Your edits stay private until you publish them.</p><form><label>Email <input name="email" type="email" autocomplete="username" required></label><label>Password <input name="password" type="password" autocomplete="current-password" required></label><button>Sign in</button></form><div class="cloud-controls" hidden><button data-cloud="save" class="primary">Save to cloud</button><button data-cloud="load">Load cloud version</button><button data-cloud="out">Sign out</button><button data-cloud="delete">Delete cloud workspace</button></div><p role="status" class="cloud-status"></p>';
  document.querySelector('header').after(panel);
  const form=panel.querySelector('form'),controls=panel.querySelector('.cloud-controls'),status=panel.querySelector('.cloud-status'),summary=panel.querySelector('.cloud-summary');
  let revision=null,baseline=null,busy=false,needsLoad=false;
  const stateKey=()=> 'seabird-cloud-base:'+cloud.user.id;
  function stamp(row){revision=row?.revision??null;baseline=row?fingerprint(row.projects):null;try{localStorage.setItem(stateKey(),JSON.stringify({revision,baseline}));}catch{}needsLoad=false;}
  function changed(){summary.textContent=cloud.user?(needsLoad?'· choose cloud version':fingerprint(getProjects())===baseline?'· saved to cloud':'· device changes to save'):'· saved on this device';onState();}
  async function run(fn){if(busy)return;busy=true;panel.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='Working…';try{await fn();}catch(e){status.textContent=e.message;}finally{busy=false;panel.querySelectorAll('button').forEach(b=>b.disabled=false);changed();}}
  async function connect(){
    await cloud.join();setAccount(cloud.user.id);
    form.hidden=true;controls.hidden=false;
    needsLoad=true;
    const row=await cloud.load();let saved=null;try{saved=JSON.parse(localStorage.getItem(stateKey())||'null');}catch{}
    if(row && (!Array.isArray(row.projects)||!row.projects.length||!row.projects.every(validate)))throw new Error('Cloud workspace is invalid. Your device draft is unchanged.');
    if(!row){stamp(null);}
    else if(fingerprint(getProjects())===fingerprint(row.projects)){stamp(row);}
    else if(saved?.revision===row.revision){revision=row.revision;baseline=saved.baseline;needsLoad=false;}
    else{revision=null;baseline=null;}
    status.textContent=`Signed in as ${cloud.user.email}. `+(needsLoad?'A cloud workspace exists. Export any device changes before loading it.':row?'Your device draft is ready. Save changes to cloud when ready.':'Save your first project to cloud when ready.');
  }
  const controller={cloud,changed,focus(){panel.open=true;panel.scrollIntoView({behavior:'smooth',block:'start'});form.querySelector('input').focus();},async save(){
    if(!cloud.user)throw new Error('Sign in to your workspace to publish a client link.');
    if(needsLoad)throw new Error('Load your cloud workspace before saving. Export device changes first if you want to keep them.');
    const snapshot=structuredClone(getProjects());
    if(!snapshot.length||!snapshot.every(validate))throw new Error('Please check the project details before saving.');
    const row=await cloud.save(snapshot,revision);stamp(row);changed();return row;
  }};
  if(!cloud.enabled){form.hidden=true;status.textContent='Local preview: cloud saving and publishing are available on the live app.';return controller;}
  form.addEventListener('submit',e=>{e.preventDefault();run(async()=>{await cloud.signIn(form.elements.email.value,form.elements.password.value);form.elements.password.value='';await connect();});});
  controls.addEventListener('click',e=>{const action=e.target.dataset.cloud;if(!action)return;run(async()=>{
    if(action==='save'){await controller.save();status.textContent='Saved to cloud. Published client versions are unchanged.';}
    else if(action==='load'){
      if(!confirm('Load the cloud version and replace this device’s current workspace? Export a backup first to keep device changes.')){status.textContent='Load cancelled.';return;}
      const row=await cloud.load();if(!row||!Array.isArray(row.projects)||!row.projects.length||!row.projects.every(validate))throw new Error('No valid cloud workspace found.');
      stamp(row);setProjects(row.projects);status.textContent='Cloud version loaded. Edit privately, then save or publish when ready.';
    }else if(action==='out'){
      try{await cloud.signOut();}finally{setAccount(null);form.hidden=false;controls.hidden=true;revision=null;baseline=null;needsLoad=false;status.textContent='Signed out. Your account’s device draft is kept separately.';}
    }else if(action==='delete'){
      if(prompt('Type DELETE to remove your Seabird cloud workspace, published links and acceptance records. Your shared Cookham sign-in stays.')!=='DELETE'){status.textContent='Deletion cancelled.';return;}
      await cloud.remove();try{await cloud.signOut();}finally{setAccount(null);form.hidden=false;controls.hidden=true;revision=null;baseline=null;needsLoad=false;status.textContent='Seabird cloud workspace deleted.';}
    }
  });});
  controller.ready=run(async()=>{const user=await cloud.restore();if(user)await connect();else status.textContent='Use your existing Cookham account. Sign-in lasts for this browser tab, including reloads.';});
  return controller;
}
