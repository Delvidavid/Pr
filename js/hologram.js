/* ============================================================
   FitHome Pro — Motor de holograma v3 "Entrenador"
   Silueta humana atlética: torso en V, extremidades musculadas
   con afinamiento anatómico, deltoides, manos y pies.
   Cada ejercicio define keyframes de pose (ángulos en grados,
   convención: 0° = hacia abajo, 90° = derecha, 180° = arriba).
   ============================================================ */
(function (global) {
  'use strict';

  const L = { spine: 52, neck: 11, head: 11, uarm: 30, farm: 28, thigh: 44, shin: 42 };
  const W = 360, H = 320, FLOOR = 288, CX = 180;
  const BASE_Y = FLOOR - (L.thigh + L.shin); // pelvis de pie

  // paleta holográfica
  const CYAN = '34,211,238';
  const VIOLET = '167,139,250';
  const BRIGHT = '224,252,255';

  const DEFAULT_POSE = {
    px: 0, py: 0, spine: 180, head: 180,
    thighL: 4, shinL: 2, thighR: -4, shinR: -2,
    armL: 12, farmL: 6, armR: -12, farmR: -6
  };

  const RAD = Math.PI / 180;
  const PI = Math.PI;
  const dir = a => [Math.sin(a * RAD), Math.cos(a * RAD)]; // canvas: y hacia abajo

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

  class Hologram {
    constructor(canvas) {
      this.cv = canvas;
      this.cv.width = W;
      this.cv.height = H;
      this.ctx = canvas.getContext('2d');
      this.kfs = null;
      this.total = 0;
      this.t0 = 0;
      this.raf = null;
      this.running = false;
      // partículas ascendentes
      this.parts = Array.from({ length: 16 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        s: 0.25 + Math.random() * 0.6, r: 0.7 + Math.random() * 1.6,
        a: 0.15 + Math.random() * 0.4
      }));
    }

    setExercise(anim) {
      this.kfs = anim && anim.kfs && anim.kfs.length ? anim.kfs : [{ ...DEFAULT_POSE, d: 1 }];
      this.total = this.kfs.reduce((s, k) => s + (k.d || 0.6), 0);
      this.t0 = performance.now();
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
      const clampY = y => Math.min(y, FLOOR);
      const pelvis = [CX + p.px, clampY(BASE_Y + p.py)];
      const chain = (from, segs) => {
        const pts = [from];
        let [x, y] = from;
        for (const [ang, len] of segs) {
          const d2 = dir(ang);
          x += d2[0] * len; y += d2[1] * len;
          pts.push([x, clampY(y)]);
        }
        return pts;
      };
      const torso = chain(pelvis, [[p.spine, L.spine]]);
      const shoulder = torso[1];
      const headPts = chain(shoulder, [[p.head, L.neck + L.head]]);
      const headC = [headPts[1][0], Math.min(headPts[1][1], FLOOR - L.head)];
      const sd = dir(p.spine);
      const chest = [pelvis[0] + sd[0] * L.spine * 0.68, pelvis[1] + sd[1] * L.spine * 0.68];
      return {
        pelvis, shoulder, headC, chest,
        axis: sd, perp: dir(p.spine + 90),
        legL: chain(pelvis, [[p.thighL, L.thigh], [p.shinL, L.shin]]),
        legR: chain(pelvis, [[p.thighR, L.thigh], [p.shinR, L.shin]]),
        armL: chain(shoulder, [[p.armL, L.uarm], [p.farmL, L.farm]]),
        armR: chain(shoulder, [[p.armR, L.uarm], [p.farmR, L.farm]])
      };
    }

    /* ---- cápsula cónica: músculo que se afina de w1 a w2 ---- */
    muscle(p1, p2, w1, w2, fill, stroke, blur) {
      const ctx = this.ctx;
      const a = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
      ctx.shadowColor = `rgba(${CYAN},.8)`;
      ctx.shadowBlur = blur;
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.arc(p1[0], p1[1], w1, a + PI / 2, a - PI / 2);
      ctx.arc(p2[0], p2[1], w2, a - PI / 2, a + PI / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    /* ---- pierna o brazo completo con anatomía ---- */
    limb(pts, ws, fill, stroke, blur, foot) {
      this.muscle(pts[0], pts[1], ws[0], ws[1], fill, stroke, blur);
      this.muscle(pts[1], pts[2], ws[1] * 0.92, ws[2], fill, stroke, blur);
      if (foot) {
        // pie: cápsula perpendicular a la tibia, orientada hacia fuera/adelante
        const [ax, ay] = pts[2];
        const dx = pts[2][0] - pts[1][0], dy = pts[2][1] - pts[1][1];
        const len = Math.hypot(dx, dy) || 1;
        let fx = -dy / len, fy = dx / len;
        const sign = (ax - pts[0][0]) >= 0 ? 1 : -1; // apunta al lado del avance
        if (fx * sign < 0) { fx = -fx; fy = -fy; }
        this.muscle([ax, ay], [ax + fx * 12, Math.min(ay + fy * 12, FLOOR)], 3.6, 2.6, fill, stroke, blur * 0.6);
      } else {
        // mano
        const ctx = this.ctx;
        ctx.fillStyle = stroke;
        ctx.beginPath();
        ctx.arc(pts[2][0], pts[2][1], 3, 0, PI * 2);
        ctx.fill();
      }
    }

    drawFigure(j, mode, now) {
      const ctx = this.ctx;
      const ghost = mode === 'ghost';
      const refl = mode === 'refl';
      const A = ghost ? 0.15 : refl ? 0.13 : 1;

      ctx.save();
      ctx.globalAlpha = A * (0.93 + 0.07 * Math.sin(now / 80) * Math.sin(now / 31));
      ctx.globalCompositeOperation = 'lighter';

      const blur = ghost || refl ? 0 : 10;
      const farFill = `rgba(${VIOLET},.16)`;
      const farLine = `rgba(${VIOLET},.55)`;
      const nearFill = `rgba(${CYAN},.26)`;
      const nearLine = `rgba(${BRIGHT},.9)`;

      // anatomía: [origen, articulación, extremo] en semigrosores
      const LEGW = [7.2, 4.6, 2.9];   // muslo→rodilla→tobillo
      const ARMW = [5.4, 3.9, 2.3];   // hombro→codo→muñeca

      /* extremidades lejanas (lado L): violeta tenue = profundidad */
      this.limb(j.legL, LEGW.map(w => w * 0.88), farFill, farLine, 0, true);
      this.limb(j.armL, ARMW.map(w => w * 0.88), farFill, farLine, 0, false);

      /* torso atlético en V: cadera→cintura→pecho→hombros */
      const [d0, d1] = j.axis, [ux, uy] = j.perp;
      const [px2, py2] = j.pelvis;
      const ts = [0, 0.22, 0.48, 0.74, 0.92, 1];
      const ws = [8.6, 7.6, 6.6, 9.6, 12.2, 13];
      const grad = ctx.createLinearGradient(j.shoulder[0], j.shoulder[1], px2, py2);
      grad.addColorStop(0, `rgba(${CYAN},.34)`);
      grad.addColorStop(1, `rgba(${VIOLET},.28)`);
      ctx.shadowColor = `rgba(${CYAN},.8)`;
      ctx.shadowBlur = blur;
      ctx.fillStyle = grad;
      ctx.strokeStyle = nearLine;
      ctx.lineWidth = 1.7;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ts.forEach((t, i) => {
        const x = px2 + d0 * L.spine * t + ux * ws[i];
        const y = py2 + d1 * L.spine * t + uy * ws[i];
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      for (let i = ts.length - 1; i >= 0; i--) {
        ctx.lineTo(px2 + d0 * L.spine * ts[i] - ux * ws[i], py2 + d1 * L.spine * ts[i] - uy * ws[i]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      /* cadera y deltoides */
      const knob = (p, r) => {
        ctx.fillStyle = nearFill;
        ctx.strokeStyle = nearLine;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p[0], p[1], r, 0, PI * 2);
        ctx.fill();
        ctx.stroke();
      };
      knob(j.pelvis, 6);
      knob(j.shoulder, 6.2);

      /* extremidades cercanas (lado R) con halo */
      ctx.shadowBlur = blur * 1.5;
      this.limb(j.legR, LEGW, nearFill, nearLine, blur, true);
      this.limb(j.armR, ARMW, nearFill, nearLine, blur, false);

      /* cuello */
      this.muscle(j.shoulder,
        [j.shoulder[0] + (j.headC[0] - j.shoulder[0]) * 0.5,
         j.shoulder[1] + (j.headC[1] - j.shoulder[1]) * 0.5],
        4.4, 3.4, nearFill, nearLine, blur * 0.5);

      /* cabeza: esfera con gradiente + visor */
      const hg = ctx.createRadialGradient(
        j.headC[0] - 3, j.headC[1] - 4, 1, j.headC[0], j.headC[1], L.head + 2);
      hg.addColorStop(0, `rgba(${BRIGHT},.85)`);
      hg.addColorStop(0.55, `rgba(${CYAN},.35)`);
      hg.addColorStop(1, `rgba(${CYAN},.05)`);
      ctx.fillStyle = hg;
      ctx.strokeStyle = nearLine;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(j.headC[0], j.headC[1], L.head, 0, PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = `rgba(${CYAN},.9)`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(j.headC[0], j.headC[1] + 1.5, L.head * 0.62, PI * 0.12, PI * 0.88);
      ctx.stroke();

      if (!ghost && !refl) {
        // núcleo de energía pulsante en el pecho
        const pr = 4.2 + Math.sin(now / 280) * 1.4;
        const cg = ctx.createRadialGradient(j.chest[0], j.chest[1], 0.5, j.chest[0], j.chest[1], pr * 3);
        cg.addColorStop(0, `rgba(${BRIGHT},.95)`);
        cg.addColorStop(0.4, `rgba(${CYAN},.5)`);
        cg.addColorStop(1, `rgba(${CYAN},0)`);
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(j.chest[0], j.chest[1], pr * 3, 0, PI * 2);
        ctx.fill();

        // articulaciones brillantes (codos y rodillas del lado cercano)
        ctx.shadowBlur = 8;
        ctx.fillStyle = `rgba(${BRIGHT},.9)`;
        for (const pts of [j.legR, j.armR]) {
          ctx.beginPath();
          ctx.arc(pts[1][0], pts[1][1], 2.4, 0, PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    draw(now) {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, W, H);

      /* --- plataforma holográfica: anillos + radios giratorios --- */
      const fy = FLOOR + 9;
      ctx.save();
      const fg = ctx.createRadialGradient(CX, fy, 6, CX, fy, 135);
      fg.addColorStop(0, `rgba(${CYAN},.28)`);
      fg.addColorStop(0.7, `rgba(${VIOLET},.07)`);
      fg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(CX, fy, 135, 21, 0, 0, PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.2;
      [[112, 16, 0.45], [80, 11.5, 0.3], [46, 6.5, 0.22]].forEach(([rx, ry, a]) => {
        ctx.strokeStyle = `rgba(${CYAN},${a})`;
        ctx.beginPath();
        ctx.ellipse(CX, fy, rx, ry, 0, 0, PI * 2);
        ctx.stroke();
      });
      const rot = now / 5000;
      ctx.strokeStyle = `rgba(${CYAN},.16)`;
      for (let i = 0; i < 10; i++) {
        const a = rot + i * PI / 5;
        ctx.beginPath();
        ctx.moveTo(CX + Math.cos(a) * 46, fy + Math.sin(a) * 6.5);
        ctx.lineTo(CX + Math.cos(a) * 112, fy + Math.sin(a) * 16);
        ctx.stroke();
      }
      ctx.restore();

      /* --- partículas ascendentes --- */
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

      /* --- figura: reflejo, estela y cuerpo principal --- */
      const j = this.joints(this.poseAt(now));

      ctx.save(); // reflejo bajo la plataforma
      ctx.translate(0, 2 * fy);
      ctx.scale(1, -1);
      this.drawFigure(j, 'refl', now);
      ctx.restore();
      const fade = ctx.createLinearGradient(0, fy, 0, H);
      fade.addColorStop(0, 'rgba(10,17,31,.25)');
      fade.addColorStop(1, 'rgba(10,17,31,.95)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, fy + 2, W, H - fy);

      this.drawFigure(this.joints(this.poseAt(now - 120)), 'ghost', now); // estela
      this.drawFigure(j, 'main', now);

      /* --- líneas de escaneo + barrido --- */
      ctx.save();
      ctx.globalAlpha = 0.13;
      ctx.fillStyle = '#06121a';
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.3);
      const sweep = (now / 16) % (H + 90) - 45;
      const sg = ctx.createLinearGradient(0, sweep - 28, 0, sweep + 28);
      sg.addColorStop(0, `rgba(${CYAN},0)`);
      sg.addColorStop(0.5, `rgba(${CYAN},.30)`);
      sg.addColorStop(1, `rgba(${CYAN},0)`);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = sg;
      ctx.fillRect(0, sweep - 28, W, 56);
      ctx.restore();
    }
  }

  global.Hologram = Hologram;
})(window);
