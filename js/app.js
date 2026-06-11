/* ============================================================
   FitHome Pro — Lógica de la aplicación
   ============================================================ */
'use strict';

const App = (() => {

  /* ================= ESTADO ================= */
  const KEY = 'fithome_pro_v1';

  const defaultState = () => ({
    perfil: null,            // {nombre, sexo, edad, peso, altura, objetivo, nivel}
    completados: {},         // 'YYYY-MM-DD' -> {sesiones, min, kcal, tipo}
    agua: {},                // 'YYYY-MM-DD' -> n vasos
    comidas: {},             // 'YYYY-MM-DD' -> {desayuno:true,...}
    pesos: []                // [{d:'YYYY-MM-DD', kg}]
  });

  let S = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(defaultState(), JSON.parse(raw));
    } catch (e) { /* estado corrupto: empezar de cero */ }
    return defaultState();
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(S)); }

  /* ================= UTILIDADES ================= */
  const $ = sel => document.querySelector(sel);
  const hoy = () => new Date();
  const dkey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const diaIdx = d => (d.getDay() + 6) % 7; // 0 = lunes
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function tipoSesion(date) {
    return PLANES[S.perfil.objetivo][diaIdx(date)];
  }

  function rutinaDe(tipo) {
    const ses = SESIONES[tipo];
    const niv = NIVELES[S.perfil.nivel];
    const min = Math.round(ses.lista.length * niv.rondas * (niv.work + niv.rest) / 60);
    const mets = ses.lista.map(id => EXERCISES[id].met);
    const metProm = mets.length ? mets.reduce((a, b) => a + b, 0) / mets.length : 0;
    const kcal = Math.round(metProm * S.perfil.peso * (ses.lista.length * niv.rondas * niv.work / 3600));
    return { tipo, ...ses, niv, min, kcal };
  }

  /* ================= AUDIO ================= */
  let audioCtx = null;
  function beep(freq = 880, dur = 0.12, vol = 0.25) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = freq; o.type = 'sine';
      g.gain.setValueAtTime(vol, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + dur);
    } catch (e) { /* sin audio */ }
  }

  /* ================= ONBOARDING ================= */
  let obStep = 0;
  const obData = {};

  function initOnboarding() {
    $('#onboarding').classList.remove('hidden');
    document.querySelectorAll('#ob-objetivo .ob-opt').forEach(b =>
      b.addEventListener('click', () => { obData.objetivo = b.dataset.val; obNext(); }));
    document.querySelectorAll('#ob-nivel .ob-opt').forEach(b =>
      b.addEventListener('click', () => { obData.nivel = b.dataset.val; finishOnboarding(); }));
  }

  function obShow(n) {
    obStep = Math.max(0, Math.min(3, n));
    document.querySelectorAll('.ob-step').forEach(s => s.classList.toggle('active', +s.dataset.step === obStep));
    $('#ob-bar').style.width = `${(obStep + 1) * 25}%`;
  }

  function obNext() {
    if (obStep === 0) {
      const n = $('#ob-nombre').value.trim();
      if (!n) { $('#ob-nombre').focus(); return; }
      obData.nombre = n;
    }
    if (obStep === 1) {
      obData.sexo = $('#ob-sexo').value;
      obData.edad = +$('#ob-edad').value || 28;
      obData.peso = +$('#ob-peso').value || 75;
      obData.altura = +$('#ob-altura').value || 172;
    }
    obShow(obStep + 1);
  }
  function obPrev() { obShow(obStep - 1); }

  function finishOnboarding() {
    S.perfil = { ...obData };
    if (!S.pesos.length) S.pesos.push({ d: dkey(hoy()), kg: S.perfil.peso });
    save();
    $('#onboarding').classList.add('hidden');
    arrancar();
  }

  /* ================= NAVEGACIÓN ================= */
  let vistaActual = 'inicio';

  function go(vista) {
    if (player.activo && vista !== 'player') pararPlayer();
    vistaActual = vista;
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + vista));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === vista));
    const render = { inicio: renderInicio, calendario: renderCalendario, entrenar: renderEntrenar, dieta: renderDieta, progreso: renderProgreso, biblioteca: renderBiblioteca };
    if (render[vista]) render[vista]();
    window.scrollTo({ top: 0 });
  }

  /* ================= MÉTRICAS ================= */
  function rachaActual() {
    let racha = 0;
    const d = new Date();
    if (!S.completados[dkey(d)]) d.setDate(d.getDate() - 1); // hoy aún cuenta si no has entrenado
    for (let i = 0; i < 400; i++) {
      const k = dkey(d);
      if (S.completados[k]) racha++;
      else if (tipoSesion(d) !== 'rest') break; // descanso planificado no rompe la racha
      d.setDate(d.getDate() - 1);
    }
    return racha;
  }

  function semanaActual() {
    const d = new Date();
    d.setDate(d.getDate() - diaIdx(d)); // lunes
    let n = 0;
    for (let i = 0; i < 7; i++) {
      if (S.completados[dkey(d)]) n++;
      d.setDate(d.getDate() + 1);
    }
    return n;
  }

  function totales() {
    let min = 0, kcal = 0, sesiones = 0;
    for (const k in S.completados) {
      min += S.completados[k].min;
      kcal += S.completados[k].kcal;
      sesiones += S.completados[k].sesiones;
    }
    return { min, kcal, sesiones };
  }

  function caloriasObjetivo() {
    const p = S.perfil;
    const bmr = 10 * p.peso + 6.25 * p.altura - 5 * p.edad + (p.sexo === 'm' ? 5 : -161);
    return Math.round(bmr * 1.45 + OBJETIVOS[p.objetivo].ajuste);
  }

  function macros() {
    const kcal = caloriasObjetivo();
    const prot = Math.round(S.perfil.peso * OBJETIVOS[S.perfil.objetivo].prot);
    const grasa = Math.round(kcal * 0.25 / 9);
    const carbs = Math.max(0, Math.round((kcal - prot * 4 - grasa * 9) / 4));
    return { kcal, prot, grasa, carbs };
  }

  /* ================= INICIO ================= */
  function renderInicio() {
    const d = hoy();
    $('#saludo-txt').textContent = `Hola, ${S.perfil.nombre} 👋`;
    $('#fecha-txt').textContent = `${DIAS[diaIdx(d)]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;

    // héroe: entrenamiento de hoy
    const tipo = tipoSesion(d);
    const r = rutinaDe(tipo);
    const hecho = S.completados[dkey(d)];
    let html;
    if (tipo === 'rest') {
      html = `<span class="hero-tag">Hoy</span>
        <h2>${r.icon} Día de descanso</h2>
        <p class="muted">${esc(r.desc)}</p>
        <div class="hero-meta"><span>💧 Hidrátate</span><span>😴 Duerme 7-8 h</span></div>
        <button class="btn-primary" onclick="App.go('entrenar')">¿Quieres entrenar igual?</button>`;
    } else {
      html = `<span class="hero-tag">${hecho ? '✓ Completado hoy' : 'Entrenamiento de hoy'}</span>
        <h2>${r.icon} ${esc(r.nombre)}</h2>
        <p class="muted">${esc(r.desc)}</p>
        <div class="hero-meta">
          <span>⏱ <b>${r.min} min</b></span>
          <span>🔥 <b>~${r.kcal} kcal</b></span>
          <span>📋 <b>${r.lista.length} ejercicios</b></span>
        </div>
        <button class="btn-primary" onclick="App.go('entrenar')">${hecho ? 'Entrenar otra vez ▶' : 'Empezar ahora ▶'}</button>`;
    }
    $('#hero-hoy').innerHTML = html;

    // anillo semanal
    const n = semanaActual();
    $('#ring-num').textContent = `${n}/6`;
    $('#ring-fg').style.strokeDashoffset = 314 - 314 * Math.min(1, n / 6);

    // racha y mini stats
    const racha = rachaActual();
    $('#streak-num').textContent = racha;
    $('#streak-txt').textContent = racha === 0 ? '¡Empieza hoy!' : racha === 1 ? '¡Primer día! Sigue así' : `${racha} días seguidos. Imparable`;
    const t = totales();
    $('#mini-min').textContent = t.min;
    $('#mini-kcal').textContent = t.kcal;

    renderAgua();
    $('#dieta-mini').textContent = `${caloriasObjetivo()} kcal · ${OBJETIVOS[S.perfil.objetivo].nombre}`;
  }

  function renderAgua() {
    const k = dkey(hoy());
    const n = S.agua[k] || 0;
    $('#water-txt').textContent = `${n} / 8 vasos`;
    $('#water-row').innerHTML = Array.from({ length: 8 }, (_, i) =>
      `<button class="vaso ${i < n ? 'lleno' : ''}" onclick="App.setAgua(${i + 1})">💧</button>`).join('');
  }

  function setAgua(n) {
    const k = dkey(hoy());
    S.agua[k] = (S.agua[k] === n) ? n - 1 : n; // tocar el último vaso lo deshace
    save();
    renderAgua();
  }

  /* ================= CALENDARIO ================= */
  let calRef = new Date();
  let calSel = dkey(hoy());

  function calMove(n) {
    calRef.setMonth(calRef.getMonth() + n);
    renderCalendario();
  }

  function renderCalendario() {
    const y = calRef.getFullYear(), m = calRef.getMonth();
    $('#cal-titulo').textContent = `${MESES[m]} ${y}`;
    const primero = new Date(y, m, 1);
    const inicio = diaIdx(primero);
    const diasMes = new Date(y, m + 1, 0).getDate();
    const hoyK = dkey(hoy());
    let html = '';
    for (let i = 0; i < inicio; i++) html += `<div class="cal-dia otro"></div>`;
    for (let dia = 1; dia <= diasMes; dia++) {
      const d = new Date(y, m, dia);
      const k = dkey(d);
      const tipo = tipoSesion(d);
      const done = !!S.completados[k];
      const cls = ['cal-dia', k === hoyK ? 'hoy' : '', done ? 'done' : '', k === calSel ? 'sel' : ''].join(' ');
      const dot = done ? 'done' : (tipo === 'rest' ? 'rest' : 'plan');
      html += `<div class="${cls}" onclick="App.calSelDia('${k}')">
        <span>${dia}</span><i class="dot ${dot}"></i></div>`;
    }
    $('#cal-grid').innerHTML = html;
    renderCalDetalle();
  }

  function calSelDia(k) {
    calSel = k;
    renderCalendario();
  }

  function renderCalDetalle() {
    const [y, m, dia] = calSel.split('-').map(Number);
    const d = new Date(y, m - 1, dia);
    const tipo = tipoSesion(d);
    const r = rutinaDe(tipo);
    const done = S.completados[calSel];
    const esHoy = calSel === dkey(hoy());
    const titulo = `${DIAS[diaIdx(d)]} ${dia} de ${MESES[d.getMonth()]}`;

    let html = `<div class="rutina-head">
      <div class="rutina-icon">${r.icon}</div>
      <div><h2>${esc(r.nombre)}</h2><p class="muted">${esc(titulo)}</p></div></div>`;

    if (done) {
      html += `<p style="margin-bottom:.7rem">✅ <b>Completado:</b> ${done.sesiones} sesión(es) · ${done.min} min · ~${done.kcal} kcal</p>`;
    }
    if (tipo === 'rest') {
      html += `<p class="muted">${esc(r.desc)} Aprovecha para caminar, estirar y dormir bien.</p>`;
    } else {
      html += r.lista.map(id => filaEjercicio(id, r.niv)).join('');
      html += `<p class="muted" style="margin:.6rem 0">⏱ ${r.min} min · ${r.niv.rondas} rondas · ~${r.kcal} kcal</p>`;
      if (esHoy) html += `<button class="btn-primary" onclick="App.go('entrenar')">Entrenar ahora ▶</button>`;
    }
    $('#cal-detalle').innerHTML = html;
  }

  function filaEjercicio(id, niv) {
    const e = EXERCISES[id];
    return `<div class="ex-row" onclick="App.verEjercicio('${id}')">
      <div class="ex-emoji">${e.emoji}</div>
      <div><b>${esc(e.nombre)}</b><small>${e.musculos.join(' · ')}</small></div>
      <span class="info" title="Ver técnica">ⓘ ${niv ? niv.work + 's' : ''}</span>
    </div>`;
  }

  /* ================= ENTRENAR ================= */
  function renderEntrenar(tipoForzado) {
    const d = hoy();
    const tipo = tipoForzado || tipoSesion(d);
    const r = rutinaDe(tipo);
    $('#entrenar-sub').textContent = `${DIAS[diaIdx(d)]} · nivel ${NIVELES[S.perfil.nivel].nombre.toLowerCase()}`;

    if (tipo === 'rest') {
      const alternativas = ['fullbody', 'hiit', 'core', 'mobility'];
      $('#entrenar-body').innerHTML = `
        <div class="card descanso-hero">
          <div class="big">😴</div>
          <h2>Hoy toca descansar</h2>
          <p class="muted" style="margin:.5rem 0 1rem">El descanso es parte del plan: tus músculos se reconstruyen hoy. Si aún así quieres moverte, elige una sesión:</p>
        </div>
        ${alternativas.map(t => {
          const rr = rutinaDe(t);
          return `<div class="card link-card" onclick="App.entrenarTipo('${t}')">
            <div><h3>${rr.icon} ${esc(rr.nombre)}</h3><p class="muted">${rr.min} min · ~${rr.kcal} kcal</p></div>
            <span class="chev">→</span></div>`;
        }).join('')}`;
      return;
    }

    $('#entrenar-body').innerHTML = `
      <div class="card">
        <div class="rutina-head">
          <div class="rutina-icon">${r.icon}</div>
          <div><h2>${esc(r.nombre)}</h2><p class="muted">${esc(r.desc)}</p></div>
        </div>
        <div class="hero-meta">
          <span>⏱ <b>${r.min} min</b></span>
          <span>🔁 <b>${r.niv.rondas} rondas</b></span>
          <span>🔥 <b>~${r.kcal} kcal</b></span>
        </div>
        <button class="btn-primary" onclick="App.iniciarRutina('${tipo}')">Comenzar entrenamiento ▶</button>
      </div>
      <div class="card">
        <h3>Ejercicios de la sesión <span class="muted">(toca para ver la técnica)</span></h3>
        ${r.lista.map(id => filaEjercicio(id, r.niv)).join('')}
      </div>`;
  }

  function entrenarTipo(tipo) { renderEntrenar(tipo); window.scrollTo({ top: 0 }); }

  /* ================= PLAYER ================= */
  const player = { activo: false, pasos: [], idx: 0, resto: 0, pausa: false, timer: null, rutina: null, holo: null, inicioMs: 0 };

  function iniciarRutina(tipo) {
    const r = rutinaDe(tipo);
    const pasos = [{ fase: 'prep', dur: 8, ex: r.lista[0] }];
    for (let ronda = 1; ronda <= r.niv.rondas; ronda++) {
      r.lista.forEach((id, i) => {
        pasos.push({ fase: 'trabajo', dur: r.niv.work, ex: id, ronda, num: i + 1, de: r.lista.length });
        const esUltimo = ronda === r.niv.rondas && i === r.lista.length - 1;
        if (!esUltimo) {
          const sig = i === r.lista.length - 1 ? r.lista[0] : r.lista[i + 1];
          pasos.push({ fase: 'descanso', dur: r.niv.rest, ex: sig, ronda });
        }
      });
    }
    Object.assign(player, { activo: true, pasos, idx: 0, resto: pasos[0].dur, pausa: false, rutina: r, inicioMs: Date.now() });
    go('player');
    renderPaso();
    player.timer = setInterval(tickPlayer, 1000);
  }

  function tickPlayer() {
    if (player.pausa) return;
    player.resto--;
    if (player.resto <= 0) {
      beep(1320, 0.25, 0.3);
      player.idx++;
      if (player.idx >= player.pasos.length) return finalizarRutina();
      player.resto = player.pasos[player.idx].dur;
      renderPaso();
      return;
    }
    if (player.resto <= 3) beep(880, 0.1);
    actualizarTimer();
  }

  function renderPaso() {
    const p = player.pasos[player.idx];
    const ex = EXERCISES[p.ex];
    const r = player.rutina;
    const fases = { prep: ['prep', '¡Prepárate!'], trabajo: ['trabajo', '¡A darlo todo!'], descanso: ['descanso', 'Descansa y respira'] };
    const [cls, label] = fases[p.fase];
    const sub = p.fase === 'trabajo'
      ? `Ronda ${p.ronda}/${r.niv.rondas} · Ejercicio ${p.num}/${p.de}`
      : p.fase === 'descanso' ? `Siguiente: ${ex.nombre}` : `Primer ejercicio: ${ex.nombre}`;

    $('#player-paso').textContent = `${player.idx + 1}/${player.pasos.length}`;
    $('#player-bar').style.width = `${(player.idx / player.pasos.length) * 100}%`;

    $('#player-body').innerHTML = `
      <span class="fase-tag ${cls}">${label}</span>
      <h2 class="player-exname">${ex.emoji} ${esc(ex.nombre)}</h2>
      <p class="player-sub">${esc(sub)}</p>
      <div class="holo-stage">
        <span class="holo-label">Holograma · técnica en vivo</span>
        <canvas id="holo-canvas"></canvas>
      </div>
      <div class="timer-big" id="timer-big">${fmt(player.resto)}</div>
      <div class="player-ctrl">
        <button class="ctrl-btn" onclick="App.togglePausa()" id="btn-pausa">⏸ Pausa</button>
        <button class="ctrl-btn main" onclick="App.saltarPaso()">Saltar ⏭</button>
      </div>
      <div class="player-tip"><b>Técnica:</b> ${esc(ex.instrucciones[p.fase === 'trabajo' ? 1 : 0])} ${esc(ex.consejo)}</div>`;

    if (player.holo) player.holo.stop();
    player.holo = new Hologram($('#holo-canvas'));
    player.holo.setExercise(ex.anim);
    player.holo.start();
  }

  function actualizarTimer() {
    const el = $('#timer-big');
    if (!el) return;
    el.textContent = fmt(player.resto);
    el.classList.toggle('urgente', player.resto <= 3);
  }

  const fmt = s => s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : String(s);

  function togglePausa() {
    player.pausa = !player.pausa;
    $('#btn-pausa').textContent = player.pausa ? '▶ Seguir' : '⏸ Pausa';
  }

  function saltarPaso() {
    player.idx++;
    if (player.idx >= player.pasos.length) return finalizarRutina();
    player.resto = player.pasos[player.idx].dur;
    renderPaso();
  }

  function pararPlayer() {
    clearInterval(player.timer);
    if (player.holo) player.holo.stop();
    player.activo = false;
  }

  function salirPlayer() {
    pararPlayer();
    go('entrenar');
  }

  function finalizarRutina() {
    pararPlayer();
    const min = Math.max(1, Math.round((Date.now() - player.inicioMs) / 60000));
    const r = player.rutina;
    const kcal = Math.round(r.kcal * Math.min(1, min / Math.max(1, r.min)));
    const k = dkey(hoy());
    const prev = S.completados[k] || { sesiones: 0, min: 0, kcal: 0, tipo: r.tipo };
    S.completados[k] = { sesiones: prev.sesiones + 1, min: prev.min + min, kcal: prev.kcal + kcal, tipo: r.tipo };
    save();
    beep(1568, 0.4, 0.35);

    $('#player-bar').style.width = '100%';
    $('#player-body').innerHTML = `
      <div class="fin-hero">
        <div class="big">🏆</div>
        <h2>¡Entrenamiento completado!</h2>
        <p class="muted">Gran trabajo, ${esc(S.perfil.nombre)}. Cada sesión te acerca a tu objetivo.</p>
        <div class="fin-stats">
          <div><b>${min}</b><small>minutos</small></div>
          <div><b>~${kcal}</b><small>kcal</small></div>
          <div><b>${rachaActual()}🔥</b><small>racha</small></div>
        </div>
        <button class="btn-primary" onclick="App.go('inicio')">Volver al inicio</button>
        <button class="btn-ghost" onclick="App.go('progreso')">Ver mi progreso →</button>
      </div>`;
  }

  /* ================= DIETA ================= */
  function renderDieta() {
    const m = macros();
    $('#macro-kcal').textContent = m.kcal;
    const total = m.prot * 4 + m.carbs * 4 + m.grasa * 9;
    const bars = [
      ['Proteína', m.prot, m.prot * 4, '#22d3ee'],
      ['Carbohidratos', m.carbs, m.carbs * 4, '#a78bfa'],
      ['Grasas', m.grasa, m.grasa * 9, '#fbbf24']
    ];
    $('#macro-bars').innerHTML = bars.map(([n, g, kc, c]) => `
      <div class="mbar"><small><span>${n}</span><span>${g} g</span></small>
        <div class="track"><div class="fill" style="width:${Math.round(kc / total * 100)}%;background:${c}"></div></div>
      </div>`).join('');

    const d = hoy();
    const menu = MENU[diaIdx(d)];
    const k = dkey(d);
    const hechas = S.comidas[k] || {};
    const orden = [['desayuno', 'Desayuno'], ['comida', 'Comida'], ['snack', 'Snack'], ['cena', 'Cena']];
    $('#dieta-comidas').innerHTML = orden.map(([id, label]) => {
      const c = menu[id];
      return `<div class="card comida-card ${hechas[id] ? 'hecha' : ''}" onclick="App.toggleComida('${id}')">
        <div class="comida-emoji">${c.e}</div>
        <div class="comida-info">
          <small class="muted" style="font-size:.68rem;text-transform:uppercase;letter-spacing:.6px">${label}</small>
          <b>${esc(c.n)}</b>
          <p>${esc(c.d)}</p>
          <span class="comida-kcal">~${c.kcal} kcal</span>
        </div>
        <div class="check">✓</div>
      </div>`;
    }).join('');

    $('#dieta-tips').innerHTML = `<h3>${OBJETIVOS[S.perfil.objetivo].emoji} Claves para ${OBJETIVOS[S.perfil.objetivo].nombre.toLowerCase()}</h3>
      <ul>${DIETA_TIPS[S.perfil.objetivo].map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
  }

  function toggleComida(id) {
    const k = dkey(hoy());
    S.comidas[k] = S.comidas[k] || {};
    S.comidas[k][id] = !S.comidas[k][id];
    save();
    renderDieta();
  }

  /* ================= PROGRESO ================= */
  function renderProgreso() {
    const t = totales();
    $('#stats-grid').innerHTML = [
      [rachaActual() + '🔥', 'racha actual'],
      [t.sesiones, 'entrenamientos'],
      [t.min, 'minutos totales'],
      [t.kcal, 'kcal quemadas']
    ].map(([v, l]) => `<div class="stat-box"><b>${v}</b><small>${l}</small></div>`).join('');

    // barras últimos 7 días
    const dias = [];
    const d = new Date();
    d.setDate(d.getDate() - 6);
    let max = 10;
    for (let i = 0; i < 7; i++) {
      const c = S.completados[dkey(d)];
      const min = c ? c.min : 0;
      max = Math.max(max, min);
      dias.push({ label: DIAS_CORTOS[diaIdx(d)], min });
      d.setDate(d.getDate() + 1);
    }
    $('#bars7').innerHTML = dias.map(x => `
      <div class="bar7 ${x.min ? 'on' : ''}" title="${x.min} min">
        <div class="col" style="height:${Math.max(4, Math.round(x.min / max * 100))}%"></div>
        <small>${x.label}</small>
      </div>`).join('');

    renderPesoChart();

    const hist = Object.entries(S.completados).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 15);
    $('#historial').innerHTML = hist.length ? hist.map(([k, c]) => {
      const ses = SESIONES[c.tipo] || SESIONES.fullbody;
      return `<div class="hist-row">
        <div><b>${ses.icon} ${esc(ses.nombre)}</b><br><small>${k} · ${c.min} min</small></div>
        <span class="hist-kcal">~${c.kcal} kcal</span></div>`;
    }).join('') : `<p class="muted">Aún no hay entrenamientos. ¡Tu primera sesión te espera! 💪</p>`;
  }

  function logPeso() {
    const v = parseFloat($('#peso-input').value);
    if (!v || v < 35 || v > 220) return;
    const k = dkey(hoy());
    S.pesos = S.pesos.filter(p => p.d !== k);
    S.pesos.push({ d: k, kg: v });
    S.pesos.sort((a, b) => a.d.localeCompare(b.d));
    S.perfil.peso = v;
    save();
    $('#peso-input').value = '';
    renderPesoChart();
  }

  function renderPesoChart() {
    const svg = $('#peso-chart');
    const ps = S.pesos.slice(-12);
    if (ps.length < 1) { svg.innerHTML = ''; return; }
    const vals = ps.map(p => p.kg);
    const min = Math.min(...vals) - 1, max = Math.max(...vals) + 1;
    const W = 340, H = 140, pad = 22;
    const X = i => ps.length === 1 ? W / 2 : pad + i * (W - pad * 2) / (ps.length - 1);
    const Y = v => H - pad - (v - min) / (max - min) * (H - pad * 2);
    const pts = ps.map((p, i) => `${X(i)},${Y(p.kg)}`).join(' ');
    svg.innerHTML = `
      <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#22d3ee" stop-opacity=".35"/>
        <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></linearGradient></defs>
      <polygon points="${X(0)},${H - pad} ${pts} ${X(ps.length - 1)},${H - pad}" fill="url(#pg)"/>
      <polyline points="${pts}" fill="none" stroke="#22d3ee" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${ps.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.kg)}" r="3.4" fill="#0b0f1a" stroke="#22d3ee" stroke-width="2"/>
        <text x="${X(i)}" y="${Y(p.kg) - 8}" text-anchor="middle" font-size="9" fill="#8b93a7">${p.kg}</text>`).join('')}`;
  }

  /* ================= BIBLIOTECA ================= */
  let filtroLib = 'todos';

  function renderBiblioteca() {
    $('#lib-filtros').innerHTML = Object.entries(GRUPOS).map(([k, n]) =>
      `<button class="filtro ${k === filtroLib ? 'active' : ''}" onclick="App.filtrarLib('${k}')">${n}</button>`).join('');
    const items = Object.entries(EXERCISES).filter(([, e]) => filtroLib === 'todos' || e.grupo === filtroLib);
    $('#lib-grid').innerHTML = items.map(([id, e]) => `
      <button class="lib-item" onclick="App.verEjercicio('${id}')">
        <span class="big">${e.emoji}</span>
        <b>${esc(e.nombre)}</b>
        <small>${e.musculos.join(' · ')}</small>
        <div class="nivel-pills">${[1, 2, 3].map(n => `<i class="${n <= e.dificultad ? 'on' : ''}"></i>`).join('')}</div>
      </button>`).join('');
  }

  function filtrarLib(g) { filtroLib = g; renderBiblioteca(); }

  /* ================= MODAL EJERCICIO ================= */
  let modalHolo = null;

  function verEjercicio(id) {
    const e = EXERCISES[id];
    const dif = ['Fácil', 'Media', 'Alta'][e.dificultad - 1];
    $('#modal-ex-body').innerHTML = `
      <h2>${e.emoji} ${esc(e.nombre)}</h2>
      <div class="holo-stage">
        <span class="holo-label">Holograma · técnica en vivo</span>
        <canvas id="modal-holo"></canvas>
      </div>
      <div class="ex-meta">
        ${e.musculos.map(m => `<span class="pill">💪 ${esc(m)}</span>`).join('')}
        <span class="pill">📶 Dificultad: ${dif}</span>
        <span class="pill">🏠 Sin equipo</span>
      </div>
      <div class="modal-sec"><h4>Cómo hacerlo paso a paso</h4>
        <ol>${e.instrucciones.map(i => `<li>${esc(i)}</li>`).join('')}</ol></div>
      <div class="modal-sec"><h4>⚠️ Errores comunes</h4>
        <ul>${e.errores.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>
      <div class="modal-sec"><h4>💡 Consejo pro</h4>
        <p style="font-size:.88rem;color:#d8dce8">${esc(e.consejo)}</p></div>
      <a class="btn-video" target="_blank" rel="noopener"
        href="https://www.youtube.com/results?search_query=${encodeURIComponent('como hacer ' + e.nombre + ' tecnica correcta')}">
        ▶ Ver video tutorial en YouTube</a>`;
    $('#modal-ex').classList.remove('hidden');
    if (modalHolo) modalHolo.stop();
    modalHolo = new Hologram($('#modal-holo'));
    modalHolo.setExercise(e.anim);
    modalHolo.start();
  }

  function cerrarModal() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    if (modalHolo) { modalHolo.stop(); modalHolo = null; }
  }

  /* ================= PERFIL ================= */
  function openPerfil() {
    const p = S.perfil;
    $('#pf-nombre').value = p.nombre;
    $('#pf-edad').value = p.edad;
    $('#pf-peso').value = p.peso;
    $('#pf-altura').value = p.altura;
    $('#pf-objetivo').value = p.objetivo;
    $('#pf-nivel').value = p.nivel;
    $('#modal-perfil').classList.remove('hidden');
  }

  function guardarPerfil() {
    const p = S.perfil;
    p.nombre = $('#pf-nombre').value.trim() || p.nombre;
    p.edad = +$('#pf-edad').value || p.edad;
    p.peso = +$('#pf-peso').value || p.peso;
    p.altura = +$('#pf-altura').value || p.altura;
    p.objetivo = $('#pf-objetivo').value;
    p.nivel = $('#pf-nivel').value;
    save();
    cerrarModal();
    go(vistaActual);
  }

  function resetApp() {
    if (!confirm('¿Seguro? Se borrarán tu perfil, historial y progreso de este navegador.')) return;
    localStorage.removeItem(KEY);
    location.reload();
  }

  /* ================= ARRANQUE ================= */
  function arrancar() {
    $('#app').classList.remove('hidden');
    go('inicio');
  }

  function init() {
    initOnboarding();
    if (S.perfil) {
      $('#onboarding').classList.add('hidden');
      arrancar();
    }
    // cerrar modales al tocar el fondo
    document.querySelectorAll('.modal').forEach(m =>
      m.addEventListener('click', ev => { if (ev.target === m) cerrarModal(); }));
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    go, obNext, obPrev, setAgua, calMove, calSelDia, entrenarTipo,
    iniciarRutina, togglePausa, saltarPaso, salirPlayer,
    toggleComida, logPeso, filtrarLib, verEjercicio, cerrarModal,
    openPerfil, guardarPerfil, resetApp
  };
})();
