"use strict";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const video=$("#video"),cv=$("#cv"),g=cv.getContext("2d"),shell=$("#shell"),sR=$("#startRange"),eR=$("#endRange");
let clips=[],ci=0,stk=[],sel=-1,file=null,broll=[],url="",dur=0,st=0,en=0,caps=[],ac=null,mon=null,dst=null,exporting=false;
const TRANS={x:50,y:50,scale:100,rotate:0,opacity:100,mirror:false,fit:"cover",bg:"#000000"};
const P={
 hormozi:{n:"HORMOZI",f:"Anton",c:"#ffffff",h:"#ffe600",sc:"#000000",st:6,up:1,gl:0,bx:0,wpl:3,sz:7,pop:1},
 beast:{n:"BEAST",f:"Lilita One",c:"#ffffff",h:"#00e676",sc:"#000000",st:8,up:1,gl:0,bx:0,wpl:2,sz:8.5,pop:1},
 neon:{n:"Neon",f:"Poppins",c:"#ffffff",h:"#ff2bd6",sc:"#000000",st:0,up:0,gl:1,bx:0,wpl:3,sz:6,pop:1},
 karaoke:{n:"Karaoke",f:"Montserrat",c:"#ffffff",h:"#7c3aed",sc:"#000000",st:0,up:0,gl:0,bx:2,wpl:3,sz:6,pop:1},
 clean:{n:"Clean",f:"Poppins",c:"#ffffff",h:"#ffffff",sc:"#000000",st:0,up:0,gl:0,bx:0,wpl:5,sz:5,pop:0},
 box:{n:"Box",f:"Montserrat",c:"#ffffff",h:"#ffd400",sc:"#000000",st:0,up:0,gl:0,bx:1,wpl:4,sz:5.5,pop:0},
 comic:{n:"Comic",f:"Bangers",c:"#ffe600",h:"#ff3b3b",sc:"#1a1a1a",st:7,up:1,gl:0,bx:0,wpl:3,sz:8,pop:1},
 marker:{n:"Marker",f:"Permanent Marker",c:"#ffffff",h:"#00e5ff",sc:"#000000",st:4,up:0,gl:1,bx:0,wpl:3,sz:6.5,pop:1}};
P.combo={n:"Combo",f:"Poppins",f2:"Pacifico",cmb:1,c:"#ffffff",h:"#ffd1f0",sc:"#000000",st:0,up:0,gl:1,bx:0,wpl:3,sz:6.5,pop:1};
P.script={n:"SCRIPT MIX",f:"Pacifico",f2:"Anton",cmb:1,c:"#ffffff",h:"#ffdf6e",sc:"#171717",st:2,up:0,gl:0,bx:0,wpl:3,sz:7,pop:1};
Object.entries({combo:"zoom",script:"pop",hormozi:"pop",beast:"pop",neon:"blur",karaoke:"slide",clean:"fade",box:"slide",comic:"pop",marker:"blur"}).forEach(([k,v])=>P[k].an=v);
const S={y:78,f2:"Pacifico",cmb:0,...P.hormozi},STR=new Set(["f","c","h","sc","an","f2"]);
const fmt=t=>{t=Math.max(0,t||0);return String(Math.floor(t/60)).padStart(2,"0")+":"+String(Math.floor(t%60)).padStart(2,"0")};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------- load / reset ---------- */
function loadFile(f){if(!f||!f.type.startsWith("video"))return;if(url)URL.revokeObjectURL(url);file=f;url=URL.createObjectURL(f);video.src=url;$("#emptyState").classList.add("hidden");$("#editor").classList.remove("hidden");$("#bottomNav").classList.remove("hidden");$("#changeBtn").classList.remove("hidden");caps=[];broll=[];cuts=[];stk=[];sel=-1;clips=[{f,url,a:0,b:100,caps,cuts,broll,stk}];ci=0;renderSegs();renderStrip();updateMeta()}
$("#fileInput").onchange=e=>loadFile(e.target.files[0]);
$("#changeBtn").onclick=()=>$("#fileInput").click();
["dragover","dragenter"].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();$("#emptyState").classList.add("drag")}));
["dragleave","drop"].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();$("#emptyState").classList.remove("drag");if(ev=="drop")loadFile(e.dataTransfer.files[0])}));
$("#resetBtn").onclick=()=>{if(url)URL.revokeObjectURL(url);url="";video.pause();video.removeAttribute("src");video.load();caps=[];$("#transcript").value="";$("#editor").classList.add("hidden");$("#bottomNav").classList.add("hidden");$("#changeBtn").classList.add("hidden");$("#emptyState").classList.remove("hidden");$("#fileInput").value=""};
video.onloadedmetadata=()=>{dur=video.duration||0;st=0;en=dur;sR.value=clips[ci]?clips[ci].a:0;eR.value=clips[ci]?clips[ci].b:100;const r=(video.videoWidth||9)/(video.videoHeight||16);if(ci==0)shell.style.aspectRatio=r;if(ci==0)shell.style.width=`min(100%,${(46*r).toFixed(1)}vh)`;$("#durationBadge").textContent=fmt(dur);sync()};

/* ---------- playback ---------- */
function audio(){if(ac)return;ac=new(window.AudioContext||window.webkitAudioContext)();const s=ac.createMediaElementSource(video);mon=ac.createGain();dst=ac.createMediaStreamDestination();const vo2=buildVoice(s);vo2.connect(mon);mon.connect(ac.destination);vo2.connect(dst);setVoice($("#voice").value)}
function toggle(){audio();ac.resume();if(video.paused){if(video.currentTime>=en-.05||video.currentTime<st)video.currentTime=st;video.play()}else video.pause()}
let dragMoved=false;$("#playBtn").onclick=()=>{if(dragMoved){dragMoved=false;return}toggle()};$("#playSmall").onclick=toggle;
video.onplay=()=>{if(musGain){mus.currentTime=Math.max(0,video.currentTime-st);mus.play()}$("#playBtn").classList.add("playing");$("#playBtn").textContent=$("#playSmall").textContent="Ⅱ"};
video.onpause=()=>{mus.pause();$("#playBtn").classList.remove("playing");$("#playBtn").textContent=$("#playSmall").textContent="▶"};
video.ontimeupdate=()=>{$("#timeLabel").textContent=fmt(video.currentTime)+" / "+fmt(dur);if(!seeking)$("#seek").value=dur?video.currentTime/dur*1000:0;if(!exporting&&!adv&&video.currentTime>=en-.03&&!video.paused){adv=true;if(ci<clips.length-1){loadClip(ci+1).then(()=>{video.play();trig()}).finally(()=>adv=false)}else{video.pause();video.currentTime=st;adv=false}}};
let seeking=false;$("#seek").oninput=e=>{seeking=true;video.currentTime=e.target.value/1000*dur};$("#seek").onchange=()=>seeking=false;
$("#muteBtn").onclick=()=>{audio();mon.gain.value=mon.gain.value?0:1;$("#muteBtn").textContent=mon.gain.value?"🔊":"🔇"};
document.addEventListener("keydown",e=>{if(e.code=="Space"&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&url){e.preventDefault();toggle()}});

/* ---------- trim ---------- */
function sync(src){let a=+sR.value,b=+eR.value,m=.3/dur*100;if(b-a<m){if(src===eR){b=Math.min(100,a+m);eR.value=b}else{a=Math.max(0,b-m);sR.value=a}}st=dur*a/100;en=dur*b/100;$("#fill").style.cssText=`left:${a}%;width:${b-a}%`;$("#startLabel").textContent=fmt(st);$("#endLabel").textContent=fmt(en);$("#trimLabel").textContent=fmt(st)+" — "+fmt(en)}
[sR,eR].forEach(x=>x.oninput=()=>{sync(x);video.currentTime=x===sR?st:Math.max(st,en-.1)});
$("#setStart").onclick=()=>{sR.value=Math.min(video.currentTime/dur*100,+eR.value-1);sync(sR)};
$("#setEnd").onclick=()=>{eR.value=Math.max(video.currentTime/dur*100,+sR.value+1);sync(eR)};

/* ---------- adjust ---------- */
const filt=()=>`brightness(${$("#fb").value}%) contrast(${$("#fc").value}%) saturate(${$("#fs").value}%) ${FX[$("#vfx").value]||""}`;
["#fb","#fc","#fs"].forEach(i=>$(i).oninput=()=>video.style.filter=filt());
$("#speed").onchange=e=>video.playbackRate=+e.target.value;
$("#adjReset").onclick=()=>{["#fb","#fc","#fs"].forEach(i=>$(i).value=100);$("#speed").value=1;video.playbackRate=1;video.style.filter=""};

/* ---------- tabs ---------- */
$$(".nav-item").forEach(b=>b.onclick=()=>{$$(".nav-item").forEach(x=>x.classList.toggle("active",x===b));$$("[data-p]").forEach(p=>p.classList.toggle("hidden",p.dataset.p!==b.dataset.t))});
function syncTransformUI(){$("#trScale").value=TRANS.scale;$("#trRotate").value=TRANS.rotate;$("#trX").value=TRANS.x;$("#trY").value=TRANS.y;$("#trOpacity").value=TRANS.opacity;$("#trMirror").checked=TRANS.mirror;$("#trContain").checked=TRANS.fit==="contain";$("#trBg").value=TRANS.bg}
[["trScale","scale"],["trRotate","rotate"],["trX","x"],["trY","y"],["trOpacity","opacity"]].forEach(([id,key])=>$("#"+id).oninput=e=>TRANS[key]=+e.target.value);
$("#trMirror").onchange=e=>TRANS.mirror=e.target.checked;$("#trContain").onchange=e=>TRANS.fit=e.target.checked?"contain":"cover";$("#trBg").oninput=e=>TRANS.bg=e.target.value;
$("#proReset").onclick=()=>{Object.assign(TRANS,{x:50,y:50,scale:100,rotate:0,opacity:100,mirror:false,fit:"cover",bg:"#000000"});syncTransformUI()};
$$(".ratio-btn").forEach(b=>b.onclick=()=>{const r=b.dataset.ratio.split(":");shell.style.aspectRatio=`${r[0]}/${r[1]}`;$$(".ratio-btn").forEach(x=>x.classList.toggle("active",x===b))});
syncTransformUI();

/* ---------- caption style ---------- */
function applyUI(){$$("[data-k]").forEach(el=>{const v=S[el.dataset.k];el.type=="checkbox"?el.checked=!!v:el.value=v})}
$$("[data-k]").forEach(el=>el.oninput=()=>{const k=el.dataset.k;S[k]=el.type=="checkbox"?+el.checked:STR.has(k)?el.value:+el.value;if(k=="f")document.fonts.load(`800 40px "${S.f}"`);$$(".style-card").forEach(c=>c.classList.remove("active"))});
$("#presets").innerHTML=Object.entries(P).map(([k,p])=>`<button class="style-card" data-s="${k}" style="font-family:'${p.f}';color:${p.h};${p.gl?`text-shadow:0 0 12px ${p.h}`:p.st?"-webkit-text-stroke:1px #000":""}">${p.n}</button>`).join("");
$$(".style-card").forEach(b=>b.onclick=()=>{Object.assign(S,{cmb:0},P[b.dataset.s]);document.fonts.load(`800 40px "${S.f}"`);applyUI();$$(".style-card").forEach(c=>c.classList.toggle("active",c===b))});
applyUI();$(".style-card").classList.add("active");

/* ---------- captions data ---------- */
function renderSegs(){caps.sort((a,b)=>a.s-b.s);$("#segList").innerHTML=caps.map((c,i)=>`<div class="seg" data-i="${i}"><input class="t" value="${esc(c.text)}"><input class="a n" type="number" step=".1" value="${c.s.toFixed(1)}"><input class="b n" type="number" step=".1" value="${c.e.toFixed(1)}"><button>×</button></div>`).join("");$("#captionStatus").textContent=caps.length?caps.length+" lines":"Off"}
$("#segList").oninput=e=>{const r=e.target.closest(".seg"),c=caps[r.dataset.i];if(e.target.classList.contains("t"))c.text=e.target.value;else if(e.target.classList.contains("a"))c.s=+e.target.value;else c.e=+e.target.value};
$("#segList").onchange=renderSegs;
$("#segList").onclick=e=>{const r=e.target.closest(".seg");if(!r)return;const i=+r.dataset.i;if(e.target.tagName=="BUTTON"){caps.splice(i,1);renderSegs()}else if(e.target.classList.contains("t"))video.currentTime=caps[i].s};
$("#addSeg").onclick=()=>{caps.push({s:video.currentTime,e:Math.min(en,video.currentTime+2),text:"New caption"});renderSegs()};
$("#clearCaptionBtn").onclick=()=>{caps=[];$("#transcript").value="";renderSegs()};
$("#buildBtn").onclick=()=>{const w=$("#transcript").value.trim().split(/\s+/).filter(Boolean);if(!w.length)return;const n=Math.max(2,S.wpl*2),len=(en-st)/w.length;caps=[];for(let i=0;i<w.length;i+=n){const c=w.slice(i,i+n);caps.push({s:st+i*len,e:st+(i+c.length)*len,text:c.join(" ")})}renderSegs()};
let speechRec=null,speechActive=false,speechRestart=false,speechLastTime=0,speechFinalText=[];
function stopAutoCaptions(message="Stopped"){
 speechActive=false;speechRestart=false;
 if(speechRec){try{speechRec.onend=null;speechRec.stop()}catch(_){}speechRec=null}
 video.pause();
 const cs=$("#captionStatus");cs.textContent=`${caps.length} lines · ${message}`;
 $("#autoCaptionBtn").disabled=false;$("#stopCaptionBtn").disabled=true;
}
function startRecognition(R){
 if(!speechActive)return;
 const r=new R();speechRec=r;r.lang=$("#lang").value;r.continuous=true;r.interimResults=true;r.maxAlternatives=1;
 r.onresult=e=>{
  for(let i=e.resultIndex;i<e.results.length;i++){
   const res=e.results[i],tx=(res[0]?.transcript||"").trim();
   if(!tx)continue;
   if(!res.isFinal){$("#captionStatus").textContent="🎙 "+tx;continue}
   // Web Speech exposes phrase-level results, not true per-word timestamps.
   // Use the actual recognition interval and distribute word starts across it.
   const end=Math.max(video.currentTime,speechLastTime+.18),begin=Math.max(st,speechLastTime);
   const words=tx.split(/\s+/).filter(Boolean),span=Math.max(.18,end-begin);
   const wordStarts=words.map((_,k)=>begin+span*k/words.length);
   caps.push({s:begin,e:Math.max(end,begin+.35),text:tx,w:wordStarts});
   speechFinalText.push(tx);speechLastTime=end;
   $("#transcript").value=speechFinalText.join(" ");renderSegs();
  }
 };
 r.onerror=e=>{
  if(!speechActive)return;
  if(["not-allowed","service-not-allowed","audio-capture"].includes(e.error)){
   $("#captionStatus").textContent="Mic permission/service unavailable: "+e.error;stopAutoCaptions("error");
  }else if(e.error!=="no-speech")$("#captionStatus").textContent="Listening… "+e.error;
 };
 r.onend=()=>{if(speechActive){speechRestart=true;setTimeout(()=>{if(speechActive)startRecognition(R)},300)}};
 try{r.start()}catch(err){$("#captionStatus").textContent="Could not start mic: "+err.message;stopAutoCaptions("error")}
}
$("#autoCaptionBtn").onclick=async()=>{
 const R=window.SpeechRecognition||window.webkitSpeechRecognition,cs=$("#captionStatus");
 if(!R){cs.textContent="Speech recognition is not available. Open VOX in Chrome on Android.";return}
 if(!url){cs.textContent="पहले वीडियो import करें";return}
 stopAutoCaptions("Restarting");
 caps=[];speechFinalText=[];$("#transcript").value="";renderSegs();
 speechActive=true;speechRestart=true;speechLastTime=st;video.pause();video.currentTime=st;
 try{audio();if(ac.state==="suspended")await ac.resume();mon.gain.value=1;await video.play();}
 catch(err){cs.textContent="Playback start नहीं हुआ: "+err.message;stopAutoCaptions("error");return}
 $("#autoCaptionBtn").disabled=true;$("#stopCaptionBtn").disabled=false;
 cs.textContent="🎙 Listening to speaker audio via phone mic…";startRecognition(R);
};
$("#stopCaptionBtn").onclick=()=>stopAutoCaptions("complete");
video.addEventListener("ended",()=>{if(speechActive)stopAutoCaptions("complete")});
video.addEventListener("pause",()=>{if(speechActive&&video.currentTime<en-.15)stopAutoCaptions("paused")});

/* ---------- caption renderer (preview + export) ---------- */
function rr(x,y,w,h,r){g.beginPath();g.roundRect?g.roundRect(x,y,w,h,r):g.rect(x,y,w,h);g.fill()}
function drawCap(w,h,t){const seg=caps.find(s=>t>=s.s&&t<s.e);if(!seg)return;let ws=seg.text.trim().split(/\s+/).filter(Boolean);if(!ws.length)return;if(S.up)ws=ws.map(x=>x.toUpperCase());
 const n=ws.length,ts=seg.w&&seg.w.length==n?seg.w:ws.map((_,i)=>seg.s+(seg.e-seg.s)*i/n);let ai=0;ts.forEach((v,i)=>{if(t>=v)ai=i});
 const pg=Math.floor(ai/S.wpl),pw=ws.slice(pg*S.wpl,pg*S.wpl+S.wpl),out=Math.min(1,(seg.e-t)/.15);
 let fs=h*S.sz/100;const FO=gi=>{const c=S.cmb&&gi%2;return`800 ${c?fs*1.08:fs}px "${c?S.f2:S.f}","Noto Sans Devanagari",sans-serif`},W=()=>pw.reduce((a,x,i)=>{g.font=FO(pg*S.wpl+i);return a+g.measureText(x).width+fs*.28},-fs*.28);
 let tw=W();if(tw>w*.9){fs*=w*.9/tw;tw=W()}
 g.save();g.textBaseline="middle";g.textAlign="center";g.lineJoin="round";let x=(w-tw)/2;const y=h*S.y/100;
 if(S.bx==1){g.fillStyle="rgba(0,0,0,.7)";g.globalAlpha=out;rr(x-fs*.4,y-fs*.75,tw+fs*.8,fs*1.5,fs*.3);g.globalAlpha=1}
 pw.forEach((wd,i)=>{const gi=pg*S.wpl+i;g.font=FO(gi);const ww=g.measureText(wd).width;if(gi>ai){x+=ww+fs*.28;return}
  const a=gi===ai,an=S.an=="auto"?["blur","pop","slide","drop","zoom","rot"][gi%6]:S.an,p=an=="none"?1:Math.min(1,(t-ts[gi])/.24),e=1-Math.pow(1-p,3);g.save();g.globalAlpha=e*out;
  g.translate(x+ww/2,y+(an=="slide"?(1-e)*fs*.6:an=="drop"?-(1-e)*fs*1.1:0));if(an=="blur")g.filter=`blur(${((1-e)*fs*.3).toFixed(1)}px)`;if(an=="rot")g.rotate(-.3*(1-e));
  let k=an=="pop"?.5+.5*(1+2.7*Math.pow(p-1,3)+1.7*Math.pow(p-1,2)):an=="zoom"?1+.9*(1-e):1;if(a&&S.pop)k*=1+.18*Math.max(0,1-(t-ts[gi])*5);g.scale(k,k);
  if(a&&S.bx==2){g.fillStyle=S.h;rr(-ww/2-fs*.18,-fs*.65,ww+fs*.36,fs*1.3,fs*.25)}
  const col=a&&S.bx!=2?S.h:S.c;
  if(S.gl){g.shadowColor=col;g.shadowBlur=fs*.7}else{g.shadowColor="rgba(0,0,0,.55)";g.shadowBlur=fs*.15;g.shadowOffsetY=fs*.05}
  if(S.st){g.lineWidth=fs*S.st/20;g.strokeStyle=S.sc;g.strokeText(wd,0,0)}
  g.fillStyle=col;g.fillText(wd,0,0);if(S.gl)g.fillText(wd,0,0);g.restore();x+=ww+fs*.28});
 g.restore()}
function drawBroll(w,h,t){broll.forEach(b=>{const on=t>=b.s&&t<b.e;if(!on){if(!b.el.paused)b.el.pause();return}
 if(b.el.paused&&!video.paused){b.el.currentTime=0;b.el.play().catch(()=>{});trig()}const v=b.el,p=(t-b.s)/(b.e-b.s),al=Math.min(1,(t-b.s)/.15,(b.e-t)/.15),z=1+.08*p,r=Math.max(w/v.videoWidth,h/v.videoHeight)*z;
 if(!v.videoWidth)return;g.save();g.globalAlpha=al;g.drawImage(v,(w-v.videoWidth*r)/2,(h-v.videoHeight*r)/2,v.videoWidth*r,v.videoHeight*r);g.restore()})}
(function loop(){if(!exporting){const d=devicePixelRatio||1,w=Math.round(shell.clientWidth*d),h=Math.round(shell.clientHeight*d);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}if(url){if(!video.paused){applyCuts(video.currentTime);applyRamp(video.currentTime)}bgTick();render(w,h,video.currentTime)}}requestAnimationFrame(loop)})();

/* ---------- export ---------- */
$("#exportBtn").onclick=async()=>{
 if(!url||exporting)return;const btn=$("#exportBtn"),stt=$("#exportStatus"),link=$("#downloadLink"),bar=$("#bar");
 const mime=["video/mp4;codecs=avc1,mp4a.40.2","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(m=>window.MediaRecorder&&MediaRecorder.isTypeSupported(m));
 if(!mime){stt.textContent="इस browser में export supported नहीं है";return}
 exporting=true;if(ci!=0)await loadClip(0);btn.disabled=true;link.classList.add("hidden");stt.textContent="Rendering… tab खुला रखें";
 await document.fonts.load(`800 40px "${S.f}"`);audio();await ac.resume();mon.gain.value=0;
 const ar=shell.clientWidth/Math.max(1,shell.clientHeight);let ew=1280,eh=Math.round(ew/ar);if(eh>1280){eh=1280;ew=Math.round(eh*ar)}cv.width=ew;cv.height=eh;
 const stream=cv.captureStream(30);dst.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
 const rec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8e6}),parts=[];rec.ondataavailable=e=>e.data.size&&parts.push(e.data);
 video.pause();video.currentTime=st;await new Promise(r=>video.addEventListener("seeked",r,{once:true}));
 const f=filt(),ext=mime.startsWith("video/mp4")?"mp4":"webm";
 const done=new Promise(r=>rec.onstop=r);rec.start(250);await video.play();
 let swi=false;const iv=setInterval(()=>{if(swi)return;const t=video.currentTime;applyCuts(t);applyRamp(t);bgTick();render(cv.width,cv.height,t);bar.style.width=Math.min(100,(t-st)/(en-st)*100)+"%";if(t>=en||video.ended){if(ci<clips.length-1){swi=true;loadClip(ci+1).then(()=>video.play()).then(()=>{trig();swi=false})}else{clearInterval(iv);video.pause();rec.stop()}}},33);
 await done;const u=URL.createObjectURL(new Blob(parts,{type:mime.split(";")[0]}));link.href=u;link.download="vox-edit."+ext;link.textContent="⬇ Download vox-edit."+ext;link.classList.remove("hidden");$("#fmt").textContent=ext.toUpperCase();
 stt.textContent="Export complete ✓";mon.gain.value=$("#muteBtn").textContent=="🔇"?0:1;exporting=false;btn.disabled=false;video.currentTime=st};

/* ---------- AI: Whisper transcription + auto B-roll ---------- */
const CF=["script","chatModel","apiUrl","apiModel","apiKey","apiLang","pexKey"];
const cfg=JSON.parse(localStorage.getItem("vox")||"{}");
cfg.script=cfg.script||"roman";cfg.chatModel=cfg.chatModel||"llama-3.3-70b-versatile";
if(!cfg.apiUrl){cfg.apiUrl="https://api.groq.com/openai/v1";cfg.apiModel="whisper-large-v3-turbo"}
CF.forEach(k=>{const el=$("#"+k);el.value=cfg[k]||"";el.oninput=()=>{cfg[k]=el.value.trim();localStorage.setItem("vox",JSON.stringify(cfg))}});
$("#apiPreset").onchange=e=>{[cfg.apiUrl,cfg.apiModel,cfg.chatModel]=e.target.value.split("|");$("#chatModel").value=cfg.chatModel;$("#apiUrl").value=cfg.apiUrl;$("#apiModel").value=cfg.apiModel;localStorage.setItem("vox",JSON.stringify(cfg))};
const say=m=>$("#aiStatus").textContent=m;
async function wav16(f){const d=await new AudioContext().decodeAudioData(await f.arrayBuffer()),n=Math.ceil(d.duration*16000),o=new OfflineAudioContext(1,n,16000),s=o.createBufferSource();s.buffer=d;s.connect(o.destination);s.start();const pcm=(await o.startRendering()).getChannelData(0),v=new DataView(new ArrayBuffer(44+n*2)),W=(p,t)=>[...t].forEach((c,i)=>v.setUint8(p+i,c.charCodeAt(0)));
 W(0,"RIFF");v.setUint32(4,36+n*2,true);W(8,"WAVEfmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);W(36,"data");v.setUint32(40,n*2,true);
 for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.max(-1,Math.min(1,pcm[i]))*32767,true);return new Blob([v],{type:"audio/wav"})}
async function transcribe(f=file){if(!f)throw Error("पहले वीडियो डालें");if(!cfg.apiKey)throw Error("API key डालें (Auto tab → API settings)");
 say("Audio निकाल रहा हूँ…");const fd=new FormData();fd.append("file",await wav16(f),"a.wav");fd.append("model",cfg.apiModel);fd.append("response_format","verbose_json");fd.append("timestamp_granularities[]","word");if(cfg.apiLang)fd.append("language",cfg.apiLang);if(cfg.script!="native")fd.append("prompt","Main bol raha hun, aaj ka kaam kya hai. Hinglish Roman script mein likho, jaise: yaar, bhai, kya haal hai.");
 say("Transcribe हो रहा है…");const r=await fetch(cfg.apiUrl.replace(/\/$/,"")+"/audio/transcriptions",{method:"POST",headers:{Authorization:"Bearer "+cfg.apiKey},body:fd});if(!r.ok)throw Error("API error "+r.status+": "+(await r.text()).slice(0,120));
 let ws=(await r.json()).words||[];if(!ws.length)throw Error("कोई शब्द नहीं मिले");if(cfg.script!="native")ws=await romanize(ws);const n=Math.max(2,S.wpl*2);caps=[];let c=[];
 const flush=()=>{if(c.length)caps.push({s:c[0].start,e:c[c.length-1].end+.05,text:c.map(x=>x.word.trim()).join(" "),w:c.map(x=>x.start)});c=[]};
 ws.forEach((x,i)=>{if(c.length&&(c.length>=n||x.start-c[c.length-1].end>.7))flush();c.push(x)});flush();$("#transcript").value=caps.map(x=>x.text).join(" ");renderSegs()}
const STOP=new Set("about after again because before being could doing every first from have here into just like make more most much only other over really said should some still such than that their them then there these they thing think this those through very want what when where which while will with would your".split(" "));
const kw=t=>(t.toLowerCase().match(/[a-z]{5,}/g)||[]).filter(x=>!STOP.has(x)).sort((a,b)=>b.length-a.length)[0];
async function autoBroll(){if(!cfg.pexKey){say("Captions तैयार ✓ (B-roll के लिए Pexels key डालें)");return}broll=[];let k=0;
 for(let i=1;i<caps.length;i+=2){const q=kw(caps[i].text);if(!q)continue;say(`B-roll खोज रहा हूँ: ${q}`);
  try{const j=await(await fetch(`https://api.pexels.com/videos/search?query=${q}&per_page=1&orientation=portrait`,{headers:{Authorization:cfg.pexKey}})).json(),f=(j.videos?.[0]?.video_files||[]).filter(x=>x.file_type=="video/mp4"&&x.width>=480).sort((a,b)=>a.width-b.width)[0];if(!f)continue;
   const el=document.createElement("video");el.muted=true;el.loop=true;el.playsInline=true;el.src=URL.createObjectURL(await(await fetch(f.link)).blob());await new Promise(r=>{el.onloadeddata=r;el.onerror=r});
   const s=caps[i].s;broll.push({s,e:Math.min(caps[i].e,s+2.4),el});k++}catch(_){}}
 say(`Done ✓ ${caps.length} caption lines · ${k} B-roll clips`)}
$("#capOnly").onclick=async()=>{try{await transcribe();say("Captions तैयार ✓ — Captions tab में edit करें")}catch(e){say("⚠ "+e.message)}};
$("#fullAuto").onclick=async()=>{try{broll=[];await transcribe();cutSilences();S.an="auto";applyUI();if($("#useBroll").checked)await autoBroll();else say("Captions तैयार ✓");video.currentTime=st}catch(e){say("⚠ "+e.message)}};

/* ---------- Studio: Hinglish, cuts, fx, bg-remove, overlay, music ---------- */
async function romanize(ws){if(!ws.some(x=>/[\u0900-\u097F]/.test(x.word)))return ws;say("Hinglish (Roman) में बदल रहा हूँ…");
 try{for(let i=0;i<ws.length;i+=120){const part=ws.slice(i,i+120).map(x=>x.word.trim());
  const r=await fetch(cfg.apiUrl.replace(/\/$/,"")+"/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+cfg.apiKey,"Content-Type":"application/json"},body:JSON.stringify({model:cfg.chatModel,temperature:0,messages:[{role:"user",content:"Convert each item of this JSON array to Hinglish: Hindi written in Roman/English letters the way Indians type on phones (e.g. मैं->main, क्या->kya, आज->aaj, है->hai). Keep English words unchanged. Return ONLY a JSON array of the same length, nothing else.\n"+JSON.stringify(part)}]})});
  const o=JSON.parse((await r.json()).choices[0].message.content.match(/\[[\s\S]*\]/)[0]);if(o.length==part.length)o.forEach((t,k)=>ws[i+k].word=String(t))}}catch(e){say("Roman convert fail — देवनागरी रखी")}return ws}
const FX={bw:"grayscale(1)",sepia:"sepia(.85)",vivid:"saturate(1.6) contrast(1.1)",cine:"contrast(1.15) saturate(.9) brightness(.95)",cool:"hue-rotate(-15deg) saturate(1.2)",vhs:"saturate(1.4) contrast(1.15) sepia(.2)",invert:"invert(1)",dream:"blur(1px) saturate(1.5) brightness(1.08)",duotone:"grayscale(1) contrast(1.25) sepia(.35)",poster:"contrast(1.7) saturate(1.35)"};
let cuts=[],markA=null,tx0=-1e4;
const cutUI=()=>$("#cutInfo").textContent=cuts.length+" cuts";
$("#cutA").onclick=()=>{markA=video.currentTime;$("#cutA").textContent="① "+fmt(markA)};
$("#cutB").onclick=()=>{if(markA==null)return;const a=Math.min(markA,video.currentTime),b=Math.max(markA,video.currentTime);if(b-a>.1)cuts.push({s:a,e:b});markA=null;$("#cutA").textContent="① Mark start";cutUI()};
$("#cutClr").onclick=()=>{cuts=[];cutUI()};
function cutSilences(){for(let i=0;i<caps.length-1;i++)if(caps[i+1].s-caps[i].e>.5)cuts.push({s:caps[i].e+.1,e:caps[i+1].s-.15});cutUI()}
$("#cutSil").onclick=()=>{if(!caps.length){say("पहले captions बनाओ (Auto tab)");return}cutSilences()};
function applyCuts(t){const c=cuts.find(c=>t>=c.s&&t<c.e);if(c){video.currentTime=c.e;trig()}}
function trig(){tx0=performance.now();sfx()}
function sfx(){const k=$("#sfxs").value;if(k=="none"||!ac)return;const t=ac.currentTime,o=ac.createGain();o.gain.value=.7;o.connect(dst);if(!exporting)o.connect(ac.destination);
 if(k=="pop"){const s=ac.createOscillator(),e=ac.createGain();s.frequency.setValueAtTime(500,t);s.frequency.exponentialRampToValueAtTime(90,t+.15);e.gain.setValueAtTime(1,t);e.gain.exponentialRampToValueAtTime(.001,t+.18);s.connect(e);e.connect(o);s.start(t);s.stop(t+.2)}
 else{const b=ac.createBuffer(1,ac.sampleRate*.5,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const s=ac.createBufferSource(),f=ac.createBiquadFilter(),e=ac.createGain();s.buffer=b;f.type="bandpass";f.Q.value=1.2;f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(4000,t+.4);e.gain.setValueAtTime(.001,t);e.gain.exponentialRampToValueAtTime(1,t+.2);e.gain.exponentialRampToValueAtTime(.001,t+.45);s.connect(f);f.connect(e);e.connect(o);s.start(t)}}
/* bg removal (MediaPipe selfie segmentation) */
let ss=null,bgMode="off",bgReady=false,bgBusy=false;const bgCv=document.createElement("canvas"),bgx=bgCv.getContext("2d");
async function bgInit(){if(ss)return;await new Promise((r,j)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js";s.onload=r;s.onerror=j;document.head.appendChild(s)});
 ss=new SelfieSegmentation({locateFile:f=>"https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/"+f});ss.setOptions({modelSelection:1});
 ss.onResults(r=>{const W=bgCv.width=r.image.width,H=bgCv.height=r.image.height;bgx.save();bgx.drawImage(r.segmentationMask,0,0,W,H);bgx.globalCompositeOperation="source-in";bgx.drawImage(r.image,0,0,W,H);bgx.globalCompositeOperation="destination-over";if(bgMode=="blur"){bgx.filter="blur(18px)";bgx.drawImage(r.image,0,0,W,H)}else{bgx.fillStyle=$("#bgcol").value;bgx.fillRect(0,0,W,H)}bgx.restore();bgReady=true})}
$("#bgm").onchange=async e=>{bgMode=e.target.value;bgReady=false;if(bgMode!="off"){try{await bgInit()}catch(_){alert("Model load नहीं हुआ — internet check करें");bgMode="off";e.target.value="off"}}};
function bgTick(){if(!ss||bgMode=="off"||bgBusy||video.readyState<2)return;bgBusy=true;ss.send({image:video}).catch(()=>{}).finally(()=>bgBusy=false)}
/* overlay / PiP */
let ov=null;const OV={x:72,y:25,sc:35,a:100,bl:"source-over",mk:"none"};
$("#ovFile").onchange=e=>{const f=e.target.files[0];if(!f)return;const v=f.type.startsWith("video"),el=document.createElement(v?"video":"img");el.src=URL.createObjectURL(f);if(v){el.muted=true;el.loop=true;el.playsInline=true;el.play()}ov=el};
$("#ovDel").onclick=()=>{ov=null;$("#ovFile").value=""};
[["ovS","sc"],["ovA","a"]].forEach(([i,k])=>$("#"+i).oninput=e=>OV[k]=+e.target.value);$("#ovB").onchange=e=>OV.bl=e.target.value;$("#ovM").onchange=e=>OV.mk=e.target.value;
const ovH=(w,h)=>{const iw=ov.videoWidth||ov.naturalWidth,ih=ov.videoHeight||ov.naturalHeight;return iw?w*OV.sc/100*ih/iw:0};
function drawOverlay(w,h){if(!ov)return;const iw=ov.videoWidth||ov.naturalWidth;if(!iw)return;const ow=w*OV.sc/100,oh=ovH(w,h),x=w*OV.x/100-ow/2,y=h*OV.y/100-oh/2,m=Math.min(ow,oh);
 g.save();g.globalAlpha=OV.a/100;g.globalCompositeOperation=OV.bl;if(OV.mk!="none"){g.beginPath();OV.mk=="circle"?g.arc(x+ow/2,y+oh/2,m/2,0,7):g.roundRect?g.roundRect(x,y,ow,oh,m*.18):g.rect(x,y,ow,oh);g.clip()}g.drawImage(ov,x,y,ow,oh);g.restore()}
let drag=false;shell.style.touchAction="none";
shell.addEventListener("pointerdown",e=>{if(!ov)return;const r=shell.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*100,py=(e.clientY-r.top)/r.height*100;if(Math.abs(px-OV.x)<OV.sc/2&&Math.abs(py-OV.y)<ovH(100,100*r.height/r.width)/2*(r.width/r.height)*0+ovH(r.width,r.height)/r.height*50){drag=true;shell.setPointerCapture(e.pointerId)}});
shell.addEventListener("pointermove",e=>{if(!drag)return;const r=shell.getBoundingClientRect();OV.x=Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100));OV.y=Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100));dragMoved=true});
shell.addEventListener("pointerup",()=>drag=false);
/* music */
const mus=new Audio();mus.loop=true;let musGain=null;
$("#musFile").onchange=e=>{const f=e.target.files[0];if(!f)return;audio();ac.resume();musF=f;mus.src=URL.createObjectURL(f);if(!musGain){const s=ac.createMediaElementSource(mus);musGain=ac.createGain();musGain.gain.value=$("#musV").value/100;s.connect(musGain);musGain.connect(mon);musGain.connect(dst)}};
$("#musV").oninput=e=>{if(musGain)musGain.gain.value=e.target.value/100};
$("#audCap").onchange=async e=>{try{await transcribe(e.target.files[0]);say("Audio से captions ✓")}catch(x){say("⚠ "+x.message)}};

/* ---------- Timeline clips ---------- */
let adv=false;
const renderStrip=()=>{$("#chips").innerHTML=clips.map((c,i)=>`<button class="chip${i==ci?" on":""}" data-i="${i}">${i+1}</button>`).join("")};
function saveClip(){const c=clips[ci];if(c)Object.assign(c,{a:+sR.value,b:+eR.value,caps,cuts,broll,stk,sp:$("#speed").value,rp:$("#ramp").value})}
async function loadClip(i){video.pause();saveClip();ci=i;const c=clips[i];file=c.f;url=c.url;caps=c.caps||[];cuts=c.cuts||[];broll=c.broll||[];stk=c.stk||[];sel=-1;$("#speed").value=c.sp||1;$("#ramp").value=c.rp||"none";
 await new Promise(r=>{video.addEventListener("loadedmetadata",r,{once:true});video.src=url});
 dur=video.duration||0; st=dur*(+c.a||0)/100; en=dur*(c.b==null?100:+c.b)/100;
 sR.value=c.a==null?0:c.a; eR.value=c.b==null?100:c.b; video.playbackRate=+c.sp||1; sync();
 await new Promise(r=>{video.addEventListener("seeked",r,{once:true});video.currentTime=st});
 renderSegs();cutUI();renderStrip();stUI();updateMeta();return c}

$("#chips").onclick=e=>{const i=e.target.dataset.i;if(i!=null&&+i!=ci)loadClip(+i)};
$("#addClip").onclick=()=>$("#clipFile").click();
$("#clipFile").onchange=e=>{const fs=[...e.target.files];fs.forEach(f=>clips.push({f,url:URL.createObjectURL(f),a:0,b:100,caps:[],cuts:[],broll:[],stk:[]}));e.target.value="";renderStrip();if(clips.length===1)loadClip(0)};
$("#splitClip").onclick=()=>{saveClip();const c=clips[ci],p=video.currentTime/dur*100;if(p<=c.a+1||p>=c.b-1)return;const n={...c,caps:c.caps.map(x=>({...x})),cuts:c.cuts.map(x=>({...x})),stk:c.stk.map(x=>({...x})),broll:[],a:p};c.b=p;eR.value=p;sync(eR);clips.splice(ci+1,0,n);renderStrip()};
const mv=d=>{const j=ci+d;if(j<0||j>=clips.length)return;saveClip();[clips[ci],clips[j]]=[clips[j],clips[ci]];ci=j;renderStrip()};
$("#mvL").onclick=()=>mv(-1);$("#mvR").onclick=()=>mv(1);
$("#delClip").onclick=()=>{if(clips.length<2)return;clips.splice(ci,1);loadClip(Math.min(ci,clips.length-1))};
/* ---------- Voice enhancer ---------- */
let vb,vc,vo,gate,nf=.01,vMode="studio";
function buildVoice(s){const F=(t,f,g,q)=>{const n=ac.createBiquadFilter();n.type=t;n.frequency.value=f;if(g!=null)n.gain.value=g;if(q)n.Q.value=q;return n},out=ac.createGain();vb=ac.createGain();vc=ac.createGain();
 const hp=F("highpass",90),mud=F("peaking",280,-3),pr=F("peaking",3200,4,.9),air=F("highshelf",9000,2.5),lp=F("lowpass",15000),cp=ac.createDynamicsCompressor(),mk=ac.createGain(),lim=ac.createDynamicsCompressor(),an=ac.createAnalyser();gate=ac.createGain();an.fftSize=1024;
 cp.threshold.value=-26;cp.ratio.value=3.5;cp.attack.value=.005;cp.release.value=.2;lim.threshold.value=-3;lim.ratio.value=20;lim.attack.value=.001;mk.gain.value=1.5;
 s.connect(vb);vb.connect(out);s.connect(hp);hp.connect(an);hp.connect(mud);mud.connect(pr);pr.connect(air);air.connect(lp);lp.connect(cp);cp.connect(gate);gate.connect(mk);mk.connect(lim);lim.connect(vc);vc.connect(out);vo={pr,air,mk,cp};
 const d=new Float32Array(1024);setInterval(()=>{if(vMode=="off")return;an.getFloatTimeDomainData(d);let r=0;for(const x of d)r+=x*x;r=Math.sqrt(r/d.length);nf=Math.min(r+1e-5,nf*1.004+1e-6);gate.gain.setTargetAtTime(r>nf*3?1:vMode=="studio"?.08:.25,ac.currentTime,.04)},30);return out}
function setVoice(m){vMode=m;if(!vb)return;vb.gain.value=m=="off"?1:0;vc.gain.value=m=="off"?0:1;const s=m=="studio";vo.pr.gain.value=s?5:3;vo.air.gain.value=s?3.5:2;vo.cp.ratio.value=s?4.5:3;vo.mk.gain.value=s?1.8:1.3}
$("#voice").onchange=e=>setVoice(e.target.value);
/* ---------- Built-in sticker library ---------- */
const STICKERS=[
["reaction","🔥","Fire"],["reaction","😂","LOL"],["reaction","🤣","ROFL"],["reaction","😍","Love"],["reaction","🤯","Mind blown"],["reaction","😳","Shock"],["reaction","😭","Crying"],["reaction","😎","Cool"],["reaction","🥶","Cold"],["reaction","😈","Savage"],["reaction","🤡","Clown"],["reaction","💀","Dead"],
["creator","🎥","REC"],["creator","🎬","ACTION"],["creator","🎙️","VOICE"],["creator","🔴","LIVE"],["creator","▶️","PLAY"],["creator","🔔","NOTIFY"],["creator","👍","LIKE"],["creator","❤️","LOVE"],["creator","💬","COMMENT"],["creator","➕","FOLLOW"],["creator","📌","PIN"],["creator","⭐","TOP"],
["gaming","🎮","GAME"],["gaming","🏆","WIN"],["gaming","👑","KING"],["gaming","⚡","POWER"],["gaming","💥","BOOM"],["gaming","🎯","HEADSHOT"],["gaming","🛡️","CLUTCH"],["gaming","🔥","OP"],["gaming","💎","RARE"],["gaming","🚀","BOOST"],
["social","💯","100"],["social","✨","WOW"],["social","💫","VIBE"],["social","🚨","ALERT"],["social","❗","IMPORTANT"],["social","❓","WHAT"],["social","👇","LOOK"],["social","👉","THIS"],["social","✅","DONE"],["social","❌","NOPE"],["social","📈","UP"],["social","💰","MONEY"],
["shape","●","DOT"],["shape","★","STAR"],["shape","◆","DIAMOND"],["shape","✦","SPARK"],["shape","➜","ARROW"],["shape","➤","ARROW2"],["shape","✓","CHECK"],["shape","×","CROSS"],["shape","＋","PLUS"],["shape","⚡","BOLT"],
["reaction","😮","WOW"],["reaction","😱","OMG"],["reaction","🤔","THINK"],["reaction","😴","SLEEP"],["reaction","🥳","PARTY"],["reaction","🤩","STAR"],["reaction","🙌","PRAISE"],["reaction","👏","CLAP"],["reaction","🙏","RESPECT"],["reaction","🫡","SALUTE"],
["creator","🔴","ON AIR"],["creator","🎬","NEW"],["creator","📢","HEY"],["creator","🔗","LINK"],["creator","💡","TIP"],["creator","🔥","TRENDING"],["creator","🚀","GROW"],["creator","🎯","GOAL"],["creator","📸","PHOTO"],["creator","🎵","MUSIC"],
["gaming","🕹️","ARCADE"],["gaming","💀","KO"],["gaming","⚔️","BATTLE"],["gaming","🏹","AIM"],["gaming","🔫","SHOT"],["gaming","🧨","BOOM"],["gaming","👾","BOSS"],["gaming","🎲","LUCK"],["gaming","🏅","MVP"],
["social","🔥","HOT"],["social","💎","PREMIUM"],["social","⚡","FAST"],["social","🧠","SMART"],["social","👀","WATCH"],["social","🗣️","SAY IT"],["social","📍","HERE"],["social","🔎","LOOK"],["social","⏱️","WAIT"],["social","💥","VIRAL"],["social","🆕","NEW"],["social","✔️","YES"],
["shape","♡","LOVE"],["shape","♥","HEART"],["shape","✿","FLOWER"],["shape","❖","GEM"],["shape","✧","SPARKLE"],["shape","➳","ARROW"],["shape","➜","GO"],["shape","↗","UP"],["shape","↘","DOWN"],["shape","★","STAR2"],["shape","☻","SMILE"],["shape","☀","SUN"]];
let stickerCat="all";
function renderStickerLibrary(){const list=STICKERS.filter(x=>stickerCat==="all"||x[0]===stickerCat);$("#emo").innerHTML=list.map(x=>`<button class="sticker-card" data-sticker="${esc(x[1])}" title="${esc(x[2])}"><span>${x[1]}</span><small>${esc(x[2])}</small></button>`).join("")}
renderStickerLibrary();
$$(".st-tab").forEach(b=>b.onclick=()=>{$$(".st-tab").forEach(x=>x.classList.toggle("active",x===b));stickerCat=b.dataset.cat;renderStickerLibrary()});
$("#emo").onclick=e=>{const b=e.target.closest(".sticker-card");if(b)addStk("emoji",b.dataset.sticker)};
function addStk(k,v,col){const t=video.currentTime;stk.push({k,v,col:col||"#ff2d55",x:50,y:35,sz:25,an:"pop",s:t,e:Math.min(t+3,dur)});sel=stk.length-1;stUI()}
$("#stAdd").onclick=()=>{const v=$("#stTxt").value.trim();if(v)addStk("text",v,$("#stCol").value)};
$("#stImg").onchange=e=>{const f=e.target.files[0];if(!f)return;const im=new Image();im.src=URL.createObjectURL(f);im.onload=()=>addStk("img",im)};
function stUI(){const o=stk[sel];if(o){$("#stS").value=o.sz;$("#stA").value=o.an}$("#stInfo").textContent=o?fmt(o.s)+"–"+fmt(o.e):"—";$("#stList").innerHTML=stk.map((o,i)=>`<button class="secondary-btn compact" data-i="${i}" style="${i==sel?"border-color:#8b5cf6":""}">${o.k=="img"?"🖼":esc(o.v)} · ${fmt(o.s)}–${fmt(o.e)}</button>`).join("")}
$("#stList").onclick=e=>{const i=e.target.dataset.i;if(i!=null){sel=+i;stUI()}};
$("#stS").oninput=e=>{if(stk[sel])stk[sel].sz=+e.target.value};$("#stA").onchange=e=>{if(stk[sel])stk[sel].an=e.target.value};
$("#stIn").onclick=()=>{if(stk[sel]){stk[sel].s=video.currentTime;stUI()}};$("#stOut").onclick=()=>{if(stk[sel]){stk[sel].e=video.currentTime;stUI()}};$("#stDel").onclick=()=>{if(stk[sel]){stk.splice(sel,1);sel=-1;stUI()}};
let sd=null;shell.addEventListener("pointerdown",e=>{const r=shell.getBoundingClientRect(),px=(e.clientX-r.left)/r.width*100,py=(e.clientY-r.top)/r.height*100,t=video.currentTime;for(let i=stk.length-1;i>=0;i--){const o=stk[i];if(t>=o.s&&t<o.e&&Math.abs(px-o.x)<o.sz/2&&Math.abs(py-o.y)<o.sz/2*r.width/r.height){sd=o;sel=i;drag=false;stUI();shell.setPointerCapture(e.pointerId);break}}});
shell.addEventListener("pointermove",e=>{if(!sd)return;const r=shell.getBoundingClientRect();sd.x=Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100));sd.y=Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100));dragMoved=true});
shell.addEventListener("pointerup",()=>sd=null);

/* ---------- sticker renderer ---------- */
function drawStk(w,h,t){
  if(!stk||!stk.length)return;
  for(const o of stk){
    if(t<o.s||t>o.e)continue;
    const p=Math.max(0,Math.min(1,(t-o.s)/Math.max(.01,o.e-o.s)));
    let a=Math.min(1,(t-o.s)/.16,(o.e-t)/.16),sc=1,rot=0,dx=0,dy=0;
    const an=o.an||"pop";
    if(an==="pop")sc=.65+.35*Math.min(1,(t-o.s)/.18);
    if(an==="bounce")sc=1+.12*Math.sin(p*Math.PI*8)*Math.exp(-p*3);
    if(an==="pulse")sc=1+.08*Math.sin(p*Math.PI*10);
    if(an==="spin")rot=(1-Math.min(1,(t-o.s)/.35))*-.5;
    if(an==="shake"){dx=Math.sin(p*45)*w*.012;dy=Math.cos(p*37)*h*.008}
    if(an==="float")dy=Math.sin(p*Math.PI*2)*h*.025;
    if(an==="wiggle")rot=Math.sin(p*Math.PI*8)*.12;
    if(an==="drop"){dy=-(1-Math.min(1,(t-o.s)/.3))*h*.08}
    if(an==="zoom")sc=.35+.65*Math.min(1,(t-o.s)/.3);
    const x=w*o.x/100+dx,y=h*o.y/100+dy,size=Math.max(12,h*(+o.sz||25)/100);
    g.save();g.globalAlpha=a;g.translate(x,y);g.rotate(rot);g.scale(sc,sc);g.textAlign="center";g.textBaseline="middle";
    if(o.k==="img"&&o.v&&o.v.complete){const iw=o.v.naturalWidth||o.v.width,ih=o.v.naturalHeight||o.v.height,r=Math.min(size*2.4/iw,size*2.4/ih);g.drawImage(o.v,-iw*r/2,-ih*r/2,iw*r,ih*r)}
    else {g.font=`900 ${size}px system-ui,"Noto Color Emoji",sans-serif`;g.lineJoin="round";g.lineWidth=Math.max(2,size*.08);g.strokeStyle="rgba(0,0,0,.65)";g.fillStyle=o.col||"#fff";g.strokeText(String(o.v||""),0,0);g.fillText(String(o.v||""),0,0)}
    g.restore();
  }
}

/* ---------- master render ---------- */
const NZ=(()=>{const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d"),d=x.createImageData(128,128);for(let i=0;i<d.data.length;i+=4){d.data[i]=d.data[i+1]=d.data[i+2]=Math.random()*255;d.data[i+3]=70}x.putImageData(d,0,0);return c})(),px=document.createElement("canvas"),pxx=px.getContext("2d");
function drawCover(s,w,h,extraScale=1,extraRot=0,extraX=0,extraY=0){
 const sw=s.videoWidth||s.width,sh=s.videoHeight||s.height;if(!sw||!sh)return;
 const r=(TRANS.fit==="contain"?Math.min(w/sw,h/sh):Math.max(w/sw,h/sh))*(TRANS.scale/100)*extraScale;
 const dw=sw*r,dh=sh*r;
 g.save();g.translate(w*TRANS.x/100+extraX,h*TRANS.y/100+extraY);g.rotate((TRANS.rotate+extraRot)*Math.PI/180);g.globalAlpha=TRANS.opacity/100;if(TRANS.mirror)g.scale(-1,1);g.drawImage(s,-dw/2,-dh/2,dw,dh);g.restore();
}
function render(w,h,t){const p=Math.min(1,(performance.now()-tx0)/450),q=1-p,tr=$("#tr").value,v=$("#vfx").value,tp=p<1&&tr!=="none",src=bgMode!=="off"&&bgReady?bgCv:video;
 let sc=1,rt=0,sx=0,sy=0;if(tp){if(tr==="zoom")sc=1+.2*q;if(tr==="spin"){sc=1+.3*q;rt=.5*q}if(tr==="shake"){sx=(Math.random()-.5)*w*.06*q;sy=(Math.random()-.5)*h*.04*q}}
 if(v==="shake"){sx+=(Math.random()-.5)*w*.012;sy+=(Math.random()-.5)*h*.008}if(v==="beat")sc*=1+.06*Math.pow(Math.abs(Math.sin(t*Math.PI*2)),6);if(v==="kenburns")sc*=1+.15*Math.min(1,(t-st)/Math.max(1,en-st));sc*=beatScale(t);
 g.clearRect(0,0,w,h);g.fillStyle=TRANS.bg||"#000";g.fillRect(0,0,w,h);g.filter=filt()+(tp&&tr==="blur"?` blur(${(q*18).toFixed(1)}px)`:"")+(v==="flicker"?` brightness(${(.8+Math.random()*.35).toFixed(2)})`:"");
 if(v==="pixel"){const pw=Math.max(16,w/28|0),ph=Math.max(16,pw*h/w|0);px.width=pw;px.height=ph;pxx.drawImage(src,0,0,pw,ph);g.imageSmoothingEnabled=false;g.drawImage(px,0,0,w,h);g.imageSmoothingEnabled=true}else if($("#ck").value==="on"){g.fillStyle=$("#ckbg").value;g.fillRect(0,0,w,h);g.drawImage(keyed(src,w,h),0,0,w,h)}else drawCover(src,w,h,sc,rt,sx,sy);
 g.filter="none";
 if(v==="glitch"&&Math.random()<.4){g.save();g.globalAlpha=.28;g.globalCompositeOperation="lighter";drawCover(src,w,h,sc,rt,sx+w*.012,sy);drawCover(src,w,h,sc,rt,sx-w*.012,sy);g.restore()}
 if(v==="grain"||v==="vhs"){g.save();g.globalAlpha=.16;g.fillStyle=g.createPattern(NZ,"repeat");g.fillRect(0,0,w,h);g.restore()}if(v==="vhs"){g.fillStyle="rgba(0,0,0,.2)";for(let y=0;y<h;y+=4)g.fillRect(0,y,w,1.5)}
 if(v==="cine"){const r=g.createRadialGradient(w/2,h/2,h*.25,w/2,h/2,h*.75);r.addColorStop(0,"rgba(0,0,0,0)");r.addColorStop(1,"rgba(0,0,0,.55)");g.fillStyle=r;g.fillRect(0,0,w,h)}
 drawBroll(w,h,t);drawOverlay(w,h);drawStk(w,h,t);if(tp&&(tr==="flash"||tr==="fade")){g.fillStyle=tr==="flash"?`rgba(255,255,255,${q*.9})`:`rgba(0,0,0,${q*.9})`;g.fillRect(0,0,w,h)}if(tp&&tr==="wipe"){g.fillStyle="#000";g.fillRect(w*p,0,w*q,h)}drawCap(w,h,t);
}

/* ---------- Speed ramp · Chroma key · Beat-sync ---------- */
let musF=null,beats=[];
function applyRamp(t){const m=$("#ramp").value;let r=+$("#speed").value;if(m!="none"){const p=Math.max(0,Math.min(1,(t-st)/Math.max(.1,en-st))),c=Math.exp(-Math.pow((p-.5)/.18,2));
 r*=m=="hero"?1-.7*c:m=="end"?1+1.5*Math.pow(p,3):m=="start"?.4+.6*Math.min(1,p*3):Math.max(.4,1+.6*Math.sin(p*Math.PI*6))}
 r=Math.max(.25,Math.min(4,r));if(Math.abs(video.playbackRate-r)>.02)video.playbackRate=r}
const kc=document.createElement("canvas"),kx=kc.getContext("2d",{willReadFrequently:true});
function keyed(s,w,h){const f=Math.min(1,480/w),W=Math.max(2,Math.round(w*f)),H=Math.max(2,Math.round(h*f));kc.width=W;kc.height=H;const sw=s.videoWidth||s.width,sh=s.videoHeight||s.height;if(!sw)return kc;const r=Math.max(W/sw,H/sh);kx.drawImage(s,(W-sw*r)/2,(H-sh*r)/2,sw*r,sh*r);
 const im=kx.getImageData(0,0,W,H),d=im.data,c=$("#ckc").value,kr=parseInt(c.slice(1,3),16),kg=parseInt(c.slice(3,5),16),kb=parseInt(c.slice(5,7),16),tol=+$("#ckt").value;
 for(let i=0;i<d.length;i+=4){const e=Math.hypot(d[i]-kr,d[i+1]-kg,d[i+2]-kb);if(e<tol*.6)d[i+3]=0;else if(e<tol)d[i+3]=(e-tol*.6)/(tol*.4)*255}kx.putImageData(im,0,0);return kc}
function beatScale(t){if(!$("#beatOn").checked||!beats.length)return 1;let lb=-1;for(const b of beats){if(b<=t)lb=b;else break}return lb<0?1:1+.07*Math.max(0,1-(t-lb)*6)}
$("#beatBtn").onclick=async()=>{const f=musF||file,B=$("#beatInfo");if(!f)return;B.textContent="Analyzing…";
 try{const d=await new AudioContext().decodeAudioData(await f.arrayBuffer()),x=d.getChannelData(0),H=1024,n=Math.floor(x.length/H),E=new Float32Array(n);
  for(let i=0;i<n;i++){let s=0;for(let k=0;k<H;k+=2){const v=x[i*H+k];s+=v*v}E[i]=s}
  const W=Math.round(d.sampleRate/H),off=musF?st:0;beats=[];let last=-1;
  for(let i=1;i<n-1;i++){let m=0,c=0;for(let k=Math.max(0,i-W);k<Math.min(n,i+W);k++){m+=E[k];c++}m/=c;const t=i*H/d.sampleRate;if(E[i]>m*1.5&&E[i]>=E[i-1]&&E[i]>=E[i+1]&&t-last>.28){beats.push(t+off);last=t}}
  B.textContent=beats.length+" beats ✓"}catch(e){B.textContent="⚠ audio नहीं पढ़ पाया"}};

/* ---------- V6 interaction layer ---------- */
function updateMeta(){const m=$("#timelineMeta"),q=$("#quickTools"),save=$("#saveProjectBtn");if(m)m.textContent=`${clips.length} clip${clips.length===1?'':'s'} · ${fmt(Math.max(0,en-st))}`;if(q)q.classList.toggle("hidden",!url);if(save)save.classList.toggle("hidden",!url)}
["addClip","splitClip","mvL","mvR","delClip"].forEach(id=>$("#"+id)?.addEventListener("click",()=>setTimeout(updateMeta,60)));
$$('.quick-tools [data-t]').forEach(b=>b.addEventListener('click',()=>{const n=b.dataset.t,target=$(`.nav-item[data-t="${n}"]`);if(target)target.click()}));
$("#quickPip")?.addEventListener('click',()=>{$(`.nav-item[data-t="fx"]`)?.click();setTimeout(()=>$("#ovFile")?.click(),100)});
$("#fitBtn")?.addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen();else $("#shell")?.requestFullscreen?.()});
$("#saveProjectBtn")?.addEventListener('click',()=>{try{saveClip();localStorage.setItem('vox-project',JSON.stringify({version:6,clips:clips.map(c=>({a:c.a,b:c.b,sp:c.sp,rp:c.rp,caps:c.caps,cuts:c.cuts,stk:c.stk}))}));alert('Project settings saved on this device ✓')}catch(e){alert('Save failed')}});
$("#undoBtn")?.addEventListener('click',()=>document.execCommand('undo'));$("#redoBtn")?.addEventListener('click',()=>document.execCommand('redo'));
updateMeta();
