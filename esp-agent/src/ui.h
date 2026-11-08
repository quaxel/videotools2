#pragma once
#include <pgmspace.h>

static const char UI_HTML[] PROGMEM = R"HTML(<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ESP Agent</title>
<style>
:root{--bg:#0e0f11;--panel:#16181b;--line:#25282d;--fg:#e6e8eb;--dim:#8a9099;--acc:#6ea8fe}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 -apple-system,system-ui,sans-serif;display:flex;flex-direction:column;height:100dvh}
header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--line)}
header b{font-weight:600}
button{background:var(--panel);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:8px 14px;font:inherit;cursor:pointer}
button:hover{border-color:var(--acc)}
#panel{border-bottom:1px solid var(--line);padding:12px 16px;max-height:40dvh;overflow-y:auto;font-size:13px;color:var(--dim)}
#panel h4{margin:8px 0 4px;color:var(--fg);font-size:13px}
#panel div{margin:2px 0;white-space:pre-wrap;word-break:break-word}
#log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
.m{max-width:min(720px,88%);padding:10px 14px;border-radius:12px;white-space:pre-wrap;word-break:break-word}
.u{align-self:flex-end;background:#1d2a3d}
.a{align-self:flex-start;background:var(--panel);border:1px solid var(--line)}
.t{align-self:flex-start;font:12px ui-monospace,Menlo,monospace;color:var(--dim);border:1px dashed var(--line);border-radius:8px;padding:4px 10px}
form{display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--line)}
input{flex:1;background:var(--panel);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:10px 12px;font:inherit}
input:focus{outline:none;border-color:var(--acc)}
</style></head><body>
<header><b>ESP Agent</b><span><button id="tasks" type="button">Tasks</button> <button id="reset" type="button">New chat</button></span></header>
<div id="panel" hidden></div>
<div id="log"></div>
<form id="f"><input id="q" autocomplete="off" placeholder="Ask or command the device..." autofocus><button>Send</button></form>
<script>
const log=document.getElementById('log'),q=document.getElementById('q');
let token=localStorage.getItem('tok')||'';
function add(c,t){const d=document.createElement('div');d.className='m '+c;d.textContent=t;log.append(d);log.scrollTop=log.scrollHeight;return d}
function tool(s){const d=document.createElement('div');d.className='t';d.textContent='⚙ '+s.tool+' '+JSON.stringify(s.input)+' → '+JSON.stringify(s.result);log.append(d)}
async function api(path,body,method='POST'){
  for(;;){
    if(!token){token=prompt('Access token')||'';if(!token)throw new Error('token required')}
    const r=await fetch(path,{method,headers:{'X-Token':token,'Content-Type':'application/json'},body:method==='POST'?JSON.stringify(body||{}):undefined});
    if(r.status===401){token='';localStorage.removeItem('tok');continue}
    localStorage.setItem('tok',token);return r.json();
  }
}
document.getElementById('f').onsubmit=async e=>{
  e.preventDefault();const m=q.value.trim();if(!m)return;q.value='';
  add('u',m);const w=add('a','…');
  try{const r=await api('/api/chat',{message:m});w.remove();(r.steps||[]).forEach(tool);add('a',r.reply||r.error||'(empty)')}
  catch(x){w.textContent='Error: '+x.message}
};
const panel=document.getElementById('panel');
function line(t){const d=document.createElement('div');d.textContent=t;panel.append(d)}
function head(t){const h=document.createElement('h4');h.textContent=t;panel.append(h)}
document.getElementById('tasks').onclick=async()=>{
  if(!panel.hidden){panel.hidden=true;return}
  const r=await api('/api/log',null,'GET');panel.innerHTML='';panel.hidden=false;
  head('Scheduled tasks');
  if(!r.tasks.length)line('none');
  r.tasks.forEach(t=>line('#'+t.id+' '+(t.at?(t.repeat?'daily at ':'once at ')+t.at:(t.repeat?'every ':'once in ')+t.minutes+' min')+', next in '+Math.round(t.next_in_s/60)+' min: '+t.prompt));
  head('Recent runs');
  if(!r.log.length)line('none yet');
  r.log.forEach(e=>line('['+Math.round((r.uptime_s-e.t)/60)+' min ago] #'+e.id+' '+e.prompt+'\n\u2192 '+e.reply));
};
document.getElementById('reset').onclick=async()=>{await api('/api/reset');log.innerHTML=''};
</script></body></html>)HTML";
