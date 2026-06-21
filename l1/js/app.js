/* ============================================================
   SLP 330 L1 — App orchestration
   Modes: window.LESSON_MODE = "scorm" | "studyguide"
   - scorm: gating, mastery, resume, completion + SCORM contract
   - studyguide: all sections open, no questions, no SCORM
   ============================================================ */
(function (w, d) {
  "use strict";
  var MODE = w.LESSON_MODE === "scorm" ? "scorm" : "studyguide";
  function $(s,r){ return (r||d).querySelector(s); }
  function $all(s,r){ return [].slice.call((r||d).querySelectorAll(s)); }

  /* gate target id -> the question that unlocks it (mirror of questions.gates) */
  var GATES = { q01:"sec-p1-3", q02:"sec-p1-5", q03:"sec-p2", q04:"sec-p2-3", q05:"sec-p2-4",
    q06:"sec-p2-5", q07:"sec-p3", q10:"sec-p3-6", q08:"sec-p3-7", q09:"sec-cumulative" };
  /* table-of-contents subsection id -> the locked-content block that governs its visibility */
  var SUBLOCK = {
    "s-1-3":"sec-p1-3","s-1-4":"sec-p1-3","s-1-5":"sec-p1-5","s-1-6":"sec-p1-5",
    "s-2-1":"sec-p2","s-2-2":"sec-p2","s-2-3":"sec-p2-3","s-2-4":"sec-p2-4",
    "s-2-5":"sec-p2-5","s-2-6":"sec-p2-5","s-2-7":"sec-p2-5",
    "s-3-1":"sec-p3","s-3-2":"sec-p3","s-3-3":"sec-p3","s-3-4":"sec-p3","s-3-5":"sec-p3",
    "s-3-6":"sec-p3-6","s-3-7":"sec-p3-7","s-3-8":"sec-p3-7","sec-cumulative":"sec-cumulative"
  };
  var INLINE = ["q01","q02","q03","q04","q05","q06","q07","q10","q08","q09"]; // gating order
  var visitedParts = {};
  var reached = false;
  var lastLoc = "sec-orientation";
  var saveTimer = null;

  /* ---------------- shared UI ---------------- */
  function initChrome(){
    // scroll progress + back to top
    var prog=$("#progress"), backtop=$("#backtop");
    function onScroll(){ var e=d.documentElement, sc=e.scrollTop||d.body.scrollTop, mx=e.scrollHeight-e.clientHeight;
      if(prog) prog.style.width=(mx>0?sc/mx*100:0)+"%";
      if(backtop) backtop.classList.toggle("show", sc>700); }
    w.addEventListener("scroll",onScroll,{passive:true}); onScroll();
    if(backtop) backtop.addEventListener("click",function(){ w.scrollTo({top:0,behavior:"smooth"}); });

    // mobile menu
    var tog=$("#navToggle"), sb=$("#sidebar"), bd=$("#sbBackdrop");
    function close(){ if(sb)sb.classList.remove("open"); if(bd)bd.classList.remove("show"); if(tog)tog.setAttribute("aria-expanded","false"); }
    if(tog) tog.addEventListener("click",function(){ var o=sb.classList.toggle("open"); if(bd)bd.classList.toggle("show",o); tog.setAttribute("aria-expanded",String(o)); });
    if(bd) bd.addEventListener("click",close);
    // clicking a ToC link selects exactly that subsection (and briefly overrides the scroll-spy)
    var navClicking=false, navTimer, visible={};
    function setActive(a){ $all("nav.menu a").forEach(function(x){ x.classList.toggle("active", x===a); }); }
    $all("nav.menu a").forEach(function(a){ a.addEventListener("click",function(){
      close(); setActive(a);
      navClicking=true; clearTimeout(navTimer); navTimer=setTimeout(function(){ navClicking=false; }, 1000);
    }); });

    // nav active state (scroll-spy): highlight the topmost subsection within the top band
    if("IntersectionObserver" in w){
      var navLinks=$all("nav.menu a[href^='#']");
      var io=new IntersectionObserver(function(es){
        es.forEach(function(e){ visible[e.target.id]=e.isIntersecting; });
        if(navClicking) return;
        for(var i=0;i<navLinks.length;i++){ var id=navLinks[i].getAttribute("href").slice(1);
          if(visible[id]){ setActive(navLinks[i]); lastLoc=id; onVisit(id); break; } }
      },{rootMargin:"0px 0px -75% 0px"});
      navLinks.forEach(function(a){ var t=d.getElementById(a.getAttribute("href").slice(1)); if(t) io.observe(t); });
    }
  }

  function onVisit(id){
    var p = (id.indexOf("s-1-")===0||id.indexOf("sec-p1")===0)?1 : (id.indexOf("s-2-")===0||id.indexOf("sec-p2")===0)?2 : (id.indexOf("s-3-")===0||id.indexOf("sec-p3")===0)?3 : 0;
    if(p && !visitedParts[p]){ visitedParts[p]=true; updateChecklist(); scheduleSave(); }
    if(id==="sec-completion"||id==="sec-cumulative"){ reached=true; updateChecklist(); }
  }

  /* ---------------- study-guide mode ---------------- */
  function initStudyGuide(){
    $all(".locked-content").forEach(function(b){ b.classList.add("unlocked"); });
    $all("nav.menu a.locked").forEach(function(a){ a.classList.remove("locked"); });
  }

  /* ---------------- scorm mode ---------------- */
  function initScorm(){
    // render questions
    $all("[data-q]").forEach(function(m){ if(w.QUESTIONS) w.QUESTIONS.render(m, m.getAttribute("data-q")); });

    // SCORM init + resume
    var resumed=false;
    if(w.SCORM){
      var ok=w.SCORM.init();
      if(ok){
        if((w.SCORM.getEntry()==="resume") || w.SCORM.getSuspend()){ resumed=restore(w.SCORM.getSuspend()); }
        if(!resumed){ w.SCORM.setIncomplete(); w.SCORM.commit(); }
      } else { showPreview(); restorePreview(); }
    } else { showPreview(); restorePreview(); }

    wireCompletion();
    updateChecklist();
    refreshNavLocks();

    // save on exit (best effort)
    w.addEventListener("pagehide",function(){ try{ persist(); if(w.SCORM&&w.SCORM.isAvailable()){ w.SCORM.setExitSuspend(); w.SCORM.finish("suspend"); } }catch(e){} });
  }

  /* called by questions.js on mastery */
  function onQuestionMastered(qid, gatesId){
    if(gatesId){ unlock(gatesId); }
    refreshNavLocks(); updateChecklist(); scheduleSave(true);
  }

  function unlock(id){
    var blk=d.getElementById(id);
    if(blk && blk.classList.contains("locked-content")) blk.classList.add("unlocked");
    var nav=$('nav.menu a[href="#'+id+'"]'); if(nav) nav.classList.remove("locked");
  }

  function refreshNavLocks(){
    if(MODE!=="scorm") return;
    Object.keys(SUBLOCK).forEach(function(navId){
      var blk=d.getElementById(SUBLOCK[navId]);
      var unlocked = blk && blk.classList.contains("unlocked");
      var nav=$('nav.menu a[href="#'+navId+'"]');
      if(nav){ nav.classList.toggle("locked", !unlocked); var st=nav.querySelector(".state"); if(st) st.textContent = unlocked ? "" : "🔒"; }
    });
  }

  /* ---------------- completion ---------------- */
  function conditions(){
    var allQ = w.QUESTIONS ? w.QUESTIONS.allMastered() : false;
    // mastering items embedded in all three parts implies all parts were engaged;
    // used as a fallback where IntersectionObserver visit-tracking is unavailable.
    var parts = (visitedParts[1]&&visitedParts[2]&&visitedParts[3]) || allQ;
    return { questions:allQ, parts:!!parts, reached:reached || allQ };
  }
  function updateChecklist(){
    var c=conditions();
    setCk("ck-parts", c.parts);
    setCk("ck-questions", c.questions);
    setCk("ck-reached", c.reached);
    var btn=$("#finishBtn");
    if(btn) btn.disabled = !(c.questions && c.parts && c.reached);
  }
  function setCk(id,on){ var li=d.getElementById(id); if(li){ li.classList.toggle("done",!!on); var m=li.querySelector(".ck"); if(m) m.textContent=on?"✓":""; } }

  function wireCompletion(){
    var btn=$("#finishBtn"); if(!btn) return;
    btn.addEventListener("click",function(){
      var c=conditions(); if(!(c.questions&&c.parts&&c.reached)) return;
      var msg=$("#finishMsg");
      if(w.SCORM && w.SCORM.isAvailable()){
        var ok=w.SCORM.setPassedComplete();
        // verify
        var raw=w.SCORM.get("cmi.core.score.raw"), stat=w.SCORM.getStatus();
        if(ok && stat==="passed" && raw==="100"){
          finishMsg(msg,"ok","Participation recorded. Your status is <strong>passed</strong> with a score of 100. The study guide, Moodle Quiz, or assignment may now become available in Moodle.");
        } else {
          finishMsg(msg,"err","We tried to record completion but could not confirm it with Moodle (status “"+stat+"”). Your work is saved — please reopen the activity, and it will resume where you left off.");
        }
        persist();
      } else {
        finishMsg(msg,"ok","Preview mode: you completed every required check. Progress and grades are <strong>not</strong> sent to Moodle in preview. Launch this lesson inside Moodle to record participation.");
      }
      btn.disabled=true; btn.textContent="Lesson complete";
    });
  }
  function finishMsg(el,kind,html){ if(!el)return; el.className="finish-msg show "+kind; el.innerHTML=html; el.focus&&el.focus(); }

  /* ---------------- preview ---------------- */
  function showPreview(){ var b=$("#previewBanner"); if(b) b.classList.add("show"); }

  /* ---------------- persistence ---------------- */
  function serialize(){
    var m = w.QUESTIONS ? w.QUESTIONS.masteredList() : [];
    var p = [1,2,3].filter(function(n){return visitedParts[n];});
    var done = ($("#finishBtn")&&$("#finishBtn").disabled===true&&$("#finishMsg")&&$("#finishMsg").classList.contains("ok"))?1:0;
    return "1|M:"+m.join(".")+"|P:"+p.join(".")+"|L:"+lastLoc+"|D:"+done;
  }
  function parse(str){
    var o={m:[],p:[],loc:"",done:0}; if(!str) return o;
    str.split("|").forEach(function(seg){
      var k=seg.slice(0,2);
      if(k==="M:") o.m=seg.slice(2).split(".").filter(Boolean);
      else if(k==="P:") o.p=seg.slice(2).split(".").filter(Boolean);
      else if(k==="L:") o.loc=seg.slice(2);
      else if(k==="D:") o.done=+seg.slice(2)||0;
    });
    return o;
  }
  function restore(str){
    var o=parse(str); if(!o.m.length && !o.p.length) return false;
    if(w.QUESTIONS){ w.QUESTIONS.restore(o.m); }
    // re-render mastered questions to reflect state + unlock gated blocks
    $all("[data-q]").forEach(function(mt){ var id=mt.getAttribute("data-q"); if(w.QUESTIONS) w.QUESTIONS.render(mt,id); });
    o.m.forEach(function(qid){ if(GATES[qid]) unlock(GATES[qid]); });
    o.p.forEach(function(n){ visitedParts[+n]=true; });
    if(o.done) reached=true;
    lastLoc=o.loc||lastLoc;
    refreshNavLocks(); updateChecklist();
    if(o.loc){ var t=d.getElementById(o.loc); if(t) setTimeout(function(){ t.scrollIntoView({behavior:"auto",block:"start"}); },120); }
    return true;
  }
  function persist(){
    var data=serialize();
    if(w.SCORM && w.SCORM.isAvailable()){ w.SCORM.setSuspend(data); w.SCORM.setLocation(lastLoc); w.SCORM.commit(); }
    else { try{ w.localStorage.setItem("slp330l1_preview", data); }catch(e){} }
  }
  function restorePreview(){ try{ var s=w.localStorage.getItem("slp330l1_preview"); if(s) restore(s); }catch(e){} }
  function scheduleSave(now){ if(now){ persist(); return; } if(saveTimer) clearTimeout(saveTimer); saveTimer=setTimeout(persist,800); }

  /* pause checkpoints save immediately */
  function initPausepoints(){ $all(".pausepoint").forEach(function(pp){ /* visited via observer triggers save */ }); }

  /* ---------------- boot ---------------- */
  function boot(){
    initChrome();
    if(MODE==="studyguide"){ initStudyGuide(); }
    else { initScorm(); initPausepoints(); }
  }
  if(d.readyState==="loading") d.addEventListener("DOMContentLoaded",boot); else boot();

  w.APP = { mode:MODE, onQuestionMastered:onQuestionMastered, save:persist };
})(window, document);
