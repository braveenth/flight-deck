/* ============================================================
   FLIGHT DECK — shared engine
   One localStorage blob. Every module reads and writes through FD.
   ============================================================ */
const FD = (function(){
  const KEY   = 'flightdeck.v1';
  const THEME = 'flightdeck.theme';
  const PROGRAM_DAYS = 120;

  const MODULES = [
    {id:'preflight', name:'Preflight',    icon:'🌅', file:'apps/preflight.html', cadence:'Daily · Morning',
     blurb:'Set the day: identity, top three, and if-then plans.'},
    {id:'study',     name:'Study Flight', icon:'✈️', file:'apps/study.html',     cadence:'Daily',
     blurb:'Focus blocks with a takeoff checklist and a landing.'},
    {id:'recall',    name:'Recall Bay',   icon:'🧠', file:'apps/recall.html',    cadence:'Daily',
     blurb:'Spaced retrieval practice. The highest-yield study move.'},
    {id:'habits',    name:'Habit Reactor',icon:'⚙️', file:'apps/habits.html',    cadence:'Daily',
     blurb:'Context-cued habits tracked to 66-day automaticity.'},
    {id:'body',      name:'Airframe',     icon:'🫀', file:'apps/body.html',      cadence:'Daily',
     blurb:'Sleep, training, light, fuel. The hardware layer.'},
    {id:'mind',      name:'Cabin Pressure',icon:'🌬️',file:'apps/mind.html',      cadence:'Daily',
     blurb:'Five-minute breathing protocols to drop arousal.'},
    {id:'firewall',  name:'Firewall',     icon:'🛡️', file:'apps/firewall.html',  cadence:'On demand',
     blurb:'Urge surfing, delay timer, and commitment devices.'},
    {id:'debrief',   name:'Debrief',      icon:'🌙', file:'apps/debrief.html',   cadence:'Daily · Night',
     blurb:'Score the day, three good things, tomorrow’s first move.'},
    {id:'weekly',    name:'Weekly Debrief',icon:'📋',file:'apps/weekly.html',    cadence:'Weekly · Sunday',
     blurb:'Auto scorecard, obstacle analysis, one system change.'},
    {id:'flightplan',name:'Flight Plan',  icon:'🎯', file:'apps/flightplan.html',cadence:'Set once · review weekly',
     blurb:'Your 120-day outcomes and the process targets under them.'},
    {id:'rhythm',    name:'Rhythm',       icon:'🕰️', file:'apps/rhythm.html',    cadence:'Anytime',
     blurb:'When you start, when you stop, and the gaps in between.'},
    {id:'recorder',  name:'Flight Recorder',icon:'📈',file:'apps/recorder.html', cadence:'Anytime',
     blurb:'Heatmap, trends, records, and full data export.'},
    {id:'evidence',  name:'Evidence Log', icon:'📚', file:'evidence.html',       cadence:'Reference',
     blurb:'Every mechanic in this system and the study behind it.'}
  ];

  const RANKS = [
    [1,'Cadet'],[3,'Student Pilot'],[5,'Solo'],[7,'Private Pilot'],[9,'Instrument Rated'],
    [11,'Commercial'],[13,'Multi-Engine'],[15,'Jet Captain'],[17,'Test Pilot'],[20,'Astronaut']
  ];

  const BLANK = {
    version:1, xp:0, created:null, startDate:null, name:'',
    days:{}, frozen:{}, freezes:0, habits:null, cards:[], goals:[],
    urges:[], rules:[], weeks:{}, records:{}, settings:{}
  };

  /* ---------- dates ----------
     A "logical day" runs from the rollover hour to the same hour next morning,
     so work and the Debrief done at 1am still belong to the day that just
     ended. Everything keyed by day — XP, streaks, habits, modules — uses it.
     key()      : logical day (no argument) or a given Date's calendar day
     calKey(d)  : always the true calendar day
  ---------------------------------------------------------------------- */
  function rollover(){
    // Read the raw cache directly: read() calls key() during init, so going
    // back through read() here would recurse.
    const v = cache && cache.settings && cache.settings.rollover;
    return (typeof v==='number' && v>=0 && v<=8) ? v : 4;
  }
  function calKey(d){
    d = d || new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function logicalDate(){
    const n=new Date();
    if(n.getHours()<rollover()) n.setDate(n.getDate()-1);
    return n;
  }
  function key(d){ return calKey(d||logicalDate()); }
  // True when the wall clock is past midnight but before the rollover, i.e.
  // still inside yesterday's logical day.
  function inExtended(){ return new Date().getHours()<rollover(); }
  // Minutes since the logical day's midnight. Post-midnight times land in
  // 1440-1920 so a 1:30am debrief sorts after an 11pm one instead of before.
  function dayMinutes(at){
    const n = at ? new Date(at) : new Date();
    let m = n.getHours()*60 + n.getMinutes();
    if(n.getHours()<rollover()) m += 1440;
    return m;
  }
  function fmtMin(m,mark){
    if(m==null||isNaN(m)) return '—';
    const over=m>=1440, x=((Math.round(m)%1440)+1440)%1440;
    let h=Math.floor(x/60); const mm=x%60;
    const ap=h<12?'am':'pm'; let hh=h%12; if(hh===0) hh=12;
    return hh+':'+String(mm).padStart(2,'0')+ap+(mark&&over?'⁺':'');
  }
  function dow(){ return parseKey(key()).getDay(); }
  function parseKey(k){ return new Date(k+'T12:00:00'); }
  function shift(k,n){ const d=parseKey(k); d.setDate(d.getDate()+n); return key(d); }
  function diff(a,b){ return Math.round((parseKey(b)-parseKey(a))/86400000); }
  function weekKey(k){
    const d=parseKey(k||key()); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); return key(d);
  }

  /* ---------- storage ---------- */
  let cache=null;
  function read(){
    if(cache) return cache;
    let raw={};
    try{ raw=JSON.parse(localStorage.getItem(KEY)||'{}'); }catch(e){ raw={}; }
    cache=Object.assign({},JSON.parse(JSON.stringify(BLANK)),raw);
    if(!cache.created){ cache.created=key(); cache.startDate=cache.startDate||key(); write(); }
    return cache;
  }
  function write(){
    try{ localStorage.setItem(KEY,JSON.stringify(cache)); }
    catch(e){ console.warn('Flight Deck could not save:',e); toast('⚠️ Could not save — storage blocked'); }
  }
  function mutate(fn){ const s=read(); fn(s); write(); return s; }
  function reload(){ cache=null; return read(); }

  function day(k){
    const s=read(); k=k||key();
    if(!s.days[k]) s.days[k]={xp:0,mods:{}};
    if(!s.days[k].mods) s.days[k].mods={};
    return s.days[k];
  }
  function mod(id,k){ return day(k).mods[id] || {}; }
  function setMod(id,patch,k){
    return mutate(s=>{
      const kk=k||key();
      if(!s.days[kk]) s.days[kk]={xp:0,mods:{}};
      s.days[kk].mods[id]=Object.assign({},s.days[kk].mods[id]||{},patch);
    });
  }

  /* ---------- XP + rank ---------- */
  function levelFor(xp){ return Math.floor(Math.sqrt(Math.max(0,xp)/125))+1; }
  function xpForLevel(L){ return 125*Math.pow(L-1,2); }
  function rankFor(L){ let r=RANKS[0][1]; RANKS.forEach(([lv,nm])=>{ if(L>=lv) r=nm; }); return r; }
  function levelInfo(){
    const xp=read().xp||0, L=levelFor(xp);
    const base=xpForLevel(L), next=xpForLevel(L+1);
    return {xp, level:L, rank:rankFor(L), into:xp-base, span:next-base,
            need:next-xp, pct:Math.round((xp-base)/(next-base)*100)};
  }

  function addXP(points, reason, opts){
    opts=opts||{};
    const before=levelFor(read().xp||0);
    let gain=points, tailwind=false;
    // Variable-ratio bonus: intermittent reinforcement sustains responding
    // more durably than a fixed schedule (Ferster & Skinner, 1957).
    if(!opts.noBonus && Math.random()<0.12){ gain=points*2; tailwind=true; }
    mutate(s=>{
      const k=key();
      if(!s.days[k]) s.days[k]={xp:0,mods:{}};
      s.days[k].xp=(s.days[k].xp||0)+gain;
      s.xp=(s.xp||0)+gain;
      const st=streak();
      s.records.bestStreak=Math.max(s.records.bestStreak||0,st);
      s.records.bestDay=Math.max(s.records.bestDay||0,s.days[k].xp);
    });
    const after=levelFor(read().xp||0);
    if(tailwind) toast('🌬️ TAILWIND — double XP! +'+gain+' · '+reason,true);
    else toast('+'+gain+' XP · '+reason);
    if(after>before){
      setTimeout(()=>{ toast('▲ LEVEL '+after+' — '+rankFor(after),true); confetti(40); },1400);
    }
    paintNav();
    document.dispatchEvent(new CustomEvent('fd:xp'));
    return gain;
  }

  /* ---------- streak ---------- */
  function activeOn(k){ const d=read().days[k]; return !!(d && d.xp>0); }
  function streak(){
    const s=read(); let n=0, k=key();
    if(!activeOn(k)) k=shift(k,-1);      // today still counts as "not broken yet"
    while(activeOn(k)||s.frozen[k]){ n++; k=shift(k,-1); }
    return n;
  }
  // Earn one streak freeze per 7 unbroken days; auto-spend it on a single
  // missed day. Lally et al. (2010) found one missed day did not measurably
  // impair habit formation — so a single lapse should not zero the counter.
  function reconcileFreezes(){
    mutate(s=>{
      const st=streak();
      const earned=Math.floor(st/7);
      if((s.records.freezeEarnedAt||0)<earned){ s.freezes=(s.freezes||0)+(earned-(s.records.freezeEarnedAt||0)); s.records.freezeEarnedAt=earned; }
      const y=shift(key(),-1);
      if(activeOn(key()) && !activeOn(y) && !s.frozen[y] && (s.freezes||0)>0){
        const y2=shift(y,-1);
        if(activeOn(y2)||s.frozen[y2]){ s.frozen[y]=true; s.freezes--; setTimeout(()=>toast('🧊 Streak freeze used — you missed one day, not two'),900); }
      }
    });
  }
  function missedYesterday(){
    const y=shift(key(),-1);
    return !activeOn(y) && !read().frozen[y] && diff(read().startDate,y)>=0;
  }

  /* ---------- program clock ---------- */
  function program(){
    const s=read(); const start=s.startDate||key();
    const elapsed=diff(start,key());
    return {start, end:shift(start,PROGRAM_DAYS), dayNo:Math.min(PROGRAM_DAYS,elapsed+1),
            left:Math.max(0,PROGRAM_DAYS-elapsed-1), total:PROGRAM_DAYS,
            pct:Math.min(100,Math.round((elapsed+1)/PROGRAM_DAYS*100))};
  }

  /* ---------- feedback ---------- */
  function ensure(id,cls){
    let el=document.getElementById(id);
    if(!el){ el=document.createElement('div'); el.id=id; el.className=cls; document.body.appendChild(el); }
    return el;
  }
  let toastT;
  function toast(msg,big){
    const el=ensure('fd-toast','toast');
    el.textContent=msg; el.className='toast show'+(big?' big':'');
    clearTimeout(toastT); toastT=setTimeout(()=>el.className='toast'+(big?' big':''),2300);
  }
  function confetti(n){
    n=n||22; const box=ensure('fd-confetti','confetti');
    const pal=['#6fa4ff','#a97dff','#4fd39a','#ffc55c','#ff7784'];
    for(let i=0;i<n;i++){
      const p=document.createElement('i');
      p.style.left=Math.random()*100+'vw';
      p.style.background=pal[i%pal.length];
      p.style.animationDelay=(Math.random()*.3)+'s';
      p.style.transform='rotate('+(Math.random()*180)+'deg)';
      box.appendChild(p); setTimeout(()=>p.remove(),2000);
    }
  }
  let AC;
  function beep(freq,dur,type){
    try{
      AC=AC||new (window.AudioContext||window.webkitAudioContext)();
      const o=AC.createOscillator(), g=AC.createGain();
      o.type=type||'sine'; o.frequency.value=freq||880;
      o.connect(g); g.connect(AC.destination);
      g.gain.setValueAtTime(.0001,AC.currentTime);
      g.gain.exponentialRampToValueAtTime(.16,AC.currentTime+.02);
      g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+(dur||.35));
      o.start(); o.stop(AC.currentTime+(dur||.35)+.02);
    }catch(e){}
  }
  function chime(){ beep(660,.3); setTimeout(()=>beep(880,.45),260); }

  /* ---------- theme ---------- */
  function applyTheme(t){
    document.documentElement.setAttribute('data-theme',t);
    try{ localStorage.setItem(THEME,t); }catch(e){}
    const b=document.getElementById('fd-theme'); if(b) b.textContent = t==='light'?'☾':'☀';
  }
  function toggleTheme(){
    applyTheme((document.documentElement.getAttribute('data-theme')||'dark')==='dark'?'light':'dark');
  }

  /* ---------- nav ---------- */
  function root(){ return document.body.dataset.root || '.'; }
  function href(m){ return root()+'/'+m.file; }
  function paintNav(){
    const li=levelInfo(), st=streak(), pr=program(), td=day().xp||0;
    const set=(id,v)=>{ const e=document.getElementById(id); if(e) e.textContent=v; };
    set('fd-streak',st); set('fd-level',li.level); set('fd-xp',li.xp.toLocaleString());
    set('fd-today',td); set('fd-dayno',pr.dayNo+'/'+pr.total);
    const night=document.getElementById('fd-night');
    if(night){
      night.style.display = inExtended() ? 'inline-flex' : 'none';
      set('fd-nightday', 'STILL '+parseKey(key()).toLocaleDateString(undefined,{weekday:'short'}).toUpperCase());
    }
  }
  function buildNav(){
    const cur=document.body.dataset.module||'';
    const me=MODULES.find(m=>m.id===cur);
    const nav=document.createElement('header');
    nav.className='fdnav';
    nav.innerHTML=
      '<div class="fdnav-in">'+
        '<a class="fdbrand" href="'+root()+'/index.html">'+
          '<span style="font-size:17px">✈</span>'+
          '<span><b>FLIGHT DECK</b><br><span class="mod">'+(me?me.name:'Mission Control')+'</span></span>'+
        '</a>'+
        '<div class="fdchips">'+
          '<span class="chip night" id="fd-night" style="display:none" '+
            'title="Past midnight but before your rollover hour — still logging to the day that just ended">'+
            '◐ <span id="fd-nightday">—</span></span>'+
          '<span class="chip hot" title="Consecutive active days">🔥 <span id="fd-streak">0</span></span>'+
          '<span class="chip lvl" title="Rank level"><small>LVL</small> <span id="fd-level">1</span></span>'+
          '<span class="chip opt" title="Total XP"><span id="fd-xp">0</span> <small>XP</small></span>'+
          '<span class="chip opt" title="XP earned today"><small>TODAY</small> <span id="fd-today">0</span></span>'+
          '<span class="chip opt" title="Day of your 120-day program"><small>DAY</small> <span id="fd-dayno">1/120</span></span>'+
          '<button class="iconbtn" id="fd-theme" title="Toggle theme">☀</button>'+
          '<button class="iconbtn" id="fd-menu" title="All modules (press M)">☰</button>'+
        '</div>'+
      '</div>';
    document.body.insertBefore(nav,document.body.firstChild);

    const dr=document.createElement('div');
    dr.className='fddrawer'; dr.id='fd-drawer';
    dr.innerHTML='<div class="fddrawer-in"><h3>All modules — press <b>Esc</b> to close</h3><div class="modgrid">'+
      MODULES.map(m=>'<a class="modlink'+(m.id===cur?' here':'')+'" href="'+href(m)+'">'+
        '<div class="ic">'+m.icon+'</div><div class="nm">'+m.name+'</div>'+
        '<div class="cd">'+m.cadence+'</div></a>').join('')+
      '</div></div>';
    document.body.appendChild(dr);

    document.getElementById('fd-theme').onclick=toggleTheme;
    document.getElementById('fd-menu').onclick=()=>dr.classList.toggle('open');
    dr.onclick=e=>{ if(e.target===dr) dr.classList.remove('open'); };
    document.addEventListener('keydown',e=>{
      const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if(e.key==='Escape') dr.classList.remove('open');
      if(e.key.toLowerCase()==='m' && !typing && !e.metaKey && !e.ctrlKey) dr.classList.toggle('open');
    });
    paintNav();
  }

  /* ---------- helpers ---------- */
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function $(s,r){ return (r||document).querySelector(s); }
  function $$(s,r){ return Array.from((r||document).querySelectorAll(s)); }
  function uid(){ return Math.random().toString(36).slice(2,10); }
  function pct(a,b){ return b>0?Math.min(100,Math.round(a/b*100)):0; }
  function lastDays(n){ const out=[]; for(let i=n-1;i>=0;i--) out.push(shift(key(),-i)); return out; }

  // Bind a text/textarea field to a module's day record.
  function bindField(el,modId,field,k){
    if(!el) return;
    el.value=(mod(modId,k)[field])||'';
    let t; el.addEventListener('input',()=>{ clearTimeout(t); t=setTimeout(()=>{
      const p={}; p[field]=el.value; setMod(modId,p,k);
    },320); });
  }
  // Bind a checklist. Awards XP once per box per day. Calls onChange(doneCount,total).
  function bindChecks(container,modId,onChange,xpEach){
    const boxes=$$('input[type=checkbox]',container);
    const st=mod(modId).checks||[];
    boxes.forEach((b,i)=>{
      b.checked=!!st[i];
      b.closest('.check').classList.toggle('done',b.checked);
      b.addEventListener('change',()=>{
        b.closest('.check').classList.toggle('done',b.checked);
        const cur=(mod(modId).checks||[]).slice();
        const wasOn=!!cur[i]; cur[i]=b.checked;
        setMod(modId,{checks:cur});
        if(b.checked&&!wasOn&&xpEach!==0) addXP(xpEach||2,'Checklist step');
        if(onChange) onChange(boxes.filter(x=>x.checked).length,boxes.length);
      });
    });
    if(onChange) onChange(boxes.filter(x=>x.checked).length,boxes.length);
    return boxes;
  }

  function exportJSON(){
    const blob=new Blob([JSON.stringify(read(),null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='flight-deck-backup-'+key()+'.json';
    document.body.appendChild(a); a.click(); a.remove();
    toast('Backup downloaded');
  }
  function importJSON(file,cb){
    const r=new FileReader();
    r.onload=()=>{
      try{
        const d=JSON.parse(r.result);
        if(typeof d.xp!=='number'||!d.days) throw new Error('Not a Flight Deck backup');
        localStorage.setItem(KEY,JSON.stringify(d)); reload(); toast('Data restored'); cb&&cb(true);
      }catch(e){ toast('⚠️ '+e.message); cb&&cb(false); }
    };
    r.readAsText(file);
  }

  /* ---------- boot ---------- */
  function boot(){
    applyTheme((()=>{ try{ return localStorage.getItem(THEME)||'dark'; }catch(e){ return 'dark'; } })());
    read(); buildNav(); reconcileFreezes(); paintNav();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();

  return {MODULES,PROGRAM_DAYS,key,calKey,parseKey,shift,diff,weekKey,read,write,mutate,reload,day,mod,setMod,
          rollover,inExtended,dayMinutes,fmtMin,dow,logicalDate,
          levelFor,xpForLevel,levelInfo,rankFor,addXP,streak,activeOn,missedYesterday,program,
          toast,confetti,beep,chime,applyTheme,toggleTheme,paintNav,esc,$,$$,uid,pct,lastDays,
          bindField,bindChecks,exportJSON,importJSON,href,root};
})();
