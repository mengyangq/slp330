/* ============================================================
   SLP 330 L4, Hearing Aids, Cochlear Implants, and Aural (Re)habilitation
   Original visuals & non-graded interactions. Shared by both builds.
   No autoplay anywhere. Every function guards for missing DOM.
   New for L4: hearing-aid style tradeoff explorer, compression and
   output explorer, orientation/troubleshooting bench, remote-microphone
   SNR explorer, CI configuration builder, pediatric auditory-skills
   ladder, direct-vs-coaching role sorter, adult communication-repair
   dialogue, speechreading ambiguity lab.
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
     Shared micro-engines (same behavior as L3, restyled for L4)
     ========================================================= */

  function wirePractice(scope, msg) {
    var choices = $all(".p-choice", scope), fb = $(".p-fb", scope);
    choices.forEach(function (b) {
      b.addEventListener("click", function () {
        choices.forEach(function (x) { x.classList.remove("correct", "wrong"); });
        var ok = b.dataset.ok === "1";
        b.classList.add(ok ? "correct" : "wrong");
        if (ok) choices.forEach(function (x) { if (x.dataset.ok === "1") x.classList.add("correct"); });
        fb.className = "p-fb show " + (ok ? "ok" : "no");
        fb.innerHTML = ok ? msg.ok : msg.no;
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
    box.insertAdjacentHTML("beforeend", "<h4>" + esc(cfg.title) + "</h4>" + (cfg.note ? '<p class="step-note">' + cfg.note + "</p>" : ""));
    var bar = el('<div class="stepper" role="group" aria-label="' + esc(cfg.title) + ' cases"></div>');
    var panel = el('<div class="case-panel"></div>');
    box.appendChild(bar); box.appendChild(panel);
    function show(i) {
      $all(".step-btn", bar).forEach(function (b, bi) { b.setAttribute("aria-pressed", String(bi === i)); });
      var c = cfg.cases[i];
      panel.innerHTML =
        (c.facts ? '<ul class="case-facts">' + c.facts.map(function (f) { return "<li>" + f + "</li>"; }).join("") + "</ul>" : "") +
        '<p class="p-q">' + c.prompt + "</p>" +
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

  /* multi-bin card sorter */
  function multiSorter(box, cfg) {
    if (!box) return;
    box.innerHTML =
      "<h4>" + esc(cfg.title) + "</h4>" +
      '<p class="sort-hint">' + (cfg.hint || "Select a card, then choose a column. Use × to send a card back. Press <strong>Check</strong> when every card is placed.") + "</p>" +
      '<div class="sort-cards" role="group" aria-label="Cards to sort"></div>' +
      '<div class="sort-bins b' + cfg.bins.length + '">' +
      cfg.bins.map(function (b) {
        return '<div class="sort-bin"><h5>' + esc(b.label) + "</h5>" +
          '<ul class="binlist" data-bin="' + esc(b.key) + '" aria-label="' + esc(b.label) + ' column"></ul>' +
          '<button type="button" class="btn sm sec" data-assign="' + esc(b.key) + '">Put card here</button>' +
          (b.meta ? '<div class="bin-meta" hidden>' + b.meta + "</div>" : "") + "</div>";
      }).join("") + "</div>" +
      '<div class="qactions" style="margin-top:12px"><button type="button" class="btn sm" data-check>Check</button></div>' +
      '<div class="p-fb" role="status" aria-live="polite"></div>';
    var pool = $(".sort-cards", box), fb = $(":scope > .p-fb", box), selected = null;
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
    shuffled(cfg.cards).forEach(function (c) { pool.appendChild(mkCard(c)); });
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

  /* ordering widget: arrange labels with up/down buttons, then check */
  function orderer(box, cfg) {
    if (!box) return;
    box.innerHTML = "<h4>" + esc(cfg.title) + "</h4>" +
      '<p class="step-note">' + (cfg.note || "Use the ▲ / ▼ buttons to arrange the steps, then press Check.") + "</p>" +
      '<ul class="seq-list"></ul>' +
      '<div class="qactions"><button type="button" class="btn sm" data-check>Check order</button></div>' +
      '<div class="p-fb" role="status" aria-live="polite"></div>';
    var ul = $(".seq-list", box), fb = $(".p-fb", box);
    var order = shuffled(cfg.items.map(function (_, i) { return i; }));
    if (order.join() === cfg.items.map(function (_, i) { return i; }).join()) order.reverse();
    function paint() {
      ul.innerHTML = "";
      order.forEach(function (itemIdx, pos) {
        var li = el('<li class="seq-item"><span class="s-pos">' + (pos + 1) + '</span><span class="s-text">' + esc(cfg.items[itemIdx]) + "</span></li>");
        var mv = el('<span class="seq-move"></span>');
        var up = el('<button type="button" aria-label="Move up">▲</button>');
        var dn = el('<button type="button" aria-label="Move down">▼</button>');
        if (pos === 0) up.disabled = true;
        if (pos === order.length - 1) dn.disabled = true;
        up.addEventListener("click", function () { var t = order[pos - 1]; order[pos - 1] = order[pos]; order[pos] = t; paint(); });
        dn.addEventListener("click", function () { var t = order[pos + 1]; order[pos + 1] = order[pos]; order[pos] = t; paint(); });
        mv.appendChild(up); mv.appendChild(dn); li.appendChild(mv); ul.appendChild(li);
      });
    }
    paint();
    $("[data-check]", box).addEventListener("click", function () {
      var ok = order.every(function (v, i) { return v === i; });
      fb.className = "p-fb show " + (ok ? "ok" : "no");
      fb.innerHTML = ok ? cfg.okMsg : cfg.noMsg;
      if (ok) $all(".seq-item", ul).forEach(function (li) { li.classList.add("correct"); });
    });
  }

  /* =========================================================
     1. Hearing-aid style tradeoff explorer  (Topic 1.4)
     ========================================================= */
  var STYLES = {
    bte: { t: "Behind-the-ear (BTE)", d: "Electronics behind the pinna; sound routed through tubing to an earmold." },
    ric: { t: "Receiver-in-canal (RIC)", d: "Processor behind the ear; the receiver itself sits in the canal." },
    ite: { t: "In-the-ear (ITE)", d: "Custom shell filling part or most of the outer-ear bowl." },
    itc: { t: "In-the-canal / CIC", d: "Custom device sitting partly or deeply in the canal." }
  };
  var PROFILES = [
    { label: "S1 · Young child",
      facts: ["Growing ear, so earmolds will be replaced often", "Needs a broad fitting range", "School remote microphone must connect", "Tamper-resistant battery compartment is wanted"],
      prompt: "Which direction is best supported by these priorities?",
      opts: [
        { t: "Behind-the-ear (BTE)", ok: true, fb: "Strongly supported. A BTE keeps the electronics out of the growing ear, so only the earmold is replaced as the ear changes. It also offers a broad fitting range, reliable accessory connection, and tamper-resistant options. Final selection still requires pediatric audiologic assessment and family input." },
        { t: "Completely-in-canal (CIC)", ok: false, fb: "Not here. A custom canal device would need remaking as the ear grows, offers limited power and wireless options, and the small controls are not designed for a young child." },
        { t: "In-the-ear (ITE)", ok: false, fb: "Not the best fit. A custom shell still has to be remade as the ear grows, and accessory options are usually more limited than with a BTE." }
      ] },
    { label: "S2 · Adult, wireless priority",
      facts: ["Good dexterity and vision", "Values rechargeability", "Wants reliable phone streaming", "No strong cosmetic preference stated"],
      prompt: "What is the most defensible conclusion?",
      opts: [
        { t: "Several options may be reasonable; the choice depends on audiologic findings and preference.", ok: true, fb: "Correct. BTE, RIC, and some ITE devices can all offer rechargeability and streaming. When priorities do not clearly separate the options, the honest answer is that more than one is defensible. Do not force a single cosmetic choice on someone who has not asked for one." },
        { t: "The smallest available device, because it is the most discreet.", ok: false, fb: "No. Smaller is not the same as better, and this person did not raise visibility as a priority. Very small devices also tend to have fewer wireless options." },
        { t: "A behind-the-ear device, because it is always the most reliable.", ok: false, fb: "Too strong. A BTE is a good option here, but so are others. Declaring one style universally best ignores the person's anatomy, audiologic findings, and preference." }
      ] },
    { label: "S3 · Adult, handling needs",
      facts: ["High output needs", "Limited dexterity and reduced vision", "Wants controls large enough to feel", "Family will help with charging"],
      prompt: "Which direction best matches these priorities?",
      opts: [
        { t: "A larger BTE or ITE option", ok: true, fb: "Reasonable. Larger cases can support higher output and offer controls and batteries that are easier to see and handle. Anatomy, audiologic findings, and verification still determine whether a particular device is suitable." },
        { t: "A completely-in-canal device", ok: false, fb: "Working against the priorities. CIC devices have the smallest controls and batteries, limited power, and they are the hardest to handle with reduced dexterity or vision." },
        { t: "Any style, since handling can be learned with practice", ok: false, fb: "No. Dexterity and vision are real selection factors, not obstacles to train away. A device the person cannot manage independently is a device that will not be worn." }
      ] }
  ];
  function initStyleExplorer() {
    var box = $("#style-explorer"); if (!box) return;
    box.insertAdjacentHTML("beforeend",
      '<div class="style-grid">' + Object.keys(STYLES).map(function (k) {
        return '<div class="style-card"><h5>' + STYLES[k].t + "</h5><p>" + STYLES[k].d + "</p></div>";
      }).join("") + "</div>");
    caseDeck(box, {
      title: "Match the person, not the picture",
      note: "Three profiles. Weigh the priorities, then choose the direction the evidence supports. Sometimes more than one answer is defensible, and saying so is the correct clinical move.",
      cases: PROFILES
    });
  }

  /* =========================================================
     2. Compression and output explorer  (Topic 1.3)
     ========================================================= */
  var COMP = {
    linear: { label: "Linear", knee: null, ratio: 1, ceiling: 120,
      note: "Every 10 dB increase at the input produces a 10 dB increase at the output. Gain is constant across this region." },
    comp: { label: "Compression", knee: 45, ratio: 2, ceiling: 120,
      note: "Below the compression region the gain is relatively greater. Above it, output still rises, but more gradually, so a wide range of input levels is squeezed into the listener's smaller usable range." },
    limit: { label: "Output limiting", knee: 45, ratio: 2, ceiling: 90,
      note: "The same compression, plus a ceiling: output stops rising beyond the selected maximum. Limiting the maximum output is not the same as making every loud sound automatically comfortable." }
  };
  function compPath(cfg, gain) {
    var pts = [];
    for (var inp = 20; inp <= 100; inp += 2) {
      var out;
      if (cfg.knee === null || inp <= cfg.knee) out = inp + gain;
      else out = cfg.knee + gain + (inp - cfg.knee) / cfg.ratio;
      out = Math.min(out, cfg.ceiling);
      pts.push([inp, out]);
    }
    return pts;
  }
  function initCompression() {
    var box = $("#compression-explorer"); if (!box) return;
    box.innerHTML =
      "<h4>Input, output, and what compression actually does</h4>" +
      '<p class="step-note">The horizontal axis is the sound level going <em>in</em>; the vertical axis is the level coming <em>out</em>. The dotted line is unaided (no gain). Choose a response, then move the input slider to see what the listener receives. Values are conceptual, not a fitting prescription and not a hearing test.</p>' +
      '<div class="stepper" role="group" aria-label="Response type"></div>' +
      '<div class="io-stage"></div>' +
      '<div class="ctrl-grid"><div class="ctrl"><label for="io-in">Input level <output id="io-in-out">50 dB</output></label>' +
      '<input type="range" id="io-in" min="20" max="100" step="5" value="50"><span class="rng-ends"><span>soft</span><span>loud</span></span></div></div>' +
      '<div class="io-read" role="status" aria-live="polite"></div>';
    var bar = $(".stepper", box), stage = $(".io-stage", box), slider = $("#io-in", box), read = $(".io-read", box);
    var current = "linear", GAIN = 25;
    var W = 420, H = 260, ml = 46, mr = 16, mt = 14, mb = 34;
    function px(v) { return ml + (v - 20) / 80 * (W - ml - mr); }
    function py(v) { return H - mb - (v - 20) / 100 * (H - mt - mb); }
    function draw() {
      var cfg = COMP[current], pts = compPath(cfg, GAIN), inp = +slider.value;
      var outv = pts.reduce(function (acc, p) { return Math.abs(p[0] - inp) < Math.abs(acc[0] - inp) ? p : acc; })[1];
      var s = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Input-output graph. ' + esc(cfg.label) + ". " + esc(cfg.note) + '">'];
      for (var g = 20; g <= 120; g += 20) {
        s.push('<line x1="' + ml + '" y1="' + py(g).toFixed(1) + '" x2="' + (W - mr) + '" y2="' + py(g).toFixed(1) + '" stroke="rgba(234,244,251,.14)" stroke-width="1"/>');
        s.push('<text x="' + (ml - 8) + '" y="' + (py(g) + 3).toFixed(1) + '" font-size="9" fill="#9fb2c6" text-anchor="end">' + g + "</text>");
      }
      for (var x = 20; x <= 100; x += 20) {
        s.push('<line x1="' + px(x).toFixed(1) + '" y1="' + mt + '" x2="' + px(x).toFixed(1) + '" y2="' + (H - mb) + '" stroke="rgba(234,244,251,.10)" stroke-width="1"/>');
        s.push('<text x="' + px(x).toFixed(1) + '" y="' + (H - mb + 14) + '" font-size="9" fill="#9fb2c6" text-anchor="middle">' + x + "</text>");
      }
      s.push('<path d="M' + px(20).toFixed(1) + " " + py(20).toFixed(1) + " L" + px(100).toFixed(1) + " " + py(100).toFixed(1) + '" fill="none" stroke="#7f93a8" stroke-width="1.4" stroke-dasharray="5 4"/>');
      s.push('<text x="' + px(92).toFixed(1) + '" y="' + (py(92) - 6).toFixed(1) + '" font-size="9" fill="#9fb2c6" text-anchor="end">unaided</text>');
      s.push('<path d="' + pts.map(function (p, i) { return (i ? "L" : "M") + px(p[0]).toFixed(1) + " " + py(p[1]).toFixed(1); }).join(" ") + '" fill="none" stroke="#dc9329" stroke-width="2.6"/>');
      s.push('<line x1="' + px(inp).toFixed(1) + '" y1="' + mt + '" x2="' + px(inp).toFixed(1) + '" y2="' + (H - mb) + '" stroke="#7fd1a3" stroke-width="1.4"/>');
      s.push('<circle cx="' + px(inp).toFixed(1) + '" cy="' + py(outv).toFixed(1) + '" r="5.5" fill="#7fd1a3"/>');
      s.push('<text x="' + ((ml + W - mr) / 2) + '" y="' + (H - 6) + '" font-size="9.5" fill="#9fb2c6" text-anchor="middle">Input level (dB)</text>');
      s.push('<text x="13" y="' + (H / 2) + '" font-size="9.5" fill="#9fb2c6" text-anchor="middle" transform="rotate(-90 13 ' + (H / 2) + ')">Output level (dB)</text>');
      s.push("</svg>");
      stage.innerHTML = s.join("");
      $("#io-in-out", box).textContent = inp + " dB";
      var gainNow = Math.round(outv - inp);
      read.innerHTML = "<strong>" + cfg.label + ".</strong> At a " + inp + " dB input the output is about <strong>" + Math.round(outv) + " dB</strong>, so " +
        (gainNow > 0 ? "the device is adding roughly <strong>" + gainNow + " dB</strong> of gain."
          : gainNow === 0 ? "the device is adding <strong>no gain</strong> at this level: the input is already as loud as the planned output."
            : "the output is being held <strong>below</strong> the input at this level, because the ceiling has been reached.") +
        " " + cfg.note;
    }
    Object.keys(COMP).forEach(function (k, i) {
      var b = el('<button type="button" class="step-btn" aria-pressed="' + (i === 0 ? "true" : "false") + '">' + COMP[k].label + "</button>");
      b.addEventListener("click", function () {
        $all(".step-btn", bar).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true"); current = k; draw();
      });
      bar.appendChild(b);
    });
    slider.addEventListener("input", draw);
    draw();
    box.insertAdjacentHTML("beforeend",
      '<div class="practice" data-practice style="margin-top:16px" ' +
      'data-ok-msg="Correct. Compare the gain at a soft input with the gain at a loud input on the compression curve: the number shrinks as the input grows. That is the whole point, because it fits a wide range of environmental sounds into the listener\'s smaller usable range." ' +
      'data-no-msg="Not quite. Set the response to Compression, then move the input slider from 30 dB to 90 dB and watch the gain figure in the readout.">' +
      '<p class="p-q">On the compression setting, what happens to the amount of gain as the input gets louder?</p>' +
      '<div class="p-choices" role="group" aria-label="Options">' +
      '<button type="button" class="p-choice" data-ok="0">It stays the same at every input level.</button>' +
      '<button type="button" class="p-choice" data-ok="1">It gets smaller, so soft sounds receive relatively more gain.</button>' +
      '<button type="button" class="p-choice" data-ok="0">It gets larger, so loud sounds receive the most gain.</button>' +
      "</div><div class=\"p-fb\" role=\"status\" aria-live=\"polite\"></div></div>");
    initPracticeBlocks();
  }

  /* =========================================================
     3. Orientation and troubleshooting bench  (Topic 1.7)
     ========================================================= */
  function initBench() {
    var box = $("#trouble-bench"); if (!box) return;
    caseDeck(box, {
      title: "Troubleshooting bench: what is the safe first move?",
      note: "Four common problems. Start with safe, visible checks and the user instructions. Whatever the device is doing, keep another communication route open while the problem is unresolved.",
      cases: [
        { label: "T1 · No sound, no power",
          facts: ["The device gives no sound and shows no power indicator"],
          prompt: "What is the safe first action?",
          opts: [
            { t: "Confirm it is the right device, then check the switch, charge, or battery orientation using the instructions.", ok: true, fb: "Correct. Start with the simplest, most reversible checks. If power is still absent after that, refer to the audiologist rather than investigating further." },
            { t: "Open the case to inspect the internal components.", ok: false, fb: "No. Opening the device is outside the SLP role, can void a warranty, and can cause damage." },
            { t: "Turn the volume to maximum and try again.", ok: false, fb: "No. Nothing suggests a volume problem, and a device with no power indicator will not respond to a volume change." }
          ] },
        { label: "T2 · Powers on, weak output",
          facts: ["The device powers on", "Sound is present but noticeably weak"],
          prompt: "What is the safe first action?",
          opts: [
            { t: "Check the visible opening, dome or earmold, tubing, and approved wax guard, and confirm correct insertion and program.", ok: true, fb: "Correct. Blockage and incorrect insertion are common, visible, and safely checkable. If the blockage cannot be safely addressed or the weak output persists, refer." },
            { t: "Use a pin or paperclip to clear the receiver opening.", ok: false, fb: "No. Never insert an object into the device or the ear. Follow the manufacturer's approved cleaning tools and the setting's protocol." },
            { t: "Assume the hearing loss has worsened and re-plan the session goals.", ok: false, fb: "Not yet. Check access before you conclude anything about the person. That is the whole reason the daily check exists." }
          ] },
        { label: "T3 · Whistling after insertion",
          facts: ["The device whistles after it is placed in the ear"],
          prompt: "What is the safe first action?",
          opts: [
            { t: "Reseat the device and check for an obvious fit or tubing problem.", ok: true, fb: "Correct. Feedback often follows a poor seat. If it persists after reseating, it can signal a fit, blockage, or device problem that needs audiologic review." },
            { t: "Turn the device off and continue the session without it.", ok: false, fb: "Not as a first move. Try reseating first, and if the device must come out, add visual, written, or other access rather than simply proceeding without it." },
            { t: "Tell the person the whistling is normal and can be ignored.", ok: false, fb: "No. Feedback can signal poor fit, blockage, or damage, so it deserves a check rather than reassurance." }
          ] },
        { label: "T4 · Intermittent after moisture",
          facts: ["The device worked this morning", "It was exposed to sweat or rain", "It now cuts in and out"],
          prompt: "What is the safe first action?",
          opts: [
            { t: "Stop unsafe use and follow the approved drying and storage instructions.", ok: true, fb: "Correct. Follow the manufacturer's drying guidance and contact the clinic if the problem does not resolve. Meanwhile, keep communication accessible another way." },
            { t: "Use a hair dryer or place the device on a radiator to dry it quickly.", ok: false, fb: "No. Heat can damage the electronics and the casing. Use only approved drying methods." },
            { t: "Keep using it, since it still works part of the time.", ok: false, fb: "No. Intermittent function gives inconsistent access, which is easy to mistake for a listening or language problem." }
          ] }
      ]
    });
    box.insertAdjacentHTML("beforeend",
      '<div class="callout c-clinical" style="margin-top:16px"><span class="ic" aria-hidden="true">&#9432;</span>' +
      "<h4>The boundary, stated once</h4><p>An SLP may observe function, support consistent use, teach communication strategies, and report patterns. Programming, electroacoustic analysis, diagnosis, and repair belong to appropriately qualified hearing-care professionals. If a device is not working, add visual, signed, written, or captioned access rather than asking for more listening effort.</p></div>");
  }

  /* =========================================================
     4. Remote-microphone SNR explorer  (Topic 1.9)
     ========================================================= */
  var RM_PRESETS = {
    R1: { label: "R1 · Talker near, quiet room", dist: 1, noise: 1, mic: "none", conn: "on", reflect: 1 },
    R2: { label: "R2 · Talker far, noisy, mic near listener", dist: 3, noise: 3, mic: "listener", conn: "on", reflect: 3 },
    R3: { label: "R3 · Talker far, noisy, mic on talker", dist: 3, noise: 3, mic: "talker", conn: "on", reflect: 3 },
    R4: { label: "R4 · Same, but the mic is muted", dist: 3, noise: 3, mic: "talker", conn: "mute", reflect: 3 },
    R5: { label: "R5 · Mic on a table across the room", dist: 3, noise: 3, mic: "table", conn: "on", reflect: 3 }
  };
  function rmModel(p) {
    var target = 70 - (p.dist - 1) * 11 - (p.reflect - 1) * 3;
    var noise = 38 + (p.noise - 1) * 11;
    var via = "direct sound across the room";
    if (p.conn === "mute") { via = "nothing: a muted microphone sends no signal, so the listener is back to direct sound only"; }
    else if (p.mic === "talker") { target = 70 - (p.reflect - 1) * 1; via = "the remote microphone, captured close to the talker before distance and reflections weaken it"; }
    else if (p.mic === "table") { target = 70 - (p.dist - 1) * 7 - (p.reflect - 1) * 3; via = "the remote microphone, but placed far from the talker, so it picks up much of the same weakened signal and room noise"; }
    else if (p.mic === "listener") { via = "the remote microphone placed near the listener, which mostly captures the listener's own local noise"; }
    return { target: Math.round(target), noise: Math.round(noise), snr: Math.round(target - noise), via: via };
  }
  function initRemoteMic() {
    var box = $("#remote-mic"); if (!box) return;
    box.innerHTML =
      "<h4>Where the microphone sits changes everything</h4>" +
      '<p class="step-note">Choose a situation and read the two bars. The signal-to-noise ratio is the target speech level minus the competing noise level. Nothing here plays audio.</p>' +
      '<div class="stepper" role="group" aria-label="Listening situations"></div>' +
      '<div class="rm-stage"></div>' +
      '<div class="rm-read" role="status" aria-live="polite"></div>';
    var bar = $(".stepper", box), stage = $(".rm-stage", box), read = $(".rm-read", box);
    function show(key, btn) {
      $all(".step-btn", bar).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      if (btn) btn.setAttribute("aria-pressed", "true");
      var p = RM_PRESETS[key], m = rmModel(p);
      function bar2(y, label, val, color) {
        var wpx = Math.max(3, val / 80 * 300);
        return '<text x="8" y="' + (y + 15) + '" font-size="11" fill="#cdd9e6">' + label + "</text>" +
          '<rect x="96" y="' + y + '" width="' + wpx.toFixed(1) + '" height="22" rx="4" fill="' + color + '"/>' +
          '<text x="' + (102 + wpx).toFixed(1) + '" y="' + (y + 16) + '" font-size="11" fill="#eaf1f8">' + val + " dB</text>";
      }
      stage.innerHTML = '<svg viewBox="0 0 420 120" role="img" aria-label="Two bars comparing the target speech level with the competing noise level. Target ' +
        m.target + " decibels, noise " + m.noise + " decibels, signal-to-noise ratio " + (m.snr > 0 ? "plus " : "") + m.snr + ' decibels."><g>' +
        bar2(24, "Target", m.target, "#dc9329") + bar2(66, "Noise", m.noise, "#2E6F9E") + "</g></svg>";
      var band = m.snr >= 12 ? "ok" : (m.snr >= 4 ? "mid" : "no");
      read.className = "rm-read " + band;
      read.innerHTML = "<strong>SNR = " + m.target + " &minus; " + m.noise + " = " + (m.snr > 0 ? "+" : "") + m.snr + " dB.</strong> " +
        "The target reaches the listener through " + m.via + ". " +
        (band === "ok" ? "That is a favorable relationship: the talker is well above the competing sound."
          : band === "mid" ? "Usable, but the listener is working. Small changes to placement or distance matter a lot here."
            : "The talker and the noise are close in level, so understanding will take real effort.");
    }
    Object.keys(RM_PRESETS).forEach(function (k, i) {
      var b = el('<button type="button" class="step-btn" aria-pressed="' + (i === 0 ? "true" : "false") + '">' + RM_PRESETS[k].label + "</button>");
      b.addEventListener("click", function () { show(k, b); });
      bar.appendChild(b);
    });
    show("R1", $(".step-btn", bar));
    box.insertAdjacentHTML("beforeend",
      '<div class="practice" data-practice style="margin-top:16px" ' +
      'data-ok-msg="Correct. Compare R3 with R5: the same room, the same noise, the same equipment, and a very different result. A remote microphone helps because it is close to the talker, not because it is switched on. Placement, connection, and mute status all decide whether any benefit reaches the listener." ' +
      'data-no-msg="Not quite. Step through R3, R4, and R5. The equipment is present in all three, but only one of them puts the microphone where it can capture a strong, direct signal from the talker.">' +
      '<p class="p-q">Why does the same remote-microphone system help in R3 but not in R4 or R5?</p>' +
      '<div class="p-choices" role="group" aria-label="Options">' +
      '<button type="button" class="p-choice" data-ok="0">The system removes background noise, and it was switched off in R4 and R5.</button>' +
      '<button type="button" class="p-choice" data-ok="1">Benefit depends on the microphone being close to the talker and actually transmitting.</button>' +
      '<button type="button" class="p-choice" data-ok="0">The room is more reverberant in R4 and R5 than in R3.</button>' +
      "</div><div class=\"p-fb\" role=\"status\" aria-live=\"polite\"></div></div>");
    initPracticeBlocks();
  }

  /* =========================================================
     5. Cochlear-implant configuration builder  (Topic 2.8)
     ========================================================= */
  var CONFIGS = [
    { key: "uni", label: "Unilateral CI", right: "CI", left: "not specified",
      d: "One cochlear implant. Notice what the label does <em>not</em> say: the other ear might have a hearing aid, usable unaided hearing, or little usable hearing. “One CI” describes one ear only." },
    { key: "bilat", label: "Bilateral CIs", right: "CI", left: "CI",
      d: "A cochlear implant in each ear, placed in the same surgery (simultaneous) or in separate surgeries (sequential). That timing distinction describes the surgery, not the expected benefit, and two devices do not guarantee typical binaural hearing." },
    { key: "bimodal", label: "Bimodal", right: "CI", left: "Hearing aid",
      d: "A cochlear implant on one side and a hearing aid on the other, so the brain combines electrical hearing with acoustic amplification across the two ears." },
    { key: "eas", label: "Electric-acoustic (EAS)", right: "CI + amplified low-frequency hearing", left: "any separate status",
      d: "Electrical stimulation <strong>and</strong> amplified residual low-frequency acoustic hearing in the <strong>same implanted ear</strong>. This is the one that is easy to confuse with bimodal: bimodal is across two ears, EAS is within one ear, and EAS requires usable residual hearing plus an appropriate system." },
    { key: "ssd", label: "CI for single-sided deafness", right: "CI in the poorer ear", left: "Typical or near-typical hearing",
      d: "An implant in the poorer ear when the opposite ear hears well. The evaluation considers speech in noise, awareness from the poorer side, localization, tinnitus when relevant, and the person's own goals." }
  ];
  function earSVG(cfg) {
    function box2(x, label, text) {
      return '<rect x="' + x + '" y="34" width="150" height="52" rx="10" fill="#EAF4FB" stroke="#2E6F9E" stroke-width="2"/>' +
        '<text x="' + (x + 75) + '" y="24" font-size="11" font-weight="700" fill="#0B2D4D" text-anchor="middle">' + label + "</text>" +
        text.split("|").map(function (line, i) {
          return '<text x="' + (x + 75) + '" y="' + (56 + i * 14) + '" font-size="10" fill="#1b2a3a" text-anchor="middle">' + line + "</text>";
        }).join("");
    }
    function wrap(s) {
      var words = s.split(" "), lines = [""], max = 22;
      words.forEach(function (wd) {
        if ((lines[lines.length - 1] + " " + wd).trim().length > max) lines.push(wd);
        else lines[lines.length - 1] = (lines[lines.length - 1] + " " + wd).trim();
      });
      return lines.slice(0, 3).join("|");
    }
    return '<svg viewBox="0 0 360 100" role="img" aria-label="' + esc(cfg.label + ": right ear " + cfg.right + ", left ear " + cfg.left) + '">' +
      box2(10, "Right ear", wrap(cfg.right)) + box2(200, "Left ear", wrap(cfg.left)) + "</svg>";
  }
  function initConfigBuilder() {
    var box = $("#ci-config"); if (!box) return;
    box.innerHTML =
      "<h4>Two ears, five arrangements</h4>" +
      '<p class="step-note">Select a configuration to see what sits at each ear. A configuration label describes an arrangement. It does not predict an individual outcome and it does not establish candidacy.</p>' +
      '<div class="stepper" role="group" aria-label="Configurations"></div>' +
      '<div class="cfg-stage" role="status" aria-live="polite"></div>';
    var bar = $(".stepper", box), stage = $(".cfg-stage", box);
    function show(i) {
      $all(".step-btn", bar).forEach(function (b, bi) { b.setAttribute("aria-pressed", String(bi === i)); });
      stage.innerHTML = earSVG(CONFIGS[i]) + '<p class="a-desc"><strong>' + CONFIGS[i].label + ".</strong> " + CONFIGS[i].d + "</p>";
    }
    CONFIGS.forEach(function (c, i) {
      var b = el('<button type="button" class="step-btn" aria-pressed="' + (i === 0 ? "true" : "false") + '">' + esc(c.label) + "</button>");
      b.addEventListener("click", function () { show(i); });
      bar.appendChild(b);
    });
    show(0);
    box.insertAdjacentHTML("beforeend",
      '<div class="practice" data-practice style="margin-top:16px" ' +
      'data-ok-msg="Correct. Bimodal spans two ears: a CI on one side, a hearing aid on the other. EAS happens inside one implanted ear, combining electrical stimulation with amplified residual low-frequency hearing in that same ear. The number of ears involved is the distinguishing feature." ' +
      'data-no-msg="Not quite. Step through the Bimodal and Electric-acoustic diagrams and count the ears each one describes.">' +
      '<p class="p-q">What separates a bimodal arrangement from electric-acoustic stimulation?</p>' +
      '<div class="p-choices" role="group" aria-label="Options">' +
      '<button type="button" class="p-choice" data-ok="0">Bimodal uses two implants; EAS uses one implant.</button>' +
      '<button type="button" class="p-choice" data-ok="1">Bimodal combines devices across two ears; EAS combines both signals within one implanted ear.</button>' +
      '<button type="button" class="p-choice" data-ok="0">Bimodal is placed in one surgery; EAS is placed in two.</button>' +
      "</div><div class=\"p-fb\" role=\"status\" aria-live=\"polite\"></div></div>");
    initPracticeBlocks();
  }

  /* =========================================================
     6. Pediatric auditory-skills ladder  (Topic 3.4)
     ========================================================= */
  function initSkillsLadder() {
    var box = $("#skills-ladder"); if (!box) return;
    var host1 = el('<div class="ladder-order"></div>'), host2 = el('<div class="ladder-sort"></div>');
    box.appendChild(host1); box.appendChild(host2);
    orderer(host1, {
      title: "Order the four auditory-skill labels",
      note: "Arrange them from the least to the most demanding listening task, then press Check.",
      items: [
        "Detection: is a sound present?",
        "Discrimination: are these two sounds the same or different?",
        "Identification: which sound or word was it?",
        "Comprehension: what does the message mean?"
      ],
      okMsg: "Correct: detection, discrimination, identification, comprehension. Now sort the task cards below. Read them by what the child has to <em>do</em>, not by the stimulus used.",
      noMsg: "Not yet. Ask what the child has to do at each level: notice that something happened, compare two things, name or select one thing, or use the meaning of a message."
    });
    multiSorter(host2, {
      title: "Sort the task cards by response demand",
      hint: "Each card describes what the child must do. Match it to the skill that describes that demand. Press <strong>Check</strong> when every card is placed.",
      bins: [
        { key: "det", label: "Detection", meta: "The child indicates that a sound occurred. Nothing is compared, named, or interpreted." },
        { key: "dis", label: "Discrimination", meta: "The child judges same or different. No label is required, so a child can succeed without knowing what either sound was." },
        { key: "id", label: "Identification", meta: "The child selects or names what was heard, usually from a known set." },
        { key: "com", label: "Comprehension", meta: "The child uses the meaning of the message, typically without a visible response set." }
      ],
      cards: [
        { t: "Put a block in a cup whenever a sound occurs.", bin: "det" },
        { t: "Indicate whether two animal sounds are the same or different.", bin: "dis" },
        { t: "Choose whether two syllables match.", bin: "dis" },
        { t: "Point to one of four pictures after hearing its name.", bin: "id" },
        { t: "Follow a novel two-part direction without a visible response set.", bin: "com" },
        { t: "Answer a question about a short spoken message.", bin: "com" }
      ],
      okMsg: "All correct. Notice that the stimulus does not decide the label: two syllables can be a discrimination task or an identification task depending on what the child has to do with them. One caution to carry forward: this is a planning framework, not a rigid staircase. Skills overlap, and a child may comprehend a familiar routine while still confusing two isolated speech sounds.",
      noMsg: "Read each card for the response, not the stimulus. Does the child notice, compare, name, or use meaning? Fix the red cards and check again."
    });
  }

  /* =========================================================
     7. Direct therapy or caregiver coaching?  (Topic 3.5)
     ========================================================= */
  function initServiceMode() {
    var box = $("#service-mode"); if (!box) return;
    box.insertAdjacentHTML("beforeend",
      '<p class="step-note">The same shared-book routine, run two ways. Sort each action by the mode it belongs to. Neither mode is universally better: the choice depends on the child, family, goals, setting, and services.</p>');
    var host = el('<div class="sorter-host"></div>');
    box.appendChild(host);
    multiSorter(host, {
      title: "Which mode does each action belong to?",
      hint: "Select an action, then choose a mode. Press <strong>Check</strong> when every card is placed.",
      bins: [
        { key: "direct", label: "Direct therapy", meta: "The clinician works mainly with the child while the caregiver observes, asks questions, and helps identify what will matter at home. The clinician summarizes and demonstrates a possible carryover." },
        { key: "coach", label: "Caregiver coaching", meta: "The clinician and caregiver choose a goal together, the clinician models or prompts, the caregiver practices, and the two reflect and adapt the strategy together. Coaching is collaborative practice and reflection, not handing over homework." }
      ],
      cards: [
        { t: "Clinician presents the target message to the child during structured book turns.", bin: "direct" },
        { t: "Child responds while the caregiver observes and asks questions.", bin: "direct" },
        { t: "Clinician summarizes the session and demonstrates a possible home routine.", bin: "direct" },
        { t: "Clinician and caregiver choose one meaningful book-sharing goal together.", bin: "coach" },
        { t: "Caregiver practices the strategy with the child during the session.", bin: "coach" },
        { t: "Clinician asks the caregiver what they noticed, and the two adapt the plan.", bin: "coach" }
      ],
      okMsg: "All correct. The clearest signal is who is doing the talking with the child, and who is reflecting afterward. Both modes can be appropriate, and many sessions blend them.",
      noMsg: "Ask who interacts with the child in each action, and who reflects on it afterward. Fix the red cards and check again."
    });
  }

  /* =========================================================
     8. Adult communication-repair dialogue  (Topic 4.4)
     ========================================================= */
  var REPAIRS = [
    { t: "“What?”", resp: "“The appointment moved to two fifteen.”", note: "The partner repeats the identical sentence. This is not wrong, and it sometimes works, but it gives the partner no information about which part was missed. Repeating the same signal often produces the same result.", solved: false },
    { t: "“Did you say two fifteen or three fifteen?”", resp: "“Two fifteen.”", note: "A forced-choice question targets exactly the missing information and makes the partner's job easy. This is often the most efficient repair for a specific detail.", solved: true },
    { t: "“Please say the time another way.”", resp: "“Quarter past two.”", note: "Asking for a rephrase supplies different acoustic and linguistic cues rather than the same ones again. Useful when you are unsure which part you missed.", solved: true },
    { t: "“Please write the new time.”", resp: "Writes: 2:15 p.m.", note: "Writing is well suited to precise information: times, names, numbers, dosages, addresses. It removes the ambiguity instead of working around it.", solved: true },
    { t: "Nod and say “Got it.”", resp: "The conversation moves on.", note: "The breakdown is now invisible. Nobody in the conversation knows the detail was missed, and the appointment time is still unconfirmed. This is the option with the real cost.", solved: false }
  ];
  function initRepair() {
    var box = $("#repair-dialogue"); if (!box) return;
    box.innerHTML =
      "<h4>Repair the breakdown</h4>" +
      '<p class="step-note">A partner says something you did not fully catch. Try each response and read what comes back. Then confirm the message at the end.</p>' +
      '<div class="dlg">' +
      '<p class="dlg-turn partner"><span class="dlg-who">Partner</span>“The appointment moved to two fifteen.”</p>' +
      '<p class="dlg-turn you"><span class="dlg-who">You</span><em>You caught “the appointment moved to,” but not the time.</em></p>' +
      "</div>" +
      '<div class="p-choices" role="group" aria-label="Repair options"></div>' +
      '<div class="p-fb" role="status" aria-live="polite"></div>' +
      '<div class="repair-final" hidden><p class="p-q">Last step: confirm the repaired message.</p>' +
      '<div class="p-choices2" role="group" aria-label="Confirmation options"></div><div class="p-fb2" role="status" aria-live="polite"></div></div>';
    var wrap = $(".p-choices", box), fb = $(".p-fb", box), fin = $(".repair-final", box);
    shuffled(REPAIRS).forEach(function (r) {
      var b = el('<button type="button" class="p-choice">' + esc(r.t) + "</button>");
      b.addEventListener("click", function () {
        $all(".p-choice", wrap).forEach(function (x) { x.classList.remove("correct", "wrong"); });
        b.classList.add(r.solved ? "correct" : "wrong");
        fb.className = "p-fb show " + (r.solved ? "ok" : "no");
        fb.innerHTML = '<span class="dlg-who">Partner</span>' + esc(r.resp) + "<br><br>" + r.note;
        if (r.solved) fin.hidden = false;
      });
      wrap.appendChild(b);
    });
    var CONF = [
      { t: "“So the new appointment is 2:15 p.m., correct?”", ok: true, fb: "Correct. Confirmation closes the loop. You state what you understood, and the partner can correct you if it is wrong. For times, numbers, names, and instructions, that final step is worth the two seconds it costs." },
      { t: "“Thanks, see you then.”", ok: false, fb: "The repair worked, but the loop is still open. Nothing you said would reveal a mistake if you had misheard the correction too." },
      { t: "“I think I got it.”", ok: false, fb: "Not yet. The partner still has no way to check what you understood." }
    ];
    var wrap2 = $(".p-choices2", box), fb2 = $(".p-fb2", box);
    shuffled(CONF).forEach(function (c) {
      var b = el('<button type="button" class="p-choice">' + esc(c.t) + "</button>");
      b.addEventListener("click", function () {
        $all(".p-choice", wrap2).forEach(function (x) { x.classList.remove("correct", "wrong"); });
        b.classList.add(c.ok ? "correct" : "wrong");
        fb2.className = "p-fb2 p-fb show " + (c.ok ? "ok" : "no");
        fb2.innerHTML = c.fb;
      });
      wrap2.appendChild(b);
    });
  }

  /* =========================================================
     9. Speechreading ambiguity lab  (Topic 4.5)
     ========================================================= */
  var LIPS = {
    closed: { d: "M30 46 Q60 44 90 46 Q60 50 30 46 Z", label: "lips pressed together" },
    open: { d: "M30 46 Q60 30 90 46 Q60 64 30 46 Z", label: "mouth open" },
    round: { d: "M45 46 Q60 32 75 46 Q60 60 45 46 Z", label: "lips rounded" }
  };
  function faceSVG(shape) {
    var s = LIPS[shape];
    return '<svg viewBox="0 0 120 96" role="img" aria-label="Simplified mouth showing ' + s.label + '">' +
      '<rect x="0" y="0" width="120" height="96" rx="10" fill="#EAF4FB"/>' +
      '<path d="M24 26 Q36 20 48 26" stroke="#5d6675" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M72 26 Q84 20 96 26" stroke="#5d6675" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="' + s.d + '" fill="#c0573f" stroke="#8f3a26" stroke-width="1.6"/>' +
      "</svg>";
  }
  var SR_STAGES = [
    { key: "V1", label: "V1 · No context",
      face: "closed",
      prompt: "The talker's lips press together and release. Which word was it?",
      opts: [
        { t: "“pea”", ok: null }, { t: "“bee”", ok: null }, { t: "“me”", ok: null }
      ],
      reveal: "Whichever one you chose, you could not have known. The sounds /p/, /b/, and /m/ are made with the same visible lip movement. They differ in voicing and nasality, and neither of those is visible on the face. Speechreading is not a visual copy of speech: many contrasts simply are not there to see." },
    { key: "V2", label: "V2 · Known topic",
      face: "closed",
      prompt: "Same movement, but now you know the topic is a food order. Which word was it?",
      opts: [{ t: "“pea”", ok: null }, { t: "“bee”", ok: null }, { t: "“me”", ok: null }],
      reveal: "Context helped: “pea” is now the most plausible of the three, and you probably chose it. But notice what happened. Context narrowed the possibilities without ever making the movement visible, so a confident guess is now available even though the visual information did not change. That is exactly how a plausible wrong guess gets made." },
    { key: "V3", label: "V3 · With a caption",
      face: "closed",
      prompt: "Same movement, with a written key word on the screen: <strong>“bee”</strong>. Which word was it?",
      opts: [{ t: "“pea”", ok: false }, { t: "“bee”", ok: true }, { t: "“me”", ok: false }],
      reveal: "Now it is settled, and it was not the word context made most plausible. Visual text resolves what visible speech movements cannot. This is why captions, written key words, and spelling are access, not a crutch, and why they matter most for the details that are hardest to guess." },
    { key: "V4", label: "V4 · Confirm it",
      face: "open",
      prompt: "You think the partner said the meeting is at ten. What is the best move for a detail that matters?",
      opts: [
        { t: "Confirm it: “The meeting is at ten, correct?”", ok: true },
        { t: "Assume you are right, since the topic made it likely.", ok: false },
        { t: "Watch more carefully next time.", ok: false }
      ],
      reveal: "Confirmation is the reliable move. Auditory information, facial expression, gesture, captions, and a partner's confirmation each reduce ambiguity in different ways. For high-stakes details, do not rely on a plausible guess." }
  ];
  function initSpeechreading() {
    var box = $("#speechreading-lab"); if (!box) return;
    box.innerHTML =
      "<h4>Speechreading ambiguity lab</h4>" +
      '<p class="step-note">Four silent stages. Nothing here requires hearing, and the drawings are simplified: a real face carries more cues than this. Work through them in order.</p>' +
      '<div class="stepper" role="group" aria-label="Stages"></div>' +
      '<div class="sr-stage"></div>';
    var bar = $(".stepper", box), stage = $(".sr-stage", box);
    function show(i) {
      $all(".step-btn", bar).forEach(function (b, bi) { b.setAttribute("aria-pressed", String(bi === i)); });
      var s = SR_STAGES[i];
      stage.innerHTML = '<div class="sr-face">' + faceSVG(s.face) + "</div>" +
        '<p class="p-q">' + s.prompt + "</p>" +
        '<div class="p-choices" role="group" aria-label="Options"></div>' +
        '<div class="p-fb" role="status" aria-live="polite"></div>';
      var wrap = $(".p-choices", stage), fb = $(".p-fb", stage);
      s.opts.forEach(function (o) {
        var b = el('<button type="button" class="p-choice">' + o.t + "</button>");
        b.addEventListener("click", function () {
          $all(".p-choice", wrap).forEach(function (x) { x.classList.remove("correct", "wrong"); });
          if (o.ok === null) { b.classList.add("wrong"); fb.className = "p-fb show no"; }
          else { b.classList.add(o.ok ? "correct" : "wrong"); fb.className = "p-fb show " + (o.ok ? "ok" : "no"); }
          fb.innerHTML = s.reveal;
        });
        wrap.appendChild(b);
      });
    }
    SR_STAGES.forEach(function (s, i) {
      var b = el('<button type="button" class="step-btn" aria-pressed="' + (i === 0 ? "true" : "false") + '">' + esc(s.label) + "</button>");
      b.addEventListener("click", function () { show(i); });
      bar.appendChild(b);
    });
    show(0);
  }

  /* =========================================================
     Shared L1/L2/L3 patterns: transcripts, flip cards, image fallback
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
    initStyleExplorer(); initCompression(); initBench(); initRemoteMic(); initConfigBuilder();
    initSkillsLadder(); initServiceMode(); initRepair(); initSpeechreading();
    initPracticeBlocks();
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
  w.INTERACTIONS = { init: init };
})(window, document);
