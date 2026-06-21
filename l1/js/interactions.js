/* ============================================================
   SLP 330 L1 — Original visuals & non-graded interactions
   Shared by both builds. Every function guards for missing DOM.
   No autoplay anywhere. Optional tone is user-initiated, low level.
   ============================================================ */
(function (w, d) {
  "use strict";
  function $(s,r){ return (r||d).querySelector(s); }
  function $all(s,r){ return [].slice.call((r||d).querySelectorAll(s)); }
  var reduceMotion = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- glossary (click / keyboard disclosure) ---------- */
  function initGlossary(){
    var open=null;
    $all(".gloss-term").forEach(function(btn){
      var pop=btn.nextElementSibling;
      if(!pop||!pop.classList.contains("gloss-pop")) return;
      btn.setAttribute("aria-expanded","false");
      btn.addEventListener("click",function(e){
        e.stopPropagation();
        var show=pop.classList.contains("show");
        if(open&&open!==pop){ open.classList.remove("show"); open.previousElementSibling.setAttribute("aria-expanded","false"); }
        pop.classList.toggle("show",!show);
        btn.setAttribute("aria-expanded", String(!show));
        open = show?null:pop;
      });
    });
    d.addEventListener("click",function(){ if(open){ open.classList.remove("show"); open.previousElementSibling.setAttribute("aria-expanded","false"); open=null; } });
    d.addEventListener("keydown",function(e){ if(e.key==="Escape"&&open){ open.classList.remove("show"); var b=open.previousElementSibling; b.setAttribute("aria-expanded","false"); b.focus(); open=null; } });
  }

  /* ---------- flip cards ---------- */
  function initFlip(){
    $all(".flipcard").forEach(function(c){
      c.addEventListener("click",function(){ c.setAttribute("aria-pressed", c.getAttribute("aria-pressed")==="true"?"false":"true"); });
    });
  }

  /* ---------- predict-then-reveal ---------- */
  function initPredict(){
    $all(".predict").forEach(function(box){
      var reveal=$(".p-reveal",box);
      $all(".p-opt",box).forEach(function(opt){
        opt.addEventListener("click",function(){
          $all(".p-opt",box).forEach(function(o){ o.classList.remove("correct","wrong"); });
          opt.classList.add(opt.dataset.correct==="1"?"correct":"wrong");
          if(reveal) reveal.classList.add("show");
        });
      });
    });
  }

  /* ---------- waveform explorer (Canvas + optional tone) ---------- */
  function initWaveform(){
    var cv=$("#wf-canvas"); if(!cv) return;
    var ctx=cv.getContext && cv.getContext("2d"); if(!ctx) return;
    var fEl=$("#wf-freq"), aEl=$("#wf-amp"), fOut=$("#wf-freq-out"), aOut=$("#wf-amp-out");
    function size(){ var r=cv.getBoundingClientRect(); if(r.width<1) return; cv.width=Math.round(r.width*devicePixelRatio); cv.height=Math.round(r.height*devicePixelRatio); ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); draw(); }
    function draw(){
      var W=cv.width/devicePixelRatio, H=cv.height/devicePixelRatio; if(W<1) return;
      var hz=+fEl.value, amp=+aEl.value/100;
      ctx.clearRect(0,0,W,H);
      // midline
      ctx.strokeStyle="rgba(234,244,251,.25)"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,H/2); ctx.lineTo(W,H/2); ctx.stroke();
      // wave: cycles across window scale with Hz (schematic)
      var cycles=Math.max(.5, hz/100);
      ctx.strokeStyle="#dc9329"; ctx.lineWidth=3; ctx.beginPath();
      for(var x=0;x<=W;x++){ var t=x/W; var y=H/2 - Math.sin(t*cycles*2*Math.PI)*(H/2-16)*amp; if(x===0)ctx.moveTo(x,y); else ctx.lineTo(x,y); }
      ctx.stroke();
      if(fOut) fOut.textContent=hz+" Hz";
      if(aOut) aOut.textContent=Math.round(amp*100)+" (relative units)";
    }
    fEl.addEventListener("input",draw); aEl.addEventListener("input",draw);
    w.addEventListener("resize",size);
    // redraw when the canvas first becomes visible (it starts inside a hidden/locked section)
    if("ResizeObserver" in w){ new ResizeObserver(function(){ size(); }).observe(cv); }
    else { var tries=0; (function poll(){ size(); if((cv.width||0)<2 && tries++<30) setTimeout(poll,120); })(); }
    size();

    /* optional, user-initiated demonstration tone — volume follows relative amplitude, kept low */
    var toneBtn=$("#wf-tone"), toneStop=$("#wf-tone-stop"); var ac=null, osc=null, gain=null, timer=null;
    function setSliders(disabled){ if(fEl) fEl.disabled=disabled; if(aEl) aEl.disabled=disabled; }
    function stopTone(){ if(osc){ try{osc.stop();}catch(e){} try{osc.disconnect();}catch(e){} osc=null; } if(gain){try{gain.disconnect();}catch(e){} gain=null;} if(timer){clearTimeout(timer);timer=null;} if(toneBtn) toneBtn.disabled=false; if(toneStop) toneStop.disabled=true; setSliders(false); }
    if(toneBtn) toneBtn.addEventListener("click",function(){
      try{
        ac=ac||new (w.AudioContext||w.webkitAudioContext)();
        if(ac.state==="suspended") ac.resume();
        stopTone();
        var amp01=Math.max(0,Math.min(1,(+aEl.value)/100));
        osc=ac.createOscillator(); gain=ac.createGain();
        osc.type="sine"; osc.frequency.value=+fEl.value;
        gain.gain.value=Math.max(0.0001, amp01*0.08); // louder with higher relative amplitude; conservatively low
        osc.connect(gain); gain.connect(ac.destination); osc.start();
        toneBtn.disabled=true; if(toneStop) toneStop.disabled=false; setSliders(true); // freeze sliders while playing
        timer=setTimeout(stopTone,4000);              // auto-stop safeguard
      }catch(e){ if(w.console) console.warn("tone unavailable",e); }
    });
    if(toneStop) toneStop.addEventListener("click",stopTone);
    w.addEventListener("pagehide",stopTone);
  }

  /* ---------- clickable ear-region map ---------- */
  var EARMAP={
    outer:{name:"Outer ear",structures:"Pinna (auricle) and ear canal",fn:"Collects and funnels sound toward the eardrum (conductive delivery).",path:"Sound enters here first."},
    middle:{name:"Middle ear",structures:"Tympanic membrane, ossicles (malleus, incus, stapes), Eustachian tube",fn:"Air-filled space that passes vibration from the eardrum to the oval window (conductive delivery).",path:"Vibration is handed inward."},
    inner:{name:"Inner ear",structures:"Cochlea, basilar membrane, organ of Corti and hair cells, auditory nerve (CN VIII), and the vestibular system",fn:"Hair cells perform transduction — converting motion into neural signals — and the auditory nerve (CN VIII) carries them onward (the sensorineural level).",path:"Mechanical motion becomes a neural signal that travels toward the brain."},
    central:{name:"Central auditory system",structures:"Brainstem pathways and auditory cortex",fn:"Multistage, substantially bilateral processing leading to perception; the central system begins at the brainstem.",path:"Signals are processed and perceived."}
  };
  function initEarMap(){
    var info=$("#earmap-info"); if(!info) return;
    function show(key){
      var r=EARMAP[key]; if(!r) return;
      info.innerHTML="<h4>"+r.name+"</h4><p><strong>Structures:</strong> "+r.structures+"</p><p><strong>Primary function:</strong> "+r.fn+"</p><p><strong>Where we are:</strong> "+r.path+"</p>";
      $all(".earmap svg .region").forEach(function(rg){ rg.classList.toggle("sel", rg.dataset.region===key); });
      $all("#earmap-btns .region-btn").forEach(function(b){ b.classList.toggle("sel", b.dataset.region===key); b.setAttribute("aria-pressed", String(b.dataset.region===key)); });
    }
    $all(".earmap svg .region").forEach(function(rg){
      rg.setAttribute("tabindex","0"); rg.setAttribute("role","button");
      rg.setAttribute("aria-label",(EARMAP[rg.dataset.region]||{}).name||rg.dataset.region);
      rg.addEventListener("click",function(){ show(rg.dataset.region); });
      rg.addEventListener("keydown",function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); show(rg.dataset.region); } });
    });
    $all("#earmap-btns .region-btn").forEach(function(b){ b.addEventListener("click",function(){ show(b.dataset.region); }); });
    show("outer");
  }

  /* ---------- generic stepper ---------- */
  function initSteppers(){
    $all(".stepper-widget").forEach(function(wdg){
      var steps=[]; try{ steps=JSON.parse(wdg.dataset.steps||"[]"); }catch(e){ steps=[]; }
      var bar=$(".stepper",wdg), det=$(".step-detail",wdg); if(!bar||!det||!steps.length) return;
      steps.forEach(function(s,i){
        var b=document.createElement("button"); b.className="step-btn"; b.type="button"; b.setAttribute("aria-pressed", i===0?"true":"false");
        b.textContent=(i+1)+". "+s.t; b.addEventListener("click",function(){ pick(i); }); bar.appendChild(b);
      });
      function pick(i){ $all(".step-btn",bar).forEach(function(x,xi){ x.setAttribute("aria-pressed", String(xi===i)); }); det.innerHTML="<strong>"+steps[i].t+"</strong><br>"+steps[i].d; }
      pick(0);
    });
  }

  /* ---------- sound-speed: air vs water ---------- */
  function initSoundSpeed(){
    var box=$("#soundspeed"); if(!box) return;
    var airDot=$("#ss-air",box), waterDot=$("#ss-water",box), btn=$("#ss-go",box), note=$("#ss-note",box);
    var W=420, x0=40, x1=380, AIR=343, WATER=1480;
    function setX(node,x){ if(node) node.setAttribute("cx",x); }
    function reset(){ setX(airDot,x0); setX(waterDot,x0); }
    reset();
    if(reduceMotion){
      // static comparison instead of motion
      setX(airDot,x0+(x1-x0)*0.23); setX(waterDot,x1);
      if(note) note.textContent="Reduced-motion view: in the time the water pulse reaches the end, the air pulse has gone only about a quarter as far (≈ 343 m/s in air vs ≈ 1480 m/s in water).";
      if(btn) btn.style.display="none";
      return;
    }
    if(btn) btn.addEventListener("click",function(){
      reset(); btn.disabled=true; var t0=null, dur=2600;
      function frame(ts){ if(!t0)t0=ts; var p=Math.min(1,(ts-t0)/dur);
        setX(waterDot, x0+(x1-x0)*p);
        setX(airDot, x0+(x1-x0)*p*(AIR/WATER));
        if(p<1) requestAnimationFrame(frame); else btn.disabled=false;
      }
      requestAnimationFrame(frame);
    });
  }

  /* ---------- tonotopy highlight ---------- */
  function initTonotopy(){
    var box=$("#tonotopy"); if(!box) return;
    var out=$("#tono-out",box);
    $all(".tono-spot",box).forEach(function(s){
      s.setAttribute("tabindex","0"); s.setAttribute("role","button");
      function act(){ $all(".tono-spot",box).forEach(function(x){x.classList.remove("sel");}); s.classList.add("sel");
        if(out) out.textContent=s.dataset.msg||""; }
      s.addEventListener("click",act);
      s.addEventListener("keydown",function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); act(); } });
    });
  }

  /* ---------- narration transcript toggles ---------- */
  function initTranscripts(){
    $all(".tr-toggle").forEach(function(btn){
      var tr=btn.nextElementSibling; if(!tr||!tr.classList.contains("transcript")) return;
      btn.setAttribute("aria-expanded","false");
      btn.addEventListener("click",function(){
        var show=tr.classList.toggle("show");
        btn.setAttribute("aria-expanded",String(show));
        btn.textContent=show?"Hide transcript":"Show transcript";
      });
    });
  }

  function init(){ initGlossary(); initFlip(); initPredict(); initWaveform(); initEarMap(); initSteppers(); initSoundSpeed(); initTonotopy(); initTranscripts(); }
  if(d.readyState==="loading") d.addEventListener("DOMContentLoaded",init); else init();
  w.INTERACTIONS={init:init};
})(window, document);
