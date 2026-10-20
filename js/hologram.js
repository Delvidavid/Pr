/* ============================================================
   FitHome Pro — Motor de holograma v4 "Anatómico"
   Figura humana con proporciones reales (~7,8 cabezas), contornos
   musculares curvos (cuádriceps, gemelos, bíceps, pectoral, glúteo),
   manos y pies con forma, perfil de cabeza, y sombreado cilíndrico
   con luz superior izquierda. Se dibuja como una silueta opaca en un
   lienzo auxiliar y se compone sobre el escenario con brillo
   holográfico, para que las uniones no se vean "transparentes".

   API pública idéntica a v3: new Hologram(canvas), setExercise(anim),
   start(), stop(). Lee los mismos keyframes de data.js (ángulos en
   grados, 0° = hacia abajo, 90° = derecha, 180° = arriba).
   ============================================================ */
(function (global) {
  'use strict';

  const L = { spine: 52, neck: 11, head: 11, uarm: 30, farm: 28, thigh: 44, shin: 42 };
  const W = 360, H = 320, FLOOR = 288, CX = 180;
  const BASE_Y = FLOOR - (L.thigh + L.shin); // pelvis de pie

  const CYAN = '34,211,238';
  const VIOLET = '167,139,250';

  // luz principal: arriba a la izquierda (vector unitario en pantalla)
  const LIGHT = (() => { const x = -0.6, y = -0.8; const m = Math.hypot(x, y); return [x / m, y / m]; })();

  // paletas de sombreado: [borde oscuro, tono medio, brillo]
  const TONE_NEAR = ['rgb(10,44,74)', 'rgb(30,128,168)', 'rgb(150,236,255)'];
  const TONE_FAR = ['rgb(22,22,62)', 'rgb(64,66,150)', 'rgb(160,150,240)'];
  const DEFN = 'rgba(3,22,40,.3)';      // líneas de definición muscular
  const DEFN_HI = 'rgba(200,250,255,.22)';

  const DEFAULT_POSE = {
    px: 0, py: 0, spine: 180, head: 180,
    thighL: 4, shinL: 2, thighR: -4, shinR: -2,
    armL: 12, farmL: 6, armR: -12, farmR: -6
  };

  /* perfiles de grosor (semianchos) por segmento: [t, lado cóncavo, lado convexo]
     el lado cóncavo es el interior del ángulo de la articulación (gemelo, bíceps). */
  const PROF = {
    thigh: [[0, 8.8, 9.0], [0.24, 8.4, 9.0], [0.56, 7.0, 7.5], [0.86, 5.4, 5.6], [1, 5.0, 5.0]],
    shin: [[0, 4.6, 4.6], [0.2, 5.9, 4.3], [0.42, 5.0, 3.9], [0.78, 3.2, 3.0], [1, 2.8, 2.8]],
    uarm: [[0, 6.0, 6.0], [0.3, 5.7, 5.0], [0.58, 5.1, 4.5], [0.9, 3.8, 3.7], [1, 3.6, 3.6]],
    farm: [[0, 3.6, 3.6], [0.2, 4.2, 3.8], [0.6, 3.0, 2.8], [1, 2.2, 2.2]]
  };

  const RAD = Math.PI / 180;
  const PI = Math.PI;
  const dir = a => [Math.sin(a * RAD), Math.cos(a * RAD)]; // canvas: y hacia abajo
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const norm = v => { const m = Math.hypot(v[0], v[1]) || 1; return [v[0] / m, v[1] / m]; };
  const perpOf = v => [-v[1], v[0]];
  const floorY = p => [p[0], Math.min(p[1], FLOOR)];

  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t * t * (3 - 2 * t); } // smoothstep

  function mixPose(p1, p2, t) {
    const out = {};
    for (const k in DEFAULT_POSE) {
      const a = (k in p1) ? p1[k] : DEFAULT_POSE[k];
      const b = (k in p2) ? p2[k] : DEFAULT_POSE[k];
      out[k] = lerp(a, b, t);
    }
    return out;
  }

  function widthAt(prof, t, side) { // side: 1 = cóncavo, 2 = convexo
    for (let i = 1; i < prof.length; i++) {
      if (t <= prof[i][0]) {
        const a = prof[i - 1], b = prof[i];
        const k = (t - a[0]) / (b[0] - a[0] || 1);
        return lerp(a[side], b[side], ease(k));
      }
    }
    return prof[prof.length - 1][side];
  }

  /* traza un contorno cerrado y suave pasando por los puntos medios */
  function smoothClosed(ctx, pts) {
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let m = mid(pts[n - 1], pts[0]);
    ctx.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      m = mid(p, q);
      ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    ctx.closePath();
  }

  const reduceMotion = () => !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);

  class Hologram {
    constructor(canvas) {
      this.cv = canvas;
      this.dpr = Math.min(2, Math.max(1, global.devicePixelRatio || 1));
      // resolución interna x dpr, misma proporción 360:320 (no se deforma)
      this.cv.width = W * this.dpr;
      this.cv.height = H * this.dpr;
      this.ctx = canvas.getContext('2d');
      this.buf = document.createElement('canvas'); // silueta opaca
      this.buf.width = this.cv.width;
      this.buf.height = this.cv.height;
      this.bctx = this.buf.getContext('2d');
      this.kfs = null;
      this.view = 'side';
      this.face = 1;
      this.total = 0;
      this.t0 = 0;
      this.raf = null;
      this.running = false;
      this.calm = reduceMotion();
      this.parts = Array.from({ length: 14 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        s: 0.2 + Math.random() * 0.5, r: 0.6 + Math.random() * 1.3,
        a: 0.12 + Math.random() * 0.3
      }));
    }

    setExercise(anim) {
      this.kfs = anim && anim.kfs && anim.kfs.length ? anim.kfs : [{ ...DEFAULT_POSE, d: 1 }];
      this.view = anim && anim.view === 'front' ? 'front' : 'side';
      this.total = this.kfs.reduce((s, k) => s + (k.d || 0.6), 0);
      this.t0 = performance.now();
      this.face = this.computeFacing();
    }

    /* hacia dónde mira la figura en vista lateral: manos y rodillas suelen
       quedar delante del tronco. Devuelve +1/-1 respecto a la perpendicular del tronco. */
    computeFacing() {
      let s = 0;
      for (const k of this.kfs) {
        const p = { ...DEFAULT_POSE, ...k };
        const j = this.joints(p);
        for (const pt of [j.armL[2], j.armR[2], j.legL[1], j.legR[1]]) s += dot(sub(pt, j.pelvis), j.perp);
      }
      return s >= 0 ? 1 : -1;
    }

    start() {
      if (this.running) return;
      this.running = true;
      const loop = (now) => {
        if (!this.running) return;
        this.draw(now);
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }

    stop() {
      this.running = false;
      if (this.raf) cancelAnimationFrame(this.raf);
    }

    poseAt(now) {
      const kfs = this.kfs;
      if (kfs.length === 1) return { ...DEFAULT_POSE, ...kfs[0] };
      let t = ((now - this.t0) / 1000) % this.total;
      if (t < 0) t += this.total;
      for (let i = 0; i < kfs.length; i++) {
        const d = kfs[i].d || 0.6;
        if (t < d) {
          const next = kfs[(i + 1) % kfs.length];
          return mixPose(kfs[i], next, ease(t / d));
        }
        t -= d;
      }
      return { ...DEFAULT_POSE, ...kfs[0] };
    }

    joints(p) {
      const front = this.view === 'front';
      const pelvis = floorY([CX + p.px, BASE_Y + p.py]);
      const axis = dir(p.spine);
      const perp = dir(p.spine + 90);
      const chain = (from, segs) => {
        const pts = [from];
        let cur = from;
        for (const [ang, len] of segs) {
          cur = floorY(add(cur, dir(ang), len));
          pts.push(cur);
        }
        return pts;
      };
      const shoulder = floorY(add(pelvis, axis, L.spine));
      const headDir = dir(p.head);
      let headC = add(shoulder, headDir, L.neck + L.head);
      headC = [headC[0], Math.min(headC[1], FLOOR - L.head)];
      // en vista frontal hombros y caderas se separan a lo ancho;
      // el lado L queda a la derecha de la pantalla (como en los keyframes)
      const sw = front ? 14.5 : 0, hw = front ? 5.6 : 0;
      const shL = add(add(shoulder, perp, -sw), axis, front ? -2.5 : 0);
      const shR = add(add(shoulder, perp, sw), axis, front ? -2.5 : 0);
      const hpL = add(pelvis, perp, -hw), hpR = add(pelvis, perp, hw);
      return {
        pelvis, shoulder, headC, headDir, axis, perp,
        legL: chain(hpL, [[p.thighL, L.thigh], [p.shinL, L.shin]]),
        legR: chain(hpR, [[p.thighR, L.thigh], [p.shinR, L.shin]]),
        armL: chain(shL, [[p.armL, L.uarm], [p.farmL, L.farm]]),
        armR: chain(shR, [[p.armR, L.uarm], [p.farmR, L.farm]])
      };
    }

    /* ---------- relleno con sombreado cilíndrico ---------- */
    cylFill(ctx, a, b, halfW, tone) {
      // gradiente perpendicular al segmento a→b; el brillo se coloca del lado de la luz
      const d = norm(sub(b, a)), n = perpOf(d);
      const lit = dot(n, LIGHT) > 0 ? 1 : -1;
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const p0 = add(m, n, -halfW * lit), p1 = add(m, n, halfW * lit);
      const g = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
      g.addColorStop(0, tone[0]);
      g.addColorStop(0.45, tone[1]);
      g.addColorStop(0.78, tone[2]);
      g.addColorStop(1, tone[1]);
      return g;
    }

    /* contorno de una extremidad de 2 segmentos con perfil muscular */
    limbOutline(pts, profA, profB, scale) {
      const [a, k, e] = pts;
      const dA = norm(sub(k, a)), dB = norm(sub(e, k));
      const nA = perpOf(dA), nB = perpOf(dB);
      // lado cóncavo: hacia el punto medio entre origen y extremo
      const conc = sub([(a[0] + e[0]) / 2, (a[1] + e[1]) / 2], k);
      const bent = Math.hypot(conc[0], conc[1]) > 2.5;
      let cs = bent ? (dot(nA, conc) >= 0 ? 1 : -1) : this.defaultConcave(nA);
      const csB = bent ? (dot(nB, conc) >= 0 ? 1 : -1) : this.defaultConcave(nB);
      const left = [], right = [];
      const push = (c, n, t, prof) => {
        const wc = widthAt(prof, t, 1) * scale, wv = widthAt(prof, t, 2) * scale;
        // "left" = lado +n
        const wl = cs > 0 ? wc : wv, wr = cs > 0 ? wv : wc;
        left.push(add(c, n, wl));
        right.push(add(c, n, -wr));
      };
      const N = 7;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        push(add(a, sub(k, a), t), nA, t, profA);
      }
      // rodilla/codo: normal promedio para una unión suave
      const nK = norm(add(nA, nB));
      left.pop(); right.pop();
      push(k, nK, 1, profA);
      // segundo segmento: el lado cóncavo se conserva respecto a nB
      cs = csB;
      for (let i = 1; i <= N; i++) {
        const t = i / N;
        push(add(k, sub(e, k), t), nB, t, profB);
      }
      // tapa redondeada en el extremo
      const capW = widthAt(profB, 1, 1) * scale;
      const tip = add(e, dB, capW * 0.8);
      const pts2 = [...left, tip, ...right.reverse()];
      // tapa en el origen (queda bajo el tronco)
      pts2.push(add(a, dA, -widthAt(profA, 0, 2) * scale * 0.7));
      return pts2;
    }

    defaultConcave(n) {
      // extremidad recta: gemelo/bíceps hacia la espalda en lateral, simétrico en frontal
      if (this.view === 'front') return 1;
      return dot(n, this.frontVec) >= 0 ? -1 : 1;
    }

    drawLimb(ctx, pts, kind, tone, scale, detail) {
      const isLeg = kind === 'leg';
      const profA = isLeg ? PROF.thigh : PROF.uarm;
      const profB = isLeg ? PROF.shin : PROF.farm;
      const outline = this.limbOutline(pts, profA, profB, scale);
      ctx.save();
      ctx.beginPath();
      smoothClosed(ctx, outline);
      ctx.fillStyle = tone[1];
      ctx.fill();
      ctx.clip();
      // sombreado por segmento
      const maxW = (isLeg ? 9.5 : 6.5) * scale;
      // dos cuadriláteros que se unen sobre la bisectriz de la articulación:
      // así el degradado del muslo y el de la tibia no dejan una costura visible
      const [pa, pk, pe] = pts;
      const dA = norm(sub(pk, pa)), dB = norm(sub(pe, pk));
      const nK = norm(add(perpOf(dA), perpOf(dB)));
      const big = maxW * 1.6;
      const kL = add(pk, nK, big), kR = add(pk, nK, -big);
      const quads = [
        [add(add(pa, dA, -maxW), perpOf(dA), big), kL, kR, add(add(pa, dA, -maxW), perpOf(dA), -big)],
        [kL, add(add(pe, dB, maxW * 1.5), perpOf(dB), big), add(add(pe, dB, maxW * 1.5), perpOf(dB), -big), kR]
      ];
      for (let s = 0; s < 2; s++) {
        ctx.fillStyle = this.cylFill(ctx, pts[s], pts[s + 1], maxW, tone);
        const q = quads[s];
        ctx.beginPath();
        ctx.moveTo(q[0][0], q[0][1]);
        for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]);
        ctx.closePath();
        ctx.fill();
      }
      if (detail) this.limbDetail(ctx, pts, isLeg, scale);
      ctx.restore();
      // borde fino para separar del tronco
      // borde fino (sin la tapa del origen, que se funde con el tronco)
      ctx.save();
      ctx.beginPath();
      const skip = 3, nOut = outline.length - 1;
      ctx.moveTo(outline[skip][0], outline[skip][1]);
      for (let i = skip + 1; i < nOut - skip; i++) {
        const p = outline[i], q = outline[i + 1];
        ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(4,20,38,.5)';
      ctx.stroke();
      ctx.restore();
      if (isLeg) this.drawFoot(ctx, pts, tone, scale);
      else this.drawHand(ctx, pts, tone, scale);
    }

    limbDetail(ctx, pts, isLeg, scale) {
      const [a, k, e] = pts;
      const dA = norm(sub(k, a)), nA = perpOf(dA);
      const dB = norm(sub(e, k));
      ctx.lineCap = 'round';
      ctx.lineWidth = 1;
      ctx.strokeStyle = DEFN;
      ctx.beginPath();
      if (isLeg) {
        // separación del cuádriceps (lágrima interna) y rótula
        const s0 = add(add(a, dA, L.thigh * 0.2), nA, 2.2 * scale);
        const s1 = add(add(a, dA, L.thigh * 0.62), nA, 3.4 * scale);
        const s2 = add(add(a, dA, L.thigh * 0.86), nA, 1.2 * scale);
        ctx.moveTo(s0[0], s0[1]);
        ctx.quadraticCurveTo(s1[0], s1[1], s2[0], s2[1]);
      } else {
        // separación deltoides / bíceps
        const d0 = add(add(a, dA, L.uarm * 0.32), nA, 4.6 * scale);
        const d1 = add(add(a, dA, L.uarm * 0.42), nA, 0);
        const d2 = add(add(a, dA, L.uarm * 0.3), nA, -4.4 * scale);
        ctx.moveTo(d0[0], d0[1]);
        ctx.quadraticCurveTo(d1[0], d1[1], d2[0], d2[1]);
      }
      ctx.stroke();
    }

    drawHand(ctx, pts, tone, scale) {
      const [, el, wr] = pts;
      const d = norm(sub(wr, el)), n = perpOf(d);
      const c = add(wr, d, 4.6 * scale);
      const ang = Math.atan2(d[1], d[0]);
      ctx.save();
      ctx.fillStyle = this.cylFill(ctx, wr, add(wr, d, 9), 4, tone);
      ctx.beginPath();
      ctx.ellipse(c[0], c[1], 5.6 * scale, 3.1 * scale, ang, 0, PI * 2);
      ctx.fill();
      // pulgar
      const th = add(add(wr, d, 2.6 * scale), n, 2.8 * scale);
      ctx.beginPath();
      ctx.ellipse(th[0], th[1], 2.8 * scale, 1.4 * scale, ang + 0.6, 0, PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawFoot(ctx, pts, tone, scale) {
      const [, kn, an] = pts;
      const s = norm(sub(an, kn));      // tibia hacia abajo
      const u = [-s[0], -s[1]];         // hacia la rodilla
      ctx.save();
      ctx.fillStyle = this.cylFill(ctx, kn, an, 5, tone);
      ctx.beginPath();
      if (this.view === 'front') {
        const out = an[0] >= this._midX ? [1, 0] : [-1, 0];
        const c = floorY(add(add(an, s, 3.2), out, 1.4));
        const ang = Math.atan2(s[1], s[0]) + PI / 2;
        ctx.ellipse(c[0], Math.min(c[1], FLOOR - 2.6), 4.8 * scale, 3 * scale, ang, 0, PI * 2);
      } else {
        // punta hacia el frente de la figura
        let f = perpOf(s);
        if (dot(f, this.frontVec) < 0) f = [-f[0], -f[1]];
        const P = (fa, ua) => floorY(add(add(an, f, fa * scale), u, ua * scale));
        smoothClosed(ctx, [P(-2.6, 1.2), P(-3.8, -1.6), P(-3.2, -3.4), P(4, -3.6), P(10.2, -3.4), P(11.6, -2), P(9.5, -0.6), P(3.4, 0.9)]);
      }
      ctx.fill();
      ctx.restore();
    }

    /* ---------- tronco ---------- */
    torsoPoints(j) {
      const [ax, ay] = j.axis;
      const at = (t, w) => [j.pelvis[0] + ax * L.spine * t + j.perp[0] * w, j.pelvis[1] + ay * L.spine * t + j.perp[1] * w];
      let A, B; // semianchos lado +perp y -perp
      if (this.view === 'front') {
        // pelvis → cintura → costillas → dorsales → hombros → trapecio
        const prof = [[-0.15, 3.5], [-0.08, 8.5], [0.02, 13.2], [0.14, 12.4], [0.34, 10.8], [0.56, 12.2], [0.76, 15.6], [0.9, 17.6], [0.98, 15.6], [1.07, 8.4], [1.15, 5.6]];
        A = prof; B = prof;
      } else {
        // lateral: delante pecho/abdomen, detrás glúteo/lumbar/escápula
        const fr = [[-0.16, 3], [-0.04, 8.4], [0.14, 8.6], [0.34, 8.8], [0.56, 9.8], [0.76, 11.6], [0.9, 9.8], [1.0, 6.5], [1.1, 4.2], [1.17, 3.6]];
        const bk = [[-0.16, 9], [-0.04, 12.6], [0.1, 11.4], [0.3, 7.6], [0.52, 8.6], [0.74, 10], [0.9, 9.6], [1.0, 7.2], [1.1, 5.2], [1.17, 4.4]];
        const frontPlus = this.face > 0;
        A = frontPlus ? fr : bk;
        B = frontPlus ? bk : fr;
      }
      const pts = [];
      for (const [t, w] of A) pts.push(at(t, w));
      for (let i = B.length - 1; i >= 0; i--) pts.push(at(B[i][0], -B[i][1]));
      return { pts, at };
    }

    drawTorso(ctx, j, detail) {
      const { pts, at } = this.torsoPoints(j);
      ctx.save();
      ctx.beginPath();
      smoothClosed(ctx, pts);
      const halfW = this.view === 'front' ? 16 : 12;
      ctx.fillStyle = this.cylFill(ctx, j.pelvis, j.shoulder, halfW, TONE_NEAR);
      ctx.fill();
      ctx.clip();
      // volumen vertical: hombros más iluminados que la cadera
      const vg = ctx.createLinearGradient(j.shoulder[0], j.shoulder[1], j.pelvis[0], j.pelvis[1]);
      vg.addColorStop(0, 'rgba(170,240,255,.18)');
      vg.addColorStop(0.6, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(4,16,36,.12)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
      if (detail) {
        ctx.lineCap = 'round';
        ctx.lineWidth = 1;
        ctx.strokeStyle = DEFN;
        ctx.beginPath();
        if (this.view === 'front') {
          // pectorales
          for (const s of [1, -1]) {
            const p0 = at(0.7, 0.6 * s), p1 = at(0.64, 8 * s), p2 = at(0.78, 13 * s);
            ctx.moveTo(p0[0], p0[1]);
            ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
          }
          // línea alba y abdominales
          const a0 = at(0.68, 0), a1 = at(0.08, 0);
          ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]);
          for (const t of [0.52, 0.39, 0.26]) {
            for (const s of [1, -1]) {
              const q0 = at(t, 1.2 * s), q1 = at(t + 0.015, 5.2 * s);
              ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]);
            }
          }
          // cinturón de Adonis
          for (const s of [1, -1]) {
            const v0 = at(0.16, 9.6 * s), v1 = at(-0.04, 3.4 * s);
            ctx.moveTo(v0[0], v0[1]); ctx.lineTo(v1[0], v1[1]);
          }
        } else {
          const fs = this.face;
          // borde inferior del pectoral y oblicuo
          const p0 = at(0.84, 3 * fs), p1 = at(0.66, 9.6 * fs), p2 = at(0.68, 11.6 * fs);
          ctx.moveTo(p0[0], p0[1]);
          ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
          const o0 = at(0.5, 5 * fs), o1 = at(0.2, 4 * fs);
          ctx.moveTo(o0[0], o0[1]); ctx.lineTo(o1[0], o1[1]);
          // pliegue del glúteo
          const g0 = at(-0.02, -4 * fs), g1 = at(-0.12, -11 * fs);
          ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]);
        }
        ctx.stroke();
        // brillo especular suave en el pecho
        ctx.strokeStyle = DEFN_HI;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        const h0 = at(0.9, -6), h1 = at(0.93, 6);
        ctx.moveTo(h0[0], h0[1]); ctx.lineTo(h1[0], h1[1]);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ---------- cuello y cabeza ---------- */
    drawHead(ctx, j) {
      const a = norm(j.headDir);           // del hombro hacia la cabeza
      const n = perpOf(a);
      const C = j.headC;
      // cuello (trapecio → base del cráneo)
      const nb = add(j.shoulder, a, 1), nt = add(C, a, -7.5);
      ctx.save();
      ctx.fillStyle = this.cylFill(ctx, nb, nt, 5.5, TONE_NEAR);
      ctx.beginPath();
      const nw0 = this.view === 'front' ? 7 : 5.6, nw1 = 4.8;
      smoothClosed(ctx, [add(nb, n, nw0), add(nt, n, nw1), add(nt, n, -nw1), add(nb, n, -nw0)]);
      ctx.fill();

      const g = ctx.createRadialGradient(C[0] + LIGHT[0] * 5, C[1] + LIGHT[1] * 5, 1, C[0], C[1], 13);
      g.addColorStop(0, TONE_NEAR[2]);
      g.addColorStop(0.55, TONE_NEAR[1]);
      g.addColorStop(1, TONE_NEAR[0]);
      ctx.fillStyle = g;
      ctx.beginPath();
      const ang = Math.atan2(a[1], a[0]);
      if (this.view === 'front') {
        // óvalo con mandíbula y orejas
        const P = (u, v) => add(add(C, a, u), n, v);
        smoothClosed(ctx, [P(11, 0), P(9, 7.2), P(2.5, 9), P(-3.6, 8.2), P(-8.4, 5.2), P(-11.4, 0), P(-8.4, -5.2), P(-3.6, -8.2), P(2.5, -9), P(9, -7.2)]);
        ctx.fill();
        for (const s of [1, -1]) {
          const e = P(0.2, 8.9 * s);
          ctx.beginPath();
          ctx.ellipse(e[0], e[1], 2.6, 1.1, ang, 0, PI * 2);
          ctx.fill();
        }
      } else {
        // perfil: cráneo + frente, nariz, labios, mentón y mandíbula
        const f = this.face;
        const P = (u, v) => add(add(C, a, u), n, v * f);
        smoothClosed(ctx, [
          P(10.8, -1), P(9.4, 5.4), P(5.8, 9), P(3, 9.8), P(1.4, 10), P(-0.6, 13),
          P(-2.6, 10.6), P(-4.4, 10.8), P(-6.2, 10.2), P(-9.4, 8.2), P(-10.2, 4.6), P(-8.6, 1.2),
          P(-6.4, -3.6), P(-6.6, -8.4), P(-1.6, -10.6), P(5.4, -9.4)
        ]);
        ctx.fill();
        // oreja
        const e = P(-0.4, -2.6);
        ctx.strokeStyle = DEFN;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(e[0], e[1], 2.4, 1.5, ang, 0, PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    /* ---------- figura completa en el lienzo auxiliar ---------- */
    renderBody(j, detail) {
      const ctx = this.bctx;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      this.frontVec = this.view === 'front' ? [0, 1] : [j.perp[0] * this.face, j.perp[1] * this.face];
      this._midX = j.pelvis[0];
      ctx.lineJoin = 'round';
      if (this.view === 'side') {
        // lado lejano (L) primero, en violeta y algo más fino = profundidad
        this.drawLimb(ctx, j.legL, 'leg', TONE_FAR, 0.94, false);
        this.drawLimb(ctx, j.armL, 'arm', TONE_FAR, 0.94, false);
        this.drawTorso(ctx, j, detail);
        this.drawHead(ctx, j);
        this.drawLimb(ctx, j.legR, 'leg', TONE_NEAR, 1, detail);
        this.drawLimb(ctx, j.armR, 'arm', TONE_NEAR, 1, detail);
      } else {
        this.drawLimb(ctx, j.legL, 'leg', TONE_NEAR, 1, detail);
        this.drawLimb(ctx, j.legR, 'leg', TONE_NEAR, 1, detail);
        this.drawTorso(ctx, j, detail);
        this.drawHead(ctx, j);
        this.drawLimb(ctx, j.armL, 'arm', TONE_NEAR, 1, detail);
        this.drawLimb(ctx, j.armR, 'arm', TONE_NEAR, 1, detail);
      }
    }

    composite(alpha, glow) {
      const ctx = this.ctx;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = alpha;
      if (glow) {
        ctx.shadowColor = `rgba(${CYAN},.75)`;
        ctx.shadowBlur = 14 * this.dpr;
      }
      ctx.drawImage(this.buf, 0, 0);
      ctx.restore();
    }

    draw(now) {
      const ctx = this.ctx;
      const calm = this.calm;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      /* --- plataforma holográfica --- */
      const fy = FLOOR + 9;
      ctx.save();
      const fg = ctx.createRadialGradient(CX, fy, 6, CX, fy, 135);
      fg.addColorStop(0, `rgba(${CYAN},.26)`);
      fg.addColorStop(0.7, `rgba(${VIOLET},.06)`);
      fg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(CX, fy, 135, 21, 0, 0, PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.1;
      [[112, 16, 0.4], [80, 11.5, 0.28], [46, 6.5, 0.2]].forEach(([rx, ry, a]) => {
        ctx.strokeStyle = `rgba(${CYAN},${a})`;
        ctx.beginPath();
        ctx.ellipse(CX, fy, rx, ry, 0, 0, PI * 2);
        ctx.stroke();
      });
      const rot = calm ? 0 : now / 5000;
      ctx.strokeStyle = `rgba(${CYAN},.14)`;
      for (let i = 0; i < 10; i++) {
        const a = rot + i * PI / 5;
        ctx.beginPath();
        ctx.moveTo(CX + Math.cos(a) * 46, fy + Math.sin(a) * 6.5);
        ctx.lineTo(CX + Math.cos(a) * 112, fy + Math.sin(a) * 16);
        ctx.stroke();
      }
      ctx.restore();

      /* --- partículas --- */
      if (!calm) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const p of this.parts) {
          p.y -= p.s;
          if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
          ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(now / 400 + p.x));
          ctx.fillStyle = `rgba(${CYAN},.9)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      const pose = this.poseAt(now);
      const j = this.joints(pose);

      /* --- sombra de contacto bajo la figura --- */
      const low = Math.max(j.legL[2][1], j.legR[2][1], j.armL[2][1], j.armR[2][1], j.pelvis[1]);
      const near = Math.max(0, 1 - (FLOOR - low) / 90);
      ctx.save();
      const sx = (Math.min(j.legL[2][0], j.legR[2][0], j.pelvis[0], j.shoulder[0]) + Math.max(j.legL[2][0], j.legR[2][0], j.pelvis[0], j.shoulder[0])) / 2;
      const sg0 = ctx.createRadialGradient(sx, FLOOR + 2, 2, sx, FLOOR + 2, 70);
      sg0.addColorStop(0, `rgba(2,8,18,${0.55 * near})`);
      sg0.addColorStop(1, 'rgba(2,8,18,0)');
      ctx.fillStyle = sg0;
      ctx.beginPath();
      ctx.ellipse(sx, FLOOR + 2, 70, 9, 0, 0, PI * 2);
      ctx.fill();
      ctx.restore();

      /* --- reflejo bajo la plataforma --- */
      this.renderBody(j, false);
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, -this.dpr, 0, 2 * fy * this.dpr);
      ctx.globalAlpha = 0.14;
      ctx.drawImage(this.buf, 0, 0, W, H);
      ctx.restore();
      const fade = ctx.createLinearGradient(0, fy, 0, H);
      fade.addColorStop(0, 'rgba(10,17,31,.2)');
      fade.addColorStop(1, 'rgba(10,17,31,.95)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, fy + 2, W, H - fy);

      /* --- estela de movimiento --- */
      if (!calm) {
        this.renderBody(this.joints(this.poseAt(now - 110)), false);
        this.composite(0.12, false);
      }

      /* --- cuerpo principal --- */
      this.renderBody(j, true);
      const flicker = calm ? 1 : 0.95 + 0.05 * Math.sin(now / 80) * Math.sin(now / 31);
      this.composite(0.94 * flicker, true);

      /* --- borde de luz (fresnel) aditivo --- */
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.16;
      ctx.drawImage(this.buf, -1 * this.dpr, -1 * this.dpr);
      ctx.restore();

      /* --- líneas de escaneo + barrido --- */
      ctx.save();
      ctx.globalAlpha = 0.11;
      ctx.fillStyle = '#06121a';
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.1);
      if (!calm) {
        const sweep = (now / 16) % (H + 90) - 45;
        const sg = ctx.createLinearGradient(0, sweep - 28, 0, sweep + 28);
        sg.addColorStop(0, `rgba(${CYAN},0)`);
        sg.addColorStop(0.5, `rgba(${CYAN},.28)`);
        sg.addColorStop(1, `rgba(${CYAN},0)`);
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = sg;
        ctx.fillRect(0, sweep - 28, W, 56);
      }
      ctx.restore();
    }
  }

  global.Hologram = Hologram;
})(window);
