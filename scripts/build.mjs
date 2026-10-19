import {writeFile} from 'node:fs/promises';
const url=process.env.SEABIRD_SUPABASE_URL||'';
const key=process.env.SEABIRD_SUPABASE_PUBLISHABLE_KEY||'';
if(url && (!url.startsWith('https://') || !key.startsWith('sb_publishable_'))) throw new Error('Expected Supabase URL and publishable key');
// Hosted previews never inherit production database configuration.
const enabled=process.env.VERCEL_ENV==='production' && url && key;
await writeFile('dist/backend-config.js',`export default ${JSON.stringify(enabled?{url,key,schema:'seabird'}:null)};\n`);
