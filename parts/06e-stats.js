
/* ============================================================
   ESTADÍSTICAS DEL CLUB — todo se deriva de State.read + State.vault,
   así que se actualiza solo después de cada cosecha o vasallaje.
   ============================================================ */

const MESES_N = {ene:0,feb:1,mar:2,abr:3,may:4,jun:5,jul:6,ago:7,sep:8,oct:9,nov:10,dic:11};
const MESES_L = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function parseFecha(s){
  if(!s) return null;
  const m = String(s).trim().toLowerCase().match(/^(\d{1,2})\s+([a-záéíóú]{3})[a-z]*\.?\s+(\d{4})$/);
  if(m && MESES_N[m[2]]!==undefined) return { d:+m[1], m:MESES_N[m[2]], y:+m[3], key:s.trim() };
  const m2 = String(s).trim().toLowerCase().match(/^([a-záéíóú]{3})[a-z]*\.?\s+(\d{4})$/);
  if(m2 && MESES_N[m2[1]]!==undefined) return { d:1, m:MESES_N[m2[1]], y:+m2[2], key:s.trim() };
  return null;
}
const fechaOrd = s => { const p = parseFecha(s); return p ? p.y*10000 + p.m*100 + p.d : 0; };
/* a quién se le acredita el libro: el que lo rescató manda sobre el que lo trajo */
const credito = b => creditoDe(b);
const winDate = b => fechaVictoria(b) || (evLast(b,'rescates')||{}).fecha || primeraCosecha(b) || b.readDate || '';
const tropesOf = b => (b.tropes||'').split(',').map(t=>t.trim()).filter(Boolean);
const numOf = v => { const n = parseInt(v,10); return isNaN(n) ? null : n; };

/* género de autoría: campo del archivo, o lista conocida del club */
const AUTOR_F = new Set(['nellie bly','samanta schweblin','julia armfield','taylor jenkins reid','agustina bazterrica',
  'rebecca yarros','evelyn clarke','suzanne collins','caro claire burke','danya kukafka','jandy nelson','monika kim',
  'agatha christie','mary shelley','shelby van pelt','v.e. schwab','salomé esper','marisa kashino','han kang',
  'alison espach','e. lockhart','jacqueline harpman','kanae minato']);
const AUTOR_M = new Set(['carlos busqued','patrick süskind','kaveh akbar','brandon sanderson','chuck palahniuk',
  'durian sukegawa','malcolm devlin','natsume sōseki','marcus kliewer','juan rulfo','george orwell','david foenkinos',
  'martín kohan','stephen king','markus zusak','matt dinniman','tj klune','blake crouch','andy weir']);
function generoAutor(b){
  if(b.autorGenero) return /^(f|m)/i.test(b.autorGenero) ? b.autorGenero[0].toUpperCase() : '?';
  const a = (b.autor||'').toLowerCase().trim();
  if(AUTOR_F.has(a)) return 'F';
  if(AUTOR_M.has(a)) return 'M';
  return '?';
}
const FLAGS = {'estados unidos':'🇺🇸','argentina':'🇦🇷','reino unido':'🇬🇧','japón':'🇯🇵','japon':'🇯🇵','corea del sur':'🇰🇷',
  'alemania':'🇩🇪','méxico':'🇲🇽','mexico':'🇲🇽','francia':'🇫🇷','australia':'🇦🇺','bélgica':'🇧🇪','belgica':'🇧🇪',
  'estados unidos / irán':'🇺🇸','irán':'🇮🇷','italia':'🇮🇹','españa':'🇪🇸','canadá':'🇨🇦','brasil':'🇧🇷','chile':'🇨🇱'};
const flagOf = p => FLAGS[(p||'').toLowerCase().trim()] || '🌍';

/* cuenta ocurrencias y devuelve [[valor, n], …] ordenado */
function tally(arr){
  const m = new Map();
  arr.filter(Boolean).forEach(v=>m.set(v, (m.get(v)||0)+1));
  return [...m.entries()].sort((a,b)=>b[1]-a[1]);
}

function computeStats(){
  const read = State.read || [], vault = State.vault || [];
  const all = [...read, ...vault];
  const A = State.players.a, B = State.players.b;
  const isA = n => n && n.toLowerCase()===A.toLowerCase();
  const isB = n => n && n.toLowerCase()===B.toLowerCase();
  const S = { A, B, read, vault, all };

  /* ---- marcador ---- */
  const golesA = read.filter(b=>isA(b.traidoPor)).length;
  const golesB = read.filter(b=>isB(b.traidoPor)).length;
  const asisA = read.filter(b=>isA(ultimoRescate(b))).length;   // rescates que terminaron ganando
  const asisB = read.filter(b=>isB(ultimoRescate(b))).length;
  // con la bitácora se cuentan los HECHOS, no los libros: si A rescató el mismo
  // libro tres veces, son tres rescates. Antes contaba uno solo.
  const contarEv = (key, quien) => all.reduce((n,b)=>n + evPorQuien(b, key, quien), 0);
  const rescA = contarEv('rescates', A), rescB = contarEv('rescates', B);
  const traiA = contarEv('descartes', A), traiB = contarEv('descartes', B);
  const traidosA = all.filter(b=>isA(b.traidoPor)).length;
  const traidosB = all.filter(b=>isB(b.traidoPor)).length;
  S.marcador = {
    golesA, golesB, asisA, asisB, rescA, rescB, traiA, traiB, traidosA, traidosB,
    efA: traidosA ? Math.round(golesA/traidosA*100) : 0,
    efB: traidosB ? Math.round(golesB/traidosB*100) : 0,
    ptsA: golesA + asisA, ptsB: golesB + asisB,
  };
  /* racha: cuántos ganadores seguidos (por crédito) al final del estante */
  const ordenados = read.slice().sort((x,y)=>fechaOrd(winDate(x))-fechaOrd(winDate(y)));
  let racha = 0, quien = '';
  for(let i=ordenados.length-1; i>=0; i--){
    const c = credito(ordenados[i]);
    if(!c) break;
    if(!quien){ quien = c; racha = 1; }
    else if(c.toLowerCase()===quien.toLowerCase()) racha++;
    else break;
  }
  S.racha = { quien, n:racha, libros: ordenados.slice(-racha).map(b=>b.titulo) };
  /* mejor racha histórica (la que quedó en los libros de historia) */
  let best = { quien:'', n:0, libros:[] }, cur = { quien:'', n:0, libros:[] };
  ordenados.forEach(b=>{
    const c = credito(b);
    if(c && cur.quien && c.toLowerCase()===cur.quien.toLowerCase()){ cur.n++; cur.libros.push(b.titulo); }
    else cur = { quien:c, n:c?1:0, libros:c?[b.titulo]:[] };
    if(cur.n > best.n) best = { quien:cur.quien, n:cur.n, libros:cur.libros.slice() };
  });
  S.mejorRacha = best;

  /* ---- salón de la fama ---- */
  const nRes = b => evCount(b,'rescates'), nCos = b => evCount(b,'cosechas'), nDes = b => evCount(b,'descartes');
  const fenix = all.filter(nRes).sort((x,y)=>nRes(y)-nRes(x))[0] || null;
  const maldicion = vault.slice().sort((x,y)=>nCos(y)-nCos(x))[0] || null;
  const traicionado = all.filter(nDes).sort((x,y)=>(nDes(y)-nDes(x)) || (nCos(y)-nCos(x)))[0] || null;
  const anulado = all.filter(b=>evCount(b,'anulaciones'))
    .sort((x,y)=>fechaOrd((evLast(y,'anulaciones')||{}).fecha)-fechaOrd((evLast(x,'anulaciones')||{}).fecha))[0] || null;
  S.fama = { fenix, maldicion, traicionado, anulado };

  /* ---- cómo deciden: cuentan todas las veces que lo eligieron, no la última ---- */
  const critEv = arr => tally(arr.flatMap(b=>evList(b,'elegidos').map(e=>e.quien)));
  S.criterio = critEv(read);
  S.criterioTodos = critEv(all);
  S.metodos = tally(read.flatMap(b=>evList(b,'victorias').map(e=>e.quien)));
  const conPags = b => numOf(b.paginas);
  const readPags = read.filter(conPags), vaultPags = vault.filter(conPags);
  S.records = {
    ganoLargo:  readPags.slice().sort((x,y)=>numOf(y.paginas)-numOf(x.paginas))[0] || null,
    ganoCorto:  readPags.slice().sort((x,y)=>numOf(x.paginas)-numOf(y.paginas))[0] || null,
    vaultLargo: vaultPags.slice().sort((x,y)=>numOf(y.paginas)-numOf(x.paginas))[0] || null,
    vaultCorto: vaultPags.slice().sort((x,y)=>numOf(x.paginas)-numOf(y.paginas))[0] || null,
    faltanPags: all.length - (readPags.length + vaultPags.length),
  };
  S.vaultPags = vaultPags.reduce((s,b)=>s+numOf(b.paginas), 0);

  /* ---- cosechas: cada participación cuenta, no sólo la primera de cada libro.
         (Antes un libro que jugó 3 cosechas figuraba sólo en la 1ª.) ---- */
  // "fecha ?" = participación migrada de la que no se guardó la fecha: cuenta como
  // cosecha jugada del libro, pero no puede armar una fecha en el diario.
  const todasLasFechas = all.flatMap(b=>evList(b,'cosechas').map(e=>e.fecha))
    .filter(f=>f && f!==EV_NOFECHA && parseFecha(f));
  const fechas = tally(todasLasFechas);
  S.cosechas = fechas.map(([f,n])=>{
    const ganadores = read.filter(b=>winDate(b)===f);
    const lugarEv = all.flatMap(b=>evList(b,'cosechas')).find(e=>e.fecha===f && evVal(e.quien));
    return { fecha:f, libros:n, ganadores,
      lugar: evVal((lugarEv||{}).quien),
      metodo: ganadores.length ? metodoGanador(ganadores[0]) : '' };
  }).sort((x,y)=>fechaOrd(y.fecha)-fechaOrd(x.fecha));
  const porMes = tally(todasLasFechas
    .map(f=>{ const p = parseFecha(f); return p ? `${MESES_L[p.m]} ${p.y}` : null; }).filter(Boolean));
  // mes con más COSECHAS (no libros): contamos fechas únicas por mes
  const mesesCos = tally(fechas.map(([f])=>{ const p = parseFecha(f); return p ? `${MESES_L[p.m]} ${p.y}` : null; }).filter(Boolean));
  S.mesTop = mesesCos[0] || null;
  S.porMes = porMes;

  /* ---- ADN ---- */
  S.tropesAll = tally(all.flatMap(tropesOf));
  S.tropesVault = tally(vault.flatMap(tropesOf));
  S.paises = tally(all.map(b=>b.pais));
  S.autores = tally(all.map(b=>b.autor));
  S.generos = tally(all.map(b=>b.genero));
  const gens = all.map(generoAutor);
  S.autoria = { F: gens.filter(g=>g==='F').length, M: gens.filter(g=>g==='M').length, X: gens.filter(g=>g==='?').length };
  S.anios = all.filter(b=>numOf(b.anio)).map(b=>({ y:numOf(b.anio), b }));
  const avgYear = arr => arr.length ? Math.round(arr.reduce((s,x)=>s+x,0)/arr.length) : null;
  S.decadas = {
    a: avgYear(all.filter(b=>isA(b.traidoPor) && numOf(b.anio)).map(b=>numOf(b.anio))),
    b: avgYear(all.filter(b=>isB(b.traidoPor) && numOf(b.anio)).map(b=>numOf(b.anio))),
  };

  /* ---- fórmula del ganador ---- */
  const tropeWin = new Map();
  read.forEach(b=>tropesOf(b).forEach(t=>tropeWin.set(t,(tropeWin.get(t)||0)+1)));
  const formula = [...tropeWin.entries()].filter(([,n])=>n>=Math.max(2, Math.ceil(read.length*0.4)))
    .sort((x,y)=>y[1]-x[1]).slice(0,4);
  const fset = formula.map(([t])=>t);
  const candidatos = vault.map(b=>({ b, hits: tropesOf(b).filter(t=>fset.includes(t)).length }))
    .filter(x=>x.hits>=Math.min(2,fset.length)).sort((x,y)=>y.hits-x.hits).slice(0,6);
  S.formula = { tropes:formula, total:read.length, candidatos };

  /* ---- invisibles: jugaron y nadie los eligió ---- */
  const inv = all.filter(b=>evCount(b,'cosechas')>=1 && !evCount(b,'elegidos') && !evCount(b,'rescates'))
    .sort((x,y)=>fechaOrd(primeraCosecha(y))-fechaOrd(primeraCosecha(x)));   // los más recientes primero
  S.invisibles = { a: inv.filter(b=>isA(b.traidoPor)), b: inv.filter(b=>isB(b.traidoPor)) };

  /* ---- diario ---- */
  const dias = read.map(b=>numOf(b.diasLectura)).filter(Boolean);
  const encs = read.map(b=>numOf(b.encuentros)).filter(Boolean);
  const pags = read.map(b=>numOf(b.paginas)).filter(Boolean);
  const avgDias = dias.length ? Math.round(dias.reduce((s,x)=>s+x,0)/dias.length) : null;
  const velocidad = read.filter(b=>numOf(b.diasLectura) && numOf(b.paginas))
    .map(b=>({ b, ppd: numOf(b.paginas)/numOf(b.diasLectura) })).sort((x,y)=>y.ppd-x.ppd);
  S.diario = {
    cosechas: fechas.length, leidos: read.length,
    paginas: pags.reduce((s,x)=>s+x,0), avgDias,
    encuentros: encs.reduce((s,x)=>s+x,0),
    masRapido: dias.length ? read.filter(b=>numOf(b.diasLectura)).sort((x,y)=>numOf(x.diasLectura)-numOf(y.diasLectura))[0] : null,
    masLento: dias.length ? read.filter(b=>numOf(b.diasLectura)).sort((x,y)=>numOf(y.diasLectura)-numOf(x.diasLectura))[0] : null,
    velocidad: velocidad[0] || null,
    lugares: tally(all.flatMap(b=>evList(b,'cosechas').map(e=>evVal(e.quien)))),
  };
  /* cuánto tardarían en leer toda la bóveda */
  const alDate = f => { const p = parseFecha(f); return p ? new Date(p.y, p.m, p.d) : null; };
  const dPrim = S.cosechas.length ? alDate(S.cosechas[0].fecha) : null;
  const dUlt  = S.cosechas.length ? alDate(S.cosechas[S.cosechas.length-1].fecha) : null;
  const ritmo = (S.cosechas.length>1 && dPrim && dUlt)
    ? (Math.abs(dPrim - dUlt) / 86400000) / Math.max(1, read.length-1)
    : null;
  S.vaultTiempo = (ritmo && vault.length) ? { meses: Math.round(vault.length*ritmo/30.4), anios: (vault.length*ritmo/365).toFixed(1), ritmo:Math.round(ritmo) } : null;

  /* ---- bóveda ---- */
  const caidos = all.filter(b=>evCount(b,'cosechas')>=1);
  const rescatados = all.filter(b=>evCount(b,'rescates')).length;
  S.boveda = {
    esperan: vault.length,
    tasaRescate: caidos.length ? Math.round(rescatados/caidos.length*100) : 0,
    masCayo: vault.slice().sort((x,y)=>evCount(y,'cosechas')-evCount(x,'cosechas'))[0] || null,
  };

  /* ---- el veredicto: qué dijeron las estrellas ---- */
  const rA = b=>ratingOf(b, A), rB = b=>ratingOf(b, B);
  const conAlgo  = read.filter(b=>ratingAvg(b)!=null);
  const conAmbos = read.filter(b=>rA(b)!=null && rB(b)!=null);
  const promA = conAmbos.length ? conAmbos.reduce((s,b)=>s+rA(b),0)/conAmbos.length : null;
  const promB = conAmbos.length ? conAmbos.reduce((s,b)=>s+rB(b),0)/conAmbos.length : null;
  // el más terco: cuánto infla cada uno los libros que trajo ÉL vs los del otro
  const infla = (name, r)=>{
    const propios = conAmbos.filter(b=>credito(b).toLowerCase()===name.toLowerCase());
    const ajenos  = conAmbos.filter(b=>credito(b) && credito(b).toLowerCase()!==name.toLowerCase());
    if(!propios.length || !ajenos.length) return null;
    return propios.reduce((s,b)=>s+r(b),0)/propios.length
         - ajenos.reduce((s,b)=>s+r(b),0)/ajenos.length;
  };
  const iA = infla(A, rA), iB = infla(B, rB);
  S.veredicto = {
    n: conAlgo.length,
    mejor: conAlgo.slice().sort((x,y)=>ratingAvg(y)-ratingAvg(x))[0] || null,
    peor:  conAlgo.length>1 ? conAlgo.slice().sort((x,y)=>ratingAvg(x)-ratingAvg(y))[0] : null,
    polemico: conAmbos.slice().sort((x,y)=>Math.abs(rA(y)-rB(y))-Math.abs(rA(x)-rB(x)))[0] || null,
    promA, promB,
    sintonia: conAmbos.length ? conAmbos.reduce((s,b)=>s+Math.abs(rA(b)-rB(b)),0)/conAmbos.length : null,
    terco: (iA!=null && iB!=null && iA!==iB) ? { quien: iA>iB?A:B, delta: Math.max(iA,iB) } : null,
  };

  /* ---- el ojo: cómo vienen las apuestas ---- */
  S.ojo = (()=>{
    const h = (typeof Cartas !== 'undefined' && Cartas.historial) || [];
    if(!h.length) return null;
    const lado = w => ({ n: h.length, si: h.filter(r=>r[w] && r[w].acerto).length });
    const racha = w => { let n=0; for(let i=h.length-1;i>=0;i--){ if(h[i][w] && h[i][w].acerto) n++; else break; } return n; };
    const oa = lado('a'), ob = lado('b');
    return { a:oa, b:ob, rachaA:racha('a'), rachaB:racha('b'),
      plenos: h.filter(r=>r.a.acerto && r.b.acerto).length,
      sequias: h.filter(r=>!r.a.acerto && !r.b.acerto).length,
      mano: { a:Cartas.mano.a.length, b:Cartas.mano.b.length } };
  })();

  /* ---- empates de honor: se cuentan NOCHES, no libros (una noche = dos libros).
         Y viven acá, no en Vasallaje: el único que hubo fue en una cosecha. ---- */
  S.empates = new Set(read.flatMap(b=>evList(b,'victorias')
    .filter(e=>/empate/i.test(e.extra||'')).map(e=>e.fecha).filter(Boolean))).size;

  /* ---- vasallaje: todo lo que cuentan los puestos ---- */
  const normPuesto = e=>{
    const s = (e.extra||'').toLowerCase();
    if(/semifinal|3º/.test(s)) return 'semifinal';
    if(/cuartos|primera ronda|5º/.test(s)) return 'cuartos';
    if(/ganador|campeón|1º/.test(s)) return 'ganador';
    if(/final|2º/.test(s)) return 'final';
    return null;
  };
  const conCuadros = all.map(b=>({ b, ps: evList(b,'puestos') })).filter(x=>x.ps.length);
  const masVeces = key => conCuadros
    .map(x=>({ b:x.b, n: x.ps.filter(e=>normPuesto(e)===key).length }))
    .filter(x=>x.n).sort((x,y)=>y.n-x.n)[0] || null;
  const vs = read.filter(b=>nVasallajes(b) || /vasallaje/i.test(metodoGanador(b)));
  S.vasallaje = {
    jugados: new Set(all.flatMap(b=>evList(b,'puestos').map(e=>e.fecha)).filter(Boolean)).size,
    campeones: vs,
    finalista: masVeces('final'),
    semifinalista: masVeces('semifinal'),
    convocado: conCuadros.slice().sort((x,y)=>y.ps.length-x.ps.length)[0] || null,
    modos: tally(all.flatMap(b=>evList(b,'puestos')
      .map(e=>(String(e.quien||'').match(/\(([^)]+)\)/)||[])[1]).filter(Boolean))),
  };
  return S;
}

/* ============================================================
   RENDER
   ============================================================ */
const short = (t,n=26) => !t ? '—' : (t.length>n ? t.slice(0,n-1)+'…' : t);
const cov = b => b && b.portada ? `style="background-image:url('${b.portada.replace(/'/g,'%27')}')"` : '';

/* marcador compacto para las pantallas de cierre (usa la MISMA fórmula que las stats) */
function marcadorBandHTML(){
  try{
    const S = computeStats();
    return `<div class="st-band gold mk-band" style="margin:6px auto 2px;max-width:440px;display:inline-flex;gap:12px;align-items:center;justify-content:center;">
      🏆 Marcador
      <span style="color:var(--pa)">${escapeHtml(S.A)} <b class="mk-num" data-to="${S.marcador.ptsA}">0</b></span>
      <span style="color:var(--grey)">—</span>
      <span style="color:var(--pb)"><b class="mk-num" data-to="${S.marcador.ptsB}">0</b> ${escapeHtml(S.B)}</span></div>`;
  }catch(e){ return ''; }
}
/* cuenta hacia arriba los números del marcador al aparecer */
function animarMarcador(root){
  (root||document).querySelectorAll('.mk-num').forEach(el=>{
    const to = +el.dataset.to || 0, dur = 850, t0 = performance.now();
    (function step(t){
      const p = Math.min(1, (t-t0)/dur), e = 1-Math.pow(1-p,3);
      el.textContent = Math.round(e*to);
      if(p<1) requestAnimationFrame(step);
      else el.classList.add('mk-pop');
    })(t0);
  });
}

function renderStats(container){
  const S = computeStats();
  const A = S.A, B = S.B, M = S.marcador;
  const lead = M.ptsA===M.ptsB ? null : (M.ptsA>M.ptsB ? 'a' : 'b');

  /* helpers de composición */
  const fig = (k, v, u, cls='') => `<div class="st-fig"><div class="k">${k}</div>
    <div class="v ${cls}">${v}</div>${u?`<div class="u">${u}</div>`:''}</div>`;
  const figs = arr => `<div class="st-figs">${arr.join('')}</div>`;
  const bars = (rows, color) => rows.length ? `<div class="st-bars">${rows.map(([lab,n],i)=>{
      const max = rows[0][1] || 1;
      return `<div class="st-bar ${i===0?'top':''}">
        <div class="stb-h"><span class="stb-l">${escapeHtml(String(lab))}</span><span class="stb-n">${n}</span></div>
        <div class="stb-t"><i class="stb-f" style="--bc:${color||'var(--amber)'}" data-w="${Math.round(n/max*100)}"></i></div>
      </div>`;
    }).join('')}</div>` : '<div class="st-hint">Todavía sin datos.</div>';
  const rec = (ico, lab, book, sub) => `<div class="st-rec">
    <div class="st-rico">${ico}</div>
    ${book ? `<div class="st-rcov" ${cov(book)}></div>` : ''}
    <div class="st-rmain">
      <div class="st-rlab">${lab}</div>
      <div class="st-rval">${book ? escapeHtml(book.titulo) : '—'}</div>
      <div class="st-rsub">${book ? sub : 'todavía sin candidato'}</div>
    </div></div>`;
  const vsRow = (lab, a, b) => {
    const tot = (a+b) || 1;
    return `<div class="st-vs-row">
      <div class="st-vs-n l">${a}</div>
      <div class="st-vs-lab">${lab}</div>
      <div class="st-vs-n r">${b}</div>
      <div class="st-vs-meter"><i style="width:${a/tot*100}%"></i></div>
    </div>`;
  };

  /* línea de tiempo de publicación → timeline VERTICAL, cronológica e interactiva.
     Antes era una línea horizontal con puntos que se amontonaban en lo reciente. */
  const decColor = b => (b.traidoPor||'').toLowerCase()===A.toLowerCase() ? 'var(--pa)'
        : (b.traidoPor||'').toLowerCase()===B.toLowerCase() ? 'var(--pb)' : 'var(--grey)';
  const cronos = S.anios.slice().sort((x,z)=>x.y-z.y);   // más viejo → más nuevo
  let lastDecLabel = null;
  const tline = cronos.map(({y,b})=>{
    const c = decColor(b);
    const dec = y < 1950 ? '‹1950' : (Math.floor(y/10)*10)+'s';
    const sep = dec !== lastDecLabel ? (lastDecLabel = dec, `<div class="st-htl-era">${dec}</div>`) : '';
    const cov = b.portada ? `background-image:url('${b.portada.replace(/'/g,'%27')}')` : `background:${c}`;
    return `${sep}<button class="st-htl-item" data-id="${escapeHtml(String(b.id))}" style="--pc:${c}" title="${escapeHtml(b.titulo)} · ${y}">
      <span class="st-htl-cover" style="${cov}"></span>
      <span class="st-htl-year">${y}</span>
    </button>`;
  }).join('');

  /* ribbon de géneros: monocromo con acento (nada de arcoíris) */
  const gTop = S.generos.slice(0,5);
  const gTot = gTop.reduce((s,x)=>s+x[1],0) || 1;
  const GSHADE = ['var(--amber)','rgba(201,248,57,.6)','rgba(201,248,57,.38)','rgba(242,245,236,.22)','rgba(242,245,236,.12)'];

  /* autoría */
  const totAut = S.autoria.F + S.autoria.M || 1;

  container.className = 'st-wrap';
  container.innerHTML = `
    <!-- ═══ MARCADOR ═══ -->
    <section class="st-sec">
      <h3 class="st-h"><em>🏆</em> El marcador</h3>
      <div class="st-score">
        <div class="st-team ${lead==='a'?'lead':''}" style="--pc:var(--pa)">
          <div class="st-tname">${escapeHtml(A)}</div>
          <div class="st-tnum">${M.ptsA}</div>
        </div>
        <div class="st-mid"><span>—</span><small>vs</small></div>
        <div class="st-team ${lead==='b'?'lead':''}" style="--pc:var(--pb)">
          <div class="st-tname">${escapeHtml(B)}</div>
          <div class="st-tnum">${M.ptsB}</div>
        </div>
      </div>
      ${S.racha.n>=1?`<div class="st-band">🔥 Racha activa · <b>${escapeHtml(S.racha.quien)}</b> con ${S.racha.n} — ${S.racha.libros.map(t=>escapeHtml(short(t,24))).join(' · ')}</div>`:''}
      ${S.mejorRacha.n>1?`<div class="st-band gold">👑 Mejor racha histórica · <b>${escapeHtml(S.mejorRacha.quien)}</b> con ${S.mejorRacha.n} cosechas al hilo — ${S.mejorRacha.libros.map(t=>escapeHtml(short(t,22))).join(' · ')}</div>`:''}
      <div class="st-vs-rows" style="margin-top:22px;">
        ${vsRow('Goles', M.golesA, M.golesB)}
        ${vsRow('Asistencias', M.asisA, M.asisB)}
        ${vsRow('Rescates', M.rescA, M.rescB)}
        ${vsRow('Traiciones', M.traiA, M.traiB)}
        ${vsRow('Libros aportados', M.traidosA, M.traidosB)}
      </div>
    </section>

    <!-- ═══ SALÓN DE LA FAMA ═══ -->
    <section class="st-sec">
      <h3 class="st-h"><em>🎖️</em> Salón de la fama</h3>
      <div class="st-recs">
        ${rec('🔥','El Fénix', S.fama.fenix, S.fama.fenix?(()=>{
          const n = evCount(S.fama.fenix,'rescates'), quienes = [...new Set(evList(S.fama.fenix,'rescates')
            .map(e=>e.quien).filter(q=>q && q!=='?'))];
          return `rescatado ${n} vez${n>1?'es':''}${quienes.length?' por '+escapeHtml(quienes.join(' y ')):''} · y ganó`;
        })():'')}
        ${rec('💀','La Maldición', S.fama.maldicion, S.fama.maldicion?`${evCount(S.fama.maldicion,'cosechas')} cosechas y sigue sin ganar`:'')}
        ${rec('🗡️','El más traicionado', S.fama.traicionado, S.fama.traicionado?(()=>{
          const n = evCount(S.fama.traicionado,'descartes');
          const quienes = [...new Set(evList(S.fama.traicionado,'descartes').map(e=>e.quien).filter(q=>q && q!=='?'))];
          return `descartado ${n>1?n+' veces':'una vez'}${quienes.length?' por '+escapeHtml(quienes.join(' y ')):''}`;
        })():'')}
        ${S.fama.anulado ? rec('🚫','El campeón anulado', S.fama.anulado,
          `ganó el ${escapeHtml((evLast(S.fama.anulado,'anulaciones')||{}).fecha||'—')} y decidieron volver a sortear`) : ''}
      </div>
    </section>

    <!-- ═══ EL VEREDICTO ═══ -->
    <section class="st-sec">
      <h3 class="st-h"><em>⭐</em> El veredicto</h3>
      ${S.veredicto.n ? (()=>{
        const V = S.veredicto;
        const st = v => v!=null ? '★ '+String(Math.round(v*10)/10).replace('.',',') : '—';
        return `
        <div class="st-note" style="margin:-8px 0 16px;">Lo que dijeron las estrellas de los ${V.n} que ya puntuaron.</div>
        ${figs([
          fig('El consagrado', st(ratingAvg(V.mejor)), escapeHtml(short(V.mejor.titulo,22)), 'am'),
          V.peor && V.peor!==V.mejor ? fig('La decepción', st(ratingAvg(V.peor)), escapeHtml(short(V.peor.titulo,22))) : null,
          V.polemico ? fig('El polémico', 'Δ '+String(Math.abs(ratingOf(V.polemico,S.A)-ratingOf(V.polemico,S.B))).replace('.',','),
            `${escapeHtml(short(V.polemico.titulo,20))} · ${escapeHtml(S.A)} ${st(ratingOf(V.polemico,S.A)).slice(2)} vs ${escapeHtml(S.B)} ${st(ratingOf(V.polemico,S.B)).slice(2)}`) : null,
          (V.promA!=null && V.promB!=null) ? fig('El exigente',
            escapeHtml(V.promA<V.promB ? S.A : S.B),
            `promedia ${st(Math.min(V.promA,V.promB))} contra ${st(Math.max(V.promA,V.promB))}`, 'sm') : null,
          V.terco ? fig('El más terco', escapeHtml(V.terco.quien),
            `sus libros +${String(Math.round(V.terco.delta*10)/10).replace('.',',')}★ sobre los del otro`, 'sm') : null,
          V.sintonia!=null ? fig('Sintonía', String(Math.round(V.sintonia*10)/10).replace('.',','),
            V.sintonia<=1 ? 'de diferencia · leen parecido' : 'de diferencia · gustos enfrentados') : null,
        ].filter(Boolean))}`;
      })() : '<div class="st-hint">Todavía no puntuaron ningún libro. Al terminar la lectura actual, salen las estrellas.</div>'}
    </section>

    <!-- ═══ EL OJO (apuestas) ═══ -->
    ${S.ojo ? (()=>{
      const O = S.ojo;
      const tasa = x => x.n ? Math.round(x.si/x.n*100)+'%' : '—';
      const vidente = O.a.si===O.b.si ? null : (O.a.si>O.b.si ? S.A : S.B);
      const racha = Math.max(O.rachaA, O.rachaB);
      return `<section class="st-sec">
        <h3 class="st-h"><em>🃏</em> El ojo</h3>
        ${figs([
          fig(`Puntería ${escapeHtml(S.A)}`, `${O.a.si}/${O.a.n}`, `acierta el ${tasa(O.a)}`, 'sm'),
          fig(`Puntería ${escapeHtml(S.B)}`, `${O.b.si}/${O.b.n}`, `acierta el ${tasa(O.b)}`, 'sm'),
          vidente ? fig('El vidente', escapeHtml(vidente), 'lee mejor la mesa', 'am') : null,
          racha ? fig('Racha viva', racha, `acierto${racha>1?'s':''} seguido${racha>1?'s':''} · ${escapeHtml(O.rachaA>=O.rachaB?S.A:S.B)}`) : null,
          O.plenos ? fig('Plenos', O.plenos, 'las dos apuestas acertaron') : null,
          O.sequias ? fig('Noches ciegas', O.sequias, 'nadie la vio venir') : null,
          fig('Cartas en mano', O.mano.a + O.mano.b, `${escapeHtml(S.A)} ${O.mano.a} · ${escapeHtml(S.B)} ${O.mano.b}`),
        ].filter(Boolean))}
      </section>`;
    })() : ''}

    <!-- ═══ CÓMO DECIDEN ═══ -->
    <section class="st-sec">
      <h3 class="st-h"><em>🎲</em> Cómo deciden</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:34px;">
        <div>
          <div class="st-note" style="margin:-6px 0 14px;">De los ${S.read.length} que ganaron, ¿cómo habían sido elegidos?</div>
          ${bars(S.criterio)}
        </div>
        <div>
          <div class="st-note" style="margin:-6px 0 14px;">Con qué método se definió cada cosecha.</div>
          ${bars(S.metodos, 'var(--pb)')}
        </div>
      </div>
      ${figs([
        fig('Empates de honor', S.empates, S.empates===1?'una noche, dos libros':'noches de doble lectura'),
        fig('Mes con más cosechas', S.mesTop ? S.mesTop[0].split(' ')[0] : '—', S.mesTop ? `${S.mesTop[1]} cosecha${S.mesTop[1]===1?'':'s'} · ${S.mesTop[0].split(' ')[1]}` : '', 'sm'),
        fig('El más largo que ganó', S.records.ganoLargo ? numOf(S.records.ganoLargo.paginas) : '—', S.records.ganoLargo ? escapeHtml(short(S.records.ganoLargo.titulo,22))+' · págs' : ''),
        fig('El más corto que ganó', S.records.ganoCorto ? numOf(S.records.ganoCorto.paginas) : '—', S.records.ganoCorto ? escapeHtml(short(S.records.ganoCorto.titulo,22))+' · págs' : '', 'am'),
        fig('El tomo de la bóveda', S.records.vaultLargo ? numOf(S.records.vaultLargo.paginas) : '—', S.records.vaultLargo ? escapeHtml(short(S.records.vaultLargo.titulo,22))+' · págs' : ''),
        fig('El librito de la bóveda', S.records.vaultCorto ? numOf(S.records.vaultCorto.paginas) : '—', S.records.vaultCorto ? escapeHtml(short(S.records.vaultCorto.titulo,22))+' · págs' : ''),
      ])}
    </section>

    <!-- ═══ ADN ═══ -->
    <section class="st-sec">
      <h3 class="st-h"><em>🧬</em> El ADN del club</h3>
      <div class="st-note" style="margin:-8px 0 16px;">Los tropes que se repiten en toda la biblioteca. Esto son ustedes.</div>
      <div class="st-chips">${S.tropesAll.slice(0,14).map(([t,n],i)=>
        `<span class="st-chip ${i<3?'hot big':''}">${escapeHtml(t)} <b>${n}</b></span>`).join('') || '<span class="st-hint">Sin tropes cargados.</span>'}</div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:36px;margin-top:34px;">
        <div>
          <div class="st-rlab" style="margin-bottom:16px;">De dónde leen</div>
          <div class="st-geo">${S.paises.slice(0,7).map(([p,n])=>`
            <div class="st-geo-row"><span class="st-flag">${flagOf(p)}</span>
              <span class="st-geo-name">${escapeHtml(p)}</span>
              <span class="st-geo-bar"><i data-w="${n/S.paises[0][1]*100}"></i></span>
              <span class="st-geo-n">${n}</span></div>`).join('') || '<div class="st-hint">Sin países.</div>'}</div>
        </div>
        <div>
          <div class="st-rlab" style="margin-bottom:16px;">Géneros</div>
          <div class="st-ribbon">${gTop.map((g,i)=>`<i style="background:${GSHADE[i]}" data-w="${g[1]/gTot*100}"></i>`).join('')}</div>
          <div class="st-rleg">${gTop.map((g,i)=>`<div><i style="background:${GSHADE[i]}"></i>${escapeHtml(short(g[0],22))} · ${g[1]}</div>`).join('')}</div>
        </div>
      </div>

      <div class="st-rlab" style="margin:34px 0 14px;">Quién escribe lo que leen</div>
      <div class="st-scale">
        <div class="f" data-w="${S.autoria.F/totAut*100}"><b>${S.autoria.F}</b><span>autoras</span></div>
        <div class="m" data-w="${S.autoria.M/totAut*100}"><b>${S.autoria.M}</b><span>autores</span></div>
      </div>

      ${figs([
        fig('Autor más repetido', S.autores[0] && S.autores[0][1]>1 ? escapeHtml(short(S.autores[0][0],18)) : '—',
          S.autores[0] && S.autores[0][1]>1 ? `${S.autores[0][1]} libros en el club` : 'nadie repite todavía', 'sm'),
        fig('Leer TODA la bóveda', S.vaultTiempo ? S.vaultTiempo.anios : '—',
          S.vaultTiempo ? `años · ${S.boveda.esperan} libros a ${S.vaultTiempo.ritmo} días c/u` : 'faltan días de lectura', 'am'),
        fig('Páginas en la bóveda', S.vaultPags ? S.vaultPags.toLocaleString('es-AR') : '—', 'esperando ser leídas'),
        fig('El club en páginas', S.diario.paginas ? S.diario.paginas.toLocaleString('es-AR') : '—', 'ya leídas juntos', 'am'),
      ])}

      <div class="st-rlab" style="margin:34px 0 0;">Línea de tiempo de publicación</div>
      <div class="st-note" style="margin:2px 0 10px;">De lo más viejo a lo más nuevo. Deslizá → · tocá un libro para abrirlo.</div>
      <div class="st-htl">${tline || '<div class="st-hint">Todavía sin años cargados.</div>'}</div>
      <div class="st-duel">
        <div class="st-duel-s" style="--pc:var(--pa)">
          <div class="st-duel-y">${S.decadas.a||'—'}</div>
          <div class="st-duel-n">${escapeHtml(A)} promedia</div>
        </div>
        <div class="st-duel-mid"></div>
        <div class="st-duel-s" style="--pc:var(--pb)">
          <div class="st-duel-y">${S.decadas.b||'—'}</div>
          <div class="st-duel-n">${escapeHtml(B)} promedia</div>
        </div>
      </div>
      ${(S.decadas.a && S.decadas.b) ? `<div class="st-band gold">
        ${Math.abs(S.decadas.a-S.decadas.b) > 12
          ? `📅 <b>${escapeHtml(S.decadas.a < S.decadas.b ? A : B)}</b> trae los muertos, <b>${escapeHtml(S.decadas.a < S.decadas.b ? B : A)}</b> trae el hype — ${Math.abs(S.decadas.a-S.decadas.b)} años de distancia.`
          : `📅 Leen la misma época. Da miedo.`}</div>` : ''}
    </section>

    <!-- ═══ FÓRMULA ═══ -->
    <section class="st-sec">
      <h3 class="st-h"><em>🧪</em> La fórmula del ganador</h3>
      ${S.formula.tropes.length ? `
        <div class="st-note" style="margin:-8px 0 16px;">Lo que comparten los ${S.formula.total} libros que ganaron.</div>
        <div class="st-chips">${S.formula.tropes.map(([t,n])=>`<span class="st-chip hot big">${escapeHtml(t)} <b>${n}/${S.formula.total}</b></span>`).join('')}</div>
        ${S.formula.candidatos.length ? `
          <div class="st-rlab" style="margin:28px 0 14px;">🔮 Candidatos científicos en la bóveda</div>
          <div class="st-chips">${S.formula.candidatos.map(c=>`<span class="st-chip cand">${escapeHtml(short(c.b.titulo,24))} <b>${c.hits}</b></span>`).join('')}</div>
        ` : ''}` : '<div class="st-hint">Con más cosechas va a aparecer el patrón.</div>'}
    </section>

    <!-- ═══ INVISIBLES ═══ -->
    <section class="st-sec">
      <h3 class="st-h"><em>👻</em> El rincón de los invisibles</h3>
      <div class="st-note" style="margin:-8px 0 20px;">Jugaron una cosecha y nadie los eligió: ni por tapa, ni por título, ni por sinopsis.</div>
      <div class="st-inv">
        ${['a','b'].map(k=>{
          const list = S.invisibles[k], nom = k==='a'?A:B;
          return `<div class="st-invside">
            <div class="k" style="color:${k==='a'?'var(--pa)':'var(--pb)'}">los últimos 2 de ${escapeHtml(nom)}${list.length>2?` · ${list.length} en total`:''}</div>
            <div class="st-invbooks" id="stInv${k.toUpperCase()}"></div>
            ${!list.length?'<div class="st-hint">Ninguno. Todos fueron mirados.</div>':''}
          </div>`;
        }).join('')}
      </div>
    </section>

    <!-- ═══ DIARIO ═══ -->
    <section class="st-sec">
      <h3 class="st-h"><em>📖</em> El diario del club</h3>
      ${figs([
        fig('Cosechas', S.diario.cosechas, 'jugadas en total', 'am'),
        fig('Libros leídos', S.diario.leidos, 'en el estante de honor'),
        fig('Encuentros', S.diario.encuentros || '—', S.diario.encuentros?'charlas hechas':'falta cargar'),
        fig('Ritmo', S.diario.avgDias || '—', S.diario.avgDias?'días por libro':'falta cargar'),
        fig('El más rápido', S.diario.masRapido ? numOf(S.diario.masRapido.diasLectura) : '—', S.diario.masRapido?`días · ${escapeHtml(short(S.diario.masRapido.titulo,20))}`:'', 'am'),
        fig('El más lento', S.diario.masLento ? numOf(S.diario.masLento.diasLectura) : '—', S.diario.masLento?`días · ${escapeHtml(short(S.diario.masLento.titulo,20))}`:''),
        fig('Máquina de leer', S.diario.velocidad ? Math.round(S.diario.velocidad.ppd) : '—', S.diario.velocidad?`págs/día · ${escapeHtml(short(S.diario.velocidad.b.titulo,18))}`:''),
        fig('En la bóveda', S.boveda.esperan, `esperando · vuelve el ${S.boveda.tasaRescate}%`),
      ])}
      <div class="st-rlab" style="margin:30px 0 16px;">Dónde cosechan</div>
      ${bars(S.diario.lugares, 'var(--wood-3)')}
      <div class="st-rlab" style="margin:34px 0 4px;">La historia, cosecha por cosecha</div>
      <div class="st-tl">${S.cosechas.map(c=>`
        <div class="st-tlrow">
          <div class="st-tldate">${escapeHtml(c.fecha)}</div>
          ${(c.ganadores.length ? c.ganadores.slice(0,2) : [null])
            .map(g=>`<div class="st-tlcov" ${cov(g)}></div>`).join('')}
          <div class="st-tlmain">
            <div class="st-tlwin">${c.ganadores.length ? c.ganadores.map(g=>escapeHtml(g.titulo)).join(' <span style="color:var(--amber)">+</span> ') : '<span style="color:var(--grey)">sin ganador registrado</span>'}</div>
            <div class="st-tlmeta">${c.libros} libros${c.lugar?' · 📍 '+escapeHtml(c.lugar):''}${c.metodo?' · 🎲 '+escapeHtml(c.metodo):''}${c.ganadores.length>1?' · 🤝 empate de honor':''}</div>
          </div>
        </div>`).join('') || '<div class="st-hint">Todavía no hay cosechas registradas.</div>'}</div>
    </section>

    <!-- ═══ VASALLAJE ═══ -->
    <section class="st-sec">
      <h3 class="st-h"><em>⚔️</em> Vasallaje</h3>
      ${S.vasallaje.jugados ? (()=>{
        const V = S.vasallaje;
        return `
        ${figs([
          fig('Torneos jugados', V.jugados, 'veces peleó la bóveda', 'am'),
          fig('Último campeón', V.campeones.length?escapeHtml(short(V.campeones[V.campeones.length-1].titulo,16)):'—', V.campeones.length+(V.campeones.length===1?' campeón en total':' campeones en total')),
          V.finalista ? fig('El eterno finalista', V.finalista.n, `final${V.finalista.n>1?'es':''} perdida${V.finalista.n>1?'s':''} · ${escapeHtml(short(V.finalista.b.titulo,18))}`) : null,
          V.semifinalista ? fig('El semifinalista serial', V.semifinalista.n, `vece${V.semifinalista.n>1?'s':''} en semis · ${escapeHtml(short(V.semifinalista.b.titulo,18))}`, 'sm') : null,
          V.convocado ? fig('Carne de cuadro', V.convocado.ps.length, `cuadros jugados · ${escapeHtml(short(V.convocado.b.titulo,18))}`) : null,
          fig('Tasa de rescate', S.boveda.tasaRescate+'%', 'de los caídos vuelve a jugar'),
        ].filter(Boolean))}
        ${V.modos.length ? `<div class="st-rlab" style="margin:30px 0 16px;">Cómo se armaron los cuadros</div>${bars(V.modos, 'var(--pb)')}` : ''}
        ${(State.duelos && State.duelos.length) ? (()=>{
          const d = State.duelos[State.duelos.length-1];
          const cruz = State.duelos.filter(x=>x.cruzado).length;
          return `<div class="st-rlab" style="margin:30px 0 12px;">El duelo de la final</div>
            <div class="st-band gold">🎭 Última final: <b>${escapeHtml(d.a.quien)}</b> quería «${escapeHtml(short(d.a.quiso,20))}» y <b>${escapeHtml(d.b.quien)}</b> quería «${escapeHtml(short(d.b.quiso,20))}» — ganó «${escapeHtml(short(d.ganador,20))}»${d.acuerdo?' (se pusieron de acuerdo)':' (lo decidió la ruleta)'}.</div>
            ${cruz?`<div class="st-band" style="margin-top:8px;">🔀 ${cruz} ${cruz>1?'veces':'vez'} cada uno quiso el libro que trajo el otro. Amor de club.</div>`:''}`;
        })() : ''}`;
      })() : '<div class="st-hint">Todavía no hubo ningún Vasallaje. La bóveda espera su torneo.</div>'}
    </section>`;

  // invisibles con portadas
  ['a','b'].forEach(k=>{
    const box = $('#stInv'+k.toUpperCase(), container);
    if(!box) return;
    S.invisibles[k].slice(0,2).forEach(b=>{
      const holder = document.createElement('div');
      holder.className = 'st-invb';
      holder.appendChild(miniBook(b, 52));
      holder.insertAdjacentHTML('beforeend', `<div class="st-invt">${escapeHtml(short(b.titulo,18))}</div>`);
      holder.title = b.titulo;
      holder.addEventListener('click', ()=>{
        const list = [...State.vault, ...State.read];
        const i = list.findIndex(x=>x.id===b.id);
        showPlacard(list, i<0?0:i, { source: State.read.includes(b) ? 'honor' : 'vault' });
      });
      box.appendChild(holder);
    });
  });
  // timeline de publicación: tocar un libro lo abre
  $$('.st-htl-item', container).forEach(node=>{
    node.addEventListener('click', ()=>{
      const id = node.dataset.id;
      const list = [...State.read, ...State.vault];
      const i = list.findIndex(x=>String(x.id)===id);
      if(i>=0){ try{ Sound.fx.click(); }catch(e){}
        showPlacard(list, i, { source: State.read.some(x=>String(x.id)===id) ? 'honor' : 'vault' }); }
    });
  });
  // animaciones de entrada
  requestAnimationFrame(()=>{
    $$('.stb-f, .st-geo-bar i, .st-ribbon i', container).forEach(el=>el.style.width = el.dataset.w+'%');
    $$('.st-scale div', container).forEach(el=>el.style.width = el.dataset.w+'%');
  });
  return S;
}
