(()=>{
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const store={get:(k,d)=>{try{const v=localStorage.getItem('nx_'+k);return v?JSON.parse(v):d}catch{return d}},set:(k,v)=>{try{localStorage.setItem('nx_'+k,JSON.stringify(v))}catch{}}};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const debounce=(f,t=200)=>{let h;return(...a)=>{clearTimeout(h);h=setTimeout(()=>f(...a),t)}};

/* ---------- demo data (simulated) ---------- */
const depot={lat:37.7749,lng:-122.4194};
const stops=[['Market St Hub',37.7879,-122.4075],['Mission Retail Park',37.7599,-122.4148],['Sunset Depot',37.7535,-122.4942],['Richmond Apartments',37.7800,-122.4720],['Bayview Plaza',37.7295,-122.3917],['Presidio Offices',37.7989,-122.4662],['Potrero Lofts',37.7610,-122.4000],['Marina Cafe',37.8037,-122.4368]].map(([name,lat,lng])=>({name,lat,lng}));
const STATUS=['Order Placed','Shipment Processing','Out for Delivery','Delivered','Delayed'];
const DSTAT=['Available','On Delivery','Returning to Warehouse','Break','Offline','Delayed'];
const seed={
  ships:[['Ava Chen',0,'Out for Delivery','D-204','High'],['Noah Patel',1,'Shipment Processing','D-117','Medium'],['Liam Ortiz',2,'Out for Delivery','D-204','Low'],['Mia Rossi',3,'Delayed','D-089','High'],['Eli Brooks',4,'Order Placed','D-117','Medium'],['Zoe Kim',5,'Out for Delivery','D-089','Medium'],['Omar Haddad',6,'Delivered','D-204','Low'],['Ivy Nguyen',7,'Shipment Processing','D-117','High']].map((r,i)=>({id:'SH-'+(1001+i),cust:r[0],stop:r[1],status:r[2],driver:r[3],prio:r[4]})),
  drivers:[['D-204','Marcus Reed','Van · NX-204','On Delivery',4.8,72,37.7700,-122.4300],['D-117','Priya Nair','Bike · NX-117','Available',4.9,88,37.7650,-122.4100],['D-089','Tomas Silva','Truck · NX-089','Delayed',4.5,41,37.7900,-122.4500],['D-152','Hana Ito','Van · NX-152','Break',4.7,60,37.7450,-122.4200],['D-033','Jonas Weber','EV Van · NX-033','Returning to Warehouse',4.6,35,37.7750,-122.3950],['D-310','Lena Park','Van · NX-310','Offline',4.4,90,37.7500,-122.4600]].map(r=>({id:r[0],name:r[1],veh:r[2],status:r[3],rating:r[4],fuel:r[5],lat:r[6],lng:r[7]})),
  notes:[{t:'Traffic alert: congestion on Bayshore corridor (demo).',read:false},{t:'Delivery delay: SH-1004 is running late (demo).',read:false}],
  hist:[],dismissed:[]
};
const S=Object.assign({},seed,store.get('state',{}));
const save=()=>store.set('state',{ships:S.ships,drivers:S.drivers,notes:S.notes,hist:S.hist,dismissed:S.dismissed});
const SUGS=[
 ['s1','Reassign driver D-117','D-117 is closer to 3 pending deliveries. Reassignment may reduce total delivery time.','18 min saved · 12% shorter route','High',82,'$24'],
 ['s2','Avoid congestion on the Bayshore corridor','Re-sequence stops 5 and 7 to avoid the slowest segment during the afternoon peak.','9 min saved','Medium',74,'$11'],
 ['s3','Reduce fuel cost','Shift two low-priority drops to the EV van to cut diesel use.','6 L fuel saved','Medium',68,'$10'],
 ['s4','Prevent a late delivery','SH-1004 is delayed. Move it up the sequence on D-089.','Higher on-time probability','High',77,'$0'],
 ['s5','Vehicle maintenance alert','NX-089 fuel level is low and service is due soon. Schedule it after the shift.','Avoids downtime','Low',90,'$60'],
 ['s6','Improve fleet utilisation','Driver D-310 is offline with an EV at 90% charge. Bring them online for the evening wave.','+8% utilisation','Low',61,'$35']];
const KPI=[['Active deliveries',()=>S.ships.filter(s=>s.status!=='Delivered').length,'',4.2,[3,5,4,6,5,7,6]],['Active drivers',()=>S.drivers.filter(d=>d.status!=='Offline').length,'',0,[4,4,5,5,5,5,5]],['Total fleet vehicles',()=>S.drivers.length,'',0,[6,6,6,6,6,6,6]],['Routes optimized today',()=>S.hist.filter(h=>h.opt).length+12,'',9.1,[8,9,10,10,11,12,12]],['Average delivery time',()=>38,' min',-3.4,[44,42,41,40,39,39,38]],['Fuel saved',()=>Math.round(S.hist.reduce((a,h)=>a+(h.fuel||0),0)+46),' L',6.3,[30,34,36,40,41,44,46]],['On-time rate',()=>94,'%',1.1,[91,92,92,93,93,94,94]],['AI optimization score',()=>81,'/100',2.0,[74,76,77,79,80,80,81]]];

/* ---------- ui helpers ---------- */
function toast(t){const d=document.createElement('div');d.className='toast';d.textContent=t;$('#toasts').append(d);setTimeout(()=>d.remove(),2800)}
document.addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(!b)return;const r=b.getBoundingClientRect(),s=Math.max(r.width,r.height),x=document.createElement('span');x.className='ripple';x.style.cssText=`width:${s}px;height:${s}px;left:${e.clientX-r.left-s/2}px;top:${e.clientY-r.top-s/2}px`;b.append(x);setTimeout(()=>x.remove(),600)});
function notify(t){S.notes.unshift({t,read:false});save();renderNotes();toast(t)}
function fill(sel,arr,all){sel.innerHTML=`<option value="">${all}</option>`+arr.map(a=>`<option>${a}</option>`).join('')}
fill($('#dstat'),DSTAT,'All driver statuses');fill($('#ustat'),STATUS,'All shipment statuses');fill($('#sstat'),STATUS,'All statuses');
$('#fstop').innerHTML=stops.map((s,i)=>`<option value="${i}">${s.name}</option>`).join('');

/* ---------- nav and roles ---------- */
let role=store.get('role','admin'),view='dashboard';
function go(v){
  const ok=$(`#nav [data-view="${v}"]`);if(!ok||ok.hidden)v=$$('#nav button').find(b=>!b.hidden).dataset.view;
  view=v;$$('.view').forEach(s=>s.classList.toggle('on',s.id==='v-'+v));$$('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.view===v));
  if(v==='dashboard')mapInit();render();
}
function applyRole(){$('#role').value=role;$$('#nav button').forEach(b=>b.hidden=!b.dataset.roles.split(',').includes(role));go(role==='admin'||role==='dispatcher'?'dashboard':'shipments')}
$('#nav').onclick=e=>{const b=e.target.closest('button');if(b)go(b.dataset.view)};
$('#role').onchange=e=>{role=e.target.value;store.set('role',role);applyRole();toast('Role set to '+e.target.selectedOptions[0].text+'. Demo only: real authentication needs a secure backend.')};
$('#collapse').onclick=()=>document.body.classList.toggle('collapsed');
$('#theme').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;store.set('theme',t)};
document.documentElement.dataset.theme=store.get('theme','dark');
$('#q').oninput=debounce(()=>render());

/* ---------- renderers ---------- */
const q=()=>$('#q').value.trim().toLowerCase();
let kpiDone=false;
function renderKpis(){
  $('#kpis').innerHTML=KPI.map(([l,f,u,t,sp],i)=>{const mx=Math.max(...sp),mn=Math.min(...sp),pts=sp.map((v,j)=>`${j*100/6},${30-(v-mn)/(mx-mn||1)*26}`).join(' ');
   return `<div class="card glass kpi"><span>${l}</span><b data-v="${f()}" data-u="${u}">0${u}</b><span class="${t>=0?'up':'dn'}">${t>=0?'▲':'▼'} ${Math.abs(t)}% vs yesterday (demo)</span><svg viewBox="0 0 100 32" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="var(--pri)" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg></div>`}).join('');
  $$('#kpis b').forEach(b=>{const end=+b.dataset.v,t0=performance.now();(function f(n){const p=Math.min(1,(n-t0)/900);b.textContent=Math.round(end*(1-(1-p)**3))+b.dataset.u;if(p<1)requestAnimationFrame(f)})(t0)});
}
function renderSugs(){
  const p=$('#sprio').value,list=SUGS.filter(s=>!S.dismissed.includes(s[0])&&(!p||s[4]===p));
  $('#sugs').innerHTML=list.length?list.map(s=>`<article class="card glass sug"><h3>✦ ${s[1]}</h3><span class="tag ${s[4]}">${s[4]} priority</span><p>${s[2]}</p><dl><div><dt>Expected impact</dt><dd>${s[3]}</dd></div><div><dt>Confidence (demo)</dt><dd>${s[5]}%</dd></div><div><dt>Est. savings</dt><dd>${s[6]}</dd></div></dl><div class="bar"><button class="primary" data-apply="${s[0]}">Apply suggestion</button><button data-dismiss="${s[0]}">Dismiss</button></div></article>`).join(''):'<p class="mut">No suggestions match. Refresh insights to bring them back.</p>';
  $('#hist').innerHTML=S.hist.filter(h=>h.t).slice(0,8).map(h=>`<li>${esc(h.t)}</li>`).join('')||'<li>No actions yet.</li>';
}
function renderDrivers(){
  const st=$('#dstat').value,k=q(),l=S.drivers.filter(d=>(!st||d.status===st)&&(!k||(d.name+d.id+d.veh).toLowerCase().includes(k)));
  $('#drivers').innerHTML=l.map(d=>`<div class="row"><div><b>${esc(d.name)}</b> <small>${d.id} · ${esc(d.veh)} · ★${d.rating} · fuel/charge ${d.fuel}%</small><span class="tag ${d.status.split(' ')[0]}">${d.status}</span></div><div class="bar"><button data-track="${d.id}">Track</button><button data-cycle="${d.id}">Set status</button></div></div>`).join('')||'<p class="mut">No drivers match.</p>';
}
function renderUsers(){
  const st=$('#ustat').value,k=q(),l=S.ships.filter(s=>(!st||s.status===st)&&(!k||(s.cust+s.id).toLowerCase().includes(k)));
  $('#users').innerHTML=l.map(s=>`<div class="row"><div><b>${esc(s.cust)}</b> <small>${s.id} · ${stops[s.stop].name}</small><span class="tag ${s.status.split(' ')[0]}">${s.status}</span></div><div class="bar"><button data-trackship="${s.id}">Track</button><button data-notify="${s.id}">Notify</button></div></div>`).join('')||'<p class="mut">No shipments match.</p>';
}
function renderShips(){
  const st=$('#sstat').value,k=q(),so=$('#ssort').value,P={High:0,Medium:1,Low:2};
  let l=S.ships.filter(s=>(!st||s.status===st)&&(!k||(s.cust+s.id+stops[s.stop].name).toLowerCase().includes(k)));
  if(role==='customer')l=l.filter(s=>s.cust==='Ava Chen');if(role==='driver')l=l.filter(s=>s.driver==='D-204');
  l.sort((a,b)=>so==='prio'?P[a.prio]-P[b.prio]:so==='status'?a.status.localeCompare(b.status):a.id.localeCompare(b.id));
  $('#ship').innerHTML=l.map(s=>`<tr><td>${s.id}</td><td>${esc(s.cust)}</td><td>${stops[s.stop].name}</td><td>${s.driver}</td><td class="${s.prio}">${s.prio}</td><td><span class="tag ${s.status.split(' ')[0]}">${s.status}</span></td><td><button data-next="${s.id}">Advance</button> <button data-del="${s.id}" aria-label="Delete ${s.id}">✕</button></td></tr>`).join('')||'<tr><td colspan="7">No shipments to show.</td></tr>';
}
function renderNotes(){$('#badge').textContent=S.notes.filter(n=>!n.read).length;$('#badge').hidden=!S.notes.some(n=>!n.read);$('#nlist').innerHTML=S.notes.map(n=>`<li class="${n.read?'':'unread'}">${esc(n.t)}</li>`).join('')||'<li>You are all caught up.</li>'}
function render(){({dashboard:renderKpis,suggestions:renderSugs,network:()=>{renderDrivers();renderUsers()},shipments:renderShips})[view]();renderNotes()}

/* ---------- events ---------- */
document.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;const d=t.dataset;
  if(d.apply){const s=SUGS.find(x=>x[0]===d.apply);S.hist.unshift({t:'Applied: '+s[1]});S.dismissed.push(s[0]);save();renderSugs();toast('Applied: '+s[1])}
  if(d.dismiss){S.dismissed.push(d.dismiss);save();renderSugs();toast('Dismissed')}
  if(d.track){const x=S.drivers.find(v=>v.id===d.track);go('dashboard');setTimeout(()=>NXMap.focus(x),50);toast('Tracking '+x.name)}
  if(d.cycle){const x=S.drivers.find(v=>v.id===d.cycle);x.status=DSTAT[(DSTAT.indexOf(x.status)+1)%DSTAT.length];save();renderDrivers();toast(x.name+': '+x.status)}
  if(d.trackship){const x=S.ships.find(v=>v.id===d.trackship);go('dashboard');setTimeout(()=>NXMap.focus(stops[x.stop]),50)}
  if(d.notify){notify('Notification sent to '+S.ships.find(v=>v.id===d.notify).cust)}
  if(d.next){const x=S.ships.find(v=>v.id===d.next);x.status=STATUS[Math.min(STATUS.indexOf(x.status)+1,3)];save();renderShips();toast(x.id+': '+x.status)}
  if(d.del&&confirm('Delete '+d.del+'?')){S.ships=S.ships.filter(v=>v.id!==d.del);save();renderShips();toast('Deleted '+d.del)}
});
['sprio','dstat','ustat','sstat','ssort'].forEach(i=>$('#'+i).onchange=()=>render());
$('#srefresh').onclick=()=>{S.dismissed=[];save();$('#sugs').innerHTML='<div class="skel"></div><div class="skel"></div><div class="skel"></div>';setTimeout(renderSugs,600)};
$('#bell').onclick=()=>{$('#npanel').hidden=!$('#npanel').hidden};
$('#nread').onclick=()=>{S.notes.forEach(n=>n.read=true);save();renderNotes()};
$('#nclear').onclick=()=>{S.notes=[];save();renderNotes()};
$('#snew').onclick=()=>{$('#sform').reset();$('#ferr').textContent='';$('#dlg').showModal()};
$('#fcancel').onclick=()=>$('#dlg').close();
$('#sform').onsubmit=e=>{const n=$('#fname').value.trim();if(n.length<2){e.preventDefault();$('#ferr').textContent='Enter a customer name with at least 2 characters.';return}
  const id='SH-'+(1001+S.ships.length+Math.floor(Math.random()*90));S.ships.push({id,cust:n,stop:+$('#fstop').value,status:'Order Placed',driver:'D-117',prio:$('#fprio').value});save();render();toast('Created '+id)};

/* ---------- map and optimizer ---------- */
let mapReady=false;
const COL={orig:'#94A3B8',opt:'#34D399'};
const pending=()=>S.ships.filter(s=>s.status!=='Delivered').map(s=>({...stops[s.stop],prio:s.prio,id:s.id}));
function mapInit(){if(mapReady)return;mapReady=true;NXMap.init($('#map'),{depot,stops,drivers:S.drivers});}
$('#mtype').onchange=e=>NXMap.setType(e.target.value);
$('#mtraffic').onclick=e=>{e.target.textContent='Traffic: '+(NXMap.traffic()?'on':'off')};
$('#mdrivers').onclick=e=>{e.target.textContent='Drivers: '+(NXMap.drivers()?'on':'off')};
$('#mkey').onclick=()=>{const k=prompt('Paste a browser-restricted Google Maps API key (dev only; stored in this browser):');if(k&&k.trim())NXMap.setKey(k.trim())};
function runOpt(){
  const r=NXOpt.compare(depot,pending()),sc=$('#scan');sc.classList.remove('on');void sc.offsetWidth;sc.classList.add('on');
  $('#result').innerHTML='<h3>Route comparison</h3><div class="skel"></div>';NXMap.draw([{path:pending(),color:COL.orig,dash:true}]);
  return new Promise(res=>setTimeout(()=>{
    NXMap.draw([{path:pending(),color:COL.orig,dash:true},{path:r.opt,color:COL.opt}]);
    $('#result').innerHTML=`<h3>Route comparison</h3><div class="big">${r.km.toFixed(1)} km saved</div><p class="mut">Grey dashed: dispatch order. Green: re-sequenced route (demo heuristic, straight-line distances).</p><dl><dt>Original</dt><dd>${r.origKm.toFixed(1)} km</dd><dt>Optimized</dt><dd>${r.optKm.toFixed(1)} km</dd><dt>Time saved (30 km/h est.)</dt><dd>${Math.round(r.min)} min</dd><dt>Fuel saved</dt><dd>${r.fuel.toFixed(1)} L</dd><dt>Cost saved</dt><dd>$${r.cost.toFixed(2)}</dd><dt>Stop sequence</dt><dd>${r.opt.map(s=>stops.indexOf(stops.find(x=>x.name===s.name))+1).join(' → ')}</dd><dt>Confidence</dt><dd>n/a (no model)</dd></dl>`;
    S.hist.unshift({t:`Optimized routes: ${r.km.toFixed(1)} km saved`,opt:1,fuel:r.fuel});save();notify(`Optimization complete: ${r.km.toFixed(1)} km saved (demo)`);res(r);
  },1500));
}
$('#opt').onclick=runOpt;

/* ---------- assistant (simulated; set window.NX_AI_ENDPOINT to call a real backend) ---------- */
const add=(c,t)=>{const m=document.createElement('div');m.className='m '+c;m.textContent=t;$('#msgs').append(m);$('#msgs').scrollTop=1e9;return m};
async function reply(text){
  const l=text.toLowerCase();
  if(window.NX_AI_ENDPOINT){try{const r=await fetch(window.NX_AI_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,context:{drivers:S.drivers,shipments:S.ships}})});return (await r.json()).reply}catch{return 'The AI endpoint did not respond. Check NX_AI_ENDPOINT.'}}
  if(/available|driver/.test(l)){const a=S.drivers.filter(d=>d.status==='Available');return a.length?'Available now: '+a.map(d=>`${d.name} (${d.id})`).join(', '):'No drivers are available right now.'}
  if(/delay|late/.test(l)){const a=S.ships.filter(s=>s.status==='Delayed');return a.length?'Delayed: '+a.map(s=>`${s.id} (${s.cust})`).join(', ')+'. Moving the high-priority drop up the sequence is the first fix.':'Nothing is delayed right now.'}
  if(/optimi|route|fastest|traffic/.test(l)){if(view!=='dashboard')go('dashboard');await new Promise(r=>setTimeout(r,100));const r=await runOpt();return `Done. The re-sequenced route is ${r.km.toFixed(1)} km shorter (demo heuristic, no live traffic).`}
  if(/fuel/.test(l))return 'Shift low-priority drops to the EV van and apply the optimized sequence. See AI Suggestions for estimated savings.';
  return 'Try asking about available drivers, delayed deliveries, route optimization, or fuel use.';
}
$('#fab').onclick=()=>{$('#chat').hidden=!$('#chat').hidden;if(!$('#msgs').children.length)add('a','Hi, I can answer questions about routes, drivers and delays. This assistant is simulated.')};
async function ask(t){if(!t.trim())return;add('u',t);const m=add('a','…');const r=await reply(t);setTimeout(()=>{m.textContent=r},400)}
$('#cform').onsubmit=e=>{e.preventDefault();ask($('#cin').value);$('#cin').value=''};
$('.chips').onclick=e=>{if(e.target.matches('button'))ask(e.target.textContent)};

applyRole();
})();
