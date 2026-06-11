/* ============================================================
   FitHome Pro — Motor de holograma v2
   Figura humana con volumen, reflejo, partículas y rejilla.
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
        perp: dir(p.spine + 90),
        legL: chain(pelvis, [[p.thighL, L.thigh], [p.shinL, L.shin]]),
        legR: chain(pelvis, [[p.thighR, L.thigh], [p.shinR, L.shin]]),
        armL: chain(shoulder, [[p.armL, L.uarm], [p.farmL, L.farm]]),
        armR: chain(shoulder, [[p.armR, L.uarm], [p.farmR, L.farm]])
      };
    }

    /* ---- primitivas de dibujo ---- */
    seg(p1, p2, w, color, blur) {
      const ctx = this.ctx;
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.lineCap = 'round';
      ctx.shadowColor = `rgba(${CYAN},.85)`;
      ctx.shadowBlur = blur;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    }

    limb(pts, w1, w2, color, blur) {
      this.seg(pts[0], pts[1], w1, color, blur);
      this.seg(pts[1], pts[2], w2, color, blur);
    }

    drawFigure(j, mode, now) {
      const ctx = this.ctx;
      const ghost = mode === 'ghost';
      const refl = mode === 'refl';
      const A = ghost ? 0.16 : refl ? 0.14 : 1;

      ctx.save();
      ctx.globalAlpha = A * (0.93 + 0.07 * Math.sin(now / 80) * Math.sin(now / 31));
      ctx.globalCompositeOperation = 'lighter';

      const far = `rgba(${VIOLET},.5)`;
      const haloC = `rgba(${CYAN},.30)`;
      const mainC = `rgba(${BRIGHT},.95)`;
      const blur = ghost || refl ? 0 : 12;

      // extremidades lejanas (lado L) en violeta tenue = profundidad
      this.limb(j.legL, 6.5, 5, far, blur * 0.4);
      this.limb(j.armL, 5.5, 4.5, far, blur * 0.4);

      // torso con volumen: trapecio hombros→cadera
      const [px2, py2] = j.pelvis, [sx, sy] = j.shoulder, [ux, uy] = j.perp;
      const sw = 11, hw = 7.5;
      const grad = ctx.createLinearGradient(sx, sy, px2, py2);
      grad.addColorStop(0, `rgba(${CYAN},.40)`);
      grad.addColorStop(1, `rgba(${VIOLET},.34)`);
      ctx.shadowColor = `rgba(${CYAN},.8)`;
      ctx.shadowBlur = blur;
      ctx.fillStyle = grad;
      ctx.strokeStyle = `rgba(${BRIGHT},.8)`;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(sx + ux * sw, sy + uy * sw);
      ctx.lineTo(sx - ux * sw, sy - uy * sw);
      ctx.lineTo(px2 - ux * hw, py2 - uy * hw);
      ctx.lineTo(px2 + ux * hw, py2 + uy * hw);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // halo + extremidades cercanas (lado R)
      this.limb(j.legR, 13, 11, haloC, blur * 1.4);
      this.limb(j.armR, 12, 10, haloC, blur * 1.4);
      this.limb(j.legR, 8, 6, mainC, blur);
      this.limb(j.armR, 6.5, 5, mainC, blur);

      // cuello
      this.seg(j.shoulder, [j.headC[0] - (j.headC[0] - j.shoulder[0]) * 0.45,
        j.headC[1] - (j.headC[1] - j.shoulder[1]) * 0.45], 5, mainC, blur);

      // cabeza: esfera con gradiente + visor
      const hg = ctx.createRadialGradient(
        j.headC[0] - 3, j.headC[1] - 4, 1, j.headC[0], j.headC[1], L.head + 2);
      hg.addColorStop(0, `rgba(${BRIGHT},.85)`);
      hg.addColorStop(0.55, `rgba(${CYAN},.35)`);
      hg.addColorStop(1, `rgba(${CYAN},.05)`);
      ctx.fillStyle = hg;
      ctx.strokeStyle = `rgba(${BRIGHT},.9)`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(j.headC[0], j.headC[1], L.head, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = `rgba(${CYAN},.9)`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(j.headC[0], j.headC[1] + 1.5, L.head * 0.62, Math.PI * 0.12, Math.PI * 0.88);
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
        ctx.arc(j.chest[0], j.chest[1], pr * 3, 0, Math.PI * 2);
        ctx.fill();

        // articulaciones brillantes (manos, codos, rodillas, pies)
        ctx.shadowBlur = 9;
        ctx.fillStyle = `rgba(${BRIGHT},.95)`;
        for (const pts of [j.legR, j.armR]) {
          for (let i = 1; i < pts.length; i++) {
            ctx.beginPath();
            ctx.arc(pts[i][0], pts[i][1], i === pts.length - 1 ? 3.4 : 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.fillStyle = `rgba(${VIOLET},.8)`;
        for (const pts of [j.legL, j.armL]) {
          ctx.beginPath();
          ctx.arc(pts[2][0], pts[2][1], 2.6, 0, Math.PI * 2);
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
      ctx.ellipse(CX, fy, 135, 21, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.2;
      [[112, 16, 0.45], [80, 11.5, 0.3], [46, 6.5, 0.22]].forEach(([rx, ry, a]) => {
        ctx.strokeStyle = `rgba(${CYAN},${a})`;
        ctx.beginPath();
        ctx.ellipse(CX, fy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      });
      const rot = now / 5000;
      ctx.strokeStyle = `rgba(${CYAN},.16)`;
      for (let i = 0; i < 10; i++) {
        const a = rot + i * Math.PI / 5;
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
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
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
