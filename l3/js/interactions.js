/* ============================================================
   SLP 330 L3, Hearing Screening and Ear/Hearing Disorders
   Original visuals & non-graded interactions. Shared by both builds.
   No autoplay anywhere. Every function guards for missing DOM.
   New for L3: screening pathway builder, behavioral/physiologic
   sorter, tympanogram explorer, OAE/AABR pathway comparison,
   newborn 1-3-6 timeline, auditory-system location map, outer and
   middle-ear case matchers, noise-risk explorer, referral urgency
   sorter, APD differential-team map.
   ============================================================ */
(function (w, d) {
  "use strict";
  function $(s, r) { return (r || d).querySelector(s); }
  function $all(s, r) { return [].slice.call((r || d).querySelectorAll(s)); }
  function el(html) { var t = d.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  /* option order must not be a cue: shuffle every choice list once, at render time */
  function shuffled(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* =========================================================
     Shared micro-engines
     ========================================================= */

  /* single-choice practice with immediate feedback (used by declarative blocks) */
  function wirePractice(scope, msg) {
    var choices = $all(".p-choice", scope), fb = $(".p-fb", scope);
    choices.forEach(function (b) {
      b.addEventListener("click", function () {
        choices.forEach(function (x) { x.classList.remove("correct", "wrong"); });
        var ok = b.dataset.ok === "1";
        b.classList.add(ok ? "correct" : "wrong");
        if (ok) choices.forEach(function (x) { if (x.dataset.ok === "1") x.classList.add("correct"); });
        fb.className = "p-fb show " + (ok ? "ok" : "no");
        fb.textContent = ok ? msg.ok : msg.no;
      });
    });
  }
  function initPracticeBlocks() {
    $all("[data-practice]").forEach(function (box) {
      if (box.dataset.wired) return; box.dataset.wired = "1";
      wirePractice(box, { ok: box.dataset.okMsg || "Correct.", no: box.dataset.noMsg || "Not quite. Read the options again and try another one." });
    });
  }

  /* case deck: a row of case buttons; each case asks one question with per-option feedback */
  function caseDeck(box, cfg) {
    if (!box) return;
    var head = '<h4>' + esc(cfg.title) + '</h4>' + (cfg.note ? '<p class="step-note">' + cfg.note + '</p>' : "");
    box.insertAdjacentHTML("beforeend", head);
    var bar = el('<div class="stepper" role="group" aria-label="' + esc(cfg.title) + ' cases"></div>');
    var panel = el('<div class="case-panel"></div>');
    box.appendChild(bar); box.appendChild(panel);

    function show(i) {
      $all(".step-btn", bar).forEach(function (b, bi) { b.setAttribute("aria-pressed", String(bi === i)); });
      var c = cfg.cases[i];
      panel.innerHTML =
        (c.facts ? '<ul class="case-facts">' + c.facts.map(function (f) { return "<li>" + f + "</li>"; }).join("") + "</ul>" : "") +
        '<p class="p-q">' + c.prompt + '</p>' +
        '<div class="p-choices" role="group" aria-label="Options"></div>' +
        '<div class="p-fb" role="status" aria-live="polite"></div>';
      var wrap = $(".p-choices", panel), fb = $(".p-fb", panel);
      if (!c._order) c._order = shuffled(c.opts);
      c._order.forEach(function (o) {
        var b = el('<button type="button" class="p-choice">' + o.t + "</button>");
        b._ok = o.ok;
        b.addEventListener("click", function () {
          $all(".p-choice", wrap).forEach(function (x) { x.classList.remove("correct", "wrong"); });
          b.classList.add(o.ok ? "correct" : "wrong");
          if (o.ok) $all(".p-choice", wrap).forEach(function (x) { if (x._ok) x.classList.add("correct"); });
          fb.className = "p-fb show " + (o.ok ? "ok" : "no");
          fb.innerHTML = o.fb;
        });
        wrap.appendChild(b);
      });
    }
    cfg.cases.forEach(function (c, i) {
      var b = el('<button type="button" class="step-btn" aria-pressed="' + (i === 0 ? "true" : "false") + '">' + esc(c.label) + "</button>");
      b.addEventListener("click", function () { show(i); });
      bar.appendChild(b);
    });
    show(0);
  }

  /* multi-bin card sorter: click a card, then click a bin. Keyboard operable. */
  function multiSorter(box, cfg) {
    if (!box) return;
    box.innerHTML =
      '<h4>' + esc(cfg.title) + "</h4>" +
      '<p class="sort-hint">' + (cfg.hint || "Select a card, then choose a column. Use × to send a card back. Press <strong>Check</strong> when every card is placed.") + "</p>" +
      '<div class="sort-cards" role="group" aria-label="Cards to sort"></div>' +
      '<div class="sort-bins b' + cfg.bins.length + '">' +
      cfg.bins.map(function (b) {
        return '<div class="sort-bin"><h5>' + esc(b.label) + "</h5>" +
          '<ul class="binlist" data-bin="' + esc(b.key) + '" aria-label="' + esc(b.label) + ' column"></ul>' +
          '<button type="button" class="btn sm sec" data-assign="' + esc(b.key) + '">Put card here</button>' +
          (b.meta ? '<div class="bin-meta" hidden>' + b.meta + "</div>" : "") +
          "</div>";
      }).join("") +
      "</div>" +
      '<div class="qactions" style="margin-top:12px"><button type="button" class="btn sm" data-check>Check</button></div>' +
      '<div class="p-fb" role="status" aria-live="polite"></div>';
    var pool = $(".sort-cards", box), fb = $(".p-fb", box), selected = null;
    function mkCard(c) {
      var b = el('<button type="button" class="sort-card" aria-pressed="false">' + esc(c.t) + "</button>");
      b._data = c;
      b.addEventListener("click", function () {
        if (selected === b) { b.setAttribute("aria-pressed", "false"); selected = null; return; }
        if (selected) selected.setAttribute("aria-pressed", "false");
        selected = b; b.setAttribute("aria-pressed", "true");
      });
      return b;
    }
    cfg.cards.forEach(function (c) { pool.appendChild(mkCard(c)); });
    $all("[data-assign]", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!selected) { fb.className = "p-fb show no"; fb.textContent = "Select a card first, then choose a column."; return; }
        var list = $('.binlist[data-bin="' + btn.dataset.assign + '"]', box);
        var li = el("<li>" + esc(selected._data.t) + ' <button type="button" aria-label="Remove card">×</button></li>');
        li._data = selected._data;
        li.querySelector("button").addEventListener("click", function () { pool.appendChild(mkCard(li._data)); li.remove(); fb.classList.remove("show"); });
        list.appendChild(li); selected.remove(); selected = null; fb.classList.remove("show");
      });
    });
    $("[data-check]", box).addEventListener("click", function () {
      if ($all(".sort-card", pool).length) { fb.className = "p-fb show no"; fb.textContent = "Place every card in a column before checking."; return; }
      var right = 0, total = 0;
      $all(".binlist", box).forEach(function (ul) {
        var key = ul.dataset.bin;
        $all("li", ul).forEach(function (li) {
          total++; var ok = li._data.bin === key;
          li.classList.toggle("correct", ok); li.classList.toggle("wrong", !ok); if (ok) right++;
        });
      });
      var ok = right === total;
      fb.className = "p-fb show " + (ok ? "ok" : "no");
      fb.innerHTML = ok ? cfg.okMsg : (right + " of " + total + " correct. " + cfg.noMsg);
      if (ok) $all(".bin-meta", box).forEach(function (m) { m.hidden = false; });
    });
  }

  /* case matcher: work one case through several reveal-as-you-go steps */
  function caseMatcher(box, cfg) {
    if (!box) return;
    box.insertAdjacentHTML("beforeend", "<h4>" + esc(cfg.title) + "</h4>" + (cfg.note ? '<p class="step-note">' + cfg.note + "</p>" : ""));
    var bar = el('<div class="stepper" role="group" aria-label="' + esc(cfg.title) + ' cases"></div>');
    var panel = el('<div class="cm-panel"></div>');
    box.appendChild(bar); box.appendChild(panel);

    function show(i) {
      $all(".step-btn", bar).forEach(function (b, bi) { b.setAttribute("aria-pressed", String(bi === i)); });
      var c = cfg.cases[i];
      panel.innerHTML = '<ul class="case-facts">' + c.facts.map(function (f) { return "<li>" + f + "</li>"; }).join("") + "</ul>";
      var done = false;
      c.steps.forEach(function (s, si) {
        var wrap = el('<div class="cl-step"' + (si > 0 ? " hidden" : "") + "></div>");
        wrap.appendChild(el('<p class="cl-q">' + s.q + "</p>"));
        var opts = el('<div class="cl-opts"></div>');
        var fb = el('<p class="cl-fb"></p>');
        if (!s._order) s._order = shuffled(s.opts);
        s._order.forEach(function (o) {
          var b = el('<button type="button" class="cl-opt">' + o.t + "</button>");
          b.addEventListener("click", function () {
            if (b.classList.contains("correct")) return;
            if (o.ok) {
              $all(".cl-opt", opts).forEach(function (x) { x.classList.remove("wrong"); });
              b.classList.add("correct"); fb.innerHTML = s.fb;
              var next = wrap.nextElementSibling;
              if (next && next.classList.contains("cl-step")) next.hidden = false;
              else if (!done) { done = true; panel.appendChild(el('<div class="cl-done"><strong>Safe synthesis:</strong> ' + c.summary + "</div>")); }
            } else { b.classList.add("wrong"); fb.textContent = o.fb || "Not quite. Re-read the case details, then try another option."; }
          });
          opts.appendChild(b);
        });
        wrap.appendChild(opts); wrap.appendChild(fb); panel.appendChild(wrap);
      });
    }
    cfg.cases.forEach(function (c, i) {
      var b = el('<button type="button" class="step-btn" aria-pressed="' + (i === 0 ? "true" : "false") + '">' + esc(c.label) + "</button>");
      b.addEventListener("click", function () { show(i); });
      bar.appendChild(b);
    });
    show(0);
  }

  /* =========================================================
     1. Screen -> next-step pathway builder  (Topic 1.1-1.2)
     ========================================================= */
  function initPathway() {
    var box = $("#pathway-builder"); if (!box) return;
    box.insertAdjacentHTML("beforeend",
      '<svg class="flow-svg" viewBox="0 0 620 120" role="img" aria-label="Flow diagram: a screening measure leads to a pass or refer outcome, and each outcome leads to a next step. Pass leads to routine surveillance and response to later concerns. Refer leads to the protocol next step, which may be a rescreen, medical referral, diagnostic audiology, or both.">' +
      '<rect x="6" y="42" width="130" height="40" rx="9" fill="#EAF4FB" stroke="#2E6F9E" stroke-width="2"/>' +
      '<text x="71" y="60" font-size="11" fill="#0B2D4D" text-anchor="middle" font-weight="700">Screening measure</text>' +
      '<text x="71" y="74" font-size="9.5" fill="#5d6675" text-anchor="middle">tone · tymp · OAE · AABR</text>' +
      '<line x1="138" y1="62" x2="196" y2="34" stroke="#2f7077" stroke-width="2" marker-end="url(#l3ah)"/>' +
      '<line x1="138" y1="62" x2="196" y2="92" stroke="#c0573f" stroke-width="2" marker-end="url(#l3ahr)"/>' +
      '<rect x="200" y="14" width="96" height="36" rx="9" fill="#E9F4EE" stroke="#2f7d57" stroke-width="2"/>' +
      '<text x="248" y="37" font-size="12" fill="#1c4d36" text-anchor="middle" font-weight="700">Pass</text>' +
      '<rect x="200" y="74" width="96" height="36" rx="9" fill="#FBEEDB" stroke="#c0573f" stroke-width="2"/>' +
      '<text x="248" y="97" font-size="12" fill="#7a2e1d" text-anchor="middle" font-weight="700">Refer</text>' +
      '<line x1="298" y1="32" x2="336" y2="32" stroke="#2f7077" stroke-width="2" marker-end="url(#l3ah)"/>' +
      '<line x1="298" y1="92" x2="336" y2="92" stroke="#c0573f" stroke-width="2" marker-end="url(#l3ahr)"/>' +
      '<rect x="340" y="12" width="272" height="40" rx="9" fill="#fff" stroke="#2E6F9E" stroke-width="1.5"/>' +
      '<text x="476" y="30" font-size="10.5" fill="#0B2D4D" text-anchor="middle">Routine surveillance; respond to later concerns</text>' +
      '<text x="476" y="44" font-size="9.5" fill="#5d6675" text-anchor="middle">a pass applies to those measures, on that day</text>' +
      '<rect x="340" y="72" width="272" height="42" rx="9" fill="#fff" stroke="#2E6F9E" stroke-width="1.5"/>' +
      '<text x="476" y="90" font-size="10.5" fill="#0B2D4D" text-anchor="middle">Protocol next step: rescreen, medical referral,</text>' +
      '<text x="476" y="104" font-size="10.5" fill="#0B2D4D" text-anchor="middle">diagnostic audiology, or both</text>' +
      '<defs><marker id="l3ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="#2f7077"/></marker>' +
      '<marker id="l3ahr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="#c0573f"/></marker></defs>' +
      "</svg>");
    caseDeck(box, {
      title: "Choose the next step",
      note: "Five real screening situations. For each one, name the safe next step. The rule to apply: name the test, state the outcome, name the next step in the protocol, and do not guess the cause.",
      cases: [
        {
          label: "1 · Pass, no concerns",
          facts: ["School-age child", "Pure-tone screening: <strong>pass</strong>", "No listening or communication concerns reported"],
          prompt: "What is the next step?",
          opts: [
            { t: "Continue routine surveillance, and respond if a concern appears later.", ok: true, fb: "Correct. A pass applies to the measures used and the day of the screen. Surveillance continues because hearing can change." },
            { t: "Record that hearing is permanently typical.", ok: false, fb: "No. A pass is not a guarantee about the future, and it does not test every part of the auditory system." },
            { t: "Refer for a diagnostic audiologic evaluation anyway.", ok: false, fb: "Not with no concerns present. Referral is driven by a refer result, a risk factor, or a current concern." }
          ]
        },
        {
          label: "2 · Refer, poor setup",
          facts: ["Adult, pure-tone screening at a community health fair", "Supra-aural earphones were seated over the person’s glasses and hair", "The room’s air handler ran through the whole screen", "Result: <strong>refer</strong>, both ears"],
          prompt: "What is the next step?",
          opts: [
            { t: "Fix what you can control (headset placement, a quieter spot), re-instruct, and rescreen once according to protocol.", ok: true, fb: "Correct. Earphone placement and room noise both change a behavioral result. Correct the controllable problems before you interpret the outcome." },
            { t: "Present the tones at a higher level so a pass can be recorded.", ok: false, fb: "No. Changing the criterion to force a pass hides the finding and delays needed follow-up." },
            { t: "Tell the person they have hearing loss in both ears.", ok: false, fb: "No. A refer is a next-step signal, not a diagnosis, and these test conditions were not valid to begin with." }
          ]
        },
        {
          label: "3 · Repeat still refers",
          facts: ["Conditions corrected and instructions repeated", "Second screen under good conditions: <strong>refer</strong>"],
          prompt: "What is the next step?",
          opts: [
            { t: "Follow the program's audiologic and/or medical referral pathway.", ok: true, fb: "Correct. One controlled repeat is reasonable. After that, follow the referral pathway." },
            { t: "Screen again next week, and again after that, until a pass appears.", ok: false, fb: "No. Repeating a screen to obtain a pass delays evaluation and raises the chance of an erroneous pass." },
            { t: "Assume middle-ear fluid and wait for it to clear.", ok: false, fb: "No. That guesses a cause the screen cannot establish." }
          ]
        },
        {
          label: "4 · Refer, and the person asks why",
          facts: ["Adult, workplace hearing screening", "Result: <strong>refer</strong>", "The person asks, “So am I going deaf?”"],
          prompt: "What do you say and do?",
          opts: [
            { t: "Name the measure and the outcome, explain that a refer is not a diagnosis, and complete the program's referral step.", ok: true, fb: "Correct. The safe script is: this was a pure-tone screening, you did not pass it today, and the next step is the evaluation the program specifies. The cause is not yours to guess." },
            { t: "Say it is probably noise damage from the job.", ok: false, fb: "No. That guesses a cause a screening cannot establish, and it may be wrong." },
            { t: "Reassure them that screenings are often wrong, and skip the follow-up.", ok: false, fb: "No. Dismissing a refer is how a real hearing difference goes unidentified." }
          ]
        },
        {
          label: "5 · Old pass, new concern",
          facts: ["Child passed a screening last year", "Teacher and family now report persistent listening difficulty"],
          prompt: "What is the next step?",
          opts: [
            { t: "Refer based on the current concern.", ok: true, fb: "Correct. A previous pass answered a question about that day. It does not answer a new question about today." },
            { t: "Point to the earlier pass and take no action.", ok: false, fb: "No. Hearing can change, and a screen does not cover every listening skill." },
            { t: "Diagnose an auditory processing disorder.", ok: false, fb: "No. That conclusion needs a comprehensive differential evaluation, not a screening history." }
          ]
        }
      ]
    });
  }

  /* =========================================================
     2. Behavioral vs physiologic measure sorter  (Topic 1.4)
     ========================================================= */
  function initMeasureSorter() {
    var box = $("#measure-sorter"); if (!box) return;
    multiSorter(box, {
      title: "Which measure does each card belong to?",
      hint: "Select a card, then choose a column. Use × to send a card back. Press <strong>Check</strong> when every card is placed; a correct sort reveals what each measure samples and its main limitation.",
      bins: [
        { key: "pt", label: "Pure-tone screening", meta: "<strong>Voluntary response:</strong> required.<br><strong>Samples:</strong> the behavioral response to tones at speech-relevant frequencies.<br><strong>Main limitation:</strong> needs attention, understanding, quiet, and correct earphone placement; a refer does not show where the problem is." },
        { key: "ty", label: "Tympanometry", meta: "<strong>Voluntary response:</strong> not required.<br><strong>Samples:</strong> the middle-ear transmission system (pressure, mobility, ear-canal volume).<br><strong>Main limitation:</strong> it is not a measure of hearing sensitivity." },
        { key: "oae", label: "OAE", meta: "<strong>Voluntary response:</strong> not required.<br><strong>Samples:</strong> cochlear outer-hair-cell activity in the frequency region tested.<br><strong>Main limitation:</strong> an absent OAE is nonspecific; probe fit, canal debris, or middle-ear fluid can remove it." },
        { key: "aabr", label: "AABR", meta: "<strong>Voluntary response:</strong> not required.<br><strong>Samples:</strong> synchronized neural activity through the auditory nerve and brainstem.<br><strong>Main limitation:</strong> returns pass or refer only, needs a quiet or sleeping person, and does not measure speech understanding." }
      ],
      cards: [
        { t: "Raise a hand when the tone is heard", bin: "pt" },
        { t: "Attention and instructions can affect the response", bin: "pt" },
        { t: "Changes air pressure in a sealed ear canal", bin: "ty" },
        { t: "Samples the middle-ear transmission system", bin: "ty" },
        { t: "Records a faint sound made inside the cochlea", bin: "oae" },
        { t: "Reflects outer-hair-cell activity", bin: "oae" },
        { t: "Uses surface electrodes on the head", bin: "aabr" },
        { t: "Samples synchronized nerve and brainstem activity", bin: "aabr" }
      ],
      okMsg: "All correct. One measure is behavioral (pure-tone screening) and three are physiologic (tympanometry, OAE, AABR). Each column now shows what the measure samples and where it stops.",
      noMsg: "Ask two questions about each card: does the person have to respond on purpose, and which part of the system is being sampled? Fix the red cards and check again."
    });
  }

  /* =========================================================
     3. Tympanogram explorer  (Topic 1.5)
     ========================================================= */
  var TYMP = [
    { id: "T1", label: "T1 · Type A", type: "A", peak: 0, height: 0.85, ecv: "1.0 cm³ (expected)",
      shape: "A clear peak close to 0 daPa.",
      opts: [
        { t: "Consistent with typical middle-ear pressure and mobility.", ok: true, fb: "Correct. A peak near atmospheric pressure with an expected ECV is consistent with typical middle-ear pressure and movement." },
        { t: "All of this person's hearing is normal.", ok: false, fb: "Overreach. Tympanometry describes the middle-ear system; it does not measure hearing sensitivity." },
        { t: "The cochlea is functioning normally.", ok: false, fb: "Overreach. The tracing says nothing directly about the cochlea." }
      ] },
    { id: "T2", label: "T2 · Type B, expected ECV", type: "B", peak: null, height: 0, ecv: "1.1 cm³ (expected)",
      shape: "Flat: no clear peak anywhere in the pressure range.",
      opts: [
        { t: "Very little measured mobility; middle-ear effusion is one possibility.", ok: true, fb: "Correct. Flat with an expected ECV means the probe is in the canal but the system barely moves. Effusion is one possibility among several." },
        { t: "Otitis media is confirmed.", ok: false, fb: "No. A tracing is evidence, not a medical diagnosis. Otoscopy, history, and medical evaluation are needed." },
        { t: "The eardrum is perforated.", ok: false, fb: "Not with this ECV. A perforation or an open PE tube usually enlarges the measured volume." }
      ] },
    { id: "T3", label: "T3 · Type B, large ECV", type: "B", peak: null, height: 0, ecv: "2.6 cm³ (large)",
      shape: "Flat, but the measured air space is unusually large.",
      opts: [
        { t: "May be consistent with a patent PE tube or a tympanic-membrane perforation.", ok: true, fb: "Correct. The device is measuring the canal plus the air space beyond the eardrum. Otoscopy and history separate an open tube from a perforation." },
        { t: "The PE tube is blocked.", ok: false, fb: "The opposite direction. A blocked tube would not add the middle-ear air space to the measurement." },
        { t: "There is fluid behind the eardrum.", ok: false, fb: "Effusion usually goes with an expected ECV, not a large one." }
      ] },
    { id: "T4", label: "T4 · Type B, very small ECV", type: "B", peak: null, height: 0, ecv: "0.2 cm³ (very small)",
      shape: "Flat, with a very small measured air space.",
      opts: [
        { t: "Check probe blockage, occluding cerumen, or canal obstruction.", ok: true, fb: "Correct. A tiny ECV suggests the probe is not seeing the whole canal. Re-check the probe and the canal before interpreting anything else." },
        { t: "A middle-ear mass is confirmed.", ok: false, fb: "No. The most common explanation is a blocked probe or an obstructed canal." },
        { t: "Hearing sensitivity must be reduced by at least 30 dB.", ok: false, fb: "No. The tracing carries no threshold information." }
      ] },
    { id: "T5", label: "T5 · Type C", type: "C", peak: -220, height: 0.6, ecv: "1.0 cm³ (expected)",
      shape: "A peak that is present but shifted toward negative pressure.",
      opts: [
        { t: "Negative middle-ear pressure; Eustachian-tube dysfunction is one possibility.", ok: true, fb: "Correct. The system still moves, but its best mobility occurs at negative pressure." },
        { t: "Hearing sensitivity is 30 dB HL.", ok: false, fb: "No. A tympanogram never gives a threshold." },
        { t: "The middle ear is definitely filled with fluid.", ok: false, fb: "No. A peak is present, so the system is moving. A flat tracing would be the pattern to look at for that question." }
      ] }
  ];
  function tympSVG(p) {
    var W = 420, H = 190, ml = 46, mr = 14, mt = 14, mb = 30;
    var PMIN = -400, PMAX = 200;
    function x(v) { return ml + (v - PMIN) / (PMAX - PMIN) * (W - ml - mr); }
    function y(a) { return H - mb - a * (H - mt - mb) / 1.0; }
    var s = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Simplified tympanogram. Pressure in decapascals runs left to right; measured mobility runs bottom to top. ' + esc(p.shape) + '">'];
    for (var v = PMIN; v <= PMAX; v += 100) {
      s.push('<line x1="' + x(v).toFixed(1) + '" y1="' + mt + '" x2="' + x(v).toFixed(1) + '" y2="' + (H - mb) + '" stroke="rgba(234,244,251,.16)" stroke-width="1"/>');
      s.push('<text x="' + x(v).toFixed(1) + '" y="' + (H - mb + 14) + '" font-size="9" fill="#9fb2c6" text-anchor="middle">' + v + "</text>");
    }
    for (var a = 0; a <= 1; a += 0.25) {
      s.push('<line x1="' + ml + '" y1="' + y(a).toFixed(1) + '" x2="' + (W - mr) + '" y2="' + y(a).toFixed(1) + '" stroke="rgba(234,244,251,.12)" stroke-width="1"/>');
    }
    s.push('<line x1="' + x(0).toFixed(1) + '" y1="' + mt + '" x2="' + x(0).toFixed(1) + '" y2="' + (H - mb) + '" stroke="#7fd1a3" stroke-width="1" stroke-dasharray="4 4"/>');
    var pts = [];
    for (var v2 = PMIN; v2 <= PMAX; v2 += 10) {
      var adm = 0.06;
      if (p.peak !== null) adm += p.height * Math.exp(-Math.pow((v2 - p.peak) / 90, 2));
      pts.push((v2 === PMIN ? "M" : "L") + x(v2).toFixed(1) + " " + y(adm).toFixed(1));
    }
    s.push('<path d="' + pts.join(" ") + '" fill="none" stroke="#dc9329" stroke-width="2.4"/>');
    s.push('<text x="' + ((ml + W - mr) / 2) + '" y="' + (H - 4) + '" font-size="9" fill="#9fb2c6" text-anchor="middle">Ear-canal pressure (daPa)</text>');
    var yt = '<text x="12" y="' + (H / 2) + '" font-size="9" fill="#9fb2c6" text-anchor="middle" transform="rotate(-90 12 ' + (H / 2) + ')">Measured mobility</text>';
    s.push(yt);
    s.push("</svg>");
    return s.join("");
  }
  function initTympExplorer() {
    var box = $("#tymp-explorer"); if (!box) return;
    box.innerHTML =
      "<h4>Tympanogram explorer</h4>" +
      '<p class="step-note">Three things describe a tracing: <strong>where the peak sits</strong> (pressure), <strong>how high the peak is</strong> (mobility), and <strong>ear-canal volume</strong> (the air space the probe is measuring). Choose a preset, read the tracing, then pick the beginner-safe interpretation.</p>' +
      '<div class="stepper" role="group" aria-label="Tympanogram presets"></div>' +
      '<div class="tymp-stage"></div>' +
      '<div class="callout c-clinical" style="margin-top:14px"><span class="ic" aria-hidden="true">&#9432;</span><h4>Read every tracing this way</h4>' +
      "<p>A tympanogram suggests middle-ear status. It does not diagnose a condition and it does not measure hearing sensitivity by itself. These presets also assume an age-appropriate conventional protocol: infants younger than about 6 months generally need a high-frequency probe tone and infant norms.</p></div>";
    var bar = $(".stepper", box), stage = $(".tymp-stage", box);
    function show(i) {
      $all(".step-btn", bar).forEach(function (b, bi) { b.setAttribute("aria-pressed", String(bi === i)); });
      var p = TYMP[i];
      stage.innerHTML = tympSVG(p) +
        '<ul class="tymp-read"><li><span class="tr-k">Pattern</span><span class="tr-v">Type ' + p.type + "</span></li>" +
        '<li><span class="tr-k">Peak</span><span class="tr-v">' + (p.peak === null ? "no clear peak" : p.peak + " daPa") + "</span></li>" +
        '<li><span class="tr-k">Ear-canal volume</span><span class="tr-v">' + p.ecv + "</span></li></ul>" +
        '<p class="p-q">Which interpretation is best supported?</p>' +
        '<div class="p-choices" role="group" aria-label="Interpretations"></div>' +
        '<div class="p-fb" role="status" aria-live="polite"></div>';
      var wrap = $(".p-choices", stage), fb = $(".p-fb", stage);
      if (!p._order) p._order = shuffled(p.opts);
      p._order.forEach(function (o) {
        var b = el('<button type="button" class="p-choice">' + o.t + "</button>");
        b._ok = o.ok;
        b.addEventListener("click", function () {
          $all(".p-choice", wrap).forEach(function (x) { x.classList.remove("correct", "wrong"); });
          b.classList.add(o.ok ? "correct" : "wrong");
          if (o.ok) $all(".p-choice", wrap).forEach(function (x) { if (x._ok) x.classList.add("correct"); });
          fb.className = "p-fb show " + (o.ok ? "ok" : "no");
          fb.textContent = o.fb;
        });
        wrap.appendChild(b);
      });
    }
    TYMP.forEach(function (p, i) {
      var b = el('<button type="button" class="step-btn" aria-pressed="' + (i === 0 ? "true" : "false") + '">' + p.label + "</button>");
      b.addEventListener("click", function () { show(i); });
      bar.appendChild(b);
    });
    show(0);
  }

  /* =========================================================
     4. OAE / AABR pathway comparison  (Topic 1.6-1.8)
     ========================================================= */
  var STAGES = [
    { k: "canal", t: "Ear canal" }, { k: "middle", t: "Middle ear" }, { k: "ohc", t: "Outer hair cells" },
    { k: "nerve", t: "Auditory nerve" }, { k: "brainstem", t: "Brainstem" }
  ];
  var PATHS = {
    oae: { on: ["canal", "middle", "ohc"], back: true,
      d: "A probe in the ear canal plays a sound. It travels inward through the canal and middle ear to the outer hair cells, and the emission they produce travels back out to the probe microphone. Because the response makes a round trip, anything in the canal or middle ear can weaken or remove it." },
    aabr: { on: ["canal", "middle", "ohc", "nerve", "brainstem"], back: false,
      d: "Earphones deliver sound inward. Surface electrodes on the head record the synchronized neural response through the auditory nerve and brainstem. The stimulus still has to reach the cochlea, so outer- and middle-ear status matters here too, but the response comes from farther along the pathway." }
  };
  function pathSVG(mode) {
    var cfg = PATHS[mode], W = 640, H = 130, bw = 104, gap = 24;
    var s = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Auditory pathway from ear canal to brainstem, highlighting the checkpoints sampled by ' + (mode === "oae" ? "an OAE" : "an AABR") + '.">'];
    STAGES.forEach(function (st, i) {
      var x = 8 + i * (bw + gap), on = cfg.on.indexOf(st.k) >= 0;
      s.push('<rect x="' + x + '" y="46" width="' + bw + '" height="40" rx="9" fill="' + (on ? "#dc9329" : "#EAF4FB") + '" stroke="' + (on ? "#b9761c" : "#2E6F9E") + '" stroke-width="2"/>');
      s.push('<text x="' + (x + bw / 2) + '" y="71" font-size="11" font-weight="' + (on ? "700" : "400") + '" fill="' + (on ? "#08203a" : "#5d6675") + '" text-anchor="middle">' + st.t + "</text>");
      if (i < STAGES.length - 1) s.push('<line x1="' + (x + bw + 3) + '" y1="66" x2="' + (x + bw + gap - 5) + '" y2="66" stroke="#2E6F9E" stroke-width="2" marker-end="url(#l3p)"/>');
    });
    s.push('<text x="' + (8 + bw / 2) + '" y="30" font-size="10" fill="#0B2D4D" text-anchor="middle">' + (mode === "oae" ? "probe plays sound" : "earphone plays sound") + "</text>");
    if (cfg.back) {
      s.push('<path d="M270 96 C 230 122, 90 122, 55 100" fill="none" stroke="#2f7077" stroke-width="2.4" stroke-dasharray="6 4" marker-end="url(#l3pg)"/>');
      s.push('<text x="165" y="122" font-size="10" fill="#2f7077" text-anchor="middle">emission travels back out to the probe microphone</text>');
    } else {
      s.push('<rect x="524" y="14" width="108" height="24" rx="7" fill="#E9F4EE" stroke="#2f7d57" stroke-width="1.6"/>');
      s.push('<text x="578" y="30" font-size="10" fill="#1c4d36" text-anchor="middle">surface electrodes</text>');
      s.push('<line x1="578" y1="40" x2="578" y2="44" stroke="#2f7d57" stroke-width="2"/>');
    }
    s.push('<defs><marker id="l3p" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="#2E6F9E"/></marker>' +
      '<marker id="l3pg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="#2f7077"/></marker></defs>');
    s.push("</svg>");
    return s.join("");
  }
  function initPathCompare() {
    var box = $("#oae-abr-path"); if (!box) return;
    box.innerHTML =
      "<h4>Where does each test listen?</h4>" +
      '<p class="step-note">Select a measure to highlight the checkpoints it samples.</p>' +
      '<div class="stepper" role="group" aria-label="Measure"></div>' +
      '<div class="path-stage"></div>' +
      '<div class="case-deck"></div>';
    var bar = $(".stepper", box), stage = $(".path-stage", box);
    ["oae", "aabr"].forEach(function (m, i) {
      var b = el('<button type="button" class="step-btn" aria-pressed="' + (i === 0 ? "true" : "false") + '">' + (m === "oae" ? "OAE" : "AABR") + "</button>");
      b.addEventListener("click", function () {
        $all(".step-btn", bar).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        stage.innerHTML = pathSVG(m) + '<p class="a-desc"><strong>What this shows:</strong> ' + PATHS[m].d + "</p>";
      });
      bar.appendChild(b);
    });
    stage.innerHTML = pathSVG("oae") + '<p class="a-desc"><strong>What this shows:</strong> ' + PATHS.oae.d + "</p>";

    caseDeck($(".case-deck", box), {
      title: "Cross-check the two results",
      note: "Neither test alone is a diagnosis. Their value is that they sample different checkpoints, so the combination is more informative than either result on its own.",
      cases: [
        { label: "P1 · OAE present, AABR pass",
          facts: ["OAE: <strong>present</strong>", "AABR: <strong>pass</strong>"],
          prompt: "Which reading is beginner-safe?",
          opts: [
            { t: "Both screening checkpoints met criteria that day; surveillance still continues.", ok: true, fb: "Correct. Two checkpoints were met under those conditions. Hearing can still change, and screening never covers everything." },
            { t: "The auditory system is confirmed normal for life.", ok: false, fb: "No. Screening measures sample specific functions on a specific day." },
            { t: "Speech understanding in noise is confirmed to be typical.", ok: false, fb: "No. Neither measure tests everyday speech understanding." }
          ] },
        { label: "P2 · OAE absent, AABR pass",
          facts: ["OAE: <strong>absent</strong>", "AABR: <strong>pass</strong>"],
          prompt: "Which reading is beginner-safe?",
          opts: [
            { t: "Probe fit, canal debris, middle-ear status, or outer-hair-cell function could all contribute; follow the protocol.", ok: true, fb: "Correct. An absent OAE is nonspecific. An AABR pass is reassuring but does not rule out every mild or frequency-limited cochlear loss." },
            { t: "Cochlear hearing loss is confirmed.", ok: false, fb: "No. An absent OAE has several possible explanations, several of which have nothing to do with the cochlea." },
            { t: "The absent OAE can be ignored because AABR passed.", ok: false, fb: "No. Follow the program's protocol rather than dismissing one of the two results." }
          ] },
        { label: "P3 · OAE present, AABR refer",
          facts: ["OAE: <strong>present</strong>", "AABR: <strong>refer</strong>", "The two checkpoints disagree, which is the whole reason to run both"],
          prompt: "This pattern points past the cochlea. What should happen <em>next</em>?",
          opts: [
            { t: "Diagnostic audiologic evaluation, promptly. The disagreement is the finding, and the battery is what explains it.", ok: true, fb: "Correct. The pattern is a reason to evaluate, not a conclusion. Notice what you cannot say yet: not that hearing is fine (the AABR disagrees), and not that a specific disorder is present (that needs the full battery)." },
            { t: "Repeat the AABR until it passes, since the OAE was present.", ok: false, fb: "No. Rescreening toward a pass is how a neural concern gets buried. The disagreement between the two measures is exactly what deserves a closer look." },
            { t: "Nothing. A present OAE means the ear is working, so the AABR must be a technical error.", ok: false, fb: "No. This is the case that shows why a present OAE must never be read as “the whole auditory system is normal.”" }
          ] },
        { label: "P4 · OAE absent, AABR refer",
          facts: ["OAE: <strong>absent</strong>", "AABR: <strong>refer</strong>"],
          prompt: "Which reading is beginner-safe?",
          opts: [
            { t: "Outer-, middle-, cochlear, or neural explanations are all possible; diagnostic follow-up is needed.", ok: true, fb: "Correct. Both checkpoints were missed, and the reason could sit anywhere along the pathway. The next step is prompt diagnostic evaluation." },
            { t: "The cause is certainly in the cochlea.", ok: false, fb: "No. A blocked canal or a middle-ear problem can produce this pattern too." },
            { t: "Nothing can be said, so no follow-up is needed.", ok: false, fb: "No. Uncertainty about the cause is the reason follow-up is needed, not a reason to skip it." }
          ] }
      ]
    });
  }

  /* =========================================================
     5. Newborn 1-3-6 timeline  (Topic 1.9)
     ========================================================= */
  var EHDI = [
    { k: "m1", t: "Complete the hearing screening" },
    { k: "m3", t: "Complete diagnostic evaluation after a did-not-pass result" },
    { k: "m6", t: "Begin appropriate early intervention when hearing loss is identified" }
  ];
  function initTimeline() {
    var box = $("#ehdi-timeline"); if (!box) return;
    box.innerHTML =
      "<h4>Place each milestone on the newborn timeline</h4>" +
      '<p class="step-note">Select a milestone card, then choose the benchmark age. These are the CDC Early Hearing Detection and Intervention benchmarks.</p>' +
      '<div class="sort-cards" role="group" aria-label="Milestone cards"></div>' +
      '<div class="tl-track">' +
      '<div class="tl-slot"><span class="tl-age">By 1 month</span><ul class="binlist" data-bin="m1" aria-label="By 1 month"></ul><button type="button" class="btn sm sec" data-assign="m1">Place here</button></div>' +
      '<div class="tl-slot"><span class="tl-age">By 3 months</span><ul class="binlist" data-bin="m3" aria-label="By 3 months"></ul><button type="button" class="btn sm sec" data-assign="m3">Place here</button></div>' +
      '<div class="tl-slot"><span class="tl-age">By 6 months</span><ul class="binlist" data-bin="m6" aria-label="By 6 months"></ul><button type="button" class="btn sm sec" data-assign="m6">Place here</button></div>' +
      "</div>" +
      '<div class="qactions" style="margin-top:12px"><button type="button" class="btn sm" data-check>Check</button></div>' +
      '<div class="p-fb" role="status" aria-live="polite"></div>' +
      '<div class="practice" data-practice style="margin-top:16px" ' +
      'data-ok-msg="Correct. A newborn can pass and still develop a later-onset or progressive hearing difference. Surveillance of hearing, communication, and developmental milestones continues, especially when risk factors or family concerns are present." ' +
      'data-no-msg="Not quite. A pass applies to the measures used on that day. Later-onset and progressive hearing differences are exactly why surveillance continues.">' +
      '<p class="p-q">Does a newborn-screen pass end all hearing surveillance?</p>' +
      '<div class="p-choices" role="group" aria-label="Yes or no">' +
      '<button type="button" class="p-choice" data-ok="0">Yes, a pass closes the question.</button>' +
      '<button type="button" class="p-choice" data-ok="1">No, surveillance continues.</button>' +
      '</div><div class="p-fb" role="status" aria-live="polite"></div></div>';
    var pool = $(".sort-cards", box), fb = $(".tl-track", box).parentNode.querySelector(":scope > .p-fb"), selected = null;
    function mkCard(c) {
      var b = el('<button type="button" class="sort-card" aria-pressed="false">' + esc(c.t) + "</button>");
      b._data = c;
      b.addEventListener("click", function () {
        if (selected === b) { b.setAttribute("aria-pressed", "false"); selected = null; return; }
        if (selected) selected.setAttribute("aria-pressed", "false");
        selected = b; b.setAttribute("aria-pressed", "true");
      });
      return b;
    }
    EHDI.slice().sort(function () { return Math.random() - 0.5; }).forEach(function (c) { pool.appendChild(mkCard(c)); });
    $all("[data-assign]", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!selected) { fb.className = "p-fb show no"; fb.textContent = "Select a milestone card first."; return; }
        var list = $('.binlist[data-bin="' + btn.dataset.assign + '"]', box);
        if (list.children.length) { fb.className = "p-fb show no"; fb.textContent = "That benchmark already holds a milestone. Send it back with × first."; return; }
        var li = el("<li>" + esc(selected._data.t) + ' <button type="button" aria-label="Remove milestone">×</button></li>');
        li._data = selected._data;
        li.querySelector("button").addEventListener("click", function () { pool.appendChild(mkCard(li._data)); li.remove(); fb.classList.remove("show"); });
        list.appendChild(li); selected.remove(); selected = null; fb.classList.remove("show");
      });
    });
    $("[data-check]", box).addEventListener("click", function () {
      if ($all(".sort-card", pool).length) { fb.className = "p-fb show no"; fb.textContent = "Place all three milestones before checking."; return; }
      var right = 0;
      $all(".tl-track .binlist", box).forEach(function (ul) {
        var li = ul.firstElementChild; if (!li) return;
        var ok = li._data.k === ul.dataset.bin;
        li.classList.toggle("correct", ok); li.classList.toggle("wrong", !ok); if (ok) right++;
      });
      var ok = right === 3;
      fb.className = "p-fb show " + (ok ? "ok" : "no");
      fb.innerHTML = ok
        ? "Correct: screen by 1 month, diagnostic evaluation by 3 months after a did-not-pass result, early intervention by 6 months when hearing loss is identified. These are <strong>maximum</strong> benchmark ages, not reasons to wait: earlier follow-up is better when it is available."
        : right + " of 3 in place. The pathway moves from identification, to confirmation, to intervention. Fix the red cards and check again.";
    });
  }

  /* =========================================================
     6. Auditory-system location map  (Topic 3.1 / 4.1)
     ========================================================= */
  var LOCS = [
    { k: "outer", t: "Outer ear",
      cards: ["Occluding cerumen", "Ear-canal atresia or stenosis", "Otitis externa", "Foreign body"],
      transmission: "Sound may be blocked or narrowed before it reaches the eardrum.",
      pattern: "If hearing is affected, a <strong>conductive</strong> pattern is likely (air conduction poorer than bone conduction).",
      comm: "Speech may sound softer or less clear, especially at a distance or in noise. A one-sided loss can still affect localization and listening in noise.",
      next: "Medical evaluation for the ear condition; audiologic evaluation to describe any hearing change." },
    { k: "middle", t: "Middle ear",
      cards: ["Otitis media with effusion", "Eustachian-tube dysfunction", "Tympanic-membrane perforation", "Otosclerosis"],
      transmission: "The eardrum and ossicles move less efficiently, so less energy reaches the cochlea.",
      pattern: "A <strong>conductive</strong> pattern is likely when hearing is affected; tympanometry often adds a useful clue.",
      comm: "Access to speech may fluctuate. In children, even a temporary reduction matters during language learning and classroom instruction.",
      next: "Medical evaluation, plus audiologic evaluation. The SLP supports access while follow-up is pending." },
    { k: "inner", t: "Inner ear (cochlea)",
      cards: ["Noise-damaged hair cells", "Age-related change", "Ototoxic cochlear damage", "Ménière’s disease"],
      transmission: "Sound reaches the cochlea, but transduction and coding are affected.",
      pattern: "A <strong>sensorineural</strong> pattern is likely: air and bone thresholds are both affected, with no meaningful air-bone gap.",
      comm: "High-frequency speech information is often affected first. A common report is “I hear people talking, but the words are not clear,” especially in noise.",
      next: "Audiologic evaluation; medical evaluation when the history, symptoms, or time course call for it." },
    { k: "nerve", t: "Auditory nerve",
      cards: ["Present OAE with markedly abnormal ABR", "Disrupted neural synchrony"],
      transmission: "The cochlea may respond, but the signal reaching the brain is poorly timed or poorly transmitted.",
      pattern: "A <strong>neural</strong> pattern: speech understanding can be much poorer than pure-tone thresholds alone would predict.",
      comm: "Listening effort is high, and performance in noise can be disproportionately poor.",
      next: "Diagnostic audiologic evaluation with a test battery, including cross-checks such as OAE with ABR." },
    { k: "central", t: "Central pathway",
      cards: ["Difficulty with competing speech after typical peripheral results", "Difficulty in reverberant rooms"],
      transmission: "Sound reaches the brain, but processing under complex listening conditions is difficult.",
      pattern: "Peripheral thresholds may be within typical limits. A <strong>central</strong> concern cannot be read off an audiogram.",
      comm: "Trouble with speech in noise, rapid or degraded speech, localization, and long spoken directions.",
      next: "Differential evaluation across the team: audiology, speech-language pathology, and, as appropriate, psychology and education." }
  ];
  function initLocationMap() {
    var box = $("#location-map"); if (!box) return;
    box.innerHTML =
      "<h4>Location map: what does this location predict?</h4>" +
      '<p class="step-note">Select a location to see the representative conditions, the effect on sound, the broad pattern to expect, and the appropriate follow-up. Location gives a <em>hypothesis</em>, never a diagnosis.</p>' +
      '<div class="stepper" role="group" aria-label="Auditory-system locations"></div>' +
      '<div class="loc-panel" role="status" aria-live="polite"></div>';
    var bar = $(".stepper", box), panel = $(".loc-panel", box);
    function show(i) {
      $all(".step-btn", bar).forEach(function (b, bi) { b.setAttribute("aria-pressed", String(bi === i)); });
      var L = LOCS[i];
      panel.innerHTML =
        '<div class="loc-cards">' + L.cards.map(function (c) { return '<span class="tag">' + esc(c) + "</span>"; }).join("") + "</div>" +
        '<dl class="loc-dl">' +
        "<dt>Effect on sound</dt><dd>" + L.transmission + "</dd>" +
        "<dt>Broad pattern</dt><dd>" + L.pattern + "</dd>" +
        "<dt>Communication</dt><dd>" + L.comm + "</dd>" +
        "<dt>Follow-up</dt><dd>" + L.next + "</dd>" +
        "</dl>";
    }
    LOCS.forEach(function (L, i) {
      var b = el('<button type="button" class="step-btn" aria-pressed="' + (i === 0 ? "true" : "false") + '">' + L.t + "</button>");
      b.addEventListener("click", function () { show(i); });
      bar.appendChild(b);
    });
    show(0);
  }

  /* =========================================================
     7. Outer- and middle-ear case matchers  (Topics 3.2-3.4)
     ========================================================= */
  function initOuterMatcher() {
    caseMatcher($("#outer-ear-matcher"), {
      title: "Outer-ear case matcher",
      note: "For each case, work through location, likely hearing effect, the most useful test clue, and the safe next step.",
      cases: [
        { label: "OE1 · Blocked canal",
          facts: ["Adult, routine hearing screening", "Otoscopy: the canal is substantially blocked with cerumen", "The OAE probe cannot be seated properly"],
          steps: [
            { q: "Step 1 · Where is the problem?", opts: [{ t: "Outer ear", ok: true }, { t: "Middle ear", ok: false }, { t: "Inner ear", ok: false }], fb: "Outer ear. Cerumen sits in the ear canal, before the eardrum." },
            { q: "Step 2 · Likely hearing effect?", opts: [{ t: "A conductive reduction may occur if the canal is substantially blocked", ok: true }, { t: "A sensorineural loss is confirmed", ok: false }, { t: "No effect is possible", ok: false }], fb: "A conductive reduction may occur. Cerumen is normal and protective; it matters here because the canal is substantially blocked." },
            { q: "Step 3 · Most useful clue?", opts: [{ t: "Otoscopy, plus a flat tympanogram with a very small ear-canal volume", ok: true }, { t: "A word-recognition score", ok: false }, { t: "An air-bone gap alone", ok: false }], fb: "Otoscopy first. A very small ECV suggests the probe is not seeing the whole canal." },
            { q: "Step 4 · Safe next step?", opts: [{ t: "Refer for appropriate cerumen management, then re-test", ok: true }, { t: "Remove the cerumen yourself with a swab", ok: false }, { t: "Record a hearing loss", ok: false }], fb: "Refer. Cerumen removal is a medical or audiologic procedure within a defined scope; never insert swabs or tools into the ear." }
          ],
          summary: "An outer-ear obstruction can reduce sound transmission and can also make probe-based tests unusable. Clear the obstruction through the right professional, then re-test." },
        { label: "OE2 · Painful canal",
          facts: ["Ear pain when the pinna is touched", "The canal looks swollen, with debris", "Probe placement would be uncomfortable"],
          steps: [
            { q: "Step 1 · Where is the problem?", opts: [{ t: "Outer ear", ok: true }, { t: "Middle ear", ok: false }, { t: "Auditory nerve", ok: false }], fb: "Outer ear. Pain on moving the pinna points to the external canal." },
            { q: "Step 2 · Likely hearing effect?", opts: [{ t: "It depends on how much the canal is narrowed or blocked", ok: true }, { t: "Always a severe loss", ok: false }, { t: "Never any effect", ok: false }], fb: "It depends. The amount of change tracks how much the canal is narrowed or blocked." },
            { q: "Step 3 · Safe next step?", opts: [{ t: "Stop; obtain medical evaluation before further testing", ok: true }, { t: "Force the earphone in and continue", ok: false }, { t: "Screen the other ear and call it a pass", ok: false }], fb: "Stop and refer. Possible external-ear inflammation needs medical evaluation, and testing could cause harm or an invalid result." }
          ],
          summary: "Possible otitis externa. Pain, swelling, debris, or drainage make probe and earphone placement inappropriate until a medical evaluation happens." }
      ]
    });
  }
  function initMiddleMatcher() {
    caseMatcher($("#middle-ear-matcher"), {
      title: "Middle-ear case matcher",
      note: "Same routine: location, likely hearing effect, the test clue that helps most, and the safe next step.",
      cases: [
        { label: "OM1 · Fluctuating access",
          facts: ["School-age child with a history of repeated ear infections", "Passes today’s pure-tone screening", "Tympanometry: peak shifted to −220 daPa (Type C), expected ear-canal volume", "The teacher reports that the child misses instructions on some days, but not others", "The child reports “popping” and fullness"],
          steps: [
            { q: "Step 1 · What does the tracing suggest?", opts: [{ t: "Negative middle-ear pressure; Eustachian-tube dysfunction is one possibility", ok: true }, { t: "The ear canal is blocked by cerumen", ok: false }, { t: "The cochlea is damaged", ok: false }], fb: "Negative middle-ear pressure. The system still moves, but its best mobility occurs at negative pressure. The tracing suggests a pressure problem; it does not name the cause." },
            { q: "Step 2 · The child passed the screening today. What does that settle?", opts: [{ t: "Only that the screening rule was met today, under those conditions", ok: true }, { t: "That hearing is typical on every day", ok: false }, { t: "That the teacher’s report can be dismissed", ok: false }], fb: "Only today. Middle-ear status can fluctuate, so access to soft or distant speech can be good on one day and reduced on another. A pass does not answer a question about last week." },
            { q: "Step 3 · Which evidence matters most here?", opts: [{ t: "The pattern across sources: history, tracing, symptoms, and the teacher’s day-to-day report", ok: true }, { t: "The single pass result, because it is the only hearing measure", ok: false }, { t: "The tympanogram alone, because it is objective", ok: false }], fb: "The pattern. No single result carries this case. A tracing is evidence, a pass is one day’s evidence, and a functional report from the classroom is evidence too." },
            { q: "Step 4 · Safe next step?", opts: [{ t: "Refer for medical and audiologic follow-up on the current concern, and support listening access meanwhile", ok: true }, { t: "Do nothing, because the child passed", ok: false }, { t: "Tell the family the child has Eustachian-tube dysfunction", ok: false }], fb: "Refer and support. A current, persistent concern justifies referral even after a pass, and naming the medical condition is not the SLP’s call." }
          ],
          summary: "Fluctuating middle-ear status can leave a child passing a screening on one day and missing speech on another. Refer on the current concern rather than on the screening history, and improve access while follow-up is pending." },
        { label: "OM2 · Large ear-canal volume",
          facts: ["Flat tympanogram", "Ear-canal volume: large", "No claim yet about hearing thresholds"],
          steps: [
            { q: "Step 1 · What does the large volume suggest?", opts: [{ t: "The probe may be measuring the canal plus the space beyond the eardrum", ok: true }, { t: "The canal is blocked", ok: false }, { t: "The cochlea is enlarged", ok: false }], fb: "Correct. That happens when there is an opening: an open PE tube or a tympanic-membrane perforation." },
            { q: "Step 2 · What is needed to tell those apart?", opts: [{ t: "Otoscopy and case history", ok: true }, { t: "A pure-tone average", ok: false }, { t: "A repeat OAE only", ok: false }], fb: "Otoscopy and history. The device cannot tell an open tube from a perforation." },
            { q: "Step 3 · Safe next step?", opts: [{ t: "Medical evaluation to identify the opening and decide next steps", ok: true }, { t: "Assume a perforation and counsel the family", ok: false }, { t: "Ignore it because a tympanogram is not a hearing test", ok: false }], fb: "Medical evaluation. The effect on hearing depends on the size and location of the opening and on the state of the ossicles." }
          ],
          summary: "A flat tracing with a large ECV may be consistent with a patent PE tube or a perforation. Otoscopy and history, not the tracing alone, decide the next step." },
        { label: "OM4 · Gradual conductive pattern",
          facts: ["Adult, gradually progressive hearing difficulty", "Audiogram: an air-bone gap", "No acute pain or drainage", "Stapes movement is suspected to be restricted"],
          steps: [
            { q: "Step 1 · Where is the problem most likely?", opts: [{ t: "Middle ear", ok: true }, { t: "Outer ear", ok: false }, { t: "Central pathway", ok: false }], fb: "Middle ear. The stapes sits at the oval window, at the end of the ossicular chain." },
            { q: "Step 2 · Likely hearing pattern?", opts: [{ t: "A gradually progressive conductive pattern; an inner-ear component is possible in some cases", ok: true }, { t: "A sudden sensorineural loss", ok: false }, { t: "No change in hearing", ok: false }], fb: "Correct. Reduced stapes movement limits transmission to the inner ear, and some people also develop an inner-ear component." },
            { q: "Step 3 · Safe next step?", opts: [{ t: "Audiologic and medical (ENT) evaluation", ok: true }, { t: "Tell the person they have otosclerosis", ok: false }, { t: "Recommend surgery", ok: false }], fb: "Refer for evaluation. Otosclerosis is one possible explanation, and naming it is a medical decision, not an SLP one." }
          ],
          summary: "Otosclerosis is one possible middle-ear explanation for a gradually progressive conductive pattern with an air-bone gap. Audiologic and medical evaluation are required." }
      ]
    });
  }

  /* =========================================================
     8. Noise-risk explorer  (Topic 4.2)
     ========================================================= */
  function initNoiseRisk() {
    var box = $("#noise-risk"); if (!box) return;
    box.innerHTML =
      "<h4>Noise-risk explorer: level, time, distance</h4>" +
      '<p class="step-note">Risk is not one magic number. Move the three controls and watch the risk indicator. The scales are conceptual, not calibrated dose measurements.</p>' +
      '<div class="risk-meter"><div class="rm-bar"><span id="rm-fill"></span></div><p class="rm-label" id="rm-label" role="status" aria-live="polite"></p></div>' +
      '<div class="ctrl-grid">' +
      '<div class="ctrl"><label for="nr-level">Sound level <output id="nr-level-out"></output></label><input type="range" id="nr-level" min="1" max="5" step="1" value="3"><span class="rng-ends"><span>lower</span><span>higher</span></span></div>' +
      '<div class="ctrl"><label for="nr-time">Exposure time <output id="nr-time-out"></output></label><input type="range" id="nr-time" min="1" max="5" step="1" value="3"><span class="rng-ends"><span>shorter</span><span>longer</span></span></div>' +
      '<div class="ctrl"><label for="nr-dist">Distance from the source <output id="nr-dist-out"></output></label><input type="range" id="nr-dist" min="1" max="5" step="1" value="3"><span class="rng-ends"><span>closer</span><span>farther</span></span></div>' +
      "</div>" +
      '<div class="case-deck" style="margin-top:16px"></div>';
    var lv = $("#nr-level", box), tm = $("#nr-time", box), ds = $("#nr-dist", box);
    var WORDS = ["", "much lower", "lower", "moderate", "higher", "much higher"];
    var DWORDS = ["", "very close", "close", "moderate", "farther", "much farther"];
    function draw() {
      var L = +lv.value, T = +tm.value, D = +ds.value;
      $("#nr-level-out", box).textContent = WORDS[L];
      $("#nr-time-out", box).textContent = WORDS[T] === "moderate" ? "moderate" : (T <= 2 ? (T === 1 ? "much shorter" : "shorter") : (T === 4 ? "longer" : "much longer"));
      $("#nr-dist-out", box).textContent = DWORDS[D];
      var score = (L * 2 + T + (6 - D)) / 4; /* 1 .. 5.25 */
      var pct = Math.max(6, Math.min(100, (score - 1) / 4.25 * 100));
      var fill = $("#rm-fill", box), lab = $("#rm-label", box);
      fill.style.width = pct + "%";
      var band = score < 2.2 ? "low" : (score < 3.4 ? "mid" : "high");
      fill.className = band;
      lab.className = "rm-label " + band;
      lab.textContent = band === "low"
        ? "Lower risk: a softer sound, for less time, farther away. Risk still depends on the individual and on repeated exposures over time."
        : (band === "mid"
          ? "Moderate risk: changing any one control (turn it down, shorten it, step back) moves this in the safer direction."
          : "Higher risk: loud, long, and close together add up. Human cochlear hair cells do not grow back, so prevention is the only reliable protection.");
    }
    [lv, tm, ds].forEach(function (i) { i.addEventListener("input", draw); });
    draw();

    caseDeck($(".case-deck", box), {
      title: "Choose the protective response",
      note: "Four everyday situations.",
      cases: [
        { label: "Earbuds on the subway", facts: ["The volume keeps going up to overcome train noise"], prompt: "Best protective response?",
          opts: [
            { t: "Turn it down, use better-fitting or noise-reducing options, or pause listening.", ok: true, fb: "Correct. The reason the level climbed is the background noise. Reduce the noise reaching the ear and the level can come back down." },
            { t: "Keep the level; the ear adapts.", ok: false, fb: "No. Feeling used to a level does not mean the cochlea is unaffected." },
            { t: "Use one earbud at twice the level.", ok: false, fb: "No. That protects nothing and exposes one ear to more." }
          ] },
        { label: "Concert, near a speaker", facts: ["Several hours near a loudspeaker"], prompt: "Best protective response?",
          opts: [
            { t: "Move farther away, take quiet breaks, and use appropriate hearing protection.", ok: true, fb: "Correct. Distance, duration, and protection are three independent controls, and they combine." },
            { t: "Stand closer so the sound is clearer.", ok: false, fb: "No. Moving closer increases exposure." },
            { t: "Nothing; a single event cannot matter.", ok: false, fb: "No. Damage can follow one very intense exposure, and it also accumulates." }
          ] },
        { label: "Loud power tool", facts: ["Brief use of a loud power tool"], prompt: "Best protective response?",
          opts: [
            { t: "Use well-fitted hearing protection and maximize distance where possible.", ok: true, fb: "Correct. Brief does not automatically mean safe when the level is high." },
            { t: "Skip protection because the job is short.", ok: false, fb: "No. Level matters, not just time." },
            { t: "Put cotton in the ear canal.", ok: false, fb: "No. That is not hearing protection." }
          ] },
        { label: "Muffled hearing after rehearsal", facts: ["New muffled hearing and ringing after a rehearsal"], prompt: "Best response?",
          opts: [
            { t: "Stop further exposure and seek a hearing evaluation; a sudden or marked drop warrants urgent evaluation.", ok: true, fb: "Correct. These are warning signs. Temporary improvement does not prove that no injury occurred, so do not wait it out silently." },
            { t: "Wait a few months to see whether it settles.", ok: false, fb: "No. Waiting risks missing a time-sensitive problem." },
            { t: "Return to the same exposure to test whether it happens again.", ok: false, fb: "No. Repeating a hazardous exposure is exactly what to avoid." }
          ] }
      ]
    });
  }

  /* =========================================================
     9. Referral urgency sorter  (Topics 3.5 and 4.4)
     ========================================================= */
  function initUrgency() {
    var box = $("#urgency-sorter"); if (!box) return;
    multiSorter(box, {
      title: "How urgent is each situation?",
      hint: "Select a case, then choose a column. Urgency rises with sudden change, active ear symptoms, and possible time-sensitive disease. Press <strong>Check</strong> when every case is placed.",
      bins: [
        { key: "routine", label: "Routine protocol follow-up", meta: "Complete the rescreen or referral pathway the program specifies." },
        { key: "prompt", label: "Prompt referral", meta: "Current ear or hearing status needs evaluation soon: medical for ear disease and injury, audiologic for hearing and listening concerns." },
        { key: "urgent", label: "Urgent evaluation", meta: "Same-day or immediate medical/ENT and audiologic evaluation. Treatment opportunity can decrease with delay." }
      ],
      cards: [
        { t: "Pure-tone screening refer, no acute symptoms", bin: "routine" },
        { t: "Persistent middle-ear concerns with classroom listening difficulty", bin: "prompt" },
        { t: "Ear drainage, bleeding, or marked pain", bin: "prompt" },
        { t: "Suspected foreign body in the ear canal", bin: "prompt" },
        { t: "Previous pass, but a new persistent parent or teacher concern", bin: "prompt" },
        { t: "Sudden one-sided hearing drop today, with new tinnitus and fullness", bin: "urgent" },
        { t: "New severe vertigo with neurologic symptoms", bin: "urgent" }
      ],
      okMsg: "All correct. A screening refer without symptoms follows the program pathway. Active ear symptoms, a suspected foreign body, and a new current concern need prompt referral. A sudden unexplained hearing change, and severe vertigo with neurologic symptoms, are urgent: do not wait to see whether they resolve.",
      noMsg: "Ask three questions of each card: did something change suddenly, are there active ear symptoms, and could a delay reduce the chance of effective treatment? Fix the red cards and check again."
    });
  }

  /* =========================================================
     10. APD differential-team map  (Topic 4.6)
     ========================================================= */
  function initApdMap() {
    var box = $("#apd-map"); if (!box) return;
    box.insertAdjacentHTML("beforeend",
      '<div class="complaint-chip"><span class="cc-lab">The complaint</span><p>“I have difficulty understanding speech in noise.”</p>' +
      "<p class=\"cc-note\">That single sentence is compatible with several very different explanations, and more than one branch can be active at the same time.</p></div>");
    var host = el('<div class="sorter-host"></div>');
    box.appendChild(host);
    multiSorter(host, {
      title: "Which branch does each piece of evidence belong to?",
      hint: "Select an evidence card, then choose a branch. A correct sort reveals who contributes to each branch. Press <strong>Check</strong> when every card is placed.",
      bins: [
        { key: "per", label: "Peripheral hearing", meta: "<strong>Audiologist:</strong> checks reliability and peripheral hearing status first. Peripheral hearing must be evaluated before central auditory testing is interpreted." },
        { key: "cen", label: "Central auditory processing", meta: "<strong>Audiologist:</strong> selects and interprets an individualized central auditory test battery when it is appropriate, and diagnoses APD when criteria are met." },
        { key: "sl", label: "Speech, language & phonological processing", meta: "<strong>SLP:</strong> evaluates speech, language, phonological processing, literacy-related skills, and functional communication; helps separate linguistic processing demands from auditory ones." },
        { key: "att", label: "Attention, cognition & context", meta: "<strong>Psychology, education, and the wider team:</strong> evaluate attention, cognition, and learning, and improve room acoustics, signal-to-noise ratio, visual support, and comprehension checks." }
      ],
      cards: [
        { t: "Inconsistent pure-tone thresholds", bin: "per" },
        { t: "Difficulty with rapid and competing speech after peripheral hearing has been evaluated", bin: "cen" },
        { t: "Weak phonological awareness and sentence comprehension", bin: "sl" },
        { t: "Difficulty appears across auditory and visual attention tasks", bin: "att" },
        { t: "Difficulty occurs mainly in a reverberant classroom", bin: "att" }
      ],
      okMsg: "All correct. A passing pure-tone screen answers a narrow question. It does not prove APD, and it does not rule out the other contributors to listening difficulty. The team is not deciding whether the problem is “hearing” or “language”; it is asking which parts of a complex listening task are breaking down for this person.",
      noMsg: "Ask what each piece of evidence would still be true of if hearing were typical. Fix the red cards and check again."
    });
  }

  /* =========================================================
     Shared L1/L2 patterns: transcripts, flip cards, image fallback
     ========================================================= */
  function initTranscripts() {
    $all(".tr-toggle").forEach(function (btn) {
      var tr = btn.nextElementSibling; if (!tr || !tr.classList.contains("transcript")) return;
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", function () {
        var show = tr.classList.toggle("show");
        btn.setAttribute("aria-expanded", String(show));
        btn.textContent = show ? "Hide transcript" : "Show transcript";
      });
    });
  }
  function initFlip() {
    $all(".flipcard").forEach(function (c) {
      c.addEventListener("click", function () { c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") === "true" ? "false" : "true"); });
    });
  }
  function initImageFallback() {
    $all("figure.photo-fig img").forEach(function (img) {
      function fail() { var f = img.closest("figure"); if (f) f.classList.add("img-missing"); }
      if (img.complete && img.naturalWidth === 0) fail();
      img.addEventListener("error", fail);
    });
  }

  function init() {
    initTranscripts(); initFlip(); initImageFallback();
    initPathway(); initMeasureSorter(); initTympExplorer(); initPathCompare(); initTimeline();
    initLocationMap(); initOuterMatcher(); initMiddleMatcher(); initNoiseRisk(); initUrgency(); initApdMap();
    initPracticeBlocks();
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
  w.INTERACTIONS = { init: init };
})(window, document);
