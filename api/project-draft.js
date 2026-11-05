const schema={type:'object',additionalProperties:false,required:['title','client','description','deliverables','start','programme','fee','deposit','paymentNote','terms'],properties:{
  title:{type:'string',maxLength:200},client:{type:'string',maxLength:200},description:{type:'string',maxLength:1000},
  deliverables:{type:'array',minItems:1,maxItems:12,items:{type:'object',additionalProperties:false,required:['name','specs'],properties:{name:{type:'string',maxLength:200},specs:{type:'string',maxLength:1000}}}},
  start:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$'},programme:{type:'object',additionalProperties:false,required:['directionDays','makingDays','reviewRounds','reviewDays','finishDays'],properties:{directionDays:{type:'integer',minimum:1,maximum:90},makingDays:{type:'integer',minimum:1,maximum:90},reviewRounds:{type:'integer',minimum:1,maximum:6},reviewDays:{type:'integer',minimum:1,maximum:90},finishDays:{type:'integer',minimum:1,maximum:90}}},
  fee:{type:'number',minimum:0,maximum:1000000000},deposit:{type:'integer',minimum:0,maximum:100},paymentNote:{type:'string',maxLength:3000},terms:{type:'string',maxLength:5000}
}};

const text=value=>typeof value==='string'?value.trim():'';
function validInput(value){return value&&typeof value==='object'&&!Array.isArray(value)&&text(value.brief).length<=10000&&text(value.notes).length<=10000&&JSON.stringify(value).length<50000;}
function outputText(response){if(typeof response.output_text==='string')return response.output_text;for(const item of response.output||[])for(const part of item.content||[])if(part.type==='output_text'&&typeof part.text==='string')return part.text;return'';}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST.'});}
  if(!validInput(req.body))return res.status(400).json({error:'Add a shorter project brief and try again.'});
  const authorization=req.headers.authorization||'',supabaseUrl=process.env.SEABIRD_SUPABASE_URL,publishableKey=process.env.SEABIRD_SUPABASE_PUBLISHABLE_KEY;
  if(!authorization.startsWith('Bearer ')||!supabaseUrl||!publishableKey)return res.status(401).json({error:'Sign in to use AI suggestions.'});
  const userResponse=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{Authorization:authorization,apikey:publishableKey}}).catch(()=>null);
  if(!userResponse?.ok)return res.status(401).json({error:'Your sign-in expired. Sign in again.'});
  const gatewayToken=process.env.VERCEL_OIDC_TOKEN||process.env.AI_GATEWAY_API_KEY;
  if(!gatewayToken)return res.status(503).json({error:'AI suggestions are not configured. Your instant draft is still ready.'});
  const {brief='',notes='',defaults={},profile={},current={}}=req.body;
  const prompt=`Create a concise, practical first project record for a freelancer or small studio. Use the supplied account defaults unless the brief clearly requires something else. Never invent a named client, precise technical specification, legal promise, price, or date that is not supported; use clear "to confirm" wording instead. Return a best guess for every field.\n\nACCOUNT DEFAULTS\n${JSON.stringify(defaults)}\n\nWORK TYPE\n${JSON.stringify(profile.work_types||[])}\n\nCURRENT DRAFT\n${JSON.stringify(current)}\n\nPROJECT BRIEF\n${text(brief)}\n\nCLIENT NOTES\n${text(notes)}`;
  const ai=await fetch('https://ai-gateway.vercel.sh/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${gatewayToken}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.AI_GATEWAY_PROJECT_DRAFT_MODEL||'google/gemini-2.5-flash-lite',store:false,reasoning:{effort:'low'},input:[{role:'system',content:'You draft grounded project records. Be terse, professional and explicit about uncertainty.'},{role:'user',content:prompt}],text:{format:{type:'json_schema',name:'project_draft',strict:true,schema}}})}).catch(()=>null);
  if(!ai?.ok){const status=ai?.status===429?429:502,message=ai?.status===429?'AI is busy. Try again shortly; your instant draft is still ready.':ai?.status===402||ai?.status===403?'AI suggestions are temporarily paused. Your instant draft is still ready.':'AI suggestions are unavailable. Your instant draft is still ready.';return res.status(status).json({error:message});}
  try{return res.status(200).json({draft:JSON.parse(outputText(await ai.json()))});}catch{return res.status(502).json({error:'AI returned an unusable draft. Your instant draft is still ready.'});}
}

export {schema,validInput,outputText};
