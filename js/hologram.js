/* ============================================================
   FitHome Pro — Motor de holograma
   Figura humana animada en canvas con efecto holográfico.
   Cada ejercicio define keyframes de pose (ángulos en grados,
   convención: 0° = hacia abajo, 90° = derecha, 180° = arriba).
   ============================================================ */
(function (global) {
  'use strict';

  const L = { spine: 52, neck: 11, head: 11, uarm: 30, farm: 28, thigh: 44, shin: 42 };
  const W = 360, H = 320, FLOOR = 288, CX = 180;
  const BASE_Y = FLOOR - (L.thigh + L.shin); // pelvis de pie

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

    draw(now) {
      const ctx = this.ctx;
      const p = this.poseAt(now);
      ctx.clearRect(0, 0, W, H);

      // suelo holográfico
      const fg = ctx.createRadialGradient(CX, FLOOR + 6, 8, CX, FLOOR + 6, 130);
      fg.addColorStop(0, 'rgba(34,211,238,.30)');
      fg.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(CX, FLOOR + 8, 130, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(34,211,238,.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(CX, FLOOR + 8, 96, 13, 0, 0, Math.PI * 2);
      ctx.stroke();

      // esqueleto
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
      const legL = chain(pelvis, [[p.thighL, L.thigh], [p.shinL, L.shin]]);
      const legR = chain(pelvis, [[p.thighR, L.thigh], [p.shinR, L.shin]]);
      const armL = chain(shoulder, [[p.armL, L.uarm], [p.farmL, L.farm]]);
      const armR = chain(shoulder, [[p.armR, L.uarm], [p.farmR, L.farm]]);

      const flicker = 0.88 + 0.12 * Math.sin(now / 90) * Math.sin(now / 37);

      const strokeChain = (pts, color, width, blur) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(34,211,238,.9)';
        ctx.shadowBlur = blur;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      };

      ctx.save();
      ctx.globalAlpha = flicker;

      // extremidades "lejanas" (lado L) más tenues = sensación de profundidad
      strokeChain(legL, 'rgba(34,211,238,.45)', 7, 6);
      strokeChain(armL, 'rgba(34,211,238,.45)', 6, 6);

      // halo exterior
      strokeChain(torso.concat([headC]), 'rgba(34,211,238,.22)', 14, 18);
      strokeChain(legR, 'rgba(34,211,238,.22)', 13, 18);
      strokeChain(armR, 'rgba(34,211,238,.22)', 12, 18);

      // cuerpo principal
      strokeChain(torso, 'rgba(165,243,252,.95)', 8, 10);
      strokeChain(legR, 'rgba(165,243,252,.95)', 7, 10);
      strokeChain(armR, 'rgba(165,243,252,.95)', 6, 10);

      // cabeza
      ctx.shadowBlur = 14;
      ctx.shadowColor = 'rgba(34,211,238,.9)';
      ctx.fillStyle = 'rgba(34,211,238,.25)';
      ctx.strokeStyle = 'rgba(165,243,252,.95)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(headC[0], headC[1], L.head, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // articulaciones
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      for (const pts of [legR, armR, torso]) {
        for (const pt of pts) {
          ctx.beginPath();
          ctx.arc(pt[0], pt[1], 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // líneas de escaneo
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#06121a';
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.4);
      // barrido vertical
      const sweep = (now / 18) % (H + 80) - 40;
      const sg = ctx.createLinearGradient(0, sweep - 30, 0, sweep + 30);
      sg.addColorStop(0, 'rgba(34,211,238,0)');
      sg.addColorStop(0.5, 'rgba(34,211,238,.35)');
      sg.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = sg;
      ctx.fillRect(0, sweep - 30, W, 60);
      ctx.restore();
    }
  }

  global.Hologram = Hologram;
})(window);
