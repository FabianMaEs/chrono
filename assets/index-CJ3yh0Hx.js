(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))i(e);new MutationObserver(e=>{for(const n of e)if(n.type==="childList")for(const a of n.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function s(e){const n={};return e.integrity&&(n.integrity=e.integrity),e.referrerPolicy&&(n.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?n.credentials="include":e.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function i(e){if(e.ep)return;e.ep=!0;const n=s(e);fetch(e.href,n)}})();const M="chrono_db",B=1,L={alertIntervalMinutes:60,soundEnabled:!0,vibrationEnabled:!0,currencySymbol:"$"},$={status:"idle",startTime:null,accumulatedMs:0,projectId:null,activityTitle:"",lastAlertMinutesTriggered:0};class C{dbPromise;constructor(){this.dbPromise=this.initDB()}initDB(){return new Promise((t,s)=>{const i=indexedDB.open(M,B);i.onupgradeneeded=e=>{const n=e.target.result;if(n.objectStoreNames.contains("projects")||n.createObjectStore("projects",{keyPath:"id"}).createIndex("createdAt","createdAt",{unique:!1}),!n.objectStoreNames.contains("activities")){const a=n.createObjectStore("activities",{keyPath:"id"});a.createIndex("projectId","projectId",{unique:!1}),a.createIndex("startedAt","startedAt",{unique:!1})}n.objectStoreNames.contains("kv")||n.createObjectStore("kv",{keyPath:"key"})},i.onsuccess=()=>t(i.result),i.onerror=()=>s(i.error)})}async getStore(t,s){return(await this.dbPromise).transaction(t,s).objectStore(t)}async getProjects(){const t=await this.getStore("projects","readonly");return new Promise((s,i)=>{const e=t.getAll();e.onsuccess=()=>{const n=e.result||[];n.sort((a,o)=>o.createdAt-a.createdAt),s(n)},e.onerror=()=>i(e.error)})}async getProject(t){const s=await this.getStore("projects","readonly");return new Promise((i,e)=>{const n=s.get(t);n.onsuccess=()=>i(n.result||null),n.onerror=()=>e(n.error)})}async saveProject(t){const s=await this.getStore("projects","readwrite");return new Promise((i,e)=>{const n=s.put(t);n.onsuccess=()=>i(),n.onerror=()=>e(n.error)})}async deleteProject(t){const s=await this.getStore("projects","readwrite");return new Promise((i,e)=>{const n=s.delete(t);n.onsuccess=()=>i(),n.onerror=()=>e(n.error)})}async getActivities(){const t=await this.getStore("activities","readonly");return new Promise((s,i)=>{const e=t.getAll();e.onsuccess=()=>{const n=e.result||[];n.sort((a,o)=>o.startedAt-a.startedAt),s(n)},e.onerror=()=>i(e.error)})}async getActivitiesByProject(t){const s=await this.getStore("activities","readonly");return new Promise((i,e)=>{const a=s.index("projectId").getAll(t);a.onsuccess=()=>{const o=a.result||[];o.sort((r,l)=>l.startedAt-r.startedAt),i(o)},a.onerror=()=>e(a.error)})}async saveActivity(t){const s=await this.getStore("activities","readwrite");return new Promise((i,e)=>{const n=s.put(t);n.onsuccess=()=>i(),n.onerror=()=>e(n.error)})}async deleteActivity(t){const s=await this.getStore("activities","readwrite");return new Promise((i,e)=>{const n=s.delete(t);n.onsuccess=()=>i(),n.onerror=()=>e(n.error)})}async getKV(t,s){const i=await this.getStore("kv","readonly");return new Promise(e=>{const n=i.get(t);n.onsuccess=()=>{n.result&&n.result.value!==void 0?e(n.result.value):e(s)},n.onerror=()=>e(s)})}async setKV(t,s){const i=await this.getStore("kv","readwrite");return new Promise((e,n)=>{const a=i.put({key:t,value:s});a.onsuccess=()=>e(),a.onerror=()=>n(a.error)})}async getSettings(){return this.getKV("settings",L)}async saveSettings(t){return this.setKV("settings",t)}async getTimerSession(){return this.getKV("timer_session",$)}async saveTimerSession(t){return this.setKV("timer_session",t)}async exportBackup(){const t=await this.getProjects(),s=await this.getActivities(),i=await this.getSettings(),e={version:1,exportedAt:new Date().toISOString(),projects:t,activities:s,settings:i};return JSON.stringify(e,null,2)}async importBackup(t){const s=JSON.parse(t);if(!s||!Array.isArray(s.projects)||!Array.isArray(s.activities))throw new Error("Estructura de archivo de respaldo no válida");const i=await this.getStore("projects","readwrite");for(const n of s.projects)i.put(n);const e=await this.getStore("activities","readwrite");for(const n of s.activities)e.put(n);return s.settings&&await this.saveSettings(s.settings),{projectsCount:s.projects.length,activitiesCount:s.activities.length}}}const u=new C;class P{ctx=null;initCtx(){if(!this.ctx){const t=window.AudioContext||window.webkitAudioContext;t&&(this.ctx=new t)}this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume().catch(()=>{})}playAlert(){try{if(this.initCtx(),!this.ctx)return;const t=this.ctx.currentTime,s=this.ctx.createOscillator(),i=this.ctx.createOscillator(),e=this.ctx.createGain();s.type="sine",s.frequency.setValueAtTime(587.33,t),s.frequency.setValueAtTime(880,t+.15),i.type="triangle",i.frequency.setValueAtTime(590,t),i.frequency.setValueAtTime(885,t+.15),e.gain.setValueAtTime(.01,t),e.gain.exponentialRampToValueAtTime(.2,t+.05),e.gain.exponentialRampToValueAtTime(.001,t+.6),s.connect(e),i.connect(e),e.connect(this.ctx.destination),s.start(t),i.start(t),s.stop(t+.65),i.stop(t+.65)}catch{}}playTap(){try{if(this.initCtx(),!this.ctx)return;const t=this.ctx.currentTime,s=this.ctx.createOscillator(),i=this.ctx.createGain();s.type="sine",s.frequency.setValueAtTime(440,t),i.gain.setValueAtTime(.01,t),i.gain.exponentialRampToValueAtTime(.05,t+.02),i.gain.exponentialRampToValueAtTime(.001,t+.08),s.connect(i),i.connect(this.ctx.destination),s.start(t),s.stop(t+.09)}catch{}}vibrate(t=[100,50,100]){if("vibrate"in navigator)try{navigator.vibrate(t)}catch{}}}const g=new P;function E(c){const t=Math.max(0,Math.floor(c/1e3)),s=Math.floor(t/3600),i=Math.floor(t%3600/60),e=t%60,n=a=>a.toString().padStart(2,"0");return`${n(s)}:${n(i)}:${n(e)}`}function I(c){const t=Math.max(0,Math.floor(c/1e3)),s=Math.floor(t/3600),i=Math.floor(t%3600/60),e=t%60;return s>0?`${s}h ${i}m`:i>0?`${i}m ${e}s`:`${e}s`}function w(c,t="$"){const s=c.toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2});return`${t}${s}`}function k(c,t){const s=t.filter(a=>a.projectId===c.id),i=s.reduce((a,o)=>a+(o.durationMs||0),0),e=i/(1e3*60*60),n=e>0?c.cost/e:0;return{totalDurationMs:i,totalHours:e,effectiveRatePerHour:n,activitiesCount:s.length}}function j(c,t){const s=new Map;for(const i of t){const e=k(i,c);s.set(i.id,{project:i,effectiveRate:e.effectiveRatePerHour})}return c.map(i=>{const e=s.get(i.projectId),n=e?e.project.name:"Sin asignar",a=e?e.effectiveRate:0,r=(i.durationMs||0)/(1e3*60*60)*a;return{...i,projectName:n,earnedAmount:r,effectiveRatePerHour:a}})}function V(c){return new Date(c).toLocaleDateString("es-MX",{day:"2-digit",month:"short",year:"numeric"})}function D(c){return new Date(c).toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit",hour12:!1})}class q{session={status:"idle",startTime:null,accumulatedMs:0,projectId:null,activityTitle:"",lastAlertMinutesTriggered:0};settings={alertIntervalMinutes:60,soundEnabled:!0,vibrationEnabled:!0,currencySymbol:"$"};tickTimerId=null;listeners=new Set;wakeLockSentinel=null;isInitialized=!1;async init(){this.isInitialized||(this.isInitialized=!0,this.settings=await u.getSettings(),this.session=await u.getTimerSession(),document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"?(this.emitTick(),this.session.status==="running"&&this.requestWakeLock()):this.releaseWakeLock()}),this.session.status==="running"&&(this.startTickLoop(),this.requestWakeLock()))}subscribe(t){return this.listeners.add(t),t(this.getElapsedMs(),this.session),()=>this.listeners.delete(t)}emitTick(){const t=this.getElapsedMs();this.checkAlertThreshold(t);for(const s of this.listeners)s(t,this.session)}startTickLoop(){this.tickTimerId===null&&(this.tickTimerId=window.setInterval(()=>{this.emitTick()},500))}stopTickLoop(){this.tickTimerId!==null&&(clearInterval(this.tickTimerId),this.tickTimerId=null)}async requestWakeLock(){if("wakeLock"in navigator&&!this.wakeLockSentinel)try{this.wakeLockSentinel=await navigator.wakeLock.request("screen"),this.wakeLockSentinel.addEventListener("release",()=>{this.wakeLockSentinel=null})}catch{}}releaseWakeLock(){this.wakeLockSentinel&&(this.wakeLockSentinel.release().catch(()=>{}),this.wakeLockSentinel=null)}getElapsedMs(){return this.session.status==="running"&&this.session.startTime!==null?this.session.accumulatedMs+(Date.now()-this.session.startTime):this.session.accumulatedMs}getSession(){return this.session}async updateSettings(t){this.settings=t,await u.saveSettings(t)}async setAssignedProject(t){this.session.projectId=t,await u.saveTimerSession(this.session),this.emitTick()}async setAssignedTitle(t){this.session.activityTitle=t,await u.saveTimerSession(this.session),this.emitTick()}async start(t=null,s=""){if(this.session.status==="running")return;const i=Date.now();this.session.status==="idle"?this.session={status:"running",startTime:i,accumulatedMs:0,projectId:t??this.session.projectId,activityTitle:s||this.session.activityTitle,lastAlertMinutesTriggered:0}:this.session.status==="paused"&&(this.session.status="running",this.session.startTime=i),this.settings.soundEnabled&&g.playTap(),this.settings.vibrationEnabled&&g.vibrate(50),await u.saveTimerSession(this.session),this.startTickLoop(),this.requestWakeLock(),this.emitTick()}async pause(){if(this.session.status!=="running")return;const t=Date.now();this.session.startTime!==null&&(this.session.accumulatedMs+=t-this.session.startTime),this.session.status="paused",this.session.startTime=null,this.settings.soundEnabled&&g.playTap(),this.settings.vibrationEnabled&&g.vibrate(50),await u.saveTimerSession(this.session),this.stopTickLoop(),this.releaseWakeLock(),this.emitTick()}async resume(){if(this.session.status==="paused")return this.start(this.session.projectId,this.session.activityTitle)}async stop(){const t=this.getElapsedMs(),s=Date.now(),i=s-t,e={durationMs:t,startedAt:i,endedAt:s,projectId:this.session.projectId,activityTitle:this.session.activityTitle};return this.session={status:"idle",startTime:null,accumulatedMs:0,projectId:null,activityTitle:"",lastAlertMinutesTriggered:0},this.settings.soundEnabled&&g.playTap(),this.settings.vibrationEnabled&&g.vibrate(80),await u.saveTimerSession(this.session),this.stopTickLoop(),this.releaseWakeLock(),this.emitTick(),e}async reset(){this.session={status:"idle",startTime:null,accumulatedMs:0,projectId:null,activityTitle:"",lastAlertMinutesTriggered:0},await u.saveTimerSession(this.session),this.stopTickLoop(),this.releaseWakeLock(),this.emitTick()}checkAlertThreshold(t){if(this.session.status!=="running")return;const s=this.settings.alertIntervalMinutes;if(!s||s<=0)return;const i=Math.floor(t/(1e3*60));i>0&&i%s===0&&i!==this.session.lastAlertMinutesTriggered&&(this.session.lastAlertMinutesTriggered=i,u.saveTimerSession(this.session).catch(()=>{}),this.triggerAlert(i))}triggerAlert(t){if(this.settings.soundEnabled&&g.playAlert(),this.settings.vibrationEnabled&&g.vibrate([150,100,150,100,250]),"Notification"in window&&Notification.permission==="granted"){const s=I(t*60*1e3);try{new Notification("Chrono: Temporizador activo",{body:`Lleva ${s} corriendo continuo. ¿Sigues trabajando?`,icon:"./icons/icon-192.svg",tag:"chrono-timer-running",requireInteraction:!1})}catch{}}}}const p=new q,d={play:'<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l11-6.86a1 1 0 0 0 0-1.68l-11-6.86A1 1 0 0 0 8 5.14z"/></svg>',pause:'<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',stop:'<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" width="22" height="22"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',timer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="22" height="22"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M10 2h4"/><path d="M19 6l-1.5 1.5"/></svg>',folder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="22" height="22"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',export:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',import:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="18" height="18"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'};class H{currentTab="timer";projects=[];activities=[];settings={alertIntervalMinutes:60,soundEnabled:!0,vibrationEnabled:!0,currencySymbol:"$"};mainViewport=document.getElementById("main-viewport");headerStatus=document.getElementById("header-status");miniTimerBar=document.getElementById("mini-timer-bar");miniTimerDigits=document.getElementById("mini-timer-digits");miniTimerLabel=document.getElementById("mini-timer-label");btnMiniTimerOpen=document.getElementById("btn-mini-timer-open");modalProject=document.getElementById("modal-project");formProject=document.getElementById("form-project");modalActivity=document.getElementById("modal-activity");formActivity=document.getElementById("form-activity");modalConfirm=document.getElementById("modal-confirm");inputRestoreFile=document.getElementById("input-restore-file");async init(){this.injectStaticIcons(),this.registerServiceWorker(),await p.init(),this.settings=await u.getSettings(),await this.refreshData(),this.setupNavigation(),this.setupModals(),this.setupTimerSubscription(),this.renderCurrentTab()}injectStaticIcons(){const t=document.getElementById("brand-icon");t&&(t.innerHTML=d.timer);const s=document.getElementById("icon-tab-timer");s&&(s.innerHTML=d.timer);const i=document.getElementById("icon-tab-projects");i&&(i.innerHTML=d.folder);const e=document.getElementById("icon-tab-activities");e&&(e.innerHTML=d.list);const n=document.getElementById("icon-tab-settings");n&&(n.innerHTML=d.settings);const a=document.getElementById("btn-close-project-modal");a&&(a.innerHTML=d.close);const o=document.getElementById("btn-close-activity-modal");o&&(o.innerHTML=d.close)}registerServiceWorker(){"serviceWorker"in navigator&&window.addEventListener("load",()=>{navigator.serviceWorker.register("./sw.js").catch(()=>{})})}async refreshData(){this.projects=await u.getProjects(),this.activities=await u.getActivities()}setupNavigation(){const t=document.querySelectorAll(".nav-tab");t.forEach(s=>{s.addEventListener("click",()=>{const i=s.getAttribute("data-tab");i&&i!==this.currentTab&&(t.forEach(e=>e.classList.remove("active")),s.classList.add("active"),this.currentTab=i,this.renderCurrentTab())})}),this.btnMiniTimerOpen.addEventListener("click",()=>{const s=document.querySelector('[data-tab="timer"]');s&&s.click()})}setupTimerSubscription(){p.subscribe((t,s)=>{if(this.headerStatus.className="header-status-badge",s.status==="running"?(this.headerStatus.classList.add("running"),this.headerStatus.textContent="Corriendo"):s.status==="paused"?(this.headerStatus.classList.add("paused"),this.headerStatus.textContent="En pausa"):this.headerStatus.textContent="Inactivo",s.status!=="idle"&&this.currentTab!=="timer"){this.miniTimerBar.hidden=!1,this.miniTimerDigits.textContent=E(t);const e=this.projects.find(a=>a.id===s.projectId),n=s.activityTitle||(e?e.name:"Cronómetro rápido");this.miniTimerLabel.textContent=n}else this.miniTimerBar.hidden=!0;if(this.currentTab==="timer"){const e=document.getElementById("timer-digits"),n=document.getElementById("stopwatch-container");e&&(e.textContent=E(t)),n&&(n.className="stopwatch-display-container",s.status==="running"&&n.classList.add("running"),s.status==="paused"&&n.classList.add("paused"))}})}renderCurrentTab(){switch(this.currentTab){case"timer":this.renderTimerView();break;case"projects":this.renderProjectsView();break;case"activities":this.renderActivitiesView();break;case"settings":this.renderSettingsView();break}}renderTimerView(){const t=p.getSession(),s=p.getElapsedMs(),i=this.projects.map(m=>{const b=t.projectId===m.id?"selected":"";return`<option value="${m.id}" ${b}>${m.name}</option>`}).join("");let e="";t.status==="idle"?e=`
        <button class="btn-ctrl btn-start" id="btn-timer-start" type="button">
          ${d.play}
          <span>Iniciar Cronómetro Rápido</span>
        </button>
      `:t.status==="running"?e=`
        <button class="btn-ctrl btn-pause" id="btn-timer-pause" type="button">
          ${d.pause}
          <span>Pausar</span>
        </button>
      `:t.status==="paused"&&(e=`
        <button class="btn-ctrl btn-resume" id="btn-timer-resume" type="button">
          ${d.play}
          <span>Continuar</span>
        </button>
        <button class="btn-ctrl btn-stop" id="btn-timer-stop" type="button">
          ${d.stop}
          <span>Detener</span>
        </button>
      `),this.mainViewport.innerHTML=`
      <div class="timer-view-container">
        <!-- Target selector card -->
        <div class="timer-target-card">
          <div class="timer-target-field">
            <label class="target-label" for="live-select-project">Proyecto Asignado</label>
            <select class="target-select" id="live-select-project">
              <option value="">(Sin asignar o asignar al detener)</option>
              ${i}
            </select>
          </div>
          <div class="timer-target-field">
            <label class="target-label" for="live-input-title">Actividad / Tarea</label>
            <input class="target-input" id="live-input-title" type="text" placeholder="¿En qué estás trabajando?" value="${t.activityTitle}" />
          </div>
        </div>

        <!-- Stopwatch Circle -->
        <div class="stopwatch-display-container ${t.status}" id="stopwatch-container">
          <div class="stopwatch-digits" id="timer-digits">${E(s)}</div>
          <div class="stopwatch-subtext" id="stopwatch-subtext">
            ${t.activityTitle||(t.projectId?this.projects.find(m=>m.id===t.projectId)?.name||"":"Listo")}
          </div>
        </div>

        <!-- Actions Row -->
        <div class="timer-actions-row">
          ${e}
        </div>
      </div>
    `;const n=document.getElementById("live-select-project");n&&n.addEventListener("change",()=>{p.setAssignedProject(n.value||null)});const a=document.getElementById("live-input-title");a&&a.addEventListener("input",()=>{p.setAssignedTitle(a.value);const m=document.getElementById("stopwatch-subtext");m&&(m.textContent=a.value||"Listo")});const o=document.getElementById("btn-timer-start");o&&o.addEventListener("click",()=>{this.requestNotificationPermissionOnce(),p.start(n?.value||null,a?.value||""),this.renderTimerView()});const r=document.getElementById("btn-timer-pause");r&&r.addEventListener("click",()=>{p.pause(),this.renderTimerView()});const l=document.getElementById("btn-timer-resume");l&&l.addEventListener("click",()=>{p.resume(),this.renderTimerView()});const h=document.getElementById("btn-timer-stop");h&&h.addEventListener("click",async()=>{const m=await p.stop();this.openSaveActivityModal(m),this.renderTimerView()})}requestNotificationPermissionOnce(){"Notification"in window&&Notification.permission==="default"&&Notification.requestPermission().catch(()=>{})}renderProjectsView(){const t=this.projects.length===0?`
        <div class="empty-state">
          <div class="empty-state-title">No hay proyectos todavía</div>
          <div class="empty-state-text">Crea un proyecto para definir el costo total y calcular automáticamente tu ganancia por hora.</div>
        </div>
      `:this.projects.map(i=>{const e=k(i,this.activities),n=e.effectiveRatePerHour>0?`${w(e.effectiveRatePerHour,this.settings.currencySymbol)}/h`:"--",a=`${e.totalHours.toFixed(1)}h`,o=w(i.cost,this.settings.currencySymbol);return`
          <div class="project-card ${i.isCompleted?"completed":""}" data-id="${i.id}">
            <div class="project-card-top">
              <div>
                <h3 class="project-card-title">${i.name}</h3>
                ${i.description?`<p class="project-card-desc">${i.description}</p>`:""}
              </div>
            </div>

            <div class="project-card-meta-grid">
              <div class="meta-item">
                <span class="meta-item-label">Costo</span>
                <span class="meta-item-value">${o}</span>
              </div>
              <div class="meta-item">
                <span class="meta-item-label">Tiempo</span>
                <span class="meta-item-value">${a}</span>
              </div>
              <div class="meta-item">
                <span class="meta-item-label">Ganancia/h</span>
                <span class="meta-item-value rate">${n}</span>
              </div>
            </div>

            <div class="project-card-actions">
              <button class="status-toggle-badge ${i.isCompleted?"done":""}" data-action="toggle-status" data-id="${i.id}" type="button">
                ${i.isCompleted?"Terminado":"En progreso"}
              </button>
              <div class="project-action-icons">
                <button class="btn-icon-sm" data-action="edit-project" data-id="${i.id}" type="button" aria-label="Editar">
                  ${d.edit}
                </button>
                <button class="btn-icon-sm danger" data-action="delete-project" data-id="${i.id}" type="button" aria-label="Eliminar">
                  ${d.trash}
                </button>
              </div>
            </div>
          </div>
        `}).join("");this.mainViewport.innerHTML=`
      <div>
        <div class="section-header">
          <h2 class="section-title">Proyectos</h2>
          <button class="btn-new-item" id="btn-new-project" type="button">
            ${d.plus}
            <span>Nuevo</span>
          </button>
        </div>
        <div class="cards-list">
          ${t}
        </div>
      </div>
    `;const s=document.getElementById("btn-new-project");s&&s.addEventListener("click",()=>this.openProjectModal()),this.mainViewport.querySelectorAll('[data-action="toggle-status"]').forEach(i=>{i.addEventListener("click",async e=>{e.stopPropagation();const n=i.getAttribute("data-id"),a=this.projects.find(o=>o.id===n);a&&(a.isCompleted=!a.isCompleted,a.updatedAt=Date.now(),await u.saveProject(a),await this.refreshData(),this.renderProjectsView())})}),this.mainViewport.querySelectorAll('[data-action="edit-project"]').forEach(i=>{i.addEventListener("click",e=>{e.stopPropagation();const n=i.getAttribute("data-id"),a=this.projects.find(o=>o.id===n);a&&this.openProjectModal(a)})}),this.mainViewport.querySelectorAll('[data-action="delete-project"]').forEach(i=>{i.addEventListener("click",e=>{e.stopPropagation();const n=i.getAttribute("data-id"),a=this.projects.find(o=>o.id===n);a&&this.confirmAction("Eliminar Proyecto",`¿Seguro que deseas eliminar el proyecto "${a.name}"? Sus actividades no se borrarán pero quedarán sin proyecto asignado.`,async()=>{await u.deleteProject(a.id),await this.refreshData(),this.renderProjectsView()})})})}renderActivitiesView(){const t=j(this.activities,this.projects),s=t.length===0?`
        <div class="empty-state">
          <div class="empty-state-title">No hay actividades registradas</div>
          <div class="empty-state-text">Usa el cronómetro o agrega una entrada manual para comenzar a registrar tiempos y ganancias.</div>
        </div>
      `:t.map(e=>{const n=w(e.earnedAmount,this.settings.currencySymbol),a=e.effectiveRatePerHour>0?`${w(e.effectiveRatePerHour,this.settings.currencySymbol)}/h`:"--";return`
          <div class="activity-card" data-id="${e.id}">
            <div class="activity-card-top">
              <h3 class="activity-title">${e.title}</h3>
              <span class="activity-project-pill">${e.projectName}</span>
            </div>

            <div class="activity-meta-row">
              <div class="activity-time-info">
                <span class="activity-duration">${I(e.durationMs)}</span>
                <span class="activity-date">${V(e.startedAt)} • ${D(e.startedAt)}</span>
              </div>
              <div class="activity-earning-info">
                <span class="activity-earned-amount">${n}</span>
                <span class="activity-effective-rate">Tasa: ${a}</span>
              </div>
            </div>

            <div class="project-card-actions">
              <span class="meta-item-label">${e.projectName}</span>
              <div class="project-action-icons">
                <button class="btn-icon-sm" data-action="edit-activity" data-id="${e.id}" type="button" aria-label="Editar">
                  ${d.edit}
                </button>
                <button class="btn-icon-sm danger" data-action="delete-activity" data-id="${e.id}" type="button" aria-label="Eliminar">
                  ${d.trash}
                </button>
              </div>
            </div>
          </div>
        `}).join("");this.mainViewport.innerHTML=`
      <div>
        <div class="section-header">
          <h2 class="section-title">Actividades</h2>
          <button class="btn-new-item" id="btn-new-manual-activity" type="button">
            ${d.plus}
            <span>Manual</span>
          </button>
        </div>
        <div class="cards-list">
          ${s}
        </div>
      </div>
    `;const i=document.getElementById("btn-new-manual-activity");i&&i.addEventListener("click",()=>this.openManualActivityModal()),this.mainViewport.querySelectorAll('[data-action="edit-activity"]').forEach(e=>{e.addEventListener("click",()=>{const n=e.getAttribute("data-id"),a=this.activities.find(o=>o.id===n);a&&this.openEditActivityModal(a)})}),this.mainViewport.querySelectorAll('[data-action="delete-activity"]').forEach(e=>{e.addEventListener("click",()=>{const n=e.getAttribute("data-id"),a=this.activities.find(o=>o.id===n);a&&this.confirmAction("Eliminar Actividad",`¿Seguro que deseas eliminar "${a.title}"?`,async()=>{await u.deleteActivity(a.id),await this.refreshData(),this.renderActivitiesView()})})})}renderSettingsView(){this.mainViewport.innerHTML=`
      <div>
        <div class="section-header">
          <h2 class="section-title">Ajustes</h2>
        </div>

        <!-- Timer Alert Group -->
        <div class="settings-group">
          <h3 class="settings-group-title">Recordatorios de Cronómetro</h3>

          <div class="settings-item">
            <div>
              <div class="settings-item-label">Alerta por olvido</div>
              <div class="settings-item-hint">Avisar si el cronómetro sigue corriendo</div>
            </div>
            <select class="settings-select" id="setting-alert-interval">
              <option value="0" ${this.settings.alertIntervalMinutes===0?"selected":""}>Desactivado</option>
              <option value="30" ${this.settings.alertIntervalMinutes===30?"selected":""}>Cada 30 min</option>
              <option value="45" ${this.settings.alertIntervalMinutes===45?"selected":""}>Cada 45 min</option>
              <option value="60" ${this.settings.alertIntervalMinutes===60?"selected":""}>Cada 1 hora</option>
              <option value="90" ${this.settings.alertIntervalMinutes===90?"selected":""}>Cada 1.5 horas</option>
              <option value="120" ${this.settings.alertIntervalMinutes===120?"selected":""}>Cada 2 horas</option>
            </select>
          </div>

          <div class="settings-item">
            <div>
              <div class="settings-item-label">Sonido de alerta</div>
              <div class="settings-item-hint">Campana sutil al superar el límite</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-sound-enabled" ${this.settings.soundEnabled?"checked":""} />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="settings-item">
            <div>
              <div class="settings-item-label">Vibración háptica</div>
              <div class="settings-item-hint">Respuesta táctil en móvil</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-vibe-enabled" ${this.settings.vibrationEnabled?"checked":""} />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Currency Group -->
        <div class="settings-group">
          <h3 class="settings-group-title">Moneda</h3>
          <div class="settings-item">
            <div>
              <div class="settings-item-label">Símbolo</div>
              <div class="settings-item-hint">Prefijo para montos y ganancias</div>
            </div>
            <select class="settings-select" id="setting-currency">
              <option value="$" ${this.settings.currencySymbol==="$"?"selected":""}>$ (Dólar / Peso)</option>
              <option value="€" ${this.settings.currencySymbol==="€"?"selected":""}>€ (Euro)</option>
              <option value="£" ${this.settings.currencySymbol==="£"?"selected":""}>£ (Libra)</option>
            </select>
          </div>
        </div>

        <!-- Backup & Export Group -->
        <div class="settings-group">
          <h3 class="settings-group-title">Datos y Respaldo</h3>
          <button class="btn-full-action" id="btn-backup-export" type="button">
            ${d.export}
            <span>Exportar Copia de Seguridad (JSON)</span>
          </button>
          <button class="btn-full-action" id="btn-backup-import" type="button">
            ${d.import}
            <span>Restaurar Copia de Seguridad (JSON)</span>
          </button>
          <button class="btn-full-action" id="btn-csv-export" type="button">
            ${d.list}
            <span>Exportar Reporte a CSV</span>
          </button>
        </div>
      </div>
    `;const t=document.getElementById("setting-alert-interval");t&&t.addEventListener("change",async()=>{this.settings.alertIntervalMinutes=parseInt(t.value,10),await p.updateSettings(this.settings)});const s=document.getElementById("setting-sound-enabled");s&&s.addEventListener("change",async()=>{this.settings.soundEnabled=s.checked,await p.updateSettings(this.settings)});const i=document.getElementById("setting-vibe-enabled");i&&i.addEventListener("change",async()=>{this.settings.vibrationEnabled=i.checked,await p.updateSettings(this.settings)});const e=document.getElementById("setting-currency");e&&e.addEventListener("change",async()=>{this.settings.currencySymbol=e.value,await p.updateSettings(this.settings)});const n=document.getElementById("btn-backup-export");n&&n.addEventListener("click",()=>this.handleExportBackup());const a=document.getElementById("btn-backup-import");a&&a.addEventListener("click",()=>{this.inputRestoreFile.click()});const o=document.getElementById("btn-csv-export");o&&o.addEventListener("click",()=>this.handleExportCSV())}setupModals(){const t=document.getElementById("btn-cancel-project"),s=document.getElementById("btn-close-project-modal"),i=()=>this.modalProject.close();t&&t.addEventListener("click",i),s&&s.addEventListener("click",i),this.formProject.addEventListener("submit",async o=>{o.preventDefault();const r=document.getElementById("project-field-id"),l=document.getElementById("project-field-name"),h=document.getElementById("project-field-desc"),m=document.getElementById("project-field-cost"),b=document.getElementById("project-field-completed"),v=Date.now(),f={id:r.value||`proj_${v}_${Math.random().toString(36).substring(2,7)}`,name:l.value.trim(),description:h.value.trim(),cost:parseFloat(m.value)||0,isCompleted:b.value==="true",createdAt:r.value&&this.projects.find(y=>y.id===r.value)?.createdAt||v,updatedAt:v};await u.saveProject(f),await this.refreshData(),this.modalProject.close(),this.currentTab==="projects"&&this.renderProjectsView()});const e=document.getElementById("btn-cancel-activity"),n=document.getElementById("btn-close-activity-modal"),a=()=>this.modalActivity.close();e&&e.addEventListener("click",a),n&&n.addEventListener("click",a),this.formActivity.addEventListener("submit",async o=>{o.preventDefault();const r=document.getElementById("activity-field-id"),l=document.getElementById("activity-field-project"),h=document.getElementById("activity-field-title"),m=document.getElementById("activity-field-duration"),v=(parseInt(m.value,10)||1)*60*1e3,f=Date.now(),y=r.value?this.activities.find(x=>x.id===r.value):null,S=y?y.startedAt:f-v,T=y?S+v:f,A={id:r.value||`act_${f}_${Math.random().toString(36).substring(2,7)}`,projectId:l.value,title:h.value.trim()||"Actividad general",durationMs:v,startedAt:S,endedAt:T,createdAt:y?y.createdAt:f};await u.saveActivity(A),await this.refreshData(),this.modalActivity.close(),this.currentTab==="activities"&&this.renderActivitiesView(),this.currentTab==="projects"&&this.renderProjectsView()}),this.inputRestoreFile.addEventListener("change",async()=>{const o=this.inputRestoreFile.files?.[0];if(o)try{const r=await o.text(),l=await u.importBackup(r);await this.refreshData(),alert(`Respaldo restaurado: ${l.projectsCount} proyectos y ${l.activitiesCount} actividades.`),this.renderCurrentTab()}catch(r){alert("Error al leer el archivo de respaldo: "+(r instanceof Error?r.message:String(r)))}finally{this.inputRestoreFile.value=""}})}openProjectModal(t){const s=document.getElementById("modal-project-title"),i=document.getElementById("project-field-id"),e=document.getElementById("project-field-name"),n=document.getElementById("project-field-desc"),a=document.getElementById("project-field-cost"),o=document.getElementById("project-field-completed");t?(s.textContent="Editar Proyecto",i.value=t.id,e.value=t.name,n.value=t.description||"",a.value=t.cost.toString(),o.value=t.isCompleted?"true":"false"):(s.textContent="Nuevo Proyecto",i.value="",e.value="",n.value="",a.value="",o.value="false"),this.modalProject.showModal()}populateActivityProjectSelect(t=null){const s=document.getElementById("activity-field-project");if(this.projects.length===0){s.innerHTML='<option value="">(Sin proyectos creados)</option>';return}s.innerHTML=this.projects.map(i=>{const e=i.id===t?"selected":"";return`<option value="${i.id}" ${e}>${i.name}</option>`}).join("")}openSaveActivityModal(t){const s=document.getElementById("modal-activity-title"),i=document.getElementById("activity-field-id"),e=document.getElementById("activity-field-title"),n=document.getElementById("activity-field-duration");s.textContent="Guardar Actividad Terminada",i.value="",e.value=t.activityTitle||"";const a=Math.max(1,Math.round(t.durationMs/(1e3*60)));n.value=a.toString(),this.populateActivityProjectSelect(t.projectId),this.modalActivity.showModal()}openManualActivityModal(){const t=document.getElementById("modal-activity-title"),s=document.getElementById("activity-field-id"),i=document.getElementById("activity-field-title"),e=document.getElementById("activity-field-duration");t.textContent="Nueva Entrada Manual",s.value="",i.value="",e.value="30",this.populateActivityProjectSelect(),this.modalActivity.showModal()}openEditActivityModal(t){const s=document.getElementById("modal-activity-title"),i=document.getElementById("activity-field-id"),e=document.getElementById("activity-field-title"),n=document.getElementById("activity-field-duration");s.textContent="Editar Actividad",i.value=t.id,e.value=t.title;const a=Math.max(1,Math.round(t.durationMs/(1e3*60)));n.value=a.toString(),this.populateActivityProjectSelect(t.projectId),this.modalActivity.showModal()}confirmAction(t,s,i){const e=document.getElementById("modal-confirm-title"),n=document.getElementById("modal-confirm-message"),a=document.getElementById("btn-confirm-ok"),o=document.getElementById("btn-confirm-cancel");e.textContent=t,n.textContent=s;const r=()=>{this.modalConfirm.close(),a.onclick=null,o.onclick=null};o.onclick=()=>r(),a.onclick=async()=>{r(),await i()},this.modalConfirm.showModal()}async handleExportBackup(){const t=await u.exportBackup(),s=new Blob([t],{type:"application/json"}),i=URL.createObjectURL(s),e=new Date().toISOString().split("T")[0],n=document.createElement("a");n.href=i,n.download=`chrono-backup-${e}.json`,n.click(),URL.revokeObjectURL(i)}handleExportCSV(){const t=j(this.activities,this.projects),s=["ID","Proyecto","Actividad","Minutos","Horas","Ganancia","Tasa_Hora","Fecha_Inicio"],i=t.map(l=>{const h=Math.round(l.durationMs/6e4),m=(l.durationMs/(1e3*60*60)).toFixed(2);return[`"${l.id}"`,`"${l.projectName.replace(/"/g,'""')}"`,`"${l.title.replace(/"/g,'""')}"`,h,m,l.earnedAmount.toFixed(2),l.effectiveRatePerHour.toFixed(2),`"${new Date(l.startedAt).toISOString()}"`].join(",")}),e="\uFEFF"+[s.join(","),...i].join(`
`),n=new Blob([e],{type:"text/csv;charset=utf-8;"}),a=URL.createObjectURL(n),o=new Date().toISOString().split("T")[0],r=document.createElement("a");r.href=a,r.download=`chrono-reporte-${o}.csv`,r.click(),URL.revokeObjectURL(a)}}document.addEventListener("DOMContentLoaded",()=>{new H().init().catch(console.error)});
