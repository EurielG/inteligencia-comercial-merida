/* Mérida: dónde crecer — Reto Datlas.
   Datos en data/*.js (generados con preparar_datos.py). */
const R = window.RESULTADOS, N = window.NEGOCIOS, G = window.AGEBS, P = window.PERSONAS;
const INDS = ['Fitness y deporte', 'Servicios para mascotas', 'Servicios profesionales'];
const ABR = { 'Fitness y deporte': 'fit', 'Servicios para mascotas': 'mas', 'Servicios profesionales': 'pro' };
const CORTO = { 'Fitness y deporte': 'Fitness', 'Servicios para mascotas': 'Mascotas', 'Servicios profesionales': 'Serv. profesionales' };
const COL = { 'Fitness y deporte': '#2f6690', 'Servicios para mascotas': '#b5543c', 'Servicios profesionales': '#6b5b95' };
const SCOL = { Positivo: '#3f8a5b', Neutral: '#b3aa9b', Negativo: '#c2412d' };
const PCOL = { A: '#3f8a5b', B: '#d9a441', C: '#6b5b95', D: '#c2412d' };
const PERFILES = {
  A: ['Comercio de barrio consolidado', 52, 'Comercio minorista y negocios pequeños; estable. Centro, Este y Sur.'],
  B: ['Corredor de servicios especializados', 27, '2.3 veces más servicios profesionales que el promedio; negocios grandes. Norte.'],
  C: ['Enclave industrial y de mayoreo', 3, 'Solo 3% de los negocios pero 14% de los ingresos; casi sin mascotas.'],
  D: ['Periferia en expansión', 19, '+25% de negocios netos; más gimnasios y estéticas que el promedio. Oeste y Sur.'],
};
const ORDEN = ['Positivo', 'Neutral', 'Negativo'];
const fmt = n => n.toLocaleString('es-MX');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Cifras de los reportes de las etapas 2 y 3 (ENIGH 2024)
const FICHA = {
  'Fitness y deporte': { tam: 232, sam: 138, porNegocio: 385, prioridad: 2,
    lectura: 'Mercado grande ($232 M) y la oferta que más crece (+30%). Entrar donde aún hay hueco, Las Américas, y competir con instalaciones bien mantenidas.',
    cliente: 'Hogar de ingreso alto con jefe de 30 a 59 años. Los hogares con niños gastan más por los cursos deportivos (11% contra 6%).' },
  'Servicios para mascotas': { tam: 245, sam: 163, porNegocio: 1000, prioridad: 1,
    lectura: 'La mayor demanda y la menor oferta por cliente. Entrar en el norte de nivel alto (Montebello, Altabrisa, Benito Juárez Norte) con citas a tiempo y urgencias que contestan.',
    cliente: 'Hogar de ingreso medio-alto sin niños pequeños; más probable si la jefa del hogar es mujer. 1 de cada 7 hogares paga veterinario.' },
  'Servicios profesionales': { tam: 137, sam: 104, porNegocio: 91, prioridad: 3,
    lectura: 'Saturado en hogares y con menos negocios que en 2024. Su cliente son las empresas del corredor norte; diferenciarse por comunicación y seguimiento.',
    cliente: 'Personas que viven solas u hogares pequeños, de ingreso y escolaridad altos. Su mercado principal son las empresas del corredor norte.' },
};
const REC = {
  'Precio': 'Publicar precios y dar un presupuesto antes de cobrar; evitar cargos sorpresa.',
  'Atención y trato': 'Capacitar a recepción y al personal en trato al cliente y dar seguimiento a cada inconformidad.',
  'Profesionalismo': 'Explicar diagnósticos y procesos en lenguaje claro y mostrar certificaciones.',
  'Calidad del resultado': 'Revisar los casos con quejas y ofrecer garantía o corrección sin costo.',
  'Tiempo y espera': 'Dar citas con hora real, avisar demoras y comprometer tiempos de entrega por escrito.',
  'Instalaciones y limpieza': 'Programa de mantenimiento visible y limpieza constante de baños, vestidores y equipo.',
  'Comunicación y seguimiento': 'Responder WhatsApp y teléfono el mismo día y avisar avances sin que el cliente tenga que preguntar.',
};

/* ---------- Estado ---------- */
let sel = [...INDS], vista = 'decision', capaMapa = 'oportunidad', sentNube = 'Negativo', sentEj = 'Negativo', temaSel = null;
const activa = i => sel.includes(i);
const charts = {};
Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
Chart.defaults.color = '#6b645a';
Chart.defaults.plugins.legend.labels.boxWidth = 12;
function hacer(id, cfg) { if (charts[id]) charts[id].destroy(); charts[id] = new Chart(document.getElementById(id), cfg); }

/* ===================== 00 TABLERO ===================== */
function matriz() {
  const pts = INDS.map(i => {
    const c = R.crecimiento.industrias[i];
    return { i, x: R.zonas_ref[i], y: +((c.n2026 / c.n2024 - 1) * 100).toFixed(1), r: Math.sqrt(FICHA[i].tam) * 2.6 };
  });
  hacer('g-matriz', {
    type: 'bubble',
    data: { datasets: pts.map(p => ({ label: p.i, data: [p], backgroundColor: COL[p.i] + (activa(p.i) ? 'cc' : '22'), borderColor: COL[p.i], borderWidth: 2 })) },
    options: { maintainAspectRatio: false, layout: { padding: 20 },
      plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => {
        const p = c.raw; return [`${p.i}`, `${fmt(p.x)} hogares objetivo por negocio`, `Oferta 2024-2026: ${p.y > 0 ? '+' : ''}${p.y}%`, `Gasto de hogares: $${FICHA[p.i].tam} M al año`]; } } } },
      scales: { x: { min: 0, max: 420, title: { display: true, text: 'Hogares A/B y C+ por negocio (más = menos competencia)' } },
        y: { min: -15, max: 40, title: { display: true, text: 'Cambio en el número de negocios, %' } } } },
  });
}

function podio() {
  document.getElementById('podio').innerHTML = [...INDS].sort((a, b) => FICHA[a].prioridad - FICHA[b].prioridad).map(i =>
    `<li class="${activa(i) ? '' : 'fuera'}" style="--c:${COL[i]}"><span class="num">${FICHA[i].prioridad}</span><div><h4>${i}</h4><p>${FICHA[i].lectura}</p></div></li>`).join('');
}

function comparativa() {
  const S = R.sentimiento.industrias, pct = (i, s) => Math.round(100 * S[i][s] / ORDEN.reduce((a, k) => a + S[i][k], 0));
  const filas = [
    ['Negocios en Mérida (2026)', i => R.crecimiento.industrias[i].n2026, v => fmt(v), null],
    ['Cambio de negocios 2024-2026', i => (R.crecimiento.industrias[i].n2026 / R.crecimiento.industrias[i].n2024 - 1) * 100, v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`, null],
    ['Gasto anual de los hogares', i => FICHA[i].tam, v => `$${v} M`, 'max'],
    ['Gasto de hogares por negocio', i => FICHA[i].porNegocio, v => (v >= 1000 ? '$1.0 millón' : `$${v} mil`), 'max'],
    ['Hogares objetivo por negocio', i => R.zonas_ref[i], v => fmt(v), 'max'],
    ['Concentración (HHI)', i => R.concentracion.industrias[i].hhi, v => fmt(v), null],
    ['Reseñas positivas', i => pct(i, 'Positivo'), v => `${v}%`, null],
    ['Reseñas negativas (clientes insatisfechos)', i => pct(i, 'Negativo'), v => `${v}%`, 'max'],
  ];
  document.getElementById('comparativa').innerHTML =
    `<tr><th></th>${INDS.map(i => `<th class="${activa(i) ? '' : 'fuera'}"><i class="punto ${ABR[i]}"></i>${CORTO[i]}</th>`).join('')}</tr>` +
    filas.map(([t, f, form, regla]) => {
      const vals = INDS.map(f), mejor = regla ? Math.max(...vals.filter((_, k) => activa(INDS[k]))) : null;
      return `<tr><td>${t}</td>${INDS.map((i, k) => `<td class="${activa(i) ? '' : 'fuera'} ${regla && activa(i) && vals[k] === mejor && sel.length > 1 ? 'mejor' : ''}">${form(vals[k])}</td>`).join('')}</tr>`;
    }).join('');
}

/* ===================== 01 TERRITORIO ===================== */
function grafZonas() {
  const zonas = ['Norte', 'Este', 'Centro', 'Oeste', 'Sur'];
  hacer('g-zonas', {
    type: 'bar',
    data: { labels: zonas, datasets: sel.map(i => ({ label: CORTO[i], data: zonas.map(z => R.por_zona[i][z]), backgroundColor: COL[i], borderRadius: 6 })) },
    options: { maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmt(c.raw)} negocios` } } },
      scales: { x: { grid: { display: false } }, y: { title: { display: true, text: 'Negocios' } } } },
  });
}

function anatomia() {
  document.getElementById('anatomia').innerHTML = Object.entries(PERFILES).map(([k, v]) =>
    `<div style="width:${v[1]}%;background:${PCOL[k]}" title="Perfil ${k}: ${v[1]}%">${v[1] >= 8 ? k + ' · ' + v[1] + '%' : k}</div>`).join('');
  document.getElementById('perfiles-lista').innerHTML = Object.entries(PERFILES).map(([k, v]) =>
    `<div class="pf"><i style="background:${PCOL[k]}">${k}</i><div><b>${v[0]}</b><span>${v[2]}</span></div></div>`).join('');
}

/* ===================== 02 ATRACTIVIDAD ===================== */
function grafTam() {
  hacer('g-tam', {
    type: 'bar',
    data: { labels: sel.map(i => CORTO[i]), datasets: [
      { label: 'Cliente ideal', data: sel.map(i => FICHA[i].sam), backgroundColor: sel.map(i => COL[i]), borderRadius: 6 },
      { label: 'Resto de los hogares', data: sel.map(i => FICHA[i].tam - FICHA[i].sam), backgroundColor: sel.map(i => COL[i] + '44'), borderRadius: 6 }] },
    options: { maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: $${c.raw} M`, footer: it => `Total: $${FICHA[sel[it[0].dataIndex]].tam} M al año` } } },
      scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, title: { display: true, text: 'Millones de pesos al año' } } } },
  });
}

function grafRanking() {
  const r = R.ranking;
  hacer('g-ranking', {
    type: 'bar',
    data: { labels: r.map(x => x.industria), datasets: [{ data: r.map(x => x.score), borderRadius: 4,
      backgroundColor: r.map(x => (x.foco ? (activa(x.industria) ? COL[x.industria] : COL[x.industria] + '44') : '#d8d0c2')) }] },
    options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false },
      tooltip: { callbacks: { label: c => { const x = r[c.dataIndex]; return [`Puntaje: ${x.score}`, `Negocios: ${fmt(x.negocios)}`, `Nuevos en 24 meses: ${Math.round(x.tasa_reciente * 100)}%`]; } } } },
      scales: { x: { max: 100 }, y: { grid: { display: false } } } },
  });
}

function grafCrec() {
  const subs = R.crecimiento.subcategorias.filter(s => activa(s.industria))
    .map(s => ({ ...s, cambio: s.n2024 ? (s.n2026 / s.n2024 - 1) * 100 : 100 })).sort((a, b) => b.cambio - a.cambio).slice(0, 14);
  const et = s => (s.subcategoria.length > 40 ? s.subcategoria.slice(0, 38) + '…' : s.subcategoria);
  hacer('g-crec', {
    type: 'bar',
    data: { labels: subs.map(et), datasets: [{ data: subs.map(s => +s.cambio.toFixed(1)), borderRadius: 4, backgroundColor: subs.map(s => (s.cambio >= 0 ? COL[s.industria] : '#c2412d88')) }] },
    options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false },
      tooltip: { callbacks: { title: it => subs[it[0].dataIndex].subcategoria, label: c => { const s = subs[c.dataIndex]; return [`${s.cambio > 0 ? '+' : ''}${s.cambio.toFixed(1)}%`, `${s.n2024} → ${s.n2026} negocios`]; } } } },
      scales: { x: { title: { display: true, text: '% de cambio' } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } } },
  });
}

function clienteIdeal() {
  document.getElementById('cliente-ideal').innerHTML = '<p class="nota">En las tres industrias el cliente es un hogar de ingreso y escolaridad altos: el 20% más rico tiene de 4 a 9 veces más probabilidad de gastar en ellas. En Mérida hay unos 92 mil hogares así, la mayoría en el norte.</p>' +
    sel.map(i => `<div class="ideal" style="--c:${COL[i]}"><h4>${i}</h4><p>${FICHA[i].cliente}</p></div>`).join('');
}

/* ===================== 03 COMPETENCIA ===================== */
function grafHhi() {
  const subs = R.concentracion.subcategorias.filter(s => activa(s.industria)).sort((a, b) => b.hhi - a.hhi);
  document.getElementById('g-hhi').parentElement.style.height = (90 + 26 * subs.length) + 'px';
  const umbral = { id: 'umbral', afterDatasetsDraw(ch) {
    const x = ch.scales.x.getPixelForValue(1500); if (x < ch.chartArea.left || x > ch.chartArea.right) return;
    const ctx = ch.ctx; ctx.save(); ctx.strokeStyle = '#b5543c'; ctx.setLineDash([5, 4]); ctx.beginPath();
    ctx.moveTo(x, ch.chartArea.top); ctx.lineTo(x, ch.chartArea.bottom); ctx.stroke();
    ctx.fillStyle = '#b5543c'; ctx.font = '11px Inter'; ctx.fillText('1,500', x + 4, ch.chartArea.top + 10); ctx.restore(); } };
  const et = s => (s.subcategoria.length > 44 ? s.subcategoria.slice(0, 42) + '…' : s.subcategoria);
  hacer('g-hhi', {
    type: 'bar', plugins: [umbral],
    data: { labels: subs.map(et), datasets: [{ data: subs.map(s => s.hhi), borderRadius: 4, backgroundColor: subs.map(s => COL[s.industria]) }] },
    options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false },
      tooltip: { callbacks: { title: it => subs[it[0].dataIndex].subcategoria, label: c => { const s = subs[c.dataIndex]; return [`HHI: ${fmt(s.hhi)}`, `${s.negocios} negocios de ${s.empresas} empresas`, `4 más grandes: ${Math.round(s.cr4 * 100)}%`, `Más grande: ${s.lider} (${Math.round(s.lider_part * 100)}%)`]; } } } },
      scales: { x: { max: Math.max(2000, ...subs.map(s => s.hhi)) * 1.05 }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } } },
  });
}

function topZonas(i, est, n) {
  const t = ABR[i], o = est === 'recomendada' ? 1 : -1, vistas = new Set(), out = [];
  for (const f of G.features.filter(f => f.properties[t + '_est'] === est).sort((a, b) => o * (b.properties[t + '_idx'] - a.properties[t + '_idx']))) {
    const c = f.properties.colonia || f.properties.clave; if (!vistas.has(c)) { vistas.add(c); out.push(f); } if (out.length === n) break;
  }
  return out;
}

function dondeEntrar() {
  document.getElementById('donde-entrar').innerHTML = sel.map(i => {
    const t = ABR[i], top = topZonas(i, 'recomendada', 5), max = top.length ? top[0].properties[t + '_idx'] : 1;
    return `<div class="zona-ind" style="--c:${COL[i]}"><h4><i class="punto ${t}"></i>${i}</h4>` +
      top.map(f => `<div class="zona-fila"><span>${esc(f.properties.colonia || f.properties.clave)}</span><div class="barra-z"><i style="width:${100 * f.properties[t + '_idx'] / max}%"></i></div><b>${f.properties[t + '_idx']}x</b></div>`).join('') +
      `<div class="zona-sat">Saturadas: ${topZonas(i, 'saturada', 4).map(f => esc(f.properties.colonia || f.properties.clave)).join(', ')}</div></div>`;
  }).join('');
}

/* ===================== 04 VOZ DEL CLIENTE ===================== */
function cifrasVoz() {
  const S = R.sentimiento.industrias, suma = k => sel.reduce((a, i) => a + S[i][k], 0), tot = ORDEN.reduce((a, k) => a + suma(k), 0);
  document.getElementById('cifras-voz').innerHTML =
    `<div><b>${fmt(tot)}</b><span>reseñas de Google Maps con texto</span></div>` +
    `<div><b style="color:${SCOL.Positivo}">${Math.round(100 * suma('Positivo') / tot)}%</b><span>hablan bien del negocio</span></div>` +
    `<div><b style="color:${SCOL.Negativo}">${Math.round(100 * suma('Negativo') / tot)}%</b><span>son quejas</span></div>` +
    `<div><b>89.9%</b><span>de coincidencia del modelo con las estrellas del cliente</span></div>`;
}

function colorQueja(p) { // verde (pocas quejas) → amarillo → rojo (muchas)
  const t = Math.min(p / 60, 1);
  const a = [63, 138, 91], b = [217, 164, 65], c = [194, 65, 45];
  const mix = (x, y, u) => x.map((v, k) => Math.round(v + (y[k] - v) * u));
  const rgb = t < 0.5 ? mix(a, b, t / 0.5) : mix(b, c, (t - 0.5) / 0.5);
  return `rgb(${rgb.join(',')})`;
}

function semaforo() {
  const A = R.sentimiento.aspectos, temas = A[INDS[0]].map(a => a.aspecto);
  const celda = (i, tema) => {
    const a = A[i].find(x => x.aspecto === tema);
    if (a.menciones < 15) return `<td class="vacia">pocas reseñas</td>`;
    const p = Math.round(100 * a.negativas / a.menciones);
    const s = temaSel && temaSel[0] === i && temaSel[1] === tema ? 'sel' : '';
    return `<td class="celda ${s}" data-i="${i}" data-t="${tema}" style="background:${colorQueja(p)};color:#fff">${p}%<small>${a.menciones} reseñas</small></td>`;
  };
  document.getElementById('semaforo').innerHTML = `<tr><th>Tema</th>${sel.map(i => `<th><i class="punto ${ABR[i]}"></i>${CORTO[i]}</th>`).join('')}</tr>` +
    temas.map(t => `<tr><td>${t}</td>${sel.map(i => celda(i, t)).join('')}</tr>`).join('');
  document.querySelectorAll('#semaforo .celda').forEach(c => c.addEventListener('click', () => { temaSel = [c.dataset.i, c.dataset.t]; semaforo(); }));
  if (!temaSel || !activa(temaSel[0])) {
    let mejor = null; sel.forEach(i => A[i].forEach(a => { if (a.menciones >= 30) { const p = a.negativas / a.menciones; if (!mejor || p > mejor[2]) mejor = [i, a.aspecto, p]; } }));
    if (mejor) { temaSel = [mejor[0], mejor[1]]; return semaforo(); }
  }
  detalleTema();
}

function detalleTema() {
  const el = document.getElementById('detalle-tema');
  if (!temaSel) { el.innerHTML = ''; return; }
  const [i, t] = temaSel, a = R.sentimiento.aspectos[i].find(x => x.aspecto === t), ev = R.sentimiento.evidencia[i][t] || {};
  const lista = (arr, color) => (arr && arr.length ? arr.map(x => `<blockquote style="--q:${color}">${esc(x)}</blockquote>`).join('') : '<p class="nota">Sin ejemplos claros.</p>');
  el.innerHTML = `<div class="det"><h4>${t} · ${i}</h4>
    <p class="nota">${a.menciones} reseñas lo mencionan; ${Math.round(100 * a.negativas / a.menciones)}% son quejas y ${a.menciones - a.negativas} no.</p>
    <div class="rec"><b>Qué haría un negocio nuevo:</b> ${REC[t]}</div>
    <div class="dos-col"><div><h5 style="color:${SCOL.Negativo}">Lo que reclaman</h5>${lista(ev.Negativo, SCOL.Negativo)}</div>
    <div><h5 style="color:${SCOL.Positivo}">Lo que elogian</h5>${lista(ev.Positivo, SCOL.Positivo)}</div></div></div>`;
}

function grafSent() {
  const S = R.sentimiento.industrias, pct = (i, s) => +(100 * S[i][s] / ORDEN.reduce((a, k) => a + S[i][k], 0)).toFixed(1);
  hacer('g-sent', {
    type: 'bar',
    data: { labels: sel.map(i => CORTO[i]), datasets: ORDEN.map(s => ({ label: { Positivo: 'Elogios', Neutral: 'Neutral', Negativo: 'Quejas' }[s], data: sel.map(i => pct(i, s)), backgroundColor: SCOL[s] })) },
    options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.raw}%` } } },
      scales: { x: { stacked: true, max: 100, title: { display: true, text: '% de reseñas' } }, y: { stacked: true, grid: { display: false } } } },
  });
}

function nube() {
  const cuenta = {};
  sel.forEach(i => R.sentimiento.palabras[i][sentNube].forEach(([w, n]) => { cuenta[w] = (cuenta[w] || 0) + n; }));
  const lista = Object.entries(cuenta).sort((a, b) => b[1] - a[1]).slice(0, 80);
  if (!lista.length) return;
  const max = lista[0][1];
  const tonos = { Negativo: ['#7a2416', '#a8331f', '#c2412d', '#d9705c'], Positivo: ['#1f4d33', '#2f6b47', '#3f8a5b', '#6aa883'], Neutral: ['#4a443c', '#6b645a', '#8d8578', '#a99f90'] }[sentNube];
  WordCloud(document.getElementById('nube'), { list: lista, fontFamily: 'Fraunces, Georgia, serif', weightFactor: n => 13 + 62 * Math.sqrt(n / max),
    color: () => tonos[Math.floor(Math.random() * tonos.length)], rotateRatio: 0, backgroundColor: '#fffdf9', gridSize: 7, shuffle: false });
}

function ejemplos() {
  const q = document.getElementById('buscar').value.trim().toLowerCase();
  const lista = R.sentimiento.ejemplos.filter(e => activa(e.industria) && e.sentimiento === sentEj && (!q || e.texto.toLowerCase().includes(q)));
  const marcar = t => (q ? esc(t).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${m}</mark>`) : esc(t));
  document.getElementById('ejemplos').innerHTML = lista.length
    ? lista.slice(0, 60).map(e => `<div class="resena"><div class="meta"><i class="punto ${ABR[e.industria]}"></i>${CORTO[e.industria]}${e.negocio ? ' · ' + esc(e.negocio) : ''}</div>${marcar(e.texto)}</div>`).join('')
    : '<p class="nota">No hay reseñas con esa palabra en esta selección.</p>';
}

/* ===================== 05 MODELO PREDICTIVO ===================== */
const M = R.modelo;
const MCOL = { faltante: '#1f5f8b', abajo: '#9cc3dd', acorde: '#ece6da', arriba: '#f0b98f', sobreoferta: '#c2412d', sin_viviendas: '#f6f3ee' };
const MTXT = { faltante: 'Oferta faltante', abajo: 'Algo menos de lo esperado', acorde: 'Acorde a lo esperado', arriba: 'Algo más de lo esperado', sobreoferta: 'Sobreoferta', sin_viviendas: 'Casi sin viviendas' };
const veredicto = d2 => (d2 >= 0.5 ? 'Predice bien' : d2 >= 0.3 ? 'Predicción moderada' : 'Predicción débil: usar como señal');

function cifrasModelo() {
  const suma = f => sel.reduce((a, i) => a + f(M[i]), 0), varias = sel.length > 1 ? ', sumando las industrias elegidas' : '';
  document.getElementById('cifras-modelo').innerHTML =
    `<div><b>${suma(m => m.n.faltante)}</b><span>AGEB con oferta faltante: 60% o menos de los negocios esperados${varias}</span></div>` +
    `<div><b>${suma(m => m.n.sobreoferta)}</b><span>AGEB con sobreoferta: 1.6 veces o más de lo esperado${varias}</span></div>` +
    `<div><b>${suma(m => m.coincide.rec_abajo)} de ${suma(m => m.coincide.recomendadas)}</b><span>zonas recomendadas en la Etapa 3 tienen menos oferta de la esperada</span></div>` +
    `<div><b>14</b><span>variables por AGEB: hogares, viviendas, otros negocios y ubicación</span></div>`;
}

function tablaModelo() {
  const filas = [
    ['Negocios en Mérida', m => fmt(m.negocios)],
    ['AGEB sin ningún negocio', m => Math.round(m.agebs_cero * 100) + '%'],
    ['Error promedio del modelo (negocios por AGEB)', m => m.metricas.rf.mae],
    ['Error si se adivina siempre el promedio', m => m.metricas.base_mae],
    ['Reducción del error', m => Math.round(100 * (1 - m.metricas.rf.mae / m.metricas.base_mae)) + '%'],
    ['Variación explicada (D², random forest)', m => m.metricas.rf.d2],
    ['Variación explicada (D², regresión de Poisson)', m => m.metricas.poisson.d2],
    ['Acierta el orden de las zonas (Spearman)', m => m.metricas.rf.spearman],
    ['Veredicto', m => veredicto(m.metricas.rf.d2)],
  ];
  document.getElementById('tabla-modelo').innerHTML =
    `<tr><th></th>${sel.map(i => `<th><i class="punto ${ABR[i]}"></i>${CORTO[i]}</th>`).join('')}</tr>` +
    filas.map(([t, f]) => `<tr><td>${t}</td>${sel.map(i => `<td>${f(M[i])}</td>`).join('')}</tr>`).join('');
}

function faltantesModelo() {
  document.getElementById('faltantes-modelo').innerHTML = sel.map(i => {
    const t = ABR[i];
    return `<div class="zona-ind" style="--c:${COL[i]}"><h4><i class="punto ${t}"></i>${i}</h4>` +
      M[i].faltantes.slice(0, 6).map(f => `<div class="zona-fila m"><span>${esc(f.colonia)}${f.e3 === 'recomendada' ? ' ★' : ''}` +
        `<small>${f.n_ageb} AGEB a la redonda · en la AGEB: hay ${f.real_ageb}, se esperan ${f.esp_ageb}</small></span>` +
        `<div class="barra-z" title="En 1.5 km a la redonda hay ${f.real} de ${f.esperado} esperados"><i style="width:${Math.min(100, 100 * f.real / f.esperado)}%"></i></div>` +
        `<b>${f.real} / ${Math.round(f.esperado)}</b></div>`).join('') +
      (i === 'Fitness y deporte' ? `<p class="aviso">Ojo: en fitness lo que más pesa es la actividad comercial de la zona, así que el modelo tiende a esperar de más en zonas muy comerciales como Campestre o México. Tómalo como zonas a revisar, no como recomendación. La Etapa 3 las marca cerca del promedio de la ciudad (0.8 a 1.1 veces), sin saturación.</p>` : '') + '</div>';
  }).join('');
}

function importanciaModelo() {
  document.getElementById('importancia-modelo').innerHTML = sel.map(i => {
    const imp = M[i].importancia, max = imp[0].peso;
    return `<div class="zona-ind" style="--c:${COL[i]}"><h4><i class="punto ${ABR[i]}"></i>${i}</h4>` +
      imp.map(v => `<div class="zona-fila imp"><span>${v.variable}</span><div class="barra-z"><i style="width:${100 * v.peso / max}%"></i></div><b>${Math.round(v.peso * 100)}%</b></div>`).join('') + '</div>';
  }).join('');
}

function coincideModelo() {
  const texto = {
    'Servicios para mascotas': c => `<b>${c.rec_abajo} de ${c.recomendadas}</b> zonas recomendadas en la Etapa 3 tienen menos veterinarias de las que el modelo espera, y ${c.rec_con_faltante} caen en oferta faltante (Altabrisa, Montebello, San Ramón Norte). Dos métodos distintos apuntan al mismo lugar, aunque este es el modelo menos preciso (dos de cada tres AGEB no tienen veterinaria), así que sirve como confirmación y no como cifra exacta. El modelo agrega zonas que la Etapa 3 no marcaba, como Pedregales de Tanlum y Chuburná de Hidalgo.`,
    'Fitness y deporte': c => `<b>${c.rec_abajo} de ${c.recomendadas}</b> zonas recomendadas tienen menos gimnasios de los esperados, pero solo ${c.rec_con_faltante} llegan a oferta faltante. El modelo espera más gimnasios donde hay mucha actividad comercial (Campestre, México, Buenavista), pero ahí la Etapa 3 marca zonas cerca del promedio (0.8 a 1.1 veces), sin saturación ni hueco claro: más tiendas y oficinas no significan más clientes de gimnasio, así que en esas zonas el modelo probablemente espera de más. Las dos lecturas se complementan: una mide clientes por negocio y la otra compara con zonas parecidas.`,
    'Servicios profesionales': c => `<b>${c.rec_abajo} de ${c.recomendadas}</b> zonas recomendadas tienen menos despachos de los esperados y <b>${c.sat_con_sobre} de ${c.saturadas}</b> zonas saturadas tienen más de lo esperado. El modelo confirma la saturación del centro. Para despachos, lo que más pesa es que haya otros servicios a empresas cerca, no los hogares: su cliente son las empresas.`,
  };
  document.getElementById('coincide-modelo').innerHTML = sel.map(i =>
    `<p style="--c:${COL[i]}"><i class="punto ${ABR[i]}"></i><b>${i}.</b> ${texto[i](M[i].coincide)}</p>`).join('');
}

/* ===================== EXPLORADOR ===================== */
let mapa, capaAgeb, capaPuntos;
const NSE_COL = { 'A/B': '#1f3d33', 'C+': '#3f6b55', 'C': '#8fb09b', 'C-': '#d5e2d6', 'D+': '#f0d9b5', 'D': '#dba26b', 'E': '#b5543c', 'Sin dato': '#eeeeee' };
const indMapa = () => (sel.length === 1 ? sel[0] : sel.includes('Servicios para mascotas') ? 'Servicios para mascotas' : sel[0]);

const MIX = R.industrias_mezcla;
const PCT_COL = [['#f6f3ee', 'Menos de 10 negocios en la AGEB'], ['#ece6da', '0%'], ['#d6e4ef', 'Menos de 1%'], ['#9cc3dd', '1% a 3%'], ['#4f8fbf', '3% a 6%'], ['#1f4f7a', '6% o más']];
function pctInd(p) { const tot = p.mix.reduce((a, b) => a + b, 0); return { tot, n: p.mix[MIX.indexOf(indMapa())], pct: tot ? 100 * p.mix[MIX.indexOf(indMapa())] / tot : 0 }; }
function colorPct(p) {
  const { tot, n, pct } = pctInd(p);
  return tot < 10 ? PCT_COL[0][0] : n === 0 ? PCT_COL[1][0] : pct < 1 ? PCT_COL[2][0] : pct < 3 ? PCT_COL[3][0] : pct < 6 ? PCT_COL[4][0] : PCT_COL[5][0];
}
function mezclaHtml(p) {
  const tot = p.mix.reduce((a, b) => a + b, 0), n3 = INDS.map(i => p.mix[MIX.indexOf(i)]), suma = n3.reduce((a, b) => a + b, 0);
  if (!suma) return `<div class="mezcla"><b>Nuestras 3 industrias en esta AGEB</b><br><i>Ningún negocio de las 3 industrias${tot ? ` (hay ${fmt(tot)} negocios de otros giros)` : ''}</i></div>`;
  const pct = n => (100 * n / suma).toFixed(1);
  return `<div class="mezcla"><b>Nuestras 3 industrias en esta AGEB · ${suma} negocios</b>` +
    `<div class="apilada">${INDS.map((i, k) => n3[k] ? `<i title="${i}: ${pct(n3[k])}%" style="width:${100 * n3[k] / suma}%;background:${COL[i]}"></i>` : '').join('')}</div>` +
    `<div class="mz3">${INDS.map((i, k) => `<span><i class="punto ${ABR[i]}"></i>${CORTO[i]} <b>${pct(n3[k])}%</b> · ${n3[k]}</span>`).join('')}</div>` +
    `<small class="mz-nota">Son ${Math.round(100 * suma / tot)}% de los ${fmt(tot)} negocios de la AGEB</small></div>`;
}

function colorOport(p) {
  const t = ABR[indMapa()], est = p[t + '_est'], idx = p[t + '_idx'];
  if (p.objetivo === 0 && p.viviendas < 100) return '#f1ede6';
  if (est === 'recomendada') return '#2f7a4b';
  if (est === 'saturada') return '#c2412d';
  return idx >= 1 ? '#9cc7a6' : idx >= 0.5 ? '#f0d58c' : '#e8a77f';
}
function estilo(f) {
  const p = f.properties;
  const fill = capaMapa === 'nse' ? NSE_COL[p.nse] || '#eee' : capaMapa === 'perfil' ? PCOL[p.perfil] || '#ebe6dd'
    : capaMapa === 'modelo' ? MCOL[p[ABR[indMapa()] + '_mod']] : capaMapa === 'mezcla' ? colorPct(p) : colorOport(p);
  return { weight: 0.6, color: '#fffdf9', fillOpacity: capaMapa === 'perfil' && !p.perfil ? 0.4 : 0.75, fillColor: fill };
}
function popupAgeb(p) {
  const i = indMapa(), t = ABR[i], est = { recomendada: 'zona recomendada', saturada: 'zona saturada', neutral: 'sin señal clara' }[p[t + '_est']];
  return `<b>${esc(p.colonia || 'AGEB ' + p.clave)}</b><br>Tipo de territorio: ${p.perfil ? p.perfil + ' · ' + PERFILES[p.perfil][0] : 'sin perfil (menos de 30 negocios)'}<br>` +
    `Nivel socioeconómico: ${p.nse} · ${fmt(p.viviendas)} viviendas (${fmt(p.objetivo)} A/B o C+)<hr style="margin:6px 0;border:0;border-top:1px solid #ddd">` +
    `<b>${i}</b> a 1.5 km: ${fmt(p[t + '_hog'])} hogares objetivo y ${p[t + '_neg']} negocios → ${p[t + '_idx']}x el promedio, ${est}` +
    `<br>Modelo, en 1.5 km a la redonda: hay ${p[t + '_mreal']} negocios y se esperan ${p[t + '_mesp']} → ${MTXT[p[t + '_mod']].toLowerCase()}` +
    `<br>Modelo, solo en esta AGEB: hay ${p[t + '_mareal']} y se esperan ${p[t + '_maesp']}` +
    `<hr style="margin:6px 0;border:0;border-top:1px solid #ddd">` + mezclaHtml(p);
}
function leyenda() {
  const filas = capaMapa === 'nse' ? Object.entries(NSE_COL).map(([k, v]) => [v, k])
    : capaMapa === 'perfil' ? Object.entries(PERFILES).map(([k, v]) => [PCOL[k], `${k} · ${v[0]}`]).concat([['#ebe6dd', 'Sin perfil']])
    : capaMapa === 'modelo' ? Object.entries(MTXT).map(([k, v]) => [MCOL[k], v])
    : capaMapa === 'mezcla' ? PCT_COL.map(([c, t]) => [c, t])
    : [['#2f7a4b', 'Recomendada'], ['#9cc7a6', 'Arriba del promedio'], ['#f0d58c', '0.5 a 1 vez el promedio'], ['#e8a77f', 'Menos de la mitad'], ['#c2412d', 'Saturada'], ['#f1ede6', 'Casi sin viviendas']];
  document.getElementById('leyenda').innerHTML = (['oportunidad', 'modelo', 'mezcla'].includes(capaMapa) ? `<p class="nota"><b>${indMapa()}</b>${sel.length > 1 ? ' (elige una sola industria en el menú para cambiarla)' : ''}</p>` : '') +
    filas.map(([c, t]) => `<div class="fila"><span class="caja-l" style="background:${c}"></span>${t}</div>`).join('');
  document.getElementById('nota-mapa').textContent = capaMapa === 'oportunidad'
    ? 'Oportunidad: hogares de nivel A/B y C+ por negocio en 1.5 km, comparado con el promedio de la ciudad. Recomendada: 3,000+ hogares objetivo, 1.5 veces o más el promedio y estable con radios de 1 a 2 km. Saturada: mucha oferta y menos de la mitad del promedio.'
    : capaMapa === 'modelo' ? 'Modelo predictivo (random forest): negocios reales en 1.5 km a la redonda (suma de unas 10 a 20 AGEB vecinas) frente a los que el modelo espera según los hogares y la actividad comercial de la zona. Oferta faltante: 60% o menos de lo esperado y al menos 2 negocios menos. Sobreoferta: 1.6 veces o más y al menos 2 de más.'
    : capaMapa === 'mezcla' ? `Porcentaje de los negocios de cada AGEB que son de ${indMapa()} (DENUE 2026). Da clic en una AGEB para ver cómo se reparten sus negocios entre las 10 industrias.`
    : capaMapa === 'perfil' ? 'Tipos de territorio de la Etapa 1: agrupamiento k-means de las AGEB con 30 o más negocios, ordenados del más central (A) al más periférico (D).'
    : 'Nivel socioeconómico predominante de cada AGEB según la regla AMAI, con base en el Censo 2020.';
}
function indicadores() {
  const t = ABR[indMapa()], cuenta = e => G.features.filter(f => f.properties[t + '_est'] === e).length;
  document.getElementById('indicadores').innerHTML =
    `<div><b>${fmt(N.filas.filter(f => activa(N.industrias[f[2]])).length)}</b><span>negocios</span></div>` +
    `<div><b>${fmt(G.features.reduce((a, f) => a + f.properties.objetivo, 0))}</b><span>viviendas A/B y C+</span></div>` +
    (capaMapa === 'mezcla' ? `<div><b>${(100 * N.filas.filter(f => N.industrias[f[2]] === indMapa()).length / G.features.reduce((a, f) => a + f.properties.mix.reduce((x, y) => x + y, 0), 0)).toFixed(1)}%</b><span>de los negocios de Mérida son de esta industria</span></div><div><b>${G.features.filter(f => pctInd(f.properties).n > 0).length}</b><span>AGEB con al menos uno</span></div>`
      : capaMapa === 'modelo' ? `<div><b>${M[indMapa()].n.faltante}</b><span>AGEB con oferta faltante</span></div><div><b>${M[indMapa()].n.sobreoferta}</b><span>AGEB con sobreoferta</span></div>`
      : `<div><b>${cuenta('recomendada')}</b><span>AGEB recomendadas</span></div><div><b>${cuenta('saturada')}</b><span>AGEB saturadas</span></div>`);
}
function listaZonas() {
  const el = document.getElementById('lista-zonas'), i = indMapa(), t = ABR[i];
  if (capaMapa === 'modelo') {
    el.innerHTML = `<h5>Más oferta faltante</h5><ol>${M[i].faltantes.map(f => `<li data-clave="${f.clave}">${esc(f.colonia)} · ${f.real} de ${Math.round(f.esperado)} (${f.n_ageb} AGEB)</li>`).join('')}</ol>`;
  } else if (capaMapa === 'oportunidad') {
    const li = f => `<li data-clave="${f.properties.clave}">${esc(f.properties.colonia || f.properties.clave)} · ${f.properties[t + '_idx']}x</li>`;
    el.innerHTML = `<h5>Mejores zonas</h5><ol>${topZonas(i, 'recomendada', 6).map(li).join('')}</ol><h5>Saturadas</h5><ol>${topZonas(i, 'saturada', 5).map(li).join('')}</ol>`;
  } else if (capaMapa === 'mezcla') {
    const top = G.features.filter(f => pctInd(f.properties).tot >= 30).sort((a, b) => pctInd(b.properties).pct - pctInd(a.properties).pct).slice(0, 8);
    el.innerHTML = `<h5>Mayor porcentaje <small>(AGEB con 30+ negocios)</small></h5><ol>${top.map(f => `<li data-clave="${f.properties.clave}">${esc(f.properties.colonia || f.properties.clave)} · ${pctInd(f.properties).pct.toFixed(1)}%</li>`).join('')}</ol>`;
  } else { el.innerHTML = ''; return; }
  el.querySelectorAll('li').forEach(x => x.addEventListener('click', () => capaAgeb.eachLayer(l => {
    if (l.feature.properties.clave === x.dataset.clave) { mapa.fitBounds(l.getBounds(), { maxZoom: 15 }); l.openPopup(); } })));
}
function puntos() {
  if (capaPuntos) mapa.removeLayer(capaPuntos);
  if (!document.getElementById('ver-puntos').checked) return;
  capaPuntos = L.layerGroup();
  N.filas.forEach(([lat, lon, ii, si, nom, per, zona]) => {
    const ind = N.industrias[ii]; if (!activa(ind)) return;
    L.circleMarker([lat, lon], { radius: 3.5, weight: 0.8, color: '#fff', fillColor: COL[ind], fillOpacity: 0.95 })
      .bindPopup(`<b>${esc(nom)}</b><br>${esc(N.subcategorias[si])}<br>${per} personas · zona ${zona}`).addTo(capaPuntos);
  });
  capaPuntos.addTo(mapa);
}
function iniciarMapa() {
  mapa = L.map('mapa', { scrollWheelZoom: false, zoomControl: true }).setView([21.0, -89.62], 11.5);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Mapa base &copy; Esri, HERE, Garmin, &copy; OpenStreetMap', maxZoom: 16 }).addTo(mapa);
  capaAgeb = L.geoJSON(G, { style: estilo, onEachFeature: (f, l) => l.bindPopup(() => popupAgeb(f.properties), { maxWidth: 360, minWidth: 300 }) }).addTo(mapa);
  mapa.fitBounds(capaAgeb.getBounds(), { paddingTopLeft: [0, 0], paddingBottomRight: [260, 0] });
  document.getElementById('ver-puntos').addEventListener('change', puntos);
}
function actualizarMapa() {
  document.querySelectorAll('#seg-capa button').forEach(b => b.classList.toggle('on', b.dataset.c === capaMapa));
  capaAgeb.setStyle(estilo); leyenda(); indicadores(); listaZonas(); puntos();
}

/* ===================== CLIENTES TIPO ===================== */
function personas() {
  document.getElementById('personas').innerHTML = P.map(p => {
    const ini = p.nombre.split(' ').map(x => x[0]).slice(0, 2).join(''), sec = p.secciones;
    return `<article class="persona ${activa(p.industria) ? '' : 'fuera'}" style="--c:${COL[p.industria]}">
      <div class="p-cab"><div class="p-ini">${ini}</div><div><small>${p.subcategoria}</small><h3>${esc(p.nombre)}</h3><small>${esc(p.rol)}</small></div></div>
      <div class="p-chips">${p.datos.map(d => `<span>${esc(d.etiqueta)}: ${esc(d.valor)}</span>`).join('')}</div>
      <div class="p-cuerpo">
        ${sec.slice(1, 3).map(s => `<h5>${esc(s.titulo)}</h5><ul>${s.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`).join('')}
        <details><summary>Ver ficha completa</summary>
          ${[sec[0], ...sec.slice(3)].map(s => `<h5>${esc(s.titulo)}</h5><ul>${s.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`).join('')}
          <h5>Datos que la respaldan</h5>
          ${p.barras.map(b => `<div class="p-dato"><span>${esc(b.texto)}</span><b>${b.valor}%</b><div class="b"><i style="width:${b.valor}%"></i></div></div>`).join('')}
          <div class="p-fuente">${esc(p.fuente)}</div>
        </details></div></article>`;
  }).join('');
}

/* ===================== NAVEGACIÓN ===================== */
function pintar() {
  if (vista === 'decision') { matriz(); podio(); comparativa(); }
  if (vista === 'territorio') { grafZonas(); anatomia(); }
  if (vista === 'atractividad') { grafTam(); grafRanking(); grafCrec(); clienteIdeal(); }
  if (vista === 'competencia') { grafHhi(); dondeEntrar(); }
  if (vista === 'voz') { cifrasVoz(); semaforo(); grafSent(); nube(); ejemplos(); }
  if (vista === 'modelo') { cifrasModelo(); tablaModelo(); faltantesModelo(); importanciaModelo(); coincideModelo(); }
  if (vista === 'explorador') { if (!mapa) iniciarMapa(); mapa.invalidateSize(); actualizarMapa(); }
  if (vista === 'clientes') personas();
}
function ir(v, inicio) {
  if (!document.getElementById('v-' + v)) v = 'decision';
  vista = v;
  document.querySelectorAll('.vista').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
  document.querySelectorAll('.recorrido a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  pintar();
  if (!inicio) window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('hashchange', () => ir(location.hash.slice(1)));
document.querySelectorAll('a.ir[data-capa]').forEach(a => a.addEventListener('click', () => { capaMapa = a.dataset.capa; }));
document.querySelectorAll('.toggle input').forEach(c => c.addEventListener('change', () => {
  const marcadas = [...document.querySelectorAll('.toggle input:checked')].map(x => x.value);
  if (!marcadas.length) { c.checked = true; return; } // siempre al menos una industria
  sel = INDS.filter(i => marcadas.includes(i)); pintar();
}));
document.querySelectorAll('#seg-capa button').forEach(b => b.addEventListener('click', () => { capaMapa = b.dataset.c; actualizarMapa(); }));
document.querySelectorAll('#seg-nube button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#seg-nube button').forEach(x => x.classList.toggle('on', x === b)); sentNube = b.dataset.s; nube(); }));
document.querySelectorAll('#seg-ej button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#seg-ej button').forEach(x => x.classList.toggle('on', x === b)); sentEj = b.dataset.s; ejemplos(); }));
document.getElementById('buscar').addEventListener('input', ejemplos);

ir((location.hash || '#decision').slice(1), true);
