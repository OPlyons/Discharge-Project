(()=>{'use strict';
const data=JSON.parse(document.getElementById('crisis-pathway-data').textContent);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const paragraph=(text,style='Normal')=>'<w:p><w:pPr><w:pStyle w:val="'+style+'"/><w:keepNext/><w:keepLines/><w:spacing w:after="100"/></w:pPr><w:r><w:t xml:space="preserve">'+escape(text)+'</w:t></w:r></w:p>';
const wordLink=(label,url)=>'<w:p><w:pPr><w:keepLines/></w:pPr><w:fldSimple w:instr="'+escape(' HYPERLINK "'+url+'" ')+'"><w:r><w:rPr><w:color w:val="00559B"/><w:u w:val="single"/></w:rPr><w:t>'+escape(label)+'</w:t></w:r></w:fldSimple></w:p>';
function wordXml(area){
 const info=data.areas[area];
 if(!info)return paragraph('Local crisis routes: choose your borough on the website before downloading.');
 let xml=paragraph(info.name+' crisis routes','Heading2');
 for(const r of info.routes){xml+=paragraph(r.name,'Heading2')+paragraph(r.text)+wordLink('Check '+r.name+' access details',r.url);}
 if(info.notice)xml+=wordLink(info.notice.text,info.notice.url);
 return xml;
}
function render(host,area){
 host.replaceChildren();const info=data.areas[area];
 const title=document.createElement('h3');title.textContent=info?info.name+' crisis routes':'Local crisis routes';host.append(title);
 const intro=document.createElement('p');intro.textContent=info?'These routes will be included in your Word form. Check current access before travelling.':'Choose a borough above to include its local crisis routes. A blank or other-area form keeps the emergency and NHS 111 guidance.';host.append(intro);
 if(!info)return;
 for(const route of info.routes){const detail=document.createElement('details'),summary=document.createElement('summary'),p=document.createElement('p'),a=document.createElement('a');summary.textContent=route.name;p.textContent=route.text;a.href=route.url;a.textContent='Check service access details';a.target='_blank';a.rel='noopener noreferrer';detail.append(summary,p,a);host.append(detail);}
 if(info.notice){const p=document.createElement('p'),a=document.createElement('a');a.href=info.notice.url;a.textContent=info.notice.text;a.target='_blank';a.rel='noopener noreferrer';p.append(a);host.append(p);}
}
window.DTPCrisis={data,wordXml,render};
})();
