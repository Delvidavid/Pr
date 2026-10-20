/* ============================================================
   FitHome Pro — Motor de holograma v5 "3D"
   · Hologram3D (WebGL puro): figura anatómica en 3D real, giro con el
     dedo/ratón, cámara en 3/4 con leve vaivén.
   · Hologram2D (respaldo sin WebGL): figura anatómica 2D.
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

  class Hologram2D {
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

  /* ============================================================
     MOTOR 3D (WebGL puro, sin librerías)
     El esqueleto de los keyframes (un plano) se lleva a 3D: hombros y
     caderas se separan a lo ancho del cuerpo y cada segmento se dibuja
     como una malla anatómica (secciones elípticas que cambian a lo largo
     del hueso). Un único contexto WebGL fuera de pantalla se comparte
     entre todas las instancias y su imagen se compone en el canvas 2D
     del escenario (plataforma, partículas, reflejo y escaneo).
     ============================================================ */

  const V3 = {
    add: (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norm: a => { const m = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / m, a[1] / m, a[2] / m]; },
    scale: (a, k) => [a[0] * k, a[1] * k, a[2] * k]
  };

  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function lookAt(eye, c, up) {
    const z = V3.norm(V3.sub(eye, c)), x = V3.norm(V3.cross(up, z)), y = V3.cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
      -V3.dot(x, eye), -V3.dot(y, eye), -V3.dot(z, eye), 1];
  }
  function mul(a, b) { // column-major a*b
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  }

  /* ---------- generación de mallas ----------
     espacio local: x = lateral, y = a lo largo del hueso (0..1), z = frente */
  function loftMesh(prof, rings, segs) {
    const P = [], ts = [];
    for (let i = 0; i <= rings; i++) ts.push(i / rings);
    const at = t => {
      for (let i = 1; i < prof.length; i++) {
        if (t <= prof[i][0] + 1e-6) {
          const a = prof[i - 1], b = prof[i], k = ease((t - a[0]) / (b[0] - a[0] || 1));
          return [lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3] || 0, b[3] || 0, k)];
        }
      }
      const l = prof[prof.length - 1];
      return [l[1], l[2], l[3] || 0];
    };
    const grid = [];
    for (const t of ts) {
      const [rf, rl, off] = at(t);
      const row = [];
      for (let j = 0; j <= segs; j++) {
        const th = j / segs * PI * 2;
        row.push([Math.sin(th) * rl, t, Math.cos(th) * rf + off]);
      }
      grid.push(row);
    }
    // normales numéricas
    const nrm = (i, j) => {
      const r0 = grid[Math.max(0, i - 1)][j], r1 = grid[Math.min(rings, i + 1)][j];
      const c0 = grid[i][(j - 1 + segs) % segs], c1 = grid[i][(j + 1) % segs];
      const dt = V3.sub(r1, r0), dth = V3.sub(c1, c0);
      let n = V3.norm(V3.cross(dth, dt));
      const ax = [grid[i][j][0], 0, grid[i][j][2] - at(ts[i])[2]];
      if (V3.dot(n, ax) < 0) n = V3.scale(n, -1);
      return n;
    };
    const pos = [], nor = [], idx = [];
    for (let i = 0; i <= rings; i++) for (let j = 0; j <= segs; j++) {
      pos.push(...grid[i][j]);
      nor.push(...nrm(i, j % segs));
    }
    const W = segs + 1;
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
      const a = i * W + j, b = a + W;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    // tapas planas en ambos extremos
    for (const [i, t, flip] of [[0, 0, true], [rings, 1, false]]) {
      const c = pos.length / 3, off = at(t)[2];
      pos.push(0, t, off); nor.push(0, flip ? -1 : 1, 0);
      for (let j = 0; j < segs; j++) {
        const a = i * W + j, b = i * W + j + 1;
        flip ? idx.push(c, a, b) : idx.push(c, b, a);
      }
    }
    return { pos, nor, idx };
  }

  function sphereMesh(rings, segs) { // esfera unidad centrada en el origen
    const pos = [], nor = [], idx = [];
    for (let i = 0; i <= rings; i++) {
      const v = i / rings, ph = v * PI;
      for (let j = 0; j <= segs; j++) {
        const th = j / segs * PI * 2;
        const p = [Math.sin(ph) * Math.sin(th), -Math.cos(ph), Math.sin(ph) * Math.cos(th)];
        pos.push(...p); nor.push(...p);
      }
    }
    const W = segs + 1;
    for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) {
      const a = i * W + j, b = a + W;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    return { pos, nor, idx };
  }

  /* perfiles 3D: [t, radio frente-espalda, radio lateral, desplazamiento al frente] */
  const PROF3 = {
    thigh: [[0, 9.0, 9.4, 0], [0.22, 9.4, 8.6, 0.8], [0.6, 7.4, 6.8, 0.5], [0.9, 5.4, 5.0, 0.2], [1, 5.0, 4.8, 0]],
    shin: [[0, 4.9, 4.6, 0], [0.18, 6.2, 4.9, -1.6], [0.45, 5.2, 4.2, -1.1], [0.8, 3.2, 3.0, 0], [1, 2.8, 2.7, 0]],
    uarm: [[0, 6.0, 6.2, 0], [0.3, 5.8, 5.2, 0.6], [0.55, 5.4, 4.7, 0.7], [0.9, 4.0, 3.7, 0], [1, 3.7, 3.5, 0]],
    farm: [[0, 3.8, 4.0, 0], [0.22, 4.3, 4.6, 0.2], [0.7, 3.0, 3.2, 0], [1, 2.3, 2.6, 0]],
    neck: [[0, 6.4, 7.6, -0.6], [0.5, 5.4, 5.8, 0], [1, 5.0, 5.2, 0.3]],
    // tronco: t en [0,1] equivale a -0.2..1.12 de la columna
    torso: [
      [0.0, 4.0, 5.0, -1.0], [0.06, 8.6, 11.0, -1.4], [0.16, 10.0, 13.0, -1.9],
      [0.27, 9.2, 12.4, -1.0], [0.39, 8.4, 10.8, 0.3], [0.54, 9.6, 12.0, 0.7],
      [0.69, 11.0, 15.0, 0.9], [0.81, 10.2, 17.0, 0.1], [0.89, 8.8, 15.6, -0.5],
      [0.94, 6.4, 9.6, -0.8], [1.0, 4.8, 5.6, -0.6]
    ]
  };
  const TORSO_T0 = -0.2, TORSO_T1 = 1.12;

  /* ---------- renderizador WebGL compartido ---------- */
  const GL3 = (() => {
    let gl = null, cv = null, prog = null, loc = {}, meshes = null, failed = false;
    const VS = `
      attribute vec3 aPos; attribute vec3 aNor;
      uniform mat4 uVP; uniform vec3 uStart, uDir, uFwd, uLat, uScale;
      varying vec3 vN; varying vec3 vW;
      void main(){
        vec3 p = aPos * uScale;
        vec3 w = uStart + uLat * p.x + uDir * p.y + uFwd * p.z;
        vec3 n = aNor / uScale;
        vN = normalize(uLat * n.x + uDir * n.y + uFwd * n.z);
        vW = w;
        gl_Position = uVP * vec4(w, 1.0);
      }`;
    const FS = `
      precision mediump float;
      varying vec3 vN; varying vec3 vW;
      uniform vec3 uEye; uniform vec3 uTint;
      void main(){
        vec3 N = normalize(vN);
        vec3 V = normalize(uEye - vW);
        if (dot(N, V) < 0.0) N = -N;
        vec3 Lk = normalize(vec3(-0.55, 0.75, 0.55));   // luz principal
        vec3 Lf = normalize(vec3(0.7, 0.15, 0.4));      // relleno
        float k = dot(N, Lk);
        float wrap = clamp(k * 0.5 + 0.5, 0.0, 1.0);
        float fill = max(dot(N, Lf), 0.0);
        vec3 deep = vec3(0.02, 0.07, 0.17);
        vec3 col = mix(deep, uTint, wrap * wrap);
        col += vec3(0.30, 0.22, 0.55) * fill * 0.35;              // relleno violeta
        vec3 H = normalize(Lk + V);
        col += vec3(0.75, 0.97, 1.0) * pow(max(dot(N, H), 0.0), 36.0) * 0.55;
        float fres = pow(1.0 - max(dot(N, V), 0.0), 2.4);
        col += vec3(0.35, 0.88, 1.0) * fres * 0.95;               // borde holográfico
        float band = smoothstep(0.86, 1.0, fract(vW.y * 0.22));   // líneas de contorno
        col += vec3(0.25, 0.8, 1.0) * band * 0.10;
        gl_FragColor = vec4(col, 1.0);
      }`;

    function build(src) {
      const g = gl;
      const mk = (type, s) => { const sh = g.createShader(type); g.shaderSource(sh, s); g.compileShader(sh); if (!g.getShaderParameter(sh, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(sh)); return sh; };
      const p = g.createProgram();
      g.attachShader(p, mk(g.VERTEX_SHADER, VS));
      g.attachShader(p, mk(g.FRAGMENT_SHADER, FS));
      g.linkProgram(p);
      if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(p));
      return p;
    }
    function upload(m) {
      const g = gl;
      const vb = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, vb); g.bufferData(g.ARRAY_BUFFER, new Float32Array(m.pos), g.STATIC_DRAW);
      const nb = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, nb); g.bufferData(g.ARRAY_BUFFER, new Float32Array(m.nor), g.STATIC_DRAW);
      const ib = g.createBuffer(); g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, ib); g.bufferData(g.ELEMENT_ARRAY_BUFFER, new Uint16Array(m.idx), g.STATIC_DRAW);
      return { vb, nb, ib, n: m.idx.length };
    }
    function init(w, h) {
      if (gl || failed) return !!gl;
      try {
        cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        gl = cv.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: false });
        if (!gl) throw new Error('sin WebGL');
        prog = build();
        gl.useProgram(prog);
        for (const n of ['aPos', 'aNor']) loc[n] = gl.getAttribLocation(prog, n);
        for (const n of ['uVP', 'uStart', 'uDir', 'uFwd', 'uLat', 'uScale', 'uEye', 'uTint']) loc[n] = gl.getUniformLocation(prog, n);
        meshes = {
          thigh: upload(loftMesh(PROF3.thigh, 14, 20)),
          shin: upload(loftMesh(PROF3.shin, 14, 20)),
          uarm: upload(loftMesh(PROF3.uarm, 12, 18)),
          farm: upload(loftMesh(PROF3.farm, 12, 18)),
          neck: upload(loftMesh(PROF3.neck, 4, 16)),
          torso: upload(loftMesh(PROF3.torso, 30, 28)),
          sphere: upload(sphereMesh(14, 20))
        };
        gl.enable(gl.DEPTH_TEST);
        cv.addEventListener('webglcontextlost', e => { e.preventDefault(); gl = null; failed = true; });
        return true;
      } catch (e) {
        failed = true; gl = null;
        return false;
      }
    }
    function render(list, vp, eye, w, h) {
      const g = gl;
      if (!g) return null;
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      g.viewport(0, 0, w, h);
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
      g.uniformMatrix4fv(loc.uVP, false, new Float32Array(vp));
      g.uniform3fv(loc.uEye, eye);
      g.enableVertexAttribArray(loc.aPos);
      g.enableVertexAttribArray(loc.aNor);
      let cur = null;
      for (const it of list) {
        const m = meshes[it.mesh];
        if (m !== cur) {
          g.bindBuffer(g.ARRAY_BUFFER, m.vb); g.vertexAttribPointer(loc.aPos, 3, g.FLOAT, false, 0, 0);
          g.bindBuffer(g.ARRAY_BUFFER, m.nb); g.vertexAttribPointer(loc.aNor, 3, g.FLOAT, false, 0, 0);
          g.bindBuffer(g.ELEMENT_ARRAY_BUFFER, m.ib);
          cur = m;
        }
        g.uniform3fv(loc.uStart, it.start);
        g.uniform3fv(loc.uDir, it.dir);
        g.uniform3fv(loc.uFwd, it.fwd);
        g.uniform3fv(loc.uLat, it.lat);
        g.uniform3fv(loc.uScale, it.scale);
        g.uniform3fv(loc.uTint, it.tint || [0.16, 0.66, 0.86]);
        g.drawElements(g.TRIANGLES, m.n, g.UNSIGNED_SHORT, 0);
      }
      return cv;
    }
    return { init, render, ok: () => !!gl };
  })();

  /* giro elegido por la persona: se mantiene entre ejercicios */
  let userYaw = 0;
  let hintUntil = null;

  class Hologram3D {
    constructor(canvas) {
      this.cv = canvas;
      this.dpr = Math.min(2, Math.max(1, global.devicePixelRatio || 1));
      this.cv.width = W * this.dpr;
      this.cv.height = H * this.dpr;
      this.ctx = canvas.getContext('2d');
      this.kfs = null;
      this.view = 'side';
      this.face = 1;
      this.total = 0;
      this.t0 = 0;
      this.raf = null;
      this.running = false;
      this.calm = reduceMotion();
      this.yaw = null;           // yaw actual (suavizado)
      this.drag = null;
      this.lastDrag = -1;
      this.parts = Array.from({ length: 14 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        s: 0.2 + Math.random() * 0.5, r: 0.6 + Math.random() * 1.3,
        a: 0.12 + Math.random() * 0.3
      }));
      this.bindDrag();
    }

    bindDrag() {
      const cv = this.cv;
      cv.style.touchAction = 'pan-y';
      cv.style.cursor = 'grab';
      cv.setAttribute('aria-label', 'Holograma 3D del ejercicio. Arrastra para girar.');
      cv.setAttribute('role', 'img');
      cv.addEventListener('pointerdown', e => {
        this.drag = { x: e.clientX, yaw: userYaw };
        cv.style.cursor = 'grabbing';
        try { cv.setPointerCapture(e.pointerId); } catch (_) { /* nada */ }
      });
      cv.addEventListener('pointermove', e => {
        if (!this.drag) return;
        const k = 360 / Math.max(160, cv.clientWidth || 360);
        userYaw = this.drag.yaw + (e.clientX - this.drag.x) * k * 0.9;
        this.lastDrag = performance.now();
      });
      const end = () => { this.drag = null; cv.style.cursor = 'grab'; this.lastDrag = performance.now(); };
      cv.addEventListener('pointerup', end);
      cv.addEventListener('pointercancel', end);
      cv.addEventListener('dblclick', () => { userYaw = 0; });
    }

    setExercise(anim) {
      this.kfs = anim && anim.kfs && anim.kfs.length ? anim.kfs : [{ ...DEFAULT_POSE, d: 1 }];
      this.view = anim && anim.view === 'front' ? 'front' : 'side';
      this.total = this.kfs.reduce((s, k) => s + (k.d || 0.6), 0);
      this.t0 = performance.now();
      this.face = Hologram2D.prototype.computeFacing.call(this);
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

    poseAt(now) { return Hologram2D.prototype.poseAt.call(this, now); }
    joints(p) { return Hologram2D.prototype.joints.call(this, p); }

    /* articulaciones 2D del plano del ejercicio (sin separación lateral) */
    joints2D(p) {
      const v = this.view;
      this.view = 'side';
      const j = Hologram2D.prototype.joints.call(this, p);
      this.view = v;
      return j;
    }

    /* ---------- esqueleto en 3D ---------- */
    skeleton(p) {
      const front = this.view === 'front';
      const pelvis2 = floorY([CX + p.px, BASE_Y + p.py]);
      const ax2 = dir(p.spine), pp2 = dir(p.spine + 90);
      const w3 = (pt, z = 0) => [pt[0] - CX, FLOOR - pt[1], z];
      const d3 = d => [d[0], -d[1], 0];
      const chain = (from, segs) => {
        const pts = [from]; let cur = from;
        for (const [ang, len] of segs) { cur = floorY(add(cur, dir(ang), len)); pts.push(cur); }
        return pts;
      };
      const shoulder2 = floorY(add(pelvis2, ax2, L.spine));
      const SW = 14.5, HW = 6.2;
      let shL2, shR2, hpL2, hpR2, zs = { L: 0, R: 0 }, zh = { L: 0, R: 0 };
      if (front) {
        shL2 = add(add(shoulder2, pp2, -SW), ax2, -2.5); shR2 = add(add(shoulder2, pp2, SW), ax2, -2.5);
        hpL2 = add(pelvis2, pp2, -HW); hpR2 = add(pelvis2, pp2, HW);
      } else {
        shL2 = add(shoulder2, ax2, -2.5); shR2 = shL2;
        hpL2 = pelvis2; hpR2 = pelvis2;
        zs = { L: -SW, R: SW }; zh = { L: -HW, R: HW };
      }
      const lift = (pts, z) => pts.map(pt => w3(pt, z));
      const headDir2 = dir(p.head);
      let headC2 = add(shoulder2, headDir2, L.neck + L.head);
      headC2 = [headC2[0], Math.min(headC2[1], FLOOR - L.head)];
      const torsoF = front ? [0, 0, 1] : V3.norm(d3([pp2[0] * this.face, pp2[1] * this.face]));
      return {
        front, torsoF,
        pelvis: w3(pelvis2), shoulder: w3(shoulder2), axis: V3.norm(d3(ax2)),
        headC: w3(headC2), headDir: V3.norm(d3(headDir2)),
        legL: lift(chain(hpL2, [[p.thighL, L.thigh], [p.shinL, L.shin]]), zh.L),
        legR: lift(chain(hpR2, [[p.thighR, L.thigh], [p.shinR, L.shin]]), zh.R),
        armL: lift(chain(shL2, [[p.armL, L.uarm], [p.farmL, L.farm]]), zs.L),
        armR: lift(chain(shR2, [[p.armR, L.uarm], [p.farmR, L.farm]]), zs.R)
      };
    }

    /* marco local de un hueso: dir (a lo largo), fwd (frente), lat */
    frame(d, sk, fallbackUp) {
      d = V3.norm(d);
      let f;
      if (sk.front) {
        f = [0, 0, 1];
        f = V3.norm(V3.sub(f, V3.scale(d, V3.dot(f, d))));
      } else {
        let n = V3.norm([-d[1], d[0], 0]);
        let s = V3.dot(n, sk.torsoF);
        if (Math.abs(s) < 0.25) s = V3.dot(n, fallbackUp || sk.axis);
        f = s >= 0 ? n : V3.scale(n, -1);
      }
      const lat = V3.norm(V3.cross(f, d));
      return { dir: d, fwd: f, lat };
    }

    buildList(sk) {
      const list = [];
      const TINT = [0.16, 0.66, 0.86];
      const seg = (mesh, a, b, tint, up) => {
        const d = V3.sub(b, a), len = Math.hypot(d[0], d[1], d[2]) || 1;
        const fr = this.frame(d, sk, up);
        list.push({ mesh, start: a, dir: fr.dir, fwd: fr.fwd, lat: fr.lat, scale: [1, len, 1], tint });
        return fr;
      };
      const ell = (c, fr, rl, ra, rf, tint) => list.push({ mesh: 'sphere', start: c, dir: fr.dir, fwd: fr.fwd, lat: fr.lat, scale: [rl, ra, rf], tint });

      // tronco
      const tfr = this.frame(sk.axis, sk);
      const span = TORSO_T1 - TORSO_T0;
      list.push({ mesh: 'torso', start: V3.add(sk.pelvis, sk.axis, TORSO_T0 * L.spine), dir: tfr.dir, fwd: tfr.fwd, lat: tfr.lat, scale: [1, span * L.spine, 1], tint: TINT });
      // glúteos y pectorales (volumen extra)
      for (const s of [1, -1]) {
        const g = V3.add(V3.add(V3.add(sk.pelvis, tfr.lat, 5.6 * s), tfr.fwd, -4.6), tfr.dir, -1.5);
        ell(g, tfr, 6.4, 7.2, 5.6, TINT);
        const pc = V3.add(V3.add(V3.add(sk.pelvis, tfr.lat, 6.2 * s), tfr.fwd, 5.4), tfr.dir, L.spine * 0.74);
        ell(pc, tfr, 6.8, 5.2, 4.6, TINT);
      }

      // cuello y cabeza
      const hd = sk.headDir;
      const neckA = V3.add(sk.shoulder, hd, -1.5), neckB = V3.add(sk.headC, hd, -6.5);
      seg('neck', neckA, neckB, TINT, sk.axis);
      const hfr = this.frame(hd, sk, sk.axis);
      ell(V3.add(sk.headC, hfr.fwd, 0.6), hfr, 8.6, 11.2, 10.2, TINT);           // cráneo
      ell(V3.add(V3.add(sk.headC, hd, -4.8), hfr.fwd, 2.8), hfr, 7.0, 6.0, 7.0, TINT); // mandíbula
      ell(V3.add(V3.add(sk.headC, hd, -1.2), hfr.fwd, 9.4), hfr, 1.3, 2.4, 1.6, TINT); // nariz

      // extremidades
      const limb = (pts, isLeg) => {
        const [a, k, e] = pts;
        const fA = seg(isLeg ? 'thigh' : 'uarm', a, k, TINT);
        const fB = seg(isLeg ? 'shin' : 'farm', k, e, TINT, fA.fwd);
        if (isLeg) {
          ell(a, fA, 9.3, 9.4, 9.4, TINT);                                  // cadera
          ell(V3.add(k, fA.fwd, 0.4), fB, 4.5, 4.8, 4.7, TINT);             // rodilla
          ell(e, fB, 2.6, 2.8, 2.7, TINT);                                  // tobillo
          // pie: hacia el frente del cuerpo, apoyado en el suelo
          let fd = fB.fwd;
          if (sk.front) fd = V3.norm([0, -0.15, 1]);
          const up = V3.scale(fB.dir, -1);
          let c = V3.add(V3.add(e, fd, 4.6), up, -2.4);
          if (c[1] < 3) c = [c[0], 3, c[2]];
          const ffr = { dir: fd, fwd: up, lat: V3.norm(V3.cross(up, fd)) };
          ell(c, ffr, 4.1, 7.6, 3.1, TINT);
        } else {
          ell(V3.add(a, fA.dir, 1.8), fA, 6.3, 7.0, 6.5, TINT);            // deltoides
          ell(k, fB, 3.3, 3.5, 3.4, TINT);                                  // codo
          ell(e, fB, 2.1, 2.2, 2.1, TINT);                                  // muñeca
          ell(V3.add(e, fB.dir, 4.8), fB, 2.2, 5.2, 3.9, TINT);             // mano
        }
      };
      limb(sk.legL, true); limb(sk.legR, true);
      limb(sk.armL, false); limb(sk.armR, false);
      return list;
    }

    camera(now) {
      const baseYaw = this.view === 'front' ? 22 : 32 * this.face;
      const idle = (this.lastDrag < 0 || now - this.lastDrag > 2500) && !this.drag && !this.calm;
      const sway = idle ? Math.sin(now / 1500) * 9 : 0;
      const target = baseYaw + userYaw + sway;
      if (this.yaw === null) this.yaw = target;
      this.yaw += (target - this.yaw) * (this.drag ? 0.5 : 0.07);
      const yaw = this.yaw * RAD, pitch = 8 * RAD;
      const fov = 30 * RAD, D = 146 / Math.tan(fov / 2);
      const tgt = [0, 112, 0];
      const eye = [tgt[0] + D * Math.sin(yaw) * Math.cos(pitch), tgt[1] + D * Math.sin(pitch), tgt[2] + D * Math.cos(yaw) * Math.cos(pitch)];
      const vp = mul(perspective(fov, W / H, 80, 2000), lookAt(eye, tgt, [0, 1, 0]));
      return { vp, eye };
    }

    project(vp, p) {
      const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12];
      const y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13];
      const w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
      return [(x / w * 0.5 + 0.5) * W, (1 - (y / w * 0.5 + 0.5)) * H];
    }

    draw(now) {
      const ctx = this.ctx, calm = this.calm, dpr = this.dpr;
      const cam = this.camera(now);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      /* --- plataforma en perspectiva --- */
      const c0 = this.project(cam.vp, [0, 0, 0]);
      // radios del círculo del suelo según la orientación de la cámara
      const yr = this.yaw * RAD;
      const pr = this.project(cam.vp, [Math.cos(yr) * 100, 0, -Math.sin(yr) * 100]);
      const pf = this.project(cam.vp, [Math.sin(yr) * 100, 0, Math.cos(yr) * 100]);
      const rx = Math.hypot(pr[0] - c0[0], pr[1] - c0[1]) || 100;
      const ry = Math.abs(pf[1] - c0[1]) || 14;
      const fy = c0[1];
      ctx.save();
      const fg = ctx.createRadialGradient(c0[0], fy, 6, c0[0], fy, rx * 1.25);
      fg.addColorStop(0, `rgba(${CYAN},.26)`);
      fg.addColorStop(0.7, `rgba(${VIOLET},.06)`);
      fg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(c0[0], fy, rx * 1.25, ry * 1.25, 0, 0, PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.1;
      [[1.05, 0.4], [0.75, 0.28], [0.43, 0.2]].forEach(([k, a]) => {
        ctx.strokeStyle = `rgba(${CYAN},${a})`;
        ctx.beginPath();
        ctx.ellipse(c0[0], fy, rx * k, ry * k, 0, 0, PI * 2);
        ctx.stroke();
      });
      // radios que giran con la cámara (refuerzan la sensación 3D)
      const rot = -this.yaw * RAD + (calm ? 0 : now / 9000);
      ctx.strokeStyle = `rgba(${CYAN},.14)`;
      for (let i = 0; i < 12; i++) {
        const a = rot + i * PI / 6;
        ctx.beginPath();
        ctx.moveTo(c0[0] + Math.cos(a) * rx * 0.43, fy + Math.sin(a) * ry * 0.43);
        ctx.lineTo(c0[0] + Math.cos(a) * rx * 1.05, fy + Math.sin(a) * ry * 1.05);
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

      /* --- figura 3D --- */
      const sk = this.skeleton(this.poseAt(now));
      const glc = GL3.render(this.buildList(sk), cam.vp, cam.eye, W * dpr, H * dpr);
      if (!glc) return;

      // sombra de contacto
      const feet = [sk.legL[2], sk.legR[2], sk.armL[2], sk.armR[2], sk.pelvis];
      const low = Math.min(...feet.map(q => q[1]));
      const near = Math.max(0, 1 - low / 90);
      const sp = feet.map(q => this.project(cam.vp, [q[0], 0, q[2]]));
      const sx = (Math.min(...sp.map(q => q[0])) + Math.max(...sp.map(q => q[0]))) / 2;
      const sw = Math.max(40, (Math.max(...sp.map(q => q[0])) - Math.min(...sp.map(q => q[0]))) * 0.7 + 30);
      ctx.save();
      const sg0 = ctx.createRadialGradient(sx, fy, 2, sx, fy, sw);
      sg0.addColorStop(0, `rgba(2,8,18,${0.6 * near})`);
      sg0.addColorStop(1, 'rgba(2,8,18,0)');
      ctx.fillStyle = sg0;
      ctx.beginPath();
      ctx.ellipse(sx, fy, sw, ry * 0.8, 0, 0, PI * 2);
      ctx.fill();
      ctx.restore();

      // reflejo
      ctx.save();
      ctx.setTransform(dpr, 0, 0, -dpr, 0, 2 * fy * dpr);
      ctx.globalAlpha = 0.13;
      ctx.drawImage(glc, 0, 0, W, H);
      ctx.restore();
      const fade = ctx.createLinearGradient(0, fy, 0, H);
      fade.addColorStop(0, 'rgba(10,17,31,.2)');
      fade.addColorStop(1, 'rgba(10,17,31,.95)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, fy + 1, W, H - fy);

      // cuerpo con halo
      const flicker = calm ? 1 : 0.96 + 0.04 * Math.sin(now / 80) * Math.sin(now / 31);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 0.95 * flicker;
      ctx.shadowColor = `rgba(${CYAN},.6)`;
      ctx.shadowBlur = 12 * dpr;
      ctx.drawImage(glc, 0, 0);
      ctx.restore();

      /* --- escaneo --- */
      ctx.save();
      ctx.globalAlpha = 0.09;
      ctx.fillStyle = '#06121a';
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.1);
      if (!calm) {
        const sweep = (now / 16) % (H + 90) - 45;
        const sg = ctx.createLinearGradient(0, sweep - 28, 0, sweep + 28);
        sg.addColorStop(0, `rgba(${CYAN},0)`);
        sg.addColorStop(0.5, `rgba(${CYAN},.26)`);
        sg.addColorStop(1, `rgba(${CYAN},0)`);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = sg;
        ctx.fillRect(0, sweep - 28, W, 56);
      }
      ctx.restore();

      /* --- pista de giro --- */
      // se muestra los primeros segundos de la sesión y desaparece
      if (hintUntil === null) hintUntil = now + 5500;
      if (now < hintUntil && this.lastDrag < 0) {
        const a = Math.min(1, (hintUntil - now) / 800);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = '600 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        const txt = '\u2194  Arrastra para girar 360\u00b0';
        const tw = ctx.measureText(txt).width + 22;
        ctx.fillStyle = 'rgba(8,16,28,.78)';
        ctx.strokeStyle = 'rgba(34,211,238,.35)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(W / 2 - tw / 2, 50, tw, 24, 12); else ctx.rect(W / 2 - tw / 2, 50, tw, 24);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(165,243,252,.95)';
        ctx.fillText(txt, W / 2, 66);
        ctx.restore();
      }
    }
  }

  /* WebGL disponible → 3D; si no, el motor 2D anatómico */
  const has3D = GL3.init(W * Math.min(2, Math.max(1, global.devicePixelRatio || 1)), H * Math.min(2, Math.max(1, global.devicePixelRatio || 1)));
  global.Hologram = has3D ? Hologram3D : Hologram2D;
  global.Hologram.is3D = has3D;
  global.Hologram.setYaw = v => { userYaw = +v || 0; };
})(window);
