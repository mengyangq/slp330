/* ============================================================
   SLP 330 L2, Audiometry & Audiogram Interpretation
   Original visuals & non-graded interactions. Shared by both builds.
   No autoplay anywhere. Every function guards for missing DOM.
   New for L2: audiogram plotter, symbol key, threshold-search
   simulator, orientation tool, degree/type/config classifier,
   PTA & dB SL calculator, SRT/WRS sorter, SNR slider, masking visual.
   ============================================================ */
(function (w, d) {
  "use strict";
  function $(s, r) { return (r || d).querySelector(s); }
  function $all(s, r) { return [].slice.call((r || d).querySelectorAll(s)); }
  function el(html) { var t = d.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  var reduceMotion = w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SVGNS = "http://www.w3.org/2000/svg";

  /* =========================================================
     Shared teaching data, audiogram cases (from AUDIOGRAM_DATA_CASES.md)
     ========================================================= */
  var CASES = {
    case_normal: {
      title: "Normal hearing example",
      right_ac: { 250: 10, 500: 10, 1000: 5, 2000: 10, 4000: 10, 8000: 15 },
      left_ac: { 250: 10, 500: 5, 1000: 10, 2000: 10, 4000: 15, 8000: 15 },
      desc: "Both ears are within normal limits: every air-conduction threshold sits near the top of the graph (about 5–15 dB HL) across all frequencies."
    },
    case_left_conductive_rising: {
      title: "Left conductive hearing loss rising to normal",
      right_ac: { 250: 10, 500: 10, 1000: 10, 2000: 10, 4000: 10, 8000: 15 },
      left_ac: { 250: 50, 500: 50, 1000: 45, 2000: 45, 4000: 20, 8000: 15 },
      left_bc: { 250: 10, 500: 10, 1000: 10, 2000: 10, 4000: 15 },
      desc: "Right ear within normal limits. Left ear: air conduction is moderate (about 45–50 dB HL) through 2000 Hz with normal bone conduction (an air–bone gap, so a conductive pattern), then rises to normal in the high frequencies."
    },
    case_bilateral_snhl_asymmetric: {
      title: "Bilateral asymmetric sensorineural hearing loss",
      right_ac: { 250: 35, 500: 40, 1000: 65, 2000: 70, 4000: 75, 8000: 80 },
      right_bc: { 250: 30, 500: 35, 1000: 60, 2000: 70, 4000: 75 },
      left_ac: { 250: 15, 500: 15, 1000: 20, 2000: 50, 4000: 50, 8000: 50 },
      left_bc: { 250: 10, 500: 15, 1000: 20, 2000: 45, 4000: 50 },
      desc: "Left ear: normal through 1000 Hz, sloping to a moderate loss in the highs; air and bone track together (sensorineural). Right ear: sloping mild-to-severe loss with air and bone close together (sensorineural)."
    },
    case_mixed: {
      title: "Mixed hearing loss example (right ear)",
      right_ac: { 250: 60, 500: 65, 1000: 65, 2000: 70, 4000: 70, 8000: 75 },
      right_bc: { 250: 35, 500: 40, 1000: 45, 2000: 50, 4000: 65 },
      desc: "Right ear: bone conduction is elevated (a sensorineural component) and air conduction is poorer still, leaving a clear air–bone gap (an added conductive component). Elevated bone + larger air–bone gap = mixed."
    },
    case_noise_notch: {
      title: "Notched configuration",
      right_ac: { 250: 10, 500: 10, 1000: 10, 2000: 15, 4000: 45, 8000: 20 },
      left_ac: { 250: 10, 500: 10, 1000: 10, 2000: 10, 4000: 15, 8000: 15 },
      desc: "Right ear shows a notch centered near 4000 Hz (a sharp dip that partly recovers by 8000 Hz); left ear is within normal limits."
    },
    /* single-ear (right AC) shape examples for the configuration explorer */
    cfg_flat: { title: "Relatively flat configuration",
      right_ac: { 250: 40, 500: 40, 1000: 45, 2000: 40, 4000: 45, 8000: 40 },
      desc: "Thresholds stay within about 20 dB of each other across all frequencies, the line is roughly level." },
    cfg_sloping: { title: "Sloping configuration",
      right_ac: { 250: 15, 500: 20, 1000: 30, 2000: 45, 4000: 60, 8000: 70 },
      desc: "Thresholds get gradually poorer as frequency increases, so the line slopes downward toward the high frequencies." },
    cfg_precipitous: { title: "Precipitous configuration",
      right_ac: { 250: 10, 500: 10, 1000: 15, 2000: 25, 4000: 75, 8000: 85 },
      desc: "Near-normal low frequencies drop very steeply in the high frequencies, a sharp, cliff-like fall rather than a gentle slope." },
    cfg_rising: { title: "Rising configuration",
      right_ac: { 250: 60, 500: 55, 1000: 45, 2000: 30, 4000: 20, 8000: 15 },
      desc: "Thresholds are poorer in the low frequencies and improve toward the highs, so the line rises from left to right." },
    cfg_notched: { title: "Notched configuration",
      right_ac: { 250: 10, 500: 10, 1000: 10, 2000: 15, 4000: 50, 8000: 20 },
      desc: "A sharp dip in a narrow region (here near 4000 Hz) with better thresholds on either side. Often seen with noise exposure." },
    cfg_cookiebite: { title: "Cookie-bite (saucer) configuration",
      right_ac: { 250: 15, 500: 30, 1000: 50, 2000: 50, 4000: 30, 8000: 15 },
      desc: "Poorer in the mid frequencies and better in the lows and highs, so the middle looks 'bitten out' like a saucer." },
    cfg_corner: { title: "Corner configuration",
      right_ac: { 250: 70, 500: 85, 1000: 100, 2000: 105, 4000: 110, 8000: 115 },
      desc: "Only residual low-frequency hearing remains, with little or no measurable response in the higher frequencies; thresholds sit in the bottom-left corner." },
    /* single-ear (right AC + BC) examples for the type explorer */
    type_sensorineural: { title: "Sensorineural pattern",
      right_ac: { 250: 35, 500: 40, 1000: 50, 2000: 60, 4000: 65, 8000: 70 },
      right_bc: { 250: 30, 500: 35, 1000: 45, 2000: 55, 4000: 60 },
      desc: "Air conduction (O) and bone conduction (‹) are both elevated and sit close together, with no meaningful air–bone gap. Sound is affected even when the outer and middle ear are bypassed, so the cochlea or nerve is involved. That pattern is sensorineural." },
    type_conductive: { title: "Conductive pattern",
      right_ac: { 250: 45, 500: 50, 1000: 50, 2000: 45, 4000: 45, 8000: 50 },
      right_bc: { 250: 5, 500: 10, 1000: 10, 2000: 5, 4000: 10 },
      desc: "Bone conduction (‹) is near normal while air conduction (O) is clearly poorer, leaving a wide air–bone gap. The cochlea responds well once the outer and middle ear are bypassed, so the problem is sound delivery. That pattern is conductive." },
    type_mixed: { title: "Mixed pattern",
      right_ac: { 250: 60, 500: 65, 1000: 70, 2000: 70, 4000: 75, 8000: 80 },
      right_bc: { 250: 35, 500: 40, 1000: 45, 2000: 50, 4000: 55 },
      desc: "Bone conduction (‹) is elevated (a sensorineural component) and air conduction (O) is poorer still, leaving an air–bone gap (an added conductive component). Elevated bone plus a gap is mixed." }
  };

  /* Standard axis. Poorer thresholds sit LOWER (larger dB near the bottom). */
  var FREQS = [250, 500, 1000, 2000, 4000, 8000];
  var DB_TOP = -10, DB_BOT = 120;      // vertical range
  var OCT_W = 58;                       // px per octave (horizontal)
  var PX_DB = OCT_W / 20;               // 20 dB == one octave  -> correct aspect ratio
  var PAD_L = 46, PAD_T = 40, PAD_R = 16, PAD_B = 26;
  function octPos(f) { return (Math.log(f) / Math.LN2 - Math.log(250) / Math.LN2); } // octaves above 250
  function fx(f) { return PAD_L + octPos(f) * OCT_W; }
  function fy(db) { return PAD_T + (db - DB_TOP) * PX_DB; }
  var PLOT_W = PAD_L + octPos(8000) * OCT_W + PAD_R;
  var PLOT_H = PAD_T + (DB_BOT - DB_TOP) * PX_DB + PAD_B;

  var EAR_COLOR = { right: "#c0392b", left: "#16639f" };

  function svgEl(name, attrs) {
    var n = d.createElementNS(SVGNS, name);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]);
    return n;
  }
  function svgText(x, y, s, attrs) {
    var t = svgEl("text", Object.assign({ x: x, y: y }, attrs || {}));
    t.textContent = s; return t;
  }
  if (!Object.assign) { Object.assign = function (t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; for (var k in s) if (s.hasOwnProperty(k)) t[k] = s[k]; } return t; }; }

  /* draw one ear series with the right symbol; returns nothing, appends to <g> */
  function drawSeries(g, data, ear, kind) {
    if (!data) return;
    var color = EAR_COLOR[ear];
    var pts = FREQS.filter(function (f) { return data[f] != null; })
      .map(function (f) { return { x: fx(f), y: fy(data[f]), f: f, db: data[f] }; });
    // connecting line (AC solid, BC dashed)
    if (pts.length > 1) {
      var dpath = pts.map(function (p, i) { return (i ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1); }).join(" ");
      var line = svgEl("path", { d: dpath, fill: "none", stroke: color, "stroke-width": "2", "stroke-linejoin": "round" });
      if (kind === "bc") line.setAttribute("stroke-dasharray", "5 4");
      g.appendChild(line);
    }
    pts.forEach(function (p) {
      var sym;
      if (kind === "ac" && ear === "right") { // O
        sym = svgEl("circle", { cx: p.x, cy: p.y, r: 6.5, fill: "none", stroke: color, "stroke-width": "2.4" });
      } else if (kind === "ac" && ear === "left") { // X
        sym = svgEl("g", {});
        sym.appendChild(svgEl("line", { x1: p.x - 6, y1: p.y - 6, x2: p.x + 6, y2: p.y + 6, stroke: color, "stroke-width": "2.4" }));
        sym.appendChild(svgEl("line", { x1: p.x - 6, y1: p.y + 6, x2: p.x + 6, y2: p.y - 6, stroke: color, "stroke-width": "2.4" }));
      } else { // bone conduction  <  or  >
        sym = svgText(p.x + (ear === "right" ? -2 : 2), p.y + 5, ear === "right" ? "‹" : "›",
          { "font-size": "18", "font-weight": "700", fill: color, "text-anchor": "middle" });
      }
      g.appendChild(sym);
    });
  }

  function renderAudiogram(container, caseId, opts) {
    var c = CASES[caseId]; if (!c) return;
    opts = opts || {};
    var svg = svgEl("svg", {
      viewBox: "0 0 " + Math.round(PLOT_W) + " " + Math.round(PLOT_H),
      role: "img", "aria-label": (c.title + ". " + (c.desc || "")).replace(/\s+/g, " ")
    });
    var g = svgEl("g", {});
    // grid: horizontal dB lines every 10, label every 20
    for (var db = DB_TOP; db <= DB_BOT; db += 10) {
      var y = fy(db);
      g.appendChild(svgEl("line", { x1: PAD_L, y1: y, x2: PLOT_W - PAD_R, y2: y, stroke: "#e2e8f0", "stroke-width": (db % 20 === 0 ? 1 : 0.6) }));
      if (db % 20 === 0) g.appendChild(svgText(PAD_L - 8, y + 4, String(db), { "font-size": "10", fill: "#5d6675", "text-anchor": "end" }));
    }
    // vertical frequency lines + labels along the top
    FREQS.forEach(function (f) {
      var x = fx(f);
      g.appendChild(svgEl("line", { x1: x, y1: PAD_T, x2: x, y2: PLOT_H - PAD_B, stroke: "#e2e8f0", "stroke-width": "0.8" }));
      g.appendChild(svgText(x, PAD_T - 10, f >= 1000 ? (f / 1000) + "k" : String(f), { "font-size": "10", fill: "#5d6675", "text-anchor": "middle" }));
    });
    // axis titles
    g.appendChild(svgText((PAD_L + PLOT_W - PAD_R) / 2, 14, "Frequency (Hz)", { "font-size": "10", "font-weight": "700", fill: "#0B2D4D", "text-anchor": "middle" }));
    var yt = svgText(12, PLOT_H / 2, "Hearing level (dB HL)", { "font-size": "10", "font-weight": "700", fill: "#0B2D4D", "text-anchor": "middle" });
    yt.setAttribute("transform", "rotate(-90 12 " + (PLOT_H / 2) + ")"); g.appendChild(yt);
    // data
    drawSeries(g, c.right_ac, "right", "ac");
    drawSeries(g, c.left_ac, "left", "ac");
    drawSeries(g, c.right_bc, "right", "bc");
    drawSeries(g, c.left_bc, "left", "bc");
    svg.appendChild(g);
    container.appendChild(svg);
    // which symbols are present, for the key
    var present = { rac: !!c.right_ac, lac: !!c.left_ac, rbc: !!c.right_bc, lbc: !!c.left_bc };
    if (opts.key !== false) container.appendChild(symbolKey(present));
    if (opts.desc !== false && c.desc) {
      container.appendChild(el('<p class="a-desc"><strong>What this shows:</strong> ' + c.desc + '</p>'));
    }
  }

  function symbolKey(present) {
    present = present || { rac: 1, lac: 1, rbc: 1, lbc: 1 };
    var items = [];
    function glyph(kind, ear) {
      var col = EAR_COLOR[ear];
      if (kind === "ac" && ear === "right") return '<svg class="sym-g" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="6.5" fill="none" stroke="' + col + '" stroke-width="2.4"/></svg>';
      if (kind === "ac" && ear === "left") return '<svg class="sym-g" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20"><line x1="4" y1="4" x2="16" y2="16" stroke="' + col + '" stroke-width="2.4"/><line x1="4" y1="16" x2="16" y2="4" stroke="' + col + '" stroke-width="2.4"/></svg>';
      return '<svg class="sym-g" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20"><text x="10" y="15" font-size="17" font-weight="700" fill="' + col + '" text-anchor="middle">' + (ear === "right" ? "‹" : "›") + '</text></svg>';
    }
    if (present.rac) items.push('<li>' + glyph("ac", "right") + '<span class="sym-lab">Right ear, air conduction</span></li>');
    if (present.lac) items.push('<li>' + glyph("ac", "left") + '<span class="sym-lab">Left ear, air conduction</span></li>');
    if (present.rbc) items.push('<li>' + glyph("bc", "right") + '<span class="sym-lab">Right ear, bone conduction</span></li>');
    if (present.lbc) items.push('<li>' + glyph("bc", "left") + '<span class="sym-lab">Left ear, bone conduction</span></li>');
    return el('<ul class="sym-key" aria-label="Audiogram symbol key">' + items.join("") + '</ul>');
  }

  function initAudiograms() {
    $all(".audiogram").forEach(function (box) {
      if (box.dataset.rendered) return;
      var id = box.dataset.case; if (!id) return;
      renderAudiogram(box, id, { key: box.dataset.key !== "false", desc: box.dataset.desc !== "false" });
      box.dataset.rendered = "1";
    });
    // standalone symbol keys
    $all(".symkey-standalone").forEach(function (box) {
      if (box.dataset.rendered) return;
      box.appendChild(symbolKey()); box.dataset.rendered = "1";
    });
  }

  /* =========================================================
     Threshold-search simulator (up-5 / down-10)
     ========================================================= */
  var THRESH_SEQ = [
    { trial: 1, level: 30, r: "-" }, { trial: 2, level: 50, r: "+" }, { trial: 3, level: 40, r: "-" },
    { trial: 4, level: 45, r: "+" }, { trial: 5, level: 35, r: "-" }, { trial: 6, level: 40, r: "+" },
    { trial: 7, level: 30, r: "-" }, { trial: 8, level: 35, r: "-" }, { trial: 9, level: 40, r: "+" },
    { trial: 10, level: 30, r: "-" }, { trial: 11, level: 35, r: "-" }, { trial: 12, level: 40, r: "+" }
  ];
  function initThresholdSim() {
    var box = $("#thresh-sim"); if (!box) return;
    var levels = THRESH_SEQ.map(function (t) { return t.level; });
    var minL = Math.min.apply(null, levels) - 5, maxL = Math.max.apply(null, levels) + 5;
    var W = 460, H = 210, ml = 40, mt = 14, mb = 26, mr = 14;
    var n = THRESH_SEQ.length;
    function xt(i) { return ml + (i) * (W - ml - mr) / (n - 1); }
    function yt(lv) { return mt + (lv - minL) / (maxL - minL) * (H - mt - mb); } // higher dB lower on plot
    var svg = ['<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Step plot of a threshold search. Presentation level in dB HL is on the vertical axis (softer near the top). The tone is not heard at 30 and 35 dB HL and is heard at 40 dB HL on repeated ascending trials, so threshold is 40 dB HL.">'];
    // dB gridlines
    for (var lv = minL; lv <= maxL; lv += 5) {
      var y = yt(lv).toFixed(1);
      svg.push('<line x1="' + ml + '" y1="' + y + '" x2="' + (W - mr) + '" y2="' + y + '" stroke="rgba(234,244,251,.18)" stroke-width="1"/>');
      svg.push('<text x="' + (ml - 6) + '" y="' + (yt(lv) + 3).toFixed(1) + '" font-size="9" fill="#9fb2c6" text-anchor="end">' + lv + '</text>');
    }
    // path
    var dpath = THRESH_SEQ.map(function (t, i) { return (i ? "L" : "M") + xt(i).toFixed(1) + " " + yt(t.level).toFixed(1); }).join(" ");
    svg.push('<path d="' + dpath + '" fill="none" stroke="#dc9329" stroke-width="2"/>');
    // markers
    THRESH_SEQ.forEach(function (t, i) {
      var x = xt(i).toFixed(1), y = yt(t.level).toFixed(1);
      if (t.r === "+") svg.push('<circle cx="' + x + '" cy="' + y + '" r="5" fill="#7fd1a3"/>');
      else svg.push('<g><line x1="' + (xt(i) - 4).toFixed(1) + '" y1="' + (yt(t.level) - 4).toFixed(1) + '" x2="' + (xt(i) + 4).toFixed(1) + '" y2="' + (yt(t.level) + 4).toFixed(1) + '" stroke="#f2a08c" stroke-width="2"/><line x1="' + (xt(i) - 4).toFixed(1) + '" y1="' + (yt(t.level) + 4).toFixed(1) + '" x2="' + (xt(i) + 4).toFixed(1) + '" y2="' + (yt(t.level) - 4).toFixed(1) + '" stroke="#f2a08c" stroke-width="2"/></g>');
      svg.push('<text x="' + x + '" y="' + (H - 8) + '" font-size="9" fill="#9fb2c6" text-anchor="middle">' + t.trial + '</text>');
    });
    svg.push('<text x="' + ((W) / 2) + '" y="' + (H - 0) + '" font-size="9" fill="#9fb2c6" text-anchor="middle"></text>');
    svg.push('</svg>');

    var rows = THRESH_SEQ.map(function (t) {
      return '<tr><td>' + t.trial + '</td><td>' + t.level + '</td><td class="' + (t.r === "+" ? "hit" : "miss") + '">' + (t.r === "+" ? "✓ heard" : "– no response") + '</td></tr>';
    }).join("");

    box.innerHTML =
      '<h4>Threshold search simulator</h4>' +
      '<p class="step-note">Green dots are responses; red × marks are no-response. Read the plot and table, then pick the threshold.</p>' +
      svg.join("") +
      '<table class="thresh-table"><caption>Trial-by-trial record (1000 Hz)</caption>' +
      '<thead><tr><th>Trial</th><th>Level (dB HL)</th><th>Response</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="practice" style="margin-top:14px"><p class="p-q">What threshold should be recorded?</p>' +
      '<div class="p-choices" role="group" aria-label="Threshold choices">' +
      ['35 dB HL', '40 dB HL', '45 dB HL', '50 dB HL'].map(function (t, i) {
        return '<button type="button" class="p-choice" data-ok="' + (i === 1 ? "1" : "0") + '">' + t + '</button>';
      }).join("") +
      '</div><div class="p-fb" role="status" aria-live="polite"></div></div>';
    wirePractice(box, {
      ok: "Correct, 40 dB HL. It is the lowest level meeting the 50% ascending criterion: the patient responds at 40 dB HL on repeated ascending trials, while 35 dB HL never gets a response. Going lower (35) fails the criterion.",
      no: "Not yet. Track the up-5/down-10 path: after each response the tester drops 10 dB; after each no-response they add 5 dB. The lowest level with responses on at least half of the ascending trials (and at least 2 of 3) is the threshold. Look for the lowest level that is repeatedly heard."
    });
  }

  /* generic immediate-feedback single-choice practice */
  function wirePractice(scope, msg) {
    var choices = $all(".p-choice", scope), fb = $(".p-fb", scope);
    choices.forEach(function (b) {
      b.addEventListener("click", function () {
        choices.forEach(function (x) { x.classList.remove("correct", "wrong"); });
        var ok = b.dataset.ok === "1";
        b.classList.add(ok ? "correct" : "wrong");
        if (ok) $all(".p-choice", scope).forEach(function (x) { if (x.dataset.ok === "1") x.classList.add("correct"); });
        fb.className = "p-fb show " + (ok ? "ok" : "no");
        fb.textContent = ok ? (msg.ok) : (msg.no);
      });
    });
  }
  /* declarative practice blocks: <div class="practice" data-practice> with .p-choice[data-ok] and data-ok-msg/data-no-msg */
  function initPracticeBlocks() {
    $all("[data-practice]").forEach(function (box) {
      if (box.dataset.wired) return; box.dataset.wired = "1";
      wirePractice(box, { ok: box.dataset.okMsg || "Correct.", no: box.dataset.noMsg || "Not quite, try again." });
    });
  }

  /* =========================================================
     Audiogram orientation tool
     ========================================================= */
  var ORIENT = {
    freq: { t: "Frequency axis (horizontal)", d: "Frequency runs left → right, from low pitches (250 Hz) to high pitches (8000 Hz). Each step to the right is one octave (a doubling of frequency)." },
    db: { t: "Hearing-level axis (vertical)", d: "dB HL runs top → bottom. Softer sounds (better hearing) are near the TOP; louder levels (poorer thresholds) are near the BOTTOM. That is why an audiogram looks “upside-down” compared with most graphs." },
    o: { t: "Symbol: O", d: "An O marks a RIGHT-ear air-conduction threshold. Air conduction tests the whole pathway (outer + middle + inner ear)." },
    x: { t: "Symbol: X", d: "An X marks a LEFT-ear air-conduction threshold. Always confirm symbols against the key; bone-conduction marks (‹ ›) are different and conventions vary." },
    aspect: { t: "Aspect ratio", d: "About 20 dB vertically equals one octave horizontally. Keeping that ratio stops a loss from looking artificially steeper or flatter than it is." }
  };
  function initOrientation() {
    var box = $("#audiogram-orient"); if (!box) return;
    var demo = el('<div class="audiogram" data-case="case_normal" data-desc="false"></div>');
    box.appendChild(demo);
    renderAudiogram(demo, "case_normal", { key: true, desc: false }); demo.dataset.rendered = "1";
    var btns = el('<div class="stepper" role="group" aria-label="Audiogram orientation topics"></div>');
    var info = el('<div class="step-detail" role="status" aria-live="polite"></div>');
    Object.keys(ORIENT).forEach(function (k, i) {
      var b = el('<button type="button" class="step-btn" aria-pressed="' + (i === 0 ? "true" : "false") + '">' + ORIENT[k].t + '</button>');
      b.addEventListener("click", function () {
        $all(".step-btn", btns).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        info.innerHTML = "<strong>" + ORIENT[k].t + "</strong><br>" + ORIENT[k].d;
      });
      btns.appendChild(b);
    });
    box.appendChild(btns); box.appendChild(info);
    info.innerHTML = "<strong>" + ORIENT.freq.t + "</strong><br>" + ORIENT.freq.d;
  }

  /* =========================================================
     Degree / type / configuration classifier (reveal step by step)
     Case B: left conductive rising to normal
     ========================================================= */
  /* =========================================================
     Full audiogram symbol key (unmasked + masked), masking section
     ========================================================= */
  function initFullSymbolKey() {
    var box = $("#full-symbol-key"); if (!box) return;
    var R = "#c0392b", B = "#16639f", K = "#1b2a3a";
    function g(inner, label) { return '<svg class="kg" role="img" aria-label="' + label + '" width="24" height="24" viewBox="0 0 24 24">' + inner + '</svg>'; }
    var O = g('<circle cx="12" cy="12" r="7" fill="none" stroke="' + R + '" stroke-width="2.4"/>', "circle"),
      X = g('<line x1="6" y1="6" x2="18" y2="18" stroke="' + B + '" stroke-width="2.4"/><line x1="6" y1="18" x2="18" y2="6" stroke="' + B + '" stroke-width="2.4"/>', "X mark"),
      TRI = g('<polygon points="12,5 19,18 5,18" fill="none" stroke="' + R + '" stroke-width="2.2" stroke-linejoin="round"/>', "triangle"),
      SQ = g('<rect x="6" y="6" width="12" height="12" fill="none" stroke="' + B + '" stroke-width="2.2"/>', "square"),
      LT = g('<polyline points="16,5 8,12 16,19" fill="none" stroke="' + R + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>', "less-than sign"),
      GT = g('<polyline points="8,5 16,12 8,19" fill="none" stroke="' + B + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>', "greater-than sign"),
      LB = g('<path d="M16 5 H8 V19 H16" fill="none" stroke="' + R + '" stroke-width="2.2" stroke-linejoin="round"/>', "left square bracket"),
      RB = g('<path d="M8 5 H16 V19 H8" fill="none" stroke="' + B + '" stroke-width="2.2" stroke-linejoin="round"/>', "right square bracket"),
      ADL = g('<line x1="17" y1="7" x2="8" y2="16" stroke="' + R + '" stroke-width="2.2"/><polyline points="8,10 8,16 14,16" fill="none" stroke="' + R + '" stroke-width="2.2" stroke-linejoin="round"/>', "arrow pointing down-left"),
      ADR = g('<line x1="7" y1="7" x2="16" y2="16" stroke="' + B + '" stroke-width="2.2"/><polyline points="16,10 16,16 10,16" fill="none" stroke="' + B + '" stroke-width="2.2" stroke-linejoin="round"/>', "arrow pointing down-right"),
      S = g('<text x="12" y="16.5" font-size="14" font-weight="700" fill="' + K + '" text-anchor="middle">S</text>', "letter S");
    box.innerHTML =
      '<table class="audiogram-key-table">' +
      '<thead><tr><th scope="col">Audiogram key</th><th scope="col">Right ear</th><th scope="col">Left ear</th></tr></thead>' +
      '<tbody>' +
      '<tr><td class="rowlab">AC unmasked</td><td>' + O + '</td><td>' + X + '</td></tr>' +
      '<tr><td class="rowlab">AC masked</td><td>' + TRI + '</td><td>' + SQ + '</td></tr>' +
      '<tr><td class="rowlab">BC unmasked</td><td>' + LT + '</td><td>' + GT + '</td></tr>' +
      '<tr><td class="rowlab">BC masked</td><td>' + LB + '</td><td>' + RB + '</td></tr>' +
      '<tr><td class="rowlab">No response</td><td>' + ADL + '</td><td>' + ADR + '</td></tr>' +
      '<tr><td class="rowlab">Sound-field</td><td colspan="2">' + S + '</td></tr>' +
      '</tbody></table>';
  }

  /* =========================================================
     Configuration explorer, click a shape, see an example
     ========================================================= */
  var CONFIG_ORDER = [
    ["cfg_flat", "Relatively flat"], ["cfg_sloping", "Sloping"], ["cfg_precipitous", "Precipitous"],
    ["cfg_rising", "Rising"], ["cfg_notched", "Notched"], ["cfg_cookiebite", "Cookie-bite"], ["cfg_corner", "Corner"]
  ];
  var TYPE_ORDER = [
    ["type_sensorineural", "Sensorineural"], ["type_conductive", "Conductive"], ["type_mixed", "Mixed"]
  ];
  /* shared "click a button, see an example audiogram + explanation" explorer */
  function buildExplorer(box, order, keyOn, ariaLabel) {
    if (!box) return;
    var btns = el('<div class="stepper" role="group" aria-label="' + ariaLabel + '"></div>');
    var plot = el('<div class="audiogram" data-desc="false"></div>');
    var info = el('<p class="a-desc" role="status" aria-live="polite"></p>');
    function show(id, b) {
      $all(".step-btn", btns).forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      if (b) b.setAttribute("aria-pressed", "true");
      plot.innerHTML = ""; delete plot.dataset.rendered;
      renderAudiogram(plot, id, { key: keyOn, desc: false });
      info.innerHTML = "<strong>What this shows:</strong> " + CASES[id].desc;
    }
    order.forEach(function (c, i) {
      var b = el('<button type="button" class="step-btn" aria-pressed="' + (i === 0 ? "true" : "false") + '">' + c[1] + '</button>');
      b.addEventListener("click", function () { show(c[0], b); });
      btns.appendChild(b);
    });
    box.appendChild(btns); box.appendChild(plot); box.appendChild(info);
    renderAudiogram(plot, order[0][0], { key: keyOn, desc: false });
    info.innerHTML = "<strong>What this shows:</strong> " + CASES[order[0][0]].desc;
  }
  function initConfigExplorer() { buildExplorer($("#config-explorer"), CONFIG_ORDER, false, "Audiogram configuration examples"); }
  function initTypeExplorer() { buildExplorer($("#type-explorer"), TYPE_ORDER, true, "Type of hearing loss examples"); }

  function initClassifier() {
    var box = $("#audiogram-classify"); if (!box) return;
    var steps = [
      {
        q: "Step 1 · Degree, In the left ear from 500–2000 Hz, air-conduction thresholds are about 45–50 dB HL. What degree best summarizes that region?",
        opts: [["Mild", 0], ["Moderate", 1], ["Severe", 0]],
        fb: "Moderate. Thresholds of roughly 41–55 dB HL fall in the moderate range."
      },
      {
        q: "Step 2 · Type, In that same region the left bone-conduction thresholds are near normal (about 10 dB HL) while air conduction is ~45–50 dB HL. What type does that air–bone gap indicate?",
        opts: [["Sensorineural", 0], ["Conductive", 1], ["Mixed", 0]],
        fb: "Conductive. Normal bone conduction with poorer air conduction (a gap > 10 dB) points to a conductive pattern."
      },
      {
        q: "Step 3 · Configuration: The left thresholds are poorer in the low/mid frequencies and improve to normal by 4000–8000 Hz. Which shape is that?",
        opts: [["Sloping", 0], ["Rising", 1], ["Notched", 0]],
        fb: "Rising, thresholds are poorer in the lows and get better in the highs."
      }
    ];
    box.appendChild(el('<div class="audiogram" data-case="case_left_conductive_rising" data-desc="false"></div>'));
    var demo = $(".audiogram", box); renderAudiogram(demo, "case_left_conductive_rising", { key: true, desc: false }); demo.dataset.rendered = "1";
    var done = 0;
    steps.forEach(function (s, i) {
      var wrap = el('<div class="cl-step"' + (i > 0 ? " hidden" : "") + '></div>');
      wrap.appendChild(el('<p class="cl-q">' + s.q + '</p>'));
      var opts = el('<div class="cl-opts"></div>');
      var fb = el('<p class="cl-fb"></p>');
      s.opts.forEach(function (o) {
        var b = el('<button type="button" class="cl-opt">' + o[0] + '</button>');
        b.addEventListener("click", function () {
          if (b.classList.contains("correct")) return;
          if (o[1] === 1) {
            $all(".cl-opt", opts).forEach(function (x) { x.classList.remove("wrong"); });
            b.classList.add("correct"); fb.textContent = s.fb;
            var next = wrap.nextElementSibling;
            if (next && next.classList.contains("cl-step")) next.hidden = false;
            else revealSummary();
          } else { b.classList.add("wrong"); fb.textContent = "Not quite. Look again at the plotted thresholds and the key, then try another option."; }
        });
        opts.appendChild(b);
      });
      wrap.appendChild(opts); wrap.appendChild(fb); box.appendChild(wrap);
    });
    function revealSummary() {
      if (done) return; done = 1;
      box.appendChild(el('<div class="cl-done"><strong>Putting it together:</strong> “The left ear shows a <strong>moderate conductive</strong> hearing loss through 2000 Hz, <strong>rising</strong> to normal in the higher frequencies; the right ear is within normal limits.” That single sentence (ear, degree, type, shape) is the goal of the three-pass routine.</div>'));
    }
  }

  /* =========================================================
     PTA / dB SL calculator
     ========================================================= */
  function initPTA() {
    var box = $("#pta-calc"); if (!box) return;
    box.innerHTML =
      '<h4>Pure-tone average (PTA) calculator</h4>' +
      '<p class="step-note">Traditional three-frequency PTA = average of the 500, 1000, and 2000 Hz air-conduction thresholds. Edit the values to explore.</p>' +
      '<div class="calc-grid">' +
      '<div class="ctrl"><label for="pta-500">500 Hz (dB HL)</label><input type="number" id="pta-500" value="40" min="-10" max="120" step="5"></div>' +
      '<div class="ctrl"><label for="pta-1000">1000 Hz (dB HL)</label><input type="number" id="pta-1000" value="45" min="-10" max="120" step="5"></div>' +
      '<div class="ctrl"><label for="pta-2000">2000 Hz (dB HL)</label><input type="number" id="pta-2000" value="60" min="-10" max="120" step="5"></div>' +
      '</div><div class="calc-out" role="status" aria-live="polite" id="pta-out"></div>';
    function calc() {
      var a = +$("#pta-500").value, b = +$("#pta-1000").value, c = +$("#pta-2000").value;
      var avg = (a + b + c) / 3;
      $("#pta-out").innerHTML = 'PTA = (' + a + ' + ' + b + ' + ' + c + ') / 3 = <strong>' + avg.toFixed(1) + ' dB HL</strong> (usually reported as about ' + Math.round(avg) + ' dB HL).';
    }
    $all("input", box).forEach(function (i) { i.addEventListener("input", calc); });
    calc();
  }

  /* =========================================================
     SRT vs WRS card sorter (click-to-assign; keyboard operable)
     ========================================================= */
  function initSorter() {
    var box = $("#srt-wrs-sorter"); if (!box) return;
    var CARDS = [
      { t: "Spondees (e.g., baseball)", bin: "SRT" },
      { t: "Quietest level for familiar speech", bin: "SRT" },
      { t: "~50% correct criterion", bin: "SRT" },
      { t: "Monosyllabic words", bin: "WRS" },
      { t: "Comfortable / suprathreshold level", bin: "WRS" },
      { t: "Percent of words repeated correctly", bin: "WRS" }
    ];
    box.innerHTML =
      '<h4>Sort each card: SRT or WRS?</h4>' +
      '<p class="sort-hint">Select a card, then choose a bin. You can move a card back with ×. Press <strong>Check</strong> when every card is placed.</p>' +
      '<div class="sort-cards" role="group" aria-label="Cards to sort"></div>' +
      '<div class="sort-bins">' +
      '<div class="sort-bin"><h5>SRT</h5><ul class="binlist" data-bin="SRT" aria-label="SRT bin"></ul><button type="button" class="btn sm sec" data-assign="SRT">Put selected card here</button></div>' +
      '<div class="sort-bin"><h5>WRS</h5><ul class="binlist" data-bin="WRS" aria-label="WRS bin"></ul><button type="button" class="btn sm sec" data-assign="WRS">Put selected card here</button></div>' +
      '</div>' +
      '<div class="qactions" style="margin-top:12px"><button type="button" class="btn sm" data-check>Check</button></div>' +
      '<div class="p-fb" role="status" aria-live="polite"></div>';
    var pool = $(".sort-cards", box), fb = $(".p-fb", box), selected = null;
    function mkCard(c) {
      var b = el('<button type="button" class="sort-card" aria-pressed="false">' + c.t + '</button>');
      b._data = c;
      b.addEventListener("click", function () {
        if (selected === b) { b.setAttribute("aria-pressed", "false"); selected = null; return; }
        if (selected) selected.setAttribute("aria-pressed", "false");
        selected = b; b.setAttribute("aria-pressed", "true");
      });
      return b;
    }
    CARDS.forEach(function (c) { pool.appendChild(mkCard(c)); });
    $all("[data-assign]", box).forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!selected) { fb.className = "p-fb show no"; fb.textContent = "Select a card first, then choose a bin."; return; }
        var bin = $('.binlist[data-bin="' + btn.dataset.assign + '"]', box);
        var li = el('<li>' + selected._data.t + ' <button type="button" aria-label="Remove">×</button></li>');
        li._data = selected._data;
        li.querySelector("button").addEventListener("click", function () { pool.appendChild(mkCard(li._data)); li.remove(); fb.classList.remove("show"); });
        bin.appendChild(li); selected.remove(); selected = null; fb.classList.remove("show");
      });
    });
    $("[data-check]", box).addEventListener("click", function () {
      if ($all(".sort-card", pool).length) { fb.className = "p-fb show no"; fb.textContent = "Place every card in a bin before checking."; return; }
      var right = 0, total = 0;
      $all(".binlist", box).forEach(function (ul) {
        var bin = ul.dataset.bin;
        $all("li", ul).forEach(function (li) {
          total++; var ok = li._data.bin === bin;
          li.classList.toggle("correct", ok); li.classList.toggle("wrong", !ok); if (ok) right++;
        });
      });
      var ok = right === total;
      fb.className = "p-fb show " + (ok ? "ok" : "no");
      fb.textContent = ok
        ? "All correct. SRT = spondees, the quietest level for familiar speech, judged at the ~50% criterion. WRS = monosyllabic words scored as percent correct at a comfortable level."
        : (right + " of " + total + " correct. Remember: SRT is a threshold for familiar spondees (~50%); WRS is percent of monosyllables correct when speech is comfortably loud. Fix the red cards and check again.");
    });
  }

  /* =========================================================
     SNR slider
     ========================================================= */
  function initSNR() {
    var box = $("#snr-tool"); if (!box) return;
    var speech = 50;
    box.innerHTML =
      '<h4>Signal-to-noise ratio (SNR)</h4>' +
      '<p class="step-note">Speech is fixed at ' + speech + ' dB HL. Move the noise level and watch the SNR. SNR = speech level − noise level.</p>' +
      '<svg class="snr-bars" viewBox="0 0 400 130" role="img" aria-label="Two bars comparing a fixed speech level with an adjustable noise level."><g id="snr-g"></g></svg>' +
      '<div class="ctrl" style="margin-top:12px"><label for="snr-noise">Noise level <output id="snr-noise-out">40 dB HL</output></label>' +
      '<input type="range" id="snr-noise" min="20" max="80" step="5" value="40"></div>' +
      '<p class="snr-read">SNR = <span class="snr-val" id="snr-val">+10 dB</span></p>' +
      '<p class="snr-verdict" id="snr-verdict"></p>';
    var g = $("#snr-g", box), noise = $("#snr-noise", box);
    function draw() {
      var nv = +noise.value, snr = speech - nv;
      $("#snr-noise-out", box).textContent = nv + " dB HL";
      $("#snr-val", box).textContent = (snr > 0 ? "+" : "") + snr + " dB";
      function bar(y, label, val, color) {
        var wpx = Math.max(2, val / 90 * 300);
        return '<text x="8" y="' + (y + 15) + '" font-size="11" fill="#cdd9e6">' + label + '</text>' +
          '<rect x="90" y="' + y + '" width="' + wpx + '" height="22" rx="4" fill="' + color + '"/>' +
          '<text x="' + (96 + wpx) + '" y="' + (y + 16) + '" font-size="11" fill="#eaf1f8">' + val + ' dB</text>';
      }
      g.innerHTML = bar(30, "Speech", speech, "#dc9329") + bar(74, "Noise", nv, "#2E6F9E");
      var v = $("#snr-verdict", box);
      if (snr > 0) v.textContent = "Positive SNR: speech is louder than the noise, the easier end of the range.";
      else if (snr === 0) v.textContent = "0 dB SNR: speech and noise are equal, harder.";
      else v.textContent = "Negative SNR: the noise is louder than the speech. This is the hardest case, where many people with hearing loss struggle most.";
    }
    noise.addEventListener("input", draw); draw();
  }

  /* =========================================================
     Masking cross-hearing concept visual
     ========================================================= */
  function initMasking() {
    var box = $("#masking-vis"); if (!box) return;
    var IA = { insert: 55, supra: 40, bone: 0 };
    box.innerHTML =
      '<h4>Could the non-test ear be responding?</h4>' +
      '<p class="step-note">A tone in the test ear can cross the skull to the other cochlea. Cross-over risk depends on the transducer’s interaural attenuation (IA) and how strong the tone is versus the non-test ear’s bone-conduction threshold.</p>' +
      '<svg viewBox="0 0 420 150" role="img" aria-label="Schematic of a head. A tone presented to the test ear can travel across the skull toward the non-test cochlea when the level minus the non-test bone threshold exceeds interaural attenuation.">' +
      '<ellipse cx="210" cy="80" rx="86" ry="60" fill="#fff" stroke="#2E6F9E" stroke-width="2"/>' +
      '<text x="210" y="26" font-size="10" fill="#5d6675" text-anchor="middle">skull (top view)</text>' +
      '<circle cx="120" cy="80" r="14" fill="#EAF4FB" stroke="#c0392b" stroke-width="2"/><text x="120" y="112" font-size="10" fill="#c0392b" text-anchor="middle">Test ear</text>' +
      '<circle cx="300" cy="80" r="14" fill="#EAF4FB" stroke="#16639f" stroke-width="2"/><text x="300" y="112" font-size="10" fill="#16639f" text-anchor="middle">Non-test ear</text>' +
      '<path id="mask-arrow" d="M134 80 L286 80" stroke="#dc9329" stroke-width="3" stroke-dasharray="6 5" marker-end="url(#ah)"/>' +
      '<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="#dc9329"/></marker></defs>' +
      '</svg>' +
      '<div class="masking-controls">' +
      '<div class="ctrl"><label for="mask-trans">Transducer</label><select id="mask-trans" style="min-height:42px;border-radius:8px;border:1px solid var(--muted-blue);padding:8px">' +
      '<option value="insert">Insert earphones (IA 55 dB)</option><option value="supra">Supra-aural (IA 40 dB)</option><option value="bone">Bone vibrator (IA 0 dB)</option></select></div>' +
      '<div class="ctrl"><label for="mask-level">Test-ear level <output id="mask-level-out">80 dB HL</output></label><input type="range" id="mask-level" min="20" max="100" step="5" value="80"></div>' +
      '<div class="ctrl"><label for="mask-nte">Non-test-ear BC threshold <output id="mask-nte-out">10 dB HL</output></label><input type="range" id="mask-nte" min="0" max="60" step="5" value="10"></div>' +
      '</div>' +
      '<div class="masking-out" role="status" aria-live="polite" id="mask-out"></div>';
    function draw() {
      var tr = $("#mask-trans", box).value, lvl = +$("#mask-level", box).value, nte = +$("#mask-nte", box).value;
      var diff = lvl - nte, ia = IA[tr], need = diff > ia;
      $("#mask-level-out", box).textContent = lvl + " dB HL";
      $("#mask-nte-out", box).textContent = nte + " dB HL";
      var arrow = $("#mask-arrow", box);
      arrow.setAttribute("stroke", need ? "#c0392b" : "#7fd1a3");
      arrow.setAttribute("marker-end", "url(#ah)");
      var out = $("#mask-out", box);
      out.className = "masking-out " + (need ? "need" : "nomask");
      out.innerHTML = "Level − non-test BC = " + lvl + " − " + nte + " = <strong>" + diff + " dB</strong>, versus IA of <strong>" + ia + " dB</strong>. " +
        (need
          ? "Because the difference is greater than IA, the tone could cross over, so <strong>masking may be needed</strong> to make the threshold ear-specific."
          : "Because the difference is not greater than IA, cross-over is unlikely here, so <strong>masking may not be needed</strong> for this threshold.");
    }
    $("#mask-trans", box).addEventListener("change", draw);
    $("#mask-level", box).addEventListener("input", draw);
    $("#mask-nte", box).addEventListener("input", draw);
    draw();
  }

  /* =========================================================
     Reused L1 patterns: transcripts, flip cards, steppers, glossary
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
  function initSteppers() {
    $all(".stepper-widget").forEach(function (wdg) {
      var steps = []; try { steps = JSON.parse(wdg.dataset.steps || "[]"); } catch (e) { steps = []; }
      var bar = $(".stepper", wdg), det = $(".step-detail", wdg); if (!bar || !det || !steps.length) return;
      steps.forEach(function (s, i) {
        var b = d.createElement("button"); b.className = "step-btn"; b.type = "button"; b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
        b.textContent = (i + 1) + ". " + s.t; b.addEventListener("click", function () { pick(i); }); bar.appendChild(b);
      });
      function pick(i) { $all(".step-btn", bar).forEach(function (x, xi) { x.setAttribute("aria-pressed", String(xi === i)); }); det.innerHTML = "<strong>" + steps[i].t + "</strong><br>" + steps[i].d; }
      pick(0);
    });
  }
  function initGlossary() {
    var open = null;
    $all(".gloss-term").forEach(function (btn) {
      var pop = btn.nextElementSibling;
      if (!pop || !pop.classList.contains("gloss-pop")) return;
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var show = pop.classList.contains("show");
        if (open && open !== pop) { open.classList.remove("show"); open.previousElementSibling.setAttribute("aria-expanded", "false"); }
        pop.classList.toggle("show", !show);
        btn.setAttribute("aria-expanded", String(!show));
        open = show ? null : pop;
      });
    });
    d.addEventListener("click", function () { if (open) { open.classList.remove("show"); open.previousElementSibling.setAttribute("aria-expanded", "false"); open = null; } });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) { open.classList.remove("show"); var b = open.previousElementSibling; b.setAttribute("aria-expanded", "false"); b.focus(); open = null; } });
  }

  /* graceful drop-in for optional licensed photos */
  function initImageFallback() {
    $all("figure.photo-fig img").forEach(function (img) {
      function fail() { var f = img.closest("figure"); if (f) f.classList.add("img-missing"); }
      if (img.complete && img.naturalWidth === 0) fail();
      img.addEventListener("error", fail);
    });
  }

  function init() {
    initTranscripts(); initFlip(); initSteppers(); initGlossary();
    initAudiograms(); initPracticeBlocks();
    initThresholdSim(); initOrientation(); initClassifier(); initTypeExplorer(); initConfigExplorer(); initPTA(); initSorter(); initSNR(); initMasking(); initFullSymbolKey();
    initImageFallback();
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init); else init();
  w.INTERACTIONS = { init: init, renderAudiogram: renderAudiogram };
})(window, document);
