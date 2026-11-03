import http from'node:http';import fs from'node:fs';import path from'node:path';import projectDraft from'./api/project-draft.js';
const root=path.resolve('dist');
function body(req){return new Promise((resolve,reject)=>{let value='';req.on('data',chunk=>{value+=chunk;if(value.length>50000)reject(new Error('Too large'))});req.on('end',()=>{try{resolve(value?JSON.parse(value):{})}catch(error){reject(error)}});req.on('error',reject)})}
function apiResponse(res){return{setHeader:(key,value)=>res.setHeader(key,value),status(code){res.statusCode=code;return this},json(value){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));return value}}}
http.createServer(async(req,res)=>{
  if(req.url.split('?')[0]==='/api/project-draft'){try{req.body=await body(req);await projectDraft(req,apiResponse(res))}catch{res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({error:'Invalid request.'}))}return}
  let file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return}if(file===root)file=path.join(root,'index.html');fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html');res.end(data)})
}).listen(4318,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4318'));
