import {stages, deliverableItems} from './model.js';

export function agreementDefinition(p, issued = new Date()) {
  const plan = stages(p), end = plan.at(-1).end;
  const date = value => new Date(value+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  const money = value => new Intl.NumberFormat('en-NZ',{style:'currency',currency:p.currency,minimumFractionDigits:2}).format(value);
  const deposit = Math.round(p.fee*p.deposit/100), balance=p.fee-deposit;
  const section = text => ({text,style:'section'});
  const paragraph = text => ({text:String(text),margin:[0,0,0,10]});
  const rows = plan.map((s,i)=>[
    {text:String(i+1).padStart(2,'0'),color:'#78826b'},
    {stack:[{text:s.name,bold:true},{text:s.owner,fontSize:9,color:'#697063',margin:[0,3,0,0]}]},
    {text:date(s.start)+(s.end===s.start?'':' - '+date(s.end)),fontSize:9},
  ]);
  const width=499, step=width/plan.length;
  return {
    info:{title:`${p.title} - Project agreement`,author:'Roll',creator:'Seabird',subject:`Project agreement between Roll and ${p.client}`},
    pageSize:'A4',pageMargins:[48,48,48,48],
    defaultStyle:{font:'Roboto',fontSize:10,lineHeight:1.3,color:'#30372e'},
    styles:{section:{fontSize:16,bold:true,margin:[0,20,0,10]},muted:{color:'#72786e',fontSize:9},title:{fontSize:29,bold:true,margin:[0,12,0,10]}},
    footer:(page,pages)=>({columns:[{text:'Roll / '+p.client,width:'*'},{text:`Seabird  ·  ${page} / ${pages}`,alignment:'right',width:120}],margin:[48,15,48,0],fontSize:8,color:'#72786e'}),
    content:[
      {columns:[{text:'Roll',fontSize:17,bold:true},{text:'PROJECT AGREEMENT\nPrepared '+issued.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Pacific/Auckland'}),alignment:'right',style:'muted'}]},
      {text:p.title,style:'title'},
      paragraph(p.description),
      {text:[{text:'Freelancer: ',bold:true},'Roll',{text:'     Client: ',bold:true},p.client],margin:[0,2,0,18]},
      {columns:[{stack:[{text:'PROJECT FEE',style:'muted'},{text:money(p.fee)+' '+p.currency,fontSize:22,margin:[0,4,0,4]},{text:p.tax,style:'muted'}]},
        {stack:[{text:'PROJECT DATES',style:'muted'},{text:date(p.start)+' - '+date(end),margin:[0,6,0,4]},{text:`${p.reviews} review rounds · ${p.reviewDays} working days each`,style:'muted'}]}]},
      section('The plan, in one line'),
      {canvas:plan.map((s,i)=>({type:'rect',x:i*step,y:0,w:step-3,h:10,r:2,color:s.color})),margin:[0,0,0,5]},
      {columns:plan.map((s,i)=>({stack:[{text:String(i+1).padStart(2,'0'),fontSize:8},...(plan.length<=8?[{text:s.name,fontSize:7,margin:[0,3,0,0]},{text:date(s.start),fontSize:7,margin:[0,2,0,0]}]:[])],width:step,color:'#72786e'})),columnGap:0,margin:[0,0,0,12]},
      {text:'The numbered moments above match the complete schedule below.',style:'muted'},
      section('01 / Deliverables'),
      ...deliverableItems(p).flatMap(item=>[{text:item.name,bold:true,margin:[0,8,0,4]},paragraph(item.specs||'Technical specifications to be agreed.')]),
      section('02 / Reviews & timing'),
      paragraph(`${p.reviews} review rounds, with ${p.reviewDays} working days for each. Send one consolidated set of feedback per round. Working days are Monday-Friday; public holidays are not excluded.`),
      {table:{headerRows:1,dontBreakRows:true,widths:[22,'*',150],body:[[{text:'#',bold:true},{text:'Stage / responsibility',bold:true},{text:'Dates',bold:true}],...rows]},layout:'lightHorizontalLines'},
      ...plan.flatMap((s,i)=>[{text:`${String(i+1).padStart(2,'0')} / ${s.name} - ${s.owner}`,bold:true,margin:[0,14,0,5]},paragraph(s.body)]),
      section('03 / Client materials'),
      paragraph(`${p.client} to supply by ${date(p.start)}:`),paragraph(p.inputs),
      section('04 / Payments'),
      {table:{headerRows:1,widths:['*',100,100],body:[[{text:'Payment',bold:true},{text:'Due',bold:true},{text:'Amount',bold:true}],
        [`Deposit (${p.deposit}%) - to book the project`,date(p.start),money(deposit)],
        [`Balance (${100-p.deposit}%) - before final masters`,date(end),money(balance)]]},layout:'lightHorizontalLines'},
      {text:p.currency+' · '+p.tax,style:'muted',margin:[0,8,0,10]},paragraph(p.paymentNote),
      section('05 / Working agreement'),paragraph(p.terms),
      {text:'Usage & handover',bold:true,margin:[0,6,0,5]},paragraph(p.rights),
      section('06 / Changes & delays'),paragraph(p.changesPolicy??'No separate changes policy was specified in this version. Please refer to the working agreement.'),
      {pageBreak:'before',stack:[section('Agreement & signatures'),paragraph('By signing below, both parties confirm the scope, specifications, schedule, responsibilities, fee and terms set out in this document.'),
        {columns:['Roll',p.client].map(party=>({stack:[{text:party,bold:true,margin:[0,8,0,16]},
          {text:'Signature: __________________________',margin:[0,0,0,16]},
          {text:'Name: ______________________________',margin:[0,0,0,16]},
          {text:'Date: _______________________________',margin:[0,0,0,8]}]})),columnGap:24},
        {text:'Please sign and return a copy to Roll. This document does not record an electronic signature or a payment.',style:'muted',margin:[0,12,0,0]}]},
    ],
    pageBreakBefore: node => node.style==='section' && node.startPosition?.verticalRatio>0.84,
  };
}

const escapeHtml = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Render the same document definition as native HTML. PDF tooling is not needed here.
export function agreementHtml(p, issued = new Date()) {
  const doc=agreementDefinition(p,issued);
  function render(value){
    if(typeof value==='string'||typeof value==='number')return `<span>${escapeHtml(value)}</span>`;
    if(Array.isArray(value))return value.map(render).join('');
    const node=value,style={...(doc.styles[node.style]||{}),...node};
    const css=[];
    if(style.fontSize)css.push(`font-size:${style.fontSize*4/3}px`);
    if(style.bold)css.push('font-weight:700');
    if(style.color)css.push(`color:${style.color}`);
    if(style.alignment)css.push(`text-align:${style.alignment}`);
    if(style.margin){const [l,t,r,b]=style.margin;css.push(`margin:${t*4/3}px ${r*4/3}px ${b*4/3}px ${l*4/3}px`)}
    const attr=`style="${escapeHtml(css.join(';'))}"`;
    if(node.columns)return `<div class="paper-columns" ${attr}>${node.columns.map(col=>`<div style="${typeof col.width==='number'?`flex:0 1 ${col.width*4/3}px`:'flex:1;min-width:0'}">${render(col)}</div>`).join('')}</div>`;
    if(node.stack)return `<div ${attr}>${node.stack.map(render).join('')}</div>`;
    if(node.canvas)return `<svg class="paper-timeline" viewBox="0 0 499 10" aria-label="Project timeline">${node.canvas.map(shape=>`<rect x="${shape.x}" y="${shape.y}" width="${shape.w}" height="${shape.h}" rx="${shape.r}" fill="${shape.color}"/>`).join('')}</svg>`;
    if(node.table)return `<div class="paper-table-wrap"><table class="paper-table"><thead><tr>${node.table.body[0].map(cell=>`<th>${render(cell)}</th>`).join('')}</tr></thead><tbody>${node.table.body.slice(1).map(row=>`<tr>${row.map(cell=>`<td>${render(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    const text=Array.isArray(node.text)?node.text.map(part=>typeof part==='object'?`<span${part.bold?' style="font-weight:700"':''}>${escapeHtml(part.text)}</span>`:escapeHtml(part)).join(''):escapeHtml(node.text);
    const tag=node.style==='title'?'h1':node.style==='section'?'h2':'div';
    return `<${tag} class="paper-text" ${attr}>${text}</${tag}>`;
  }
  const sheets=[[]];for(const node of doc.content){if(node.pageBreak==='before')sheets.push([]);sheets.at(-1).push(node)}
  return sheets.map((sheet,i)=>`<article class="agreement-paper" aria-label="${i?'Signature sheet':'Project agreement'}">${sheet.map(render).join('')}<div class="paper-footer"><span>Roll / ${escapeHtml(p.client)}</span><span>Seabird</span></div></article>`).join('');
}

let library;
function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(new Error('Could not load PDF tools. Please try again.'))};document.head.append(s)})}
export async function agreementBlob(p, issued = new Date()){
  if(!library)library=(async()=>{await loadScript('./vendor/pdfmake.min.js');await loadScript('./vendor/vfs_fonts.js')})().catch(err=>{library=null;throw err});
  await library;
  return new Promise((resolve,reject)=>{try{window.pdfMake.createPdf(agreementDefinition(p,issued)).getBlob(resolve)}catch(err){reject(err)}});
}
