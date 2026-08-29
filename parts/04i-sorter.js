/* ============================================================
   🏆 EL SORTER — el ordenador de libros del cierre de año.
   No es un quiz de preguntas guardadas: es un merge sort donde
   cada comparación la hace una persona. Uri y Maru lo hacen por
   separado y de ahí salen los rankings del wrapped.

   El motor (SorterMotor) es puro: no toca el DOM ni el State.
   Se le pasa una lista de ids y responde duelos.
   ============================================================ */

/* ---------- el motor ---------- */
const SORTER_RESP = ['a','b','empate','nada'];

/* un "grupo" es un array de ids empatados entre sí.
   un "run" es un array de grupos, ya ordenado de mejor a peor. */
function sorterCrear(ids, opts={}){
  const items = opts.mezclar === false ? ids.slice() : shuffled(ids);
  const n = items.length;
  const niveles = n > 1 ? Math.ceil(Math.log2(n)) : 0;
  const st = {
    v: 1,
    items,
    n,
    niveles,
    nivel: items.map(id => [[id]]),   // arranca: cada libro es su propio run
    sig: [],
    k: 0, i: 0, j: 0, out: [],
    nivelN: 0,
    puestos: 0,          // elementos colocados (para la barra: n por nivel)
    duelos: 0,
    empates: 0,
    sinop: 0,
    log: [],             // 'a' | 'b' | 'empate' | 'nada', en orden
    fin: false,
    undo: [],
    creado: Date.now(),
  };
  _sorterAvanzar(st);
  return st;
}

const _sorterPeso = g => g.length;

function _sorterAvanzar(st){
  let guarda = 0;
  while(!st.fin){
    if(++guarda > 1e6) break;                      // cinturón: nunca colgarse
    if(st.nivel.length <= 1){ st.fin = true; return; }
    if(st.k + 1 < st.nivel.length){
      const L = st.nivel[st.k], R = st.nivel[st.k+1];
      if(st.i < L.length && st.j < R.length) return;   // ⚔️ acá hace falta una persona
      while(st.i < L.length){ st.out.push(L[st.i]); st.puestos += _sorterPeso(L[st.i]); st.i++; }
      while(st.j < R.length){ st.out.push(R[st.j]); st.puestos += _sorterPeso(R[st.j]); st.j++; }
      st.sig.push(st.out);
      st.k += 2; st.i = 0; st.j = 0; st.out = [];
      continue;
    }
    if(st.k < st.nivel.length) st.sig.push(st.nivel[st.k]);   // el impar pasa derecho
    st.nivel = st.sig; st.sig = [];
    st.k = 0; st.i = 0; st.j = 0; st.out = [];
    st.nivelN++;
  }
}

/* el duelo que toca ahora, o null si ya terminó */
function sorterDuelo(st){
  if(!st || st.fin) return null;
  const L = st.nivel[st.k], R = st.nivel[st.k+1];
  if(!L || !R || st.i >= L.length || st.j >= R.length) return null;
  return { a: L[st.i][0], b: R[st.j][0], grupoA: L[st.i], grupoB: R[st.j] };
}

/* r: 'a' (gana A) · 'b' (gana B) · 'empate' (me gustan los dos) · 'nada' (sin opinión).
   Empate y sin-opinión pegan los dos grupos: quedan en el mismo puesto.
   La diferencia se guarda para el wrapped. */
function sorterResponder(st, r){
  if(!st || st.fin || SORTER_RESP.indexOf(r) < 0) return false;
  const L = st.nivel[st.k], R = st.nivel[st.k+1];
  if(!L || !R || st.i >= L.length || st.j >= R.length) return false;

  st.undo.push(_sorterFoto(st));
  if(st.undo.length > 220) st.undo.shift();

  const A = L[st.i], B = R[st.j];
  if(r === 'a'){ st.out.push(A); st.puestos += _sorterPeso(A); st.i++; }
  else if(r === 'b'){ st.out.push(B); st.puestos += _sorterPeso(B); st.j++; }
  else { const g = A.concat(B); st.out.push(g); st.puestos += _sorterPeso(g); st.i++; st.j++; }

  st.duelos++;
  if(r === 'empate') st.empates++;
  if(r === 'nada') st.sinop++;
  st.log.push(r);
  _sorterAvanzar(st);
  return true;
}

function _sorterFoto(st){
  const { undo, ...resto } = st;
  return JSON.stringify(resto);
}
function sorterDeshacer(st){
  if(!st || !st.undo.length) return false;
  const o = JSON.parse(st.undo.pop());
  Object.keys(o).forEach(k => { st[k] = o[k]; });
  return true;
}
function sorterPuedeDeshacer(st){ return !!(st && st.undo && st.undo.length); }

/* la barra: cada nivel coloca exactamente n elementos, y los niveles
   son siempre ceil(log2(n)). Así el porcentaje es exacto y nunca retrocede. */
function sorterProgreso(st){
  if(!st) return { pct:0, duelos:0, estimado:0, nivel:0, niveles:0 };
  const tot = Math.max(1, st.n * st.niveles);
  const pct = st.fin ? 100 : Math.min(99, Math.round(st.puestos / tot * 100));
  const estimado = Math.max(st.duelos, Math.round(st.n * st.niveles - st.n + 1));
  return { pct, duelos:st.duelos, estimado, nivel:Math.min(st.nivelN+1, st.niveles), niveles:st.niveles };
}

/* el ranking final: array de puestos, cada uno con los ids que empataron.
   El puesto salta como en el deporte: 1, 2, 2, 4. */
function sorterRanking(st){
  if(!st || !st.fin) return [];
  const run = st.nivel[0] || [];
  const out = []; let puesto = 1;
  run.forEach(g => { out.push({ puesto, ids: g.slice() }); puesto += g.length; });
  return out;
}

/* ============================================================
   DE QUÉ LIBROS SE HACE — la lista es configurable.
   ============================================================ */
const SORTER_FUENTES = [
  { id:'anio',  nombre:'Los del año',       sub:'todo lo que leyeron y jugaron este año',
    libros:()=>{ const y = new Date().getFullYear();
      return _sorterTodos().filter(b => String(sorterAnioDe(b)) === String(y)); } },
  { id:'leidos', nombre:'El estante de honor', sub:'sólo los que terminaron',
    libros:()=>(State.read||[]).slice() },
  { id:'club',  nombre:'El club entero',     sub:'estante + bóveda, todo lo que pasó por la mesa',
    libros:()=>_sorterTodos() },
  { id:'mano',  nombre:'Elegidos a mano',    sub:'vos armás la lista',
    libros:()=>_sorterTodos(), manual:true },
];
const _sorterTodos = () => [...(State.read||[]), ...(State.vault||[])];

function sorterAnioDe(b){
  const f = (typeof winDate === 'function' ? winDate(b) : '') || b.readDate || '';
  const m = String(f).match(/(\d{4})/);
  return m ? +m[1] : null;
}
const sorterLibroPorId = id => _sorterTodos().find(b => String(b.id) === String(id)) || null;

/* ============================================================
   DÓNDE VIVE — mientras lo estás haciendo es privado y local
   (nadie del otro lado lo ve a medio hacer). Cuando termina,
   el resultado entra al club y viaja a la nube.
   ============================================================ */
const sorterKeyCurso = who => 'cosecha:sorter-curso:' + who;

function sorterGuardarCurso(who, st){
  try{
    const { undo, ...resto } = st;
    localStorage.setItem(sorterKeyCurso(who), JSON.stringify(resto));
  }catch(e){}
}
function sorterLeerCurso(who){
  try{
    const raw = localStorage.getItem(sorterKeyCurso(who));
    if(!raw) return null;
    const st = JSON.parse(raw);
    if(!st || !st.n || st.fin) return null;
    st.undo = [];
    return st;
  }catch(e){ return null; }
}
function sorterBorrarCurso(who){ try{ localStorage.removeItem(sorterKeyCurso(who)); }catch(e){} }

/* los resultados terminados: State.sorter = { '2026': { a:{…}, b:{…} } } */
function sorterResultados(){
  if(!State.sorter || typeof State.sorter !== 'object') State.sorter = {};
  return State.sorter;
}
function sorterResultado(who, anio){
  const y = String(anio || new Date().getFullYear());
  const r = sorterResultados()[y];
  return (r && r[who]) || null;
}
async function sorterGuardarResultado(who, st, meta={}){
  const y = String(meta.anio || new Date().getFullYear());
  const R = sorterResultados();
  if(!R[y]) R[y] = {};
  const rank = sorterRanking(st);
  // se guarda una foto de los libros: si mañana borran uno, el ranking sigue teniendo sentido
  const libros = {};
  st.items.forEach(id => {
    const b = sorterLibroPorId(id);
    if(b) libros[id] = { titulo:b.titulo||'', portada:b.portada||'', autor:b.autor||'' };
  });
  R[y][who] = {
    who, anio:y, fecha:Date.now(),
    fuente: meta.fuente || 'club',
    n: st.n, duelos: st.duelos, empates: st.empates, sinop: st.sinop,
    ranking: rank.map(p => ({ puesto:p.puesto, ids:p.ids })),
    libros,
  };
  await persistSorter();
  sorterBorrarCurso(who);
  return R[y][who];
}
async function persistSorter(){
  const raw = JSON.stringify(sorterResultados());
  if(HAS_STORAGE){ try{ await window.storage.set('cosecha:sorter', raw); }catch(e){} }
  try{ localStorage.setItem('cosecha:sorter', raw); }catch(e){}
  if(typeof onLocalChange === 'function') onLocalChange();
}
async function loadSorter(){
  let raw = null;
  if(HAS_STORAGE){ try{ const r = await window.storage.get('cosecha:sorter'); if(r && r.value) raw = r.value; }catch(e){} }
  if(!raw){ try{ raw = localStorage.getItem('cosecha:sorter'); }catch(e){} }
  try{ State.sorter = raw ? (JSON.parse(raw)||{}) : {}; }catch(e){ State.sorter = {}; }
}

/* ============================================================
   LAS PANTALLAS
   ============================================================ */
const Sorter = { st:null, who:'a', fuente:'club', anio:new Date().getFullYear(), manual:null };

function screenSorter(){
  if(typeof Ruta === 'object') Ruta.marcar('/sorter');
  Flow.hide();
  App.ambient('rgba(232,195,74,.06)', 'rgba(26,22,14,.55)');
  const anio = Sorter.anio;
  const ficha = (w)=>{
    const nom = State.players[w];
    const hecho = sorterResultado(w, anio);
    const curso = sorterLeerCurso(w);
    const pr = curso ? sorterProgreso(curso) : null;
    return `<button class="so-quien ${w}" data-w="${w}">
      <div class="so-quien-av">${escapeHtml((nom||'?')[0].toUpperCase())}</div>
      <div class="so-quien-txt">
        <div class="so-quien-n">${escapeHtml(nom)}</div>
        <div class="so-quien-s">${hecho
          ? `✓ terminó · ${hecho.n} libros en ${hecho.duelos} duelos`
          : curso ? `⏸ a medio hacer · ${pr.pct}%`
          : 'todavía no lo hizo'}</div>
      </div>
      ${curso && !hecho ? `<div class="so-quien-bar"><i style="width:${pr.pct}%"></i></div>` : ''}
      <div class="so-quien-go">${hecho ? 'ver ranking' : curso ? 'seguir' : 'empezar'} →</div>
    </button>`;
  };
  show(`
    <div class="eyebrow" style="color:var(--amber);">Cierre del año</div>
    <h1 class="title" style="font-size:clamp(32px,5vw,52px);">El Sorter</h1>
    <p class="lead mt-s">No hay preguntas ni puntajes. Sólo dos libros por vez, hasta que quede
      el orden real —el tuyo, el que no sabías que tenías.</p>
    <p class="st-note" style="margin-top:8px;">Cada uno lo hace por su cuenta. Después el wrapped los cruza.</p>
    <div class="so-quienes mt-l">${ficha('a')}${ficha('b')}</div>
    <div class="row mt-l" style="justify-content:flex-start;">
      <button class="btn btn-ghost" id="backBtn">← Volver</button>
      ${sorterResultado('a',anio) && sorterResultado('b',anio)
        ? '<button class="btn btn-amber" id="soCruce">Ver el cruce de los dos</button>' : ''}
    </div>
  `);
  $('#backBtn').addEventListener('click', ()=>{ try{ Sound.fx.click(); }catch(e){} screenHome(); });
  const cr = $('#soCruce'); if(cr) cr.addEventListener('click', ()=>{ try{ Sound.fx.click(); }catch(e){} sorterCruce(); });
  $$('.so-quien').forEach(el => el.addEventListener('click', ()=>{
    try{ Sound.fx.click(); }catch(e){}
    const w = el.dataset.w;
    const hecho = sorterResultado(w, anio);
    if(hecho) return sorterPantallaRanking(w, hecho);
    const curso = sorterLeerCurso(w);
    if(curso){ Sorter.who = w; Sorter.st = curso; return sorterPantallaDuelo(); }
    sorterPantallaArmar(w);
  }));
}

/* ---------- elegir de qué libros se hace ---------- */
function sorterPantallaArmar(who){
  Sorter.who = who;
  Sorter.manual = null;
  const nom = State.players[who];
  const opts = SORTER_FUENTES.map(f => {
    const n = f.libros().length;
    return `<button class="so-fuente" data-f="${f.id}" ${n<2 && !f.manual ? 'disabled' : ''}>
      <div class="so-fuente-n">${escapeHtml(f.nombre)}</div>
      <div class="so-fuente-s">${escapeHtml(f.sub)}</div>
      <div class="so-fuente-c">${n} libro${n===1?'':'s'}</div>
    </button>`;
  }).join('');
  show(`
    <div class="eyebrow" style="color:var(--p${who});">${escapeHtml(nom)}</div>
    <h1 class="title" style="font-size:clamp(28px,4.4vw,44px);">¿Qué vas a ordenar?</h1>
    <p class="lead mt-s">Cuantos más libros, más duelos. Con 40 son unos 200 —se puede cortar y seguir después.</p>
    <div class="so-fuentes mt-l">${opts}</div>
    <div id="soManual"></div>
    <div class="row mt-l" style="justify-content:flex-start;">
      <button class="btn btn-ghost" id="backBtn">← Volver</button>
      <button class="btn btn-amber" id="soGo" disabled>Empezar</button>
    </div>
  `);
  let elegida = null;
  const pintarManual = ()=>{
    const cont = $('#soManual');
    if(!elegida || !elegida.manual){ cont.innerHTML = ''; return; }
    const todos = _sorterTodos();
    if(!Sorter.manual) Sorter.manual = new Set(todos.map(b=>String(b.id)));
    cont.innerHTML = `<div class="so-manual">
      <div class="so-manual-h">
        <span><b id="soManN">${Sorter.manual.size}</b> elegidos</span>
        <button class="so-manual-t" id="soManTodos">todos</button>
        <button class="so-manual-t" id="soManNada">ninguno</button>
      </div>
      <div class="so-manual-grid">${todos.map(b=>`
        <button class="so-mini ${Sorter.manual.has(String(b.id))?'on':''}" data-id="${escapeHtml(String(b.id))}">
          <div class="so-mini-cov" ${cov(b)}></div>
          <div class="so-mini-t">${escapeHtml(short(b.titulo,22))}</div>
        </button>`).join('')}</div></div>`;
    const refrescar = ()=>{
      $('#soManN').textContent = Sorter.manual.size;
      $('#soGo').disabled = Sorter.manual.size < 2;
    };
    $$('.so-mini', cont).forEach(el => el.addEventListener('click', ()=>{
      const id = el.dataset.id;
      if(Sorter.manual.has(id)) Sorter.manual.delete(id); else Sorter.manual.add(id);
      el.classList.toggle('on');
      refrescar();
    }));
    $('#soManTodos').addEventListener('click', ()=>{ Sorter.manual = new Set(todos.map(b=>String(b.id)));
      $$('.so-mini', cont).forEach(el=>el.classList.add('on')); refrescar(); });
    $('#soManNada').addEventListener('click', ()=>{ Sorter.manual = new Set();
      $$('.so-mini', cont).forEach(el=>el.classList.remove('on')); refrescar(); });
    refrescar();
  };
  $$('.so-fuente').forEach(el => el.addEventListener('click', ()=>{
    if(el.disabled) return;
    try{ Sound.fx.click(); }catch(e){}
    $$('.so-fuente').forEach(x=>x.classList.remove('on'));
    el.classList.add('on');
    elegida = SORTER_FUENTES.find(f=>f.id===el.dataset.f);
    Sorter.fuente = elegida.id;
    $('#soGo').disabled = false;
    pintarManual();
  }));
  $('#backBtn').addEventListener('click', ()=>{ try{ Sound.fx.click(); }catch(e){} screenSorter(); });
  $('#soGo').addEventListener('click', ()=>{
    if(!elegida) return;
    let libros = elegida.libros();
    if(elegida.manual) libros = libros.filter(b => Sorter.manual.has(String(b.id)));
    if(libros.length < 2) return toast('Hacen falta al menos dos libros.');
    try{ Sound.fx.chosen(); }catch(e){}
    Sorter.st = sorterCrear(libros.map(b=>String(b.id)));
    sorterGuardarCurso(who, Sorter.st);
    sorterPantallaDuelo();
  });
}

/* ---------- el duelo ---------- */
function sorterPantallaDuelo(){
  const st = Sorter.st, who = Sorter.who;
  if(!st) return screenSorter();
  if(st.fin) return sorterTerminar();
  const d = sorterDuelo(st);
  if(!d) return sorterTerminar();
  const A = sorterLibroPorId(d.a), B = sorterLibroPorId(d.b);
  const pr = sorterProgreso(st);
  const nom = State.players[who];

  const lado = (b, k, grupo)=>{
    const c = (b && b._color && b._color.css) || 'linear-gradient(160deg,#2a3322,#171c12)';
    return `<button class="so-lado ${k}" data-r="${k}">
      <div class="so-cov" style="${b && b.portada ? `background-image:url('${b.portada.replace(/'/g,'%27')}')` : `background:${c}`}"></div>
      <div class="so-info">
        <div class="so-t">${escapeHtml(b ? b.titulo : '—')}</div>
        ${b && b.autor ? `<div class="so-a">${escapeHtml(b.autor)}</div>` : ''}
        ${grupo.length>1 ? `<div class="so-lote">+${grupo.length-1} empatado${grupo.length>2?'s':''} con este</div>` : ''}
      </div>
      <div class="so-elegir">Este</div>
    </button>`;
  };

  show(`
    <div class="so-top">
      <div class="so-top-l"><span class="so-quien-mini ${who}">${escapeHtml((nom||'?')[0].toUpperCase())}</span>
        ${escapeHtml(nom)} · duelo ${st.duelos+1} de ~${pr.estimado}</div>
      <div class="so-top-r">${pr.pct}%</div>
    </div>
    <div class="so-bar"><i id="soBar" style="width:${pr.pct}%"></i></div>
    <h2 class="so-preg">¿Cuál te gustó más?</h2>
    <div class="so-ring" id="soRing">
      ${lado(A,'a',d.grupoA)}
      <div class="so-vs">vs</div>
      ${lado(B,'b',d.grupoB)}
    </div>
    <div class="so-acciones">
      <button class="so-alt" data-r="empate">💚 Me gustan los dos</button>
      <button class="so-alt" data-r="nada">🤷 Sin opinión</button>
    </div>
    <div class="so-pie">
      <button class="btn btn-ghost btn-sm" id="soUndo" ${sorterPuedeDeshacer(st)?'':'disabled'}>↶ Deshacer</button>
      <button class="btn btn-ghost btn-sm" id="soPausa">Guardar y salir</button>
    </div>
  `);

  // una respuesta por duelo: mientras corre la animación no se acepta otra
  // (si no, dos flechas seguidas contestan el duelo siguiente a ciegas)
  let cerrado = false;
  const responder = (r)=>{
    if(cerrado) return;
    cerrado = true;
    try{ Sound.fx.hojear(); Sound.fx[r==='nada'?'click':'chosen'](); }catch(e){}
    const ring = $('#soRing');
    if(ring) ring.classList.add(r==='a'?'gana-a':r==='b'?'gana-b':'empatan');
    setTimeout(()=>{
      sorterResponder(st, r);
      sorterGuardarCurso(who, st);
      sorterPantallaDuelo();
    }, 230);
  };
  const deshacer = ()=>{
    if(cerrado || !sorterDeshacer(st)) return;
    cerrado = true;
    try{ Sound.fx.volverAtras(); }catch(e){}
    sorterGuardarCurso(who, st);
    sorterPantallaDuelo();
  };
  $$('.so-lado').forEach(el => el.addEventListener('click', ()=>responder(el.dataset.r)));
  $$('.so-alt').forEach(el => el.addEventListener('click', ()=>responder(el.dataset.r)));
  $('#soUndo').addEventListener('click', deshacer);
  $('#soPausa').addEventListener('click', ()=>{
    if(cerrado) return;
    cerrado = true;
    sorterGuardarCurso(who, st);
    try{ Sound.fx.click(); }catch(e){}
    toast('Guardado. Podés seguir cuando quieras.');
    screenSorter();
  });
  const tecla = fn => (e)=>{ if(e && e.preventDefault) e.preventDefault(); fn(); };
  App.keys = {
    ArrowLeft:  tecla(()=>responder('a')),
    ArrowRight: tecla(()=>responder('b')),
    ArrowUp:    tecla(()=>responder('empate')),
    ArrowDown:  tecla(()=>responder('nada')),
    Backspace:  tecla(deshacer),
  };
}

async function sorterTerminar(){
  const st = Sorter.st, who = Sorter.who;
  App.keys = {};
  const res = await sorterGuardarResultado(who, st, { fuente:Sorter.fuente, anio:Sorter.anio });
  try{ Sound.fx.fanfare(); }catch(e){}
  sorterPantallaRanking(who, res, true);
}

/* ---------- el ranking ---------- */
function sorterPantallaRanking(who, res, recien=false){
  App.keys = {};
  Flow.hide();
  App.ambient('rgba(232,195,74,.07)', 'rgba(26,22,14,.55)');
  const nom = State.players[who];
  const libro = id => res.libros[id] || (sorterLibroPorId(id) || { titulo:'—' });
  const medalla = p => p===1 ? '🥇' : p===2 ? '🥈' : p===3 ? '🥉' : '';

  const fila = (p, idx)=>{
    const multi = p.ids.length > 1;
    return `<div class="so-rk-fila ${p.puesto<=3?'podio':''} ${multi?'multi':''}" style="--i:${idx}">
      <div class="so-rk-n">${medalla(p.puesto) || p.puesto}</div>
      <div class="so-rk-libros">
        ${p.ids.map(id=>{ const b = libro(id);
          return `<div class="so-rk-libro" data-id="${escapeHtml(String(id))}">
            <div class="so-rk-cov" style="${b.portada?`background-image:url('${String(b.portada).replace(/'/g,'%27')}')`:''}"></div>
            <div class="so-rk-txt">
              <div class="so-rk-t">${escapeHtml(b.titulo||'—')}</div>
              ${b.autor?`<div class="so-rk-a">${escapeHtml(b.autor)}</div>`:''}
            </div></div>`; }).join('')}
        ${multi?`<div class="so-rk-emp">empatados en el puesto ${p.puesto}</div>`:''}
      </div>
    </div>`;
  };
  const empatados = res.ranking.filter(p=>p.ids.length>1).length;

  show(`
    ${recien?'<div class="eyebrow" style="color:var(--amber);">Listo</div>':`<div class="eyebrow" style="color:var(--p${who});">${escapeHtml(nom)}</div>`}
    <h1 class="title" style="font-size:clamp(28px,4.6vw,46px);">${recien?`El orden de ${escapeHtml(nom)}`:'Su ranking del año'}</h1>
    <p class="lead mt-s">${res.n} libros · ${res.duelos} duelos · ${res.empates} empate${res.empates===1?'':'s'} · ${res.sinop} sin opinión</p>
    <div class="so-rk mt-l">${res.ranking.map(fila).join('')}</div>
    ${empatados?`<p class="st-note" style="margin-top:14px;">${empatados} puesto${empatados===1?'':'s'} quedaron compartidos: ahí no pudo elegir.</p>`:''}
    <div class="row mt-l" style="justify-content:flex-start;">
      <button class="btn btn-ghost" id="backBtn">← Volver</button>
      <button class="btn btn-ghost" id="soRehacer">Hacerlo de nuevo</button>
    </div>
  `);
  $('#backBtn').addEventListener('click', ()=>{ try{ Sound.fx.click(); }catch(e){} screenSorter(); });
  $('#soRehacer').addEventListener('click', ()=>{
    const ov = overlay(`
      <div class="ov-pop center" style="max-width:420px;">
        <div class="eyebrow" style="color:var(--amber);">Volver a empezar</div>
        <h2 class="serif" style="font-size:23px;font-weight:700;margin:4px 0 0;">¿Borrar este ranking?</h2>
        <p class="lead" style="font-size:13.5px;margin-top:10px;">El de ${escapeHtml(nom)} se pierde y arranca de cero.</p>
        <div class="row mt-m">
          <button class="btn btn-ghost" data-esc id="ovNo">Dejarlo</button>
          <button class="btn btn-amber" data-enter id="ovSi">Borrar y empezar</button>
        </div>
      </div>`);
    ov.querySelector('#ovNo').addEventListener('click', ()=>closeOverlay(ov));
    ov.querySelector('#ovSi').addEventListener('click', async ()=>{
      const y = String(Sorter.anio);
      const R = sorterResultados();
      if(R[y]) delete R[y][who];
      await persistSorter();
      closeOverlay(ov);
      sorterPantallaArmar(who);
    });
  });
  $$('.so-rk-libro').forEach(el => el.addEventListener('click', ()=>{
    const list = _sorterTodos();
    const i = list.findIndex(x => String(x.id) === el.dataset.id);
    if(i>=0){ try{ Sound.fx.click(); }catch(e){} showPlacard(list, i, { source:'vault' }); }
  }));
}

/* ---------- el cruce: los dos rankings, lado a lado ---------- */
function sorterCruceDatos(anio){
  const A = sorterResultado('a', anio), B = sorterResultado('b', anio);
  if(!A || !B) return null;
  const pos = (r)=>{ const m = new Map(); r.ranking.forEach(p => p.ids.forEach(id => m.set(String(id), p.puesto))); return m; };
  const pa = pos(A), pb = pos(B);
  const comunes = [...pa.keys()].filter(id => pb.has(id));
  const filas = comunes.map(id => {
    const b = A.libros[id] || B.libros[id] || sorterLibroPorId(id) || { titulo:'—' };
    return { id, b, a:pa.get(id), b_:pb.get(id), dif:Math.abs(pa.get(id) - pb.get(id)) };
  });
  const acuerdo = filas.slice().sort((x,y)=> x.dif - y.dif || (x.a+x.b_) - (y.a+y.b_));
  const pelea   = filas.slice().sort((x,y)=> y.dif - x.dif);
  const topA = A.ranking[0] ? A.ranking[0].ids.map(id => (A.libros[id]||{}).titulo || '—') : [];
  const topB = B.ranking[0] ? B.ranking[0].ids.map(id => (B.libros[id]||{}).titulo || '—') : [];
  const medio = filas.length ? filas.reduce((s,f)=>s+f.dif,0) / filas.length : 0;
  return { A, B, filas, acuerdo, pelea, topA, topB, medio, comunes:comunes.length };
}

function sorterCruce(){
  const D = sorterCruceDatos(Sorter.anio);
  if(!D) return screenSorter();
  const nomA = State.players.a, nomB = State.players.b;
  const fila = (f, i)=>`<div class="so-cr-fila" style="--i:${i}">
    <div class="so-cr-cov" style="${f.b.portada?`background-image:url('${String(f.b.portada).replace(/'/g,'%27')}')`:''}"></div>
    <div class="so-cr-t">${escapeHtml(short(f.b.titulo,34))}</div>
    <div class="so-cr-p a">#${f.a}</div>
    <div class="so-cr-linea"><i style="--d:${Math.min(100, f.dif/Math.max(1,D.A.n)*100)}%"></i></div>
    <div class="so-cr-p b">#${f.b_}</div>
  </div>`;
  show(`
    <div class="eyebrow" style="color:var(--amber);">Cierre del año</div>
    <h1 class="title" style="font-size:clamp(28px,4.6vw,46px);">Los dos rankings</h1>
    <p class="lead mt-s">${D.comunes} libros que los dos ordenaron. La distancia promedio entre
      ${escapeHtml(nomA)} y ${escapeHtml(nomB)} es de <b>${(Math.round(D.medio*10)/10).toString().replace('.',',')}</b> puestos.</p>
    <div class="so-cr-cabezas mt-m">
      <div class="so-cr-cabeza a"><span>El #1 de ${escapeHtml(nomA)}</span><b>${escapeHtml(D.topA.join(' · ')||'—')}</b></div>
      <div class="so-cr-cabeza b"><span>El #1 de ${escapeHtml(nomB)}</span><b>${escapeHtml(D.topB.join(' · ')||'—')}</b></div>
    </div>
    <div class="st-rlab" style="margin:28px 0 12px;">En lo que están de acuerdo</div>
    <div class="so-cr">${D.acuerdo.slice(0,5).map(fila).join('')}</div>
    <div class="st-rlab" style="margin:28px 0 12px;">En lo que no se ponen de acuerdo</div>
    <div class="so-cr">${D.pelea.slice(0,5).map(fila).join('')}</div>
    <div class="row mt-l" style="justify-content:flex-start;">
      <button class="btn btn-ghost" id="backBtn">← Volver</button>
    </div>
  `);
  $('#backBtn').addEventListener('click', ()=>{ try{ Sound.fx.click(); }catch(e){} screenSorter(); });
}
