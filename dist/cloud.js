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
    if(!r.ok)throw new Error('Your sign-in expired or failed. Please try again.');
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
    googleAuthorizeUrl(redirectTo){
      if(!settings)throw new Error('Google sign-in is available on the live Seabird app.');
      const url=new URL(settings.url+'/auth/v1/authorize');
      url.searchParams.set('provider','google');
      url.searchParams.set('redirect_to',redirectTo);
      return url.toString();
    },
    async consumeOAuthFragment(fragment){
      const params=new URLSearchParams(String(fragment||'').replace(/^#/,''));
      const oauthError=params.get('error_description')||params.get('error');
      if(oauthError)throw new Error('Google sign-in failed. '+oauthError);
      const accessToken=params.get('access_token');
      if(!accessToken)return false;
      const user=await auth('user',null,accessToken,'GET');
      persist({
        access_token:accessToken,
        refresh_token:params.get('refresh_token')||'',
        expires_at:Number(params.get('expires_at'))||Math.floor(Date.now()/1000)+(Number(params.get('expires_in'))||3600),
        token_type:params.get('token_type')||'bearer',
        user
      });
      return true;
    },
    async join(){const existing=await data('profiles?select=user_id');if(!existing.length)await data('profiles','POST',{user_id:session.user.id});},
    listProjects(){return data('projects?select=id,project,revision,created_at,updated_at&order=updated_at.desc');},
    async saveProject(project,revision){
      const path='projects?id=eq.'+encodeURIComponent(project.id)+(revision===null?'':'&revision=eq.'+revision);
      const result=revision===null?await data('projects','POST',{user_id:session.user.id,id:project.id,project}):await data(path,'PATCH',{project});
      if(result.length!==1)throw new Error('This project changed in the cloud. Load the cloud version before saving.');
      return result[0];
    },
    async deleteProject(id,revision){
      const result=await data('projects?id=eq.'+encodeURIComponent(id)+'&revision=eq.'+revision,'DELETE');
      if(result.length!==1)throw new Error('This project changed in the cloud. Load it before deleting.');
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
  panel.innerHTML='<summary>Workspace <span class="cloud-summary">· saved on this device</span></summary><p>Sign in to keep projects across devices and publish client links. Your edits stay private until you publish them.</p><form><button type="button" class="google-signin" data-cloud="google"><span aria-hidden="true">G</span>Continue with Google</button><div class="cloud-divider"><span>or use email</span></div><div class="email-signin"><label>Email <input name="email" type="email" autocomplete="username" required></label><label>Password <input name="password" type="password" autocomplete="current-password" required></label><button>Sign in</button></div></form><div class="cloud-controls" hidden><button data-cloud="save" class="primary">Save projects to cloud</button><button data-cloud="load">Load cloud projects</button><button data-cloud="out">Sign out</button><button data-cloud="delete">Delete Seabird cloud data</button></div><p role="status" class="cloud-status"></p>';
  document.querySelector('header').after(panel);
  const form=panel.querySelector('form'),controls=panel.querySelector('.cloud-controls'),status=panel.querySelector('.cloud-status'),summary=panel.querySelector('.cloud-summary');
  let rows=new Map(),baseline=new Map(),busy=false,needsLoad=false;
  const stateKey=()=> 'seabird-cloud-base:'+cloud.user.id;
  const projectFingerprint=items=>fingerprint(Object.fromEntries(items.map(project=>[project.id,project])));
  function stamp(nextRows){rows=new Map(nextRows.map(row=>[row.id,row]));baseline=new Map(nextRows.map(row=>[row.id,fingerprint(row.project)]));try{localStorage.setItem(stateKey(),JSON.stringify({revisions:Object.fromEntries(nextRows.map(row=>[row.id,row.revision])),baseline:Object.fromEntries(baseline)}));}catch{}needsLoad=false;}
  function changed(){const local=getProjects(),synced=local.length===baseline.size&&local.every(project=>baseline.get(project.id)===fingerprint(project));summary.textContent=cloud.user?(needsLoad?'· choose cloud version':synced?'· saved to cloud':'· device changes to save'):'· saved on this device';onState();}
  async function run(fn){if(busy)return;busy=true;panel.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='Working…';try{await fn();}catch(e){status.textContent=e.message;}finally{busy=false;panel.querySelectorAll('button').forEach(b=>b.disabled=false);changed();}}
  async function connect(){
    await cloud.join();setAccount(cloud.user.id);
    form.hidden=true;controls.hidden=false;
    needsLoad=true;
    const cloudRows=await cloud.listProjects(),cloudProjects=cloudRows.map(row=>row.project);let saved=null;try{saved=JSON.parse(localStorage.getItem(stateKey())||'null');}catch{}
    if(!cloudProjects.every(validate))throw new Error('A cloud project is invalid. Your device draft is unchanged.');
    if(!cloudRows.length){stamp([]);}
    else if(!getProjects().length){stamp(cloudRows);setProjects(cloudProjects);}
    else if(projectFingerprint(getProjects())===projectFingerprint(cloudProjects)){stamp(cloudRows);}
    else if(saved?.revisions&&cloudRows.every(row=>saved.revisions[row.id]===row.revision)){
      rows=new Map(cloudRows.map(row=>[row.id,row]));baseline=new Map(Object.entries(saved.baseline||{}));needsLoad=false;
    }else{rows=new Map();baseline=new Map();}
    status.textContent=`Signed in as ${cloud.user.email}. `+(needsLoad?'Cloud projects exist. Export any device changes before loading them.':cloudRows.length?'Your projects are ready. Save device changes when you want them in the cloud.':'Create your first project, then save it to cloud.');
  }
  const controller={cloud,changed,focus(){panel.open=true;panel.scrollIntoView({behavior:'smooth',block:'start'});form.querySelector('input').focus();},async save(){
    if(!cloud.user)throw new Error('Sign in to your workspace to publish a client link.');
    if(needsLoad)throw new Error('Load your cloud projects before saving. Export device changes first if you want to keep them.');
    const snapshot=structuredClone(getProjects());
    if(!snapshot.every(project=>validate(project)&&typeof project.id==='string'&&project.id.length>0))throw new Error('Please check the project details before saving.');
    for(const project of snapshot){
      if(baseline.get(project.id)===fingerprint(project))continue;
      const row=await cloud.saveProject(project,rows.get(project.id)?.revision??null);rows.set(project.id,row);
    }
    stamp([...rows.values()]);changed();return [...rows.values()];
  }};
  if(!cloud.enabled){form.hidden=true;status.textContent='Local preview: cloud saving and publishing are available on the live app.';return controller;}
  form.addEventListener('click',e=>{if(e.target.closest('[data-cloud="google"]')){status.textContent='Opening Google…';location.assign(cloud.googleAuthorizeUrl(location.origin+location.pathname));}});
  form.addEventListener('submit',e=>{e.preventDefault();run(async()=>{await cloud.signIn(form.elements.email.value,form.elements.password.value);form.elements.password.value='';await connect();});});
  controls.addEventListener('click',e=>{const action=e.target.dataset.cloud;if(!action)return;run(async()=>{
    if(action==='save'){await controller.save();status.textContent='Projects saved to cloud. Published client versions are unchanged.';}
    else if(action==='load'){
      if(!confirm('Load cloud projects and replace this device’s current project list? Export a backup first to keep device changes.')){status.textContent='Load cancelled.';return;}
      const nextRows=await cloud.listProjects();if(!nextRows.length||!nextRows.every(row=>validate(row.project)))throw new Error('No valid cloud projects found.');
      stamp(nextRows);setProjects(nextRows.map(row=>row.project));status.textContent='Cloud projects loaded. Edit privately, then save or publish when ready.';
    }else if(action==='out'){
      try{await cloud.signOut();}finally{setAccount(null);form.hidden=false;controls.hidden=true;rows=new Map();baseline=new Map();needsLoad=false;status.textContent='Signed out. Your account’s device draft is kept separately.';}
    }else if(action==='delete'){
      if(prompt('Type DELETE to remove your Seabird cloud workspace, published links and acceptance records. Your shared Cookham sign-in stays.')!=='DELETE'){status.textContent='Deletion cancelled.';return;}
      await cloud.remove();try{await cloud.signOut();}finally{setAccount(null);form.hidden=false;controls.hidden=true;rows=new Map();baseline=new Map();needsLoad=false;status.textContent='Seabird cloud workspace deleted.';}
    }
  });});
  controller.ready=run(async()=>{
    const oauthFragment=/^#(?:access_token|error|error_description)=/.test(location.hash);
    let oauth=false;
    try{if(oauthFragment)oauth=await cloud.consumeOAuthFragment(location.hash);}
    finally{if(oauthFragment)history.replaceState(null,'',location.pathname+location.search);}
    const user=oauth?cloud.user:await cloud.restore();
    if(user)await connect();else status.textContent='Continue with Google to create your workspace, or use an existing Cookham account. Sign-in lasts for this browser tab.';
  });
  return controller;
}
