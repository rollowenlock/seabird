import config from './backend-config.js';
import {normaliseProjectDefaults} from './projects.js';
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
    if(!session)throw new Error('Sign in to Seabird first.');
    if(session.expires_at*1000 < Date.now()+60000){
      if(!refreshing)refreshing=auth('token?grant_type=refresh_token',{refresh_token:session.refresh_token}).then(persist).catch(e=>{persist(null);throw e;}).finally(()=>{refreshing=null;});
      await refreshing;
    }
  }
  async function data(path, method='GET', body, publicAccess=false) {
    if(!settings)throw new Error('This is available in the live Seabird app.');
    if(!publicAccess)await fresh();
    const r=await request(settings.url+'/rest/v1/'+path,{method,cache:'no-store',headers:{apikey:settings.key,...(!publicAccess?{Authorization:'Bearer '+session.access_token}:{}),'Content-Type':'application/json','Accept-Profile':settings.schema,'Content-Profile':settings.schema,Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});
    if(!r.ok){
      const error=await r.json().catch(()=>({}));
      if(error.code==='40001'||r.status===409)throw new Error(error.code==='40001'?error.message:'This project changed elsewhere. Refresh to get the latest version.');
      if(error.code==='P0001')throw new Error(error.message);
      if(r.status===401)throw new Error('Your session expired. Sign in again.');
      throw new Error('Could not save to Seabird. Check your connection and retry.');
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
    async profile(){return (await data('profiles?select=display_name,organisation_type,provider_label,work_types,logo_path,project_defaults,onboarding_completed_at,updated_at'))[0]??null;},
    async saveProfile(profile){
      const result=await data('profiles?user_id=eq.'+session.user.id,'PATCH',profile);
      if(result.length!==1)throw new Error('Could not save these settings. Please try again.');
      return result[0];
    },
    logoUrl(path,version=''){return path?settings.url+'/storage/v1/object/public/seabird-branding/'+path.split('/').map(encodeURIComponent).join('/')+(version?'?v='+encodeURIComponent(version):''):null;},
    async uploadLogo(file){
      if(!['image/png','image/jpeg','image/webp'].includes(file?.type)||file.size>2097152)throw new Error('Choose a PNG, JPEG or WebP logo under 2 MB.');
      await fresh();const path=session.user.id+'/logo';
      const r=await request(settings.url+'/storage/v1/object/seabird-branding/'+path,{method:'POST',headers:{apikey:settings.key,Authorization:'Bearer '+session.access_token,'Content-Type':file.type,'x-upsert':'true'},body:file});
      if(!r.ok)throw new Error('Could not upload that logo. Please try again.');
      return path;
    },
    async removeLogo(path){
      if(!path)return;await fresh();
      const r=await request(settings.url+'/storage/v1/object/seabird-branding',{method:'DELETE',headers:{apikey:settings.key,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[path]})});
      if(!r.ok&&r.status!==404)throw new Error('Could not remove that logo. Please try again.');
    },
    listProjects(){return data('projects?select=id,project,revision,created_at,updated_at&order=updated_at.desc');},
    async saveProject(project,revision){
      const path='projects?id=eq.'+encodeURIComponent(project.id)+(revision===null?'':'&revision=eq.'+revision);
      const result=revision===null?await data('projects','POST',{user_id:session.user.id,id:project.id,project}):await data(path,'PATCH',{project});
      if(result.length!==1)throw new Error('This project changed elsewhere. Refresh to get the latest version.');
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

export function mountCloud({getProjects,setProjects,setAccount,setProfile=()=>{},validate,onState=()=>{},onError=()=>{}}) {
  let storage;try{storage=sessionStorage;}catch{storage=null;}
  const cloud=createCloud(config,fetch,storage);
  const panel=document.createElement('details');panel.className='cloud-panel';
  panel.innerHTML=`<summary><span class="cloud-summary">Account &amp; settings</span></summary><button type="button" class="cloud-close" data-cloud="close" aria-label="Close account and settings">×</button>
    <div class="signed-out"><p>Sign in to use Seabird on any device.</p><form class="auth-form"><button type="button" class="google-signin" data-cloud="google"><span aria-hidden="true">G</span>Continue with Google</button><div class="cloud-divider"><span>or use email</span></div><div class="email-signin"><label>Email <input name="email" type="email" autocomplete="username" required></label><label>Password <input name="password" type="password" autocomplete="current-password" required></label><button>Sign in</button></div></form></div>
    <div class="signed-in" hidden><form class="profile-form">
      <label>Display name<input name="display_name" maxlength="120" required placeholder="Your name, studio or practice"></label>
      <label>How you work<select name="organisation_type" required><option value="unspecified">Not specified</option><option value="individual">Individual</option><option value="freelancer">Freelancer</option><option value="studio">Studio</option><option value="practice">Practice</option><option value="company">Company</option><option value="other">Something else</option></select></label>
      <label class="profile-wide provider-label-field" hidden>What should agreements call you?<input name="provider_label" maxlength="60" placeholder="Collective, agency, partnership…"></label>
      <label class="profile-wide">Types of work<input name="work_types" maxlength="1000" placeholder="Architecture, motion design, sound design"></label>
      <label class="profile-wide">Logo (optional)<input name="logo" type="file" accept="image/png,image/jpeg,image/webp"></label>
      <div class="profile-logo" hidden><img alt="Current logo"><button type="button" data-cloud="remove-logo">Remove logo</button></div>
      <details class="profile-defaults profile-wide"><summary>New project defaults</summary><div class="profile-default-grid">
        <label>Currency<select name="currency">${['NZD','AUD','USD','GBP','EUR'].map(value=>`<option>${value}</option>`).join('')}</select></label>
        <label>Private day rate (optional)<input name="rate" type="number" min="0" max="1000000" step="0.01"></label>
        <label class="profile-wide">Tax wording<input name="tax" maxlength="200"></label>
        <label>Usual deposit (%)<input name="deposit" type="number" min="0" max="100" step="1"></label>
        <label>Main working stage<input name="makingStageName" maxlength="100"></label>
        <label>Direction days<input name="conceptDays" type="number" min="1" max="90" step="1"></label>
        <label>Main working-stage days<input name="animationDays" type="number" min="1" max="90" step="1"></label>
        <label>Review rounds<input name="reviews" type="number" min="1" max="6" step="1"></label>
        <label>Days per review<input name="reviewDays" type="number" min="1" max="90" step="1"></label>
        <label>Finishing / delivery days<input name="finishDays" type="number" min="1" max="90" step="1"></label>
        <label class="profile-wide">Payment wording<textarea name="paymentNote" maxlength="10000"></textarea></label>
      </div></details>
      <div class="profile-actions"><button class="primary">Save settings</button><button type="button" data-cloud="out">Sign out</button><button type="button" data-cloud="delete">Delete Seabird account data</button></div>
    </form></div><p role="status" class="cloud-status"></p>`;
  document.querySelector('footer').prepend(panel);
  const authArea=panel.querySelector('.signed-out'),signedIn=panel.querySelector('.signed-in'),authForm=panel.querySelector('.auth-form'),profileForm=panel.querySelector('.profile-form'),logoPreview=panel.querySelector('.profile-logo'),status=panel.querySelector('.cloud-status'),summary=panel.querySelector('.cloud-summary');
  let rows=new Map(),baseline=new Map(),busy=false,connected=false,timer=null,saving=null,queued=false,currentProfile=null;
  function stamp(nextRows){rows=new Map(nextRows.map(row=>[row.id,row]));baseline=new Map(nextRows.map(row=>[row.id,fingerprint(row.project)]));}
  function changed(){summary.textContent='Account & settings';onState();if(!connected||!cloud.user)return;clearTimeout(timer);timer=setTimeout(()=>{flush(true).catch(()=>{});},300);}
  async function run(fn,rethrow=false){if(busy)return;busy=true;panel.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='Working…';try{return await fn();}catch(e){status.textContent=e.message;if(rethrow)throw e;}finally{busy=false;panel.querySelectorAll('button').forEach(b=>b.disabled=false);changed();}}
  const providerLabels={unspecified:'Provider',individual:'Individual',freelancer:'Freelancer',studio:'Studio',practice:'Practice',company:'Company'};
  function toggleProviderLabel(){profileForm.querySelector('.provider-label-field').hidden=profileForm.elements.organisation_type.value!=='other';}
  function showProfile(profile){
    currentProfile=profile;const defaults=normaliseProjectDefaults(profile?.project_defaults);
    profileForm.elements.display_name.value=profile?.display_name||'';profileForm.elements.organisation_type.value=profile?.organisation_type||'unspecified';profileForm.elements.provider_label.value=profile?.provider_label||'';profileForm.elements.work_types.value=(profile?.work_types||[]).join(', ');profileForm.elements.logo.value='';
    for(const [key,value] of Object.entries(defaults))if(profileForm.elements[key])profileForm.elements[key].value=key==='rate'&&!value?'':value;
    toggleProviderLabel();
    const logoUrl=cloud.logoUrl(profile?.logo_path,profile?.updated_at);logoPreview.hidden=!logoUrl;if(logoUrl)logoPreview.querySelector('img').src=logoUrl;
    setProfile(profile?{...profile,logo_url:logoUrl}:null);
  }
  async function connect(){
    await cloud.join();setAccount(cloud.user.id);
    authArea.hidden=true;signedIn.hidden=false;
    const [profile,cloudRows]=await Promise.all([cloud.profile(),cloud.listProjects()]),cloudProjects=cloudRows.map(row=>row.project);
    if(!cloudProjects.every(validate))throw new Error('A project in this account is invalid.');
    showProfile(profile);stamp(cloudRows);setProjects(cloudProjects);connected=true;
    status.textContent=`Signed in as ${cloud.user.email}.`;
  }
  async function flush(reportError=false){
    clearTimeout(timer);
    if(!cloud.user)throw new Error('Sign in to continue.');
    if(!connected)return[];
    if(saving){queued=true;return saving;}
    const snapshot=structuredClone(getProjects());
    if(!snapshot.every(project=>validate(project)&&typeof project.id==='string'&&project.id.length>0))throw new Error('Please check the project details before saving.');
    saving=(async()=>{
      for(const project of snapshot){
        if(baseline.get(project.id)===fingerprint(project))continue;
        const row=await cloud.saveProject(project,rows.get(project.id)?.revision??null);rows.set(project.id,row);
      }
      stamp([...rows.values()]);status.textContent=`Signed in as ${cloud.user.email}.`;return[...rows.values()];
    })().catch(error=>{status.textContent=error.message;if(reportError)onError(error.message);throw error;}).finally(()=>{saving=null;if(queued){queued=false;changed();}});
    return saving;
  }
  async function updateProfile(patch,file){
    return run(async()=>{let logoPath=currentProfile?.logo_path||null;if(file)logoPath=await cloud.uploadLogo(file);const profile=await cloud.saveProfile({...patch,...(file?{logo_path:logoPath}:{})});showProfile(profile);status.textContent='Settings saved.';return profile;},true);
  }
  const controller={cloud,get profile(){return currentProfile;},changed,focus(){panel.open=true;(signedIn.hidden?authForm:profileForm).querySelector('input').focus();},signInWithGoogle(){location.assign(cloud.googleAuthorizeUrl(location.origin+location.pathname));},updateProfile,async save(){
    return flush(false);
  }};
  panel.querySelector('[data-cloud="close"]').addEventListener('click',()=>{panel.open=false;});
  if(!cloud.enabled){authForm.hidden=true;status.textContent='The backend connection is configured in the deployed app.';return controller;}
  authForm.addEventListener('click',e=>{if(e.target.closest('[data-cloud="google"]')){status.textContent='Opening Google…';location.assign(cloud.googleAuthorizeUrl(location.origin+location.pathname));}});
  authForm.addEventListener('submit',e=>{e.preventDefault();run(async()=>{await cloud.signIn(authForm.elements.email.value,authForm.elements.password.value);authForm.elements.password.value='';await connect();});});
  profileForm.addEventListener('submit',e=>{e.preventDefault();run(async()=>{
    const displayName=profileForm.elements.display_name.value.trim();
    const workTypes=[...new Set(profileForm.elements.work_types.value.split(',').map(value=>value.trim()).filter(Boolean))];
    const organisationType=profileForm.elements.organisation_type.value,providerLabel=organisationType==='other'?profileForm.elements.provider_label.value.trim():providerLabels[organisationType];
    if(!displayName)throw new Error('Add a display name.');if(!providerLabel)throw new Error('Add the label agreements should use.');if(workTypes.length>12||workTypes.some(value=>value.length>80))throw new Error('Use up to 12 work types, each under 80 characters.');
    const projectDefaults=normaliseProjectDefaults(Object.fromEntries(['currency','rate','tax','deposit','makingStageName','conceptDays','animationDays','reviews','reviewDays','finishDays','paymentNote'].map(key=>[key,profileForm.elements[key].value])));
    let logoPath=currentProfile?.logo_path||null;const file=profileForm.elements.logo.files[0];if(file)logoPath=await cloud.uploadLogo(file);
    const profile=await cloud.saveProfile({display_name:displayName,organisation_type:organisationType,provider_label:providerLabel,work_types:workTypes,project_defaults:projectDefaults,logo_path:logoPath});showProfile(profile);status.textContent='Settings saved.';
  });});
  profileForm.elements.organisation_type.addEventListener('change',toggleProviderLabel);
  signedIn.addEventListener('click',e=>{const action=e.target.dataset.cloud;if(!action)return;run(async()=>{
    if(action==='out'){
      try{await cloud.signOut();}finally{clearTimeout(timer);connected=false;setAccount(null);showProfile(null);authArea.hidden=false;signedIn.hidden=true;rows=new Map();baseline=new Map();status.textContent='Signed out.';}
    }else if(action==='remove-logo'){
      const path=currentProfile?.logo_path;const profile=await cloud.saveProfile({logo_path:null});await cloud.removeLogo(path);showProfile(profile);status.textContent='Logo removed.';
    }else if(action==='delete'){
      if(prompt('Type DELETE to remove your Seabird projects, published links and acceptance records. Your shared Cookham sign-in stays.')!=='DELETE'){status.textContent='Deletion cancelled.';return;}
      await cloud.removeLogo(currentProfile?.logo_path);await cloud.remove();try{await cloud.signOut();}finally{clearTimeout(timer);connected=false;setAccount(null);showProfile(null);authArea.hidden=false;signedIn.hidden=true;rows=new Map();baseline=new Map();status.textContent='Seabird account data deleted.';}
    }
  });});
  controller.ready=run(async()=>{
    const oauthFragment=/^#(?:access_token|error|error_description)=/.test(location.hash);
    let oauth=false;
    try{if(oauthFragment)oauth=await cloud.consumeOAuthFragment(location.hash);}
    finally{if(oauthFragment)history.replaceState(null,'',location.pathname+location.search);}
    const user=oauth?cloud.user:await cloud.restore();
    if(user)await connect();else{setAccount(null);setProfile(null);status.textContent='Sign in to use Seabird.';}
  });
  return controller;
}
