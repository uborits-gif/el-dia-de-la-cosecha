
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
  // ⛏ David: cayó a la bóveda, alguien lo rescató, y después salió campeón de un Vasallaje.
  const esCampeonVasallaje = b => nVasallajes(b) || /vasallaje/i.test(metodoGanador(b));
  const david = all.filter(b=>evCount(b,'rescates')>=1 && esCampeonVasallaje(b))
    .sort((x,y)=>evCount(y,'rescates')-evCount(x,'rescates'))[0] || null;
  S.fama = { fenix, maldicion, traicionado, anulado, david };

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
  // ⏳ el salto en el tiempo: el libro más viejo y el más nuevo del club, y el abismo entre ellos
  if(S.anios.length>=2){
    const ordY = S.anios.slice().sort((x,z)=>x.y-z.y);
    const viejo = ordY[0], nuevo = ordY[ordY.length-1];
    S.salto = { viejo:viejo.b, nuevo:nuevo.b, yViejo:viejo.y, yNuevo:nuevo.y, anios: nuevo.y-viejo.y };
  } else S.salto = null;
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
    lugares: tally(all.flatMap(b=>evList(b,'puestos')
      .map(e=>(String(e.quien||'').match(/📍\s*(.+)$/)||[])[1]).filter(Boolean).map(s=>s.trim()))),
  };
  return S;
}

/* ============================================================
   RENDER
   ============================================================ */
const short = (t,n=26) => !t ? '—' : (t.length>n ? t.slice(0,n-1)+'…' : t);
const cov = b => b && b.portada ? `style="background-image:url('${b.portada.replace(/'/g,'%27')}')"` : '';

/* el marcador Uri vs Maru de las pantallas de cierre: scoreboard grande y animado */
function marcadorBandHTML(){
  try{
    const S = computeStats(), M = S.marcador;
    const lead = M.ptsA===M.ptsB ? null : (M.ptsA>M.ptsB ? 'a' : 'b');
    const leadTxt = lead ? `🔥 ${escapeHtml(lead==='a'?S.A:S.B)} va arriba`
                         : (M.ptsA===0 ? 'Todo por jugarse' : '🤝 Van igualados');
    return `<div class="mk-eyebrow">🏆 El marcador</div>
      <div class="mk-score">
        <div class="mk-team${lead==='a'?' lead':''}" style="--pc:var(--pa)">
          <div class="mk-name">${escapeHtml(S.A)}</div>
          <div class="mk-n mk-num" data-to="${M.ptsA}">0</div>
        </div>
        <div class="mk-mid"><span>—</span></div>
        <div class="mk-team${lead==='b'?' lead':''}" style="--pc:var(--pb)">
          <div class="mk-name">${escapeHtml(S.B)}</div>
          <div class="mk-n mk-num" data-to="${M.ptsB}">0</div>
        </div>
      </div>
      <div class="mk-lead">${leadTxt}</div>`;
  }catch(e){ return ''; }
}
/* aparece con escala, cuenta hacia arriba y el líder brilla */
function animarMarcador(root){
  const r = root || document;
  const card = r.querySelector('.mk-score'); if(card) requestAnimationFrame(()=>card.classList.add('mk-in'));
  r.querySelectorAll('.mk-num').forEach(el=>{
    const to = +el.dataset.to || 0, dur = 1000, t0 = performance.now();
    (function step(t){
      const p = Math.min(1, (t-t0)/dur), e = 1-Math.pow(1-p,3);
      el.textContent = Math.round(e*to);
      if(p<1) requestAnimationFrame(step);
      else el.classList.add('mk-pop');
    })(t0);
  });
  const lead = r.querySelector('.mk-team.lead');
  if(lead) setTimeout(()=>lead.classList.add('mk-glow'), 1000);
}

function renderStats(container){
  const S = computeStats();
  const A = S.A, B = S.B, M = S.marcador;
  const lead = M.ptsA===M.ptsB ? null : (M.ptsA>M.ptsB ? 'a' : 'b');

  /* helpers de composición */
  // un valor numérico entero cuenta hacia arriba al aparecer; el resto se muestra tal cual
  const numHTML = v => /^\d+$/.test(String(v)) ? `<span class="st-count" data-to="${v}">0</span>` : String(v);
  const fig = (k, v, u, cls='') => `<div class="st-fig"><div class="k">${k}</div>
    <div class="v ${cls}">${numHTML(v)}</div>${u?`<div class="u">${u}</div>`:''}</div>`;
  const figs = arr => `<div class="st-figs">${arr.join('')}</div>`;
  const bars = (rows, color) => rows.length ? `<div class="st-bars">${rows.map(([lab,n],i)=>{
      const max = rows[0][1] || 1;
      return `<div class="st-bar ${i===0?'top':''}">
        <div class="stb-h"><span class="stb-l">${escapeHtml(String(lab))}</span><span class="stb-n">${numHTML(n)}</span></div>
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
      <div class="st-vs-n l"><span class="st-count" data-to="${a}">0</span></div>
      <div class="st-vs-lab">${lab}</div>
      <div class="st-vs-n r"><span class="st-count" data-to="${b}">0</span></div>
      <div class="st-vs-meter"><i data-w="${a/tot*100}" style="width:50%"></i></div>
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

  // qué libros tiene cada trope (para el ADN interactivo)
  const tropeBooks = {};
  S.all.forEach(b=> tropesOf(b).forEach(t=>{ (tropeBooks[t]=tropeBooks[t]||[]).push(b.titulo); }));

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
          <div class="st-tnum"><span class="st-count" data-to="${M.ptsA}">0</span></div>
        </div>
        <div class="st-mid"><span>—</span><small>vs</small></div>
        <div class="st-team ${lead==='b'?'lead':''}" style="--pc:var(--pb)">
          <div class="st-tname">${escapeHtml(B)}</div>
          <div class="st-tnum"><span class="st-count" data-to="${M.ptsB}">0</span></div>
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
        ${S.fama.david ? rec('⛏️','David', S.fama.david, (()=>{
          const n = evCount(S.fama.david,'rescates');
          return `estuvo en la bóveda, lo rescataron ${n>1?n+' veces':'una vez'} y salió campeón del cuadro`;
        })()) : ''}
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
      <div class="st-note" style="margin:-8px 0 14px;font-size:11px;opacity:.6;">Pasá o tocá un trope para ver qué libros son.</div>
      <div class="adn-grid" id="adnChips">${S.tropesAll.slice(0,18).map(([t,n],i)=>
        `<button class="adn-tile ${i<4?'hot':''}" data-trope="${escapeHtml(t)}">
          ${bookmojiHTML(t)}
          <span class="adn-tile-t">${escapeHtml(t)}</span>
          <span class="adn-tile-n">${n}</span>
        </button>`).join('') || '<span class="st-hint">Sin tropes cargados.</span>'}</div>
      <div class="st-adn-pop" id="adnPop"></div>

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
      ${S.salto ? `<div class="st-band gold" style="margin-top:14px;">⏳ El salto en el tiempo · <b>${S.salto.anios} años</b> — de «${escapeHtml(short(S.salto.viejo.titulo,22))}» (${S.salto.yViejo}) a «${escapeHtml(short(S.salto.nuevo.titulo,22))}» (${S.salto.yNuevo}).</div>` : ''}
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
        <div class="st-chips">${S.formula.tropes.map(([t,n])=>`<span class="st-chip hot big">${bookmojiHTML(t)} ${escapeHtml(t)} <b>${n}/${S.formula.total}</b></span>`).join('')}</div>
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
      <div style="text-align:center;margin-top:20px;">
        <button class="load-btn" id="verHistoria">📜 Ver la historia completa →</button>
      </div>
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
          // los apodos ("eterno", "serial", "carne de cuadro") sólo tienen gracia si SE REPITE:
          // con una sola vez se cuenta el hecho, sin título grandilocuente.
          V.finalista ? fig(V.finalista.n>1?'El eterno finalista':'Llegó a la final',
            escapeHtml(short(V.finalista.b.titulo,22)),
            V.finalista.n>1 ? `perdió ${V.finalista.n} finales` : 'y la perdió', 'sm') : null,
          V.semifinalista ? fig(V.semifinalista.n>1?'El semifinalista serial':'Llegó a semifinales',
            escapeHtml(short(V.semifinalista.b.titulo,22)),
            V.semifinalista.n>1 ? `${V.semifinalista.n} veces en semis` : 'una vez', 'sm') : null,
          (V.convocado && V.convocado.ps.length>1) ? fig('Carne de cuadro', V.convocado.ps.length,
            `cuadros jugados · ${escapeHtml(short(V.convocado.b.titulo,20))}`) : null,
          fig('Tasa de rescate', S.boveda.tasaRescate+'%', 'de los caídos vuelve a jugar'),
        ].filter(Boolean))}
        ${V.modos.length ? `<div class="st-rlab" style="margin:30px 0 16px;">Cómo se armaron los cuadros</div>${bars(V.modos, 'var(--pb)')}` : ''}
        ${V.lugares.length ? `<div class="st-rlab" style="margin:30px 0 16px;">Dónde se jugaron los torneos</div>${bars(V.lugares, 'var(--wood-3)')}` : ''}
        ${(State.duelos && State.duelos.length) ? (()=>{
          const d = State.duelos[State.duelos.length-1];
          const cruz = State.duelos.filter(x=>x.cruzado).length;
          return `<div class="st-rlab" style="margin:30px 0 12px;">El duelo de la final</div>
            <div class="st-band gold">🎭 Última final${d.lugar?` · 📍${escapeHtml(d.lugar)}`:''}: <b>${escapeHtml(d.a.quien)}</b> quería «${escapeHtml(short(d.a.quiso,20))}» y <b>${escapeHtml(d.b.quien)}</b> quería «${escapeHtml(short(d.b.quiso,20))}» — ganó «${escapeHtml(short(d.ganador,20))}»${d.acuerdo?' (se pusieron de acuerdo)':' (lo decidió la ruleta)'}.</div>
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
  // ADN: pasar o tocar un trope muestra la listita de libros (sutil, sin portadas)
  const adnPop = $('#adnPop', container);
  $$('#adnChips .adn-tile[data-trope]', container).forEach(chip=>{
    const t = chip.dataset.trope, titles = tropeBooks[t] || [];
    const showList = ()=>{
      if(!adnPop) return;
      $$('#adnChips .adn-tile', container).forEach(c=>c.classList.remove('on'));
      chip.classList.add('on');
      adnPop.innerHTML = `<div class="st-adn-h">${bookmojiHTML(t)} ${escapeHtml(t)} · ${titles.length} libro${titles.length>1?'s':''}</div>`
        + titles.map(x=>`<span>${escapeHtml(x)}</span>`).join('');
      adnPop.classList.add('on');
    };
    chip.addEventListener('mouseenter', showList);
    chip.addEventListener('click', ()=>{
      if(chip.classList.contains('on')){ chip.classList.remove('on'); if(adnPop) adnPop.classList.remove('on'); }
      else { try{ Sound.fx.click(); }catch(e){} showList(); }
    });
  });
  const vh = $('#verHistoria', container);
  if(vh) vh.addEventListener('click', ()=>{ try{ Sound.fx.click(); }catch(e){} screenHistoria(); });
  // entrada coreografiada: cada sección sube al entrar en pantalla, con sus hijos escalonados
  setupStatsReveal(container);
  return S;
}

/* ============================================================
   📜 LA HISTORIA COMPLETA — cada jornada del club, desglosada:
   quién trajo qué, por qué se eligió, quién rescató, quién descartó,
   hasta dónde llegó cada uno y quién ganó. Todo sale de la bitácora.
   ============================================================ */
function construirHistoria(){
  const all = [...(State.read||[]), ...(State.vault||[])];
  const dias = new Map();                       // fecha → jornada
  const dia = f => {
    if(!dias.has(f)) dias.set(f, { fecha:f, tipo:'cosecha', lugar:'', modo:'', metodo:'',
      libros:new Map(), campeon:null, ganadores:[] });
    return dias.get(f);
  };
  const parte = (j, b) => {
    if(!j.libros.has(b.id)) j.libros.set(b.id, { b, traidoPor:b.traidoPor||'', marcas:[] });
    return j.libros.get(b.id);
  };
  all.forEach(b=>{
    const ev = (k)=> (typeof evList==='function' ? evList(b,k) : []);
    ev('cosechas').forEach(e=>{
      if(!e.fecha || (typeof EV_NOFECHA!=='undefined' && e.fecha===EV_NOFECHA)) return;
      const j = dia(e.fecha); parte(j,b);
      const lug = (typeof evVal==='function' ? evVal(e.quien) : e.quien) || '';
      if(lug && !j.lugar) j.lugar = lug;
    });
    ev('puestos').forEach(e=>{
      if(!e.fecha) return;
      const j = dia(e.fecha); const p = parte(j,b);
      j.tipo = 'vasallaje';
      const q = String(e.quien||'');
      const m = q.match(/\(([^)]+)\)/); if(m && !j.modo) j.modo = m[1];
      const lug = (q.match(/📍\s*(.+)$/)||[])[1]; if(lug && !j.lugar) j.lugar = lug.trim();
      p.puesto = e.extra || '';
      if(/ganador|campe/i.test(p.puesto)) j.campeon = b;
    });
    ev('elegidos').forEach(e=>{ if(!e.fecha) return; parte(dia(e.fecha), b).elegido = e.quien||''; });
    ev('rescates').forEach(e=>{ if(!e.fecha) return; parte(dia(e.fecha), b).rescatadoPor = e.quien||'?'; });
    ev('descartes').forEach(e=>{ if(!e.fecha) return; parte(dia(e.fecha), b).descartadoPor = e.quien||'?'; });
    ev('victorias').forEach(e=>{
      if(!e.fecha) return;
      const j = dia(e.fecha); const p = parte(j,b);
      p.gano = true; p.empate = /empate/i.test(e.extra||'');
      if(!j.metodo) j.metodo = e.quien||'';
      if(!j.ganadores.some(x=>x.id===b.id)) j.ganadores.push(b);
    });
    ev('anulaciones').forEach(e=>{ if(!e.fecha) return; parte(dia(e.fecha), b).anulado = true; });
  });
  return [...dias.values()]
    .map(j=>({ ...j, libros:[...j.libros.values()] }))
    .sort((x,y)=>fechaOrd(y.fecha)-fechaOrd(x.fecha));      // la más reciente arriba
}

/* el juego con el que se definió: icono grande del catálogo */
function juegoDe(metodo){
  const m = String(metodo||'').toLowerCase().replace(/^vasallaje\s*·?\s*/,'').trim();
  if(!m) return null;
  if(typeof GAMES !== 'undefined'){
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    const g = GAMES.find(x=>norm(x.name)===norm(m))
           || GAMES.find(x=>norm(x.name).includes(norm(m)) || norm(m).includes(norm(x.name)));
    if(g) return { icon:g.icon, name:g.name };
  }
  return { icon:'🎲', name:metodo };
}
const HX_RANK = p => /ganador|campe/i.test(p||'') ? 4 : /^final$/i.test(p||'') ? 3 : /semi/i.test(p||'') ? 2 : 1;

function screenHistoria(){
  const H = construirHistoria();
  const A = State.players.a, B = State.players.b;
  const esA = n => n && n.toLowerCase()===A.toLowerCase();
  const nLibros = new Set(H.flatMap(j=>j.libros.map(p=>p.b.id))).size;

  /* una celda de libro: tapa de tamaño FIJO + por qué se eligió + qué le pasó */
  const celda = (p, chico)=>{
    const b = p.b;
    const gano = p.gano || (p.puesto && /ganador|campe/i.test(p.puesto));
    const cls = ['hx-cell', chico?'mini':'', gano?'win':'', p.descartadoPor?'out':'',
                 p.rescatadoPor?'resc':'', (!p.elegido && !gano && !p.puesto && !p.descartadoPor && !p.rescatadoPor)?'nadie':''].filter(Boolean).join(' ');
    const flag = gano ? `<b class="f-win">🏆 ganó</b>`
      : p.descartadoPor ? `<b class="f-out">🗡 descartado</b>`
      : p.rescatadoPor  ? `<b class="f-res">⛏ rescatado</b>`
      : p.anulado       ? `<b class="f-anu">🚫 anulado</b>` : '';
    // las cuatro franjas SIEMPRE se emiten (aunque vayan vacías): así nada se desnivela
    if(chico) return `<div class="${cls}" data-id="${escapeHtml(String(b.id))}" title="${escapeHtml(b.titulo)}">
      <div class="hx-mini" ${cov(b)}>${gano?'<span class="hx-crown">🏆</span>':''}</div></div>`;
    return `<div class="${cls}" data-id="${escapeHtml(String(b.id))}" title="${escapeHtml(b.titulo)}">
      <div class="hx-mini" ${cov(b)}>${gano?'<span class="hx-crown">🏆</span>':''}</div>
      <div class="hx-crit">${p.elegido?'por '+escapeHtml(p.elegido):''}</div>
      <div class="hx-name">${escapeHtml(short(b.titulo,22))}</div>
      <div class="hx-flag">${flag}</div>
    </div>`;
  };

  /* EL CUADRO EN MINIATURA: el mismo árbol de llaves del vasallaje, quieto.
     Se reconstruye desde los puestos (siembra clásica: campeón y finalista caen
     en mitades opuestas) y se propaga el ganador de cada cruce hacia el centro. */
  const miniCuadro = (j)=>{
    const ps = j.libros.slice();
    const rk = p => HX_RANK(p && p.puesto);
    let N = 1; while(N < ps.length) N *= 2;
    const K = Math.log2(N);
    const byRank = ps.slice().sort((a,b)=>rk(b)-rk(a));
    while(byRank.length < N) byRank.push(null);
    let seed = [1];
    while(seed.length < N){ const m = seed.length*2 + 1; seed = seed.flatMap(x=>[x, m-x]); }
    const capas = [ seed.map(s=>byRank[s-1]) ];
    for(let r=1; r<=K; r++){
      const prev = capas[r-1], nxt = [];
      for(let i=0;i<prev.length;i+=2){
        const a = prev[i], b = prev[i+1];
        nxt.push(!a ? b : !b ? a : (rk(a) >= rk(b) ? a : b));
      }
      capas.push(nxt);
    }
    const cw = N>16 ? 13 : N>8 ? 17 : 23, ch = Math.round(cw*1.5);
    const rowH = ch + (N>16 ? 4 : 7), half = N/2;
    const W = 520, H = half*rowH + 20;
    const mX = cw/2 + 12, gap = 54;
    const colW = K>1 ? (W/2 - mX - gap)/(K-1) : 0;
    const pos = {};
    for(let i=0;i<N;i++){
      const row = i % half;
      pos[`n0_${i}`] = { x: (i<half) ? mX : W - mX, y: 12 + ch/2 + row*rowH };
    }
    for(let r=1; r<=K; r++){
      const cnt = N/Math.pow(2,r);
      for(let i=0;i<cnt;i++){
        const c1 = pos[`n${r-1}_${2*i}`], c2 = pos[`n${r-1}_${2*i+1}`];
        const y = (c1.y + c2.y)/2;
        const x = (r===K) ? W/2 : (i < cnt/2 ? mX + r*colW : W - mX - r*colW);
        pos[`n${r}_${i}`] = { x, y };
      }
    }
    const paths = [];
    for(let r=0; r<K; r++){
      const cnt = N/Math.pow(2,r);
      for(let i=0;i<cnt;i++){
        const a = pos[`n${r}_${i}`], b = pos[`n${r+1}_${Math.floor(i/2)}`];
        const mx = (a.x + b.x)/2;
        const paso = capas[r][i] && capas[r][i] === capas[r+1][Math.floor(i/2)];
        paths.push(`<path d="M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}" class="${paso?'up':'dn'}"/>`);
      }
    }
    const nodos = [];
    for(let r=0; r<=K; r++){
      const cnt = N/Math.pow(2,r);
      for(let i=0;i<cnt;i++){
        const p2 = capas[r][i]; if(!p2) continue;
        const p = pos[`n${r}_${i}`], champ = (r===K), bk = p2.b;
        nodos.push(`<div class="hx-tn${champ?' champ':''}" data-id="${escapeHtml(String(bk.id))}"
          title="${escapeHtml(bk.titulo)}${p2.puesto?' · '+escapeHtml(p2.puesto):''}"
          style="left:${p.x}px;top:${p.y}px;--cw:${champ?Math.round(cw*1.6):cw}px;--ch:${champ?Math.round(ch*1.6):ch}px;${
          bk.portada?`background-image:url('${bk.portada.replace(/'/g,'%27')}')`:''}">${
          champ?'<span class="hx-tn-crown">🏆</span>':''}</div>`);
      }
    }
    return `<div class="hx-treewrap"><div class="hx-tree" style="width:${W}px;height:${H}px;">
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${paths.join('')}</svg>
      ${nodos.join('')}</div></div>`;
  };

  show(`
    <div class="center" style="padding-top:6px;">
      <div class="eyebrow" style="color:#E8C34A;">📜 El progreso del club</div>
      <h1 class="title" style="font-size:clamp(30px,5vw,52px);">La historia completa</h1>
      <p class="lead mt-s" style="margin:auto;">${H.length} jornada${H.length===1?'':'s'} · ${nLibros} libros que pasaron por la mesa.</p>
      <div class="row mt-m"><button class="btn btn-ghost" id="hxBack">← Volver</button></div>
    </div>
    <div class="hx-line" id="hxLine">
      <div class="hx-beam" id="hxBeam"></div>
      ${H.map((j,i)=>{
        const gan = j.ganadores.length ? j.ganadores : (j.campeon?[j.campeon]:[]);
        const jg = juegoDe(j.tipo==='vasallaje' ? (j.modo||'') : j.metodo);
        const esVasa = j.tipo==='vasallaje';
        // la jornada fundacional: sin método y sin cuadro
        const fundacional = !esVasa && !j.metodo && j.libros.length<=2;
        const A_ = [], B_ = [], X_ = [];
        j.libros.forEach(p=>{ (esA(p.traidoPor)?A_:(p.traidoPor?B_:X_)).push(p); });
        const equipo = (arr, nom, lado)=> arr.length ? `<div class="hx-team ${lado}">
            <div class="hx-team-box">${arr.map(p=>celda(p,false)).join('')}</div>
            <div class="hx-team-n">Libros de ${escapeHtml(nom)}</div></div>` : '';
        return `<section class="hx-day" style="--i:${i}">
          <div class="hx-dot${esVasa?' vasa':''}"></div>
          <div class="hx-card${esVasa?' vasa':''}${fundacional?' seed':''}">
            <div class="hx-top">
              <div class="hx-when">
                <div class="hx-fecha">${escapeHtml(j.fecha)}</div>
                <div class="hx-sub">${[j.lugar?'📍 '+escapeHtml(j.lugar):'', `${j.libros.length} libro${j.libros.length===1?'':'s'}`].filter(Boolean).join(' · ')}</div>
              </div>
              ${jg ? `<div class="hx-game"><div class="hx-game-ico">${jg.icon}</div>
                <div class="hx-game-n">${escapeHtml(jg.name)}</div></div>` : ''}
              <div class="hx-tipo ${esVasa?'vasa':'cos'}">${fundacional?'🌱 El comienzo':(esVasa?'⚔️ Vasallaje':'🌾 Cosecha')}</div>
            </div>
            ${fundacional ? `<div class="hx-seed-txt">Acá empezó todo. Antes de las cosechas, antes de la bóveda: el libro fundacional del club.</div>` : ''}
            ${esVasa ? miniCuadro(j) : `<div class="hx-teams">
                ${equipo(A_, A, 'a')}${equipo(B_, B, 'b')}${equipo(X_, 'la bóveda', 'x')}
              </div>`}
            ${gan.length && !esVasa ? `<div class="hx-winner">🏆 Se leyó <b>${gan.map(g=>escapeHtml(g.titulo)).join(' + ')}</b>${gan.length>1?' — empate de honor':''}</div>` : ''}
          </div>
        </section>`;
      }).join('') || '<div class="st-hint" style="text-align:center;padding:40px;">Todavía no hay historia. Jueguen la primera cosecha.</div>'}
    </div>
  `);
  $('#hxBack').addEventListener('click', ()=>{ Sound.fx.click(); screenHome(); });
  // tocar un libro abre su ficha
  $$('.hx-cell', document).forEach(el=>el.addEventListener('click', ()=>{
    const id = el.dataset.id;
    const list = [...State.read, ...State.vault];
    const i = list.findIndex(x=>String(x.id)===id);
    if(i>=0){ try{ Sound.fx.click(); }catch(e){}
      showPlacard(list, i, { source: State.read.some(x=>String(x.id)===id)?'honor':'vault' }); }
  }));
  // la línea se va llenando a medida que bajás (el progreso de toda la historia)
  const linea = $('#hxLine'), beam = $('#hxBeam');
  if(linea && beam){
    let tick = false;
    const pintar = ()=>{
      tick = false;
      if(!linea.isConnected){ window.removeEventListener('scroll', onScroll); return; }
      const r = linea.getBoundingClientRect();
      const avance = (innerHeight*0.55 - r.top) / Math.max(1, r.height);
      beam.style.height = Math.max(0, Math.min(1, avance))*100 + '%';
    };
    const onScroll = ()=>{ if(!tick){ tick = true; requestAnimationFrame(pintar); } };
    window.addEventListener('scroll', onScroll, { passive:true });
    pintar();
  }
  // aparecen al scrollear
  const dias = $$('.hx-day', document);
  if('IntersectionObserver' in window && !(matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)){
    const io = new IntersectionObserver(es=>es.forEach(e=>{
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin:'0px 0px -8% 0px', threshold:0.08 });
    dias.forEach(d=>io.observe(d));
  } else dias.forEach(d=>d.classList.add('in'));
}

/* cuenta un número hacia arriba (una vez) */
function stCountUp(el, to, dur=900){
  if(!el) return;
  if(matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches){ el.textContent = to; return; }
  const t0 = performance.now();
  (function step(t){
    const p = Math.min(1, (t-t0)/dur), e = 1-Math.pow(1-p,3);
    el.textContent = Math.round(e*to);
    if(p<1) requestAnimationFrame(step);
  })(t0);
}

/* revela las secciones a medida que entran al viewport: fade+rise, hijos en cascada,
   barras y medidores que se llenan, y números que cuentan. No repetitivo: cada bloque
   entra cuando lo mirás, no todo de una. */
function setupStatsReveal(container){
  const secs = $$('.st-sec', container);
  const reduce = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fillW = root => $$('.stb-f, .st-geo-bar i, .st-ribbon i, .st-scale div, .st-vs-meter i', root)
    .forEach((el,i)=>{ if(el.dataset.w!=null) setTimeout(()=>{ el.style.width = el.dataset.w+'%'; }, reduce?0:60+i*45); });
  const counts = root => $$('.st-count', root).forEach(el=>stCountUp(el, +el.dataset.to||0, 900));
  const reveal = sec => {
    sec.classList.add('in');
    $$('.st-rvc', sec).forEach((c,i)=>{ c.style.transitionDelay = (reduce?0:i*48)+'ms'; c.classList.add('in'); });
    fillW(sec); counts(sec);
  };
  secs.forEach(sec=>{
    sec.classList.add('st-rv');
    $$('.st-fig, .st-bar, .st-rec, .st-vs-row, .st-geo-row', sec).forEach(el=>el.classList.add('st-rvc'));
  });
  if(reduce || !('IntersectionObserver' in window)){ secs.forEach(reveal); return; }
  const io = new IntersectionObserver((ents)=>ents.forEach(e=>{
    if(e.isIntersecting){ reveal(e.target); io.unobserve(e.target); }
  }), { rootMargin:'0px 0px -12% 0px', threshold:0.12 });
  secs.forEach(sec=>io.observe(sec));
}
