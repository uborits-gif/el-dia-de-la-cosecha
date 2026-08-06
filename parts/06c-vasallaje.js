
/* ============================================================
   ⚔️ VASALLAJE — torneo directo desde la bóveda
   8 libros (4 por cabeza) → cuadro de eliminación directa PURO:
   cada ala: 2 cruces → semifinal de ala → campeón de ala → GRAN FINAL.
   Sin sorteos intermedios: todo se gana con alegato (o dado si se traba).
   Antes del anuncio, TODOS los caídos vuelven al cajón, uno a uno.
   ============================================================ */

const VS = { picks:{a:[],b:[]}, sides:null, grand:null, all:[], phase:null };
const VS_NEED = 4;   // libros por cabeza → bracket perfecto de 8

/* banda sonora: himno de torneo */
Sound.PATTERNS.vasallaje = { bpm:96, play(s,t){
  const T=(o)=>Sound.tone(o), X=(o)=>Sound.noise(o);
  if(s%8===0||s%8===3||s%8===5) T({freq:NOTE(s%16<8?38:36), at:t, dur:.22, type:'sine', vol:.16, glideTo:NOTE(s%16<8?36:34)});
  if(s%2===1) X({at:t, dur:.04, vol:.03, hp:6000, lp:11000});
  const chord = s%32<16 ? [50,57,62] : [48,55,60];
  if(s%16===8) chord.forEach(n=>T({freq:NOTE(n), at:t, dur:1.6, type:'sawtooth', vol:.028, wet:.55}));
  if(s%32===24) T({freq:NOTE(74), at:t, dur:.8, type:'triangle', vol:.05, wet:.6});
}};

/* ---------- entrada: sorteo de quién elige primero ---------- */
function screenVasallaje(){
  if(State.vault.length < VS_NEED*2){
    toast(`El Vasallaje necesita ${VS_NEED*2} libros en la bóveda (hay ${State.vault.length})`);
    return;
  }
  Flow.hide();
  App.ambient('rgba(232,195,74,.06)', 'rgba(30,26,50,.45)');
  State._snapVault = State.vault.map(b=>({...b}));   // por si abandonan a mitad de camino
  saveUndo('el Vasallaje a medias');   // ANTES de que el cuadro saque libros de la bóveda
  VS.picks = { a:[], b:[] };
  VS.sides = null; VS.grand = null; VS.all = []; VS.phase = null;
  VS.mode = null; VS.modeLabel = ''; VS.blind = false; VS.revealed = false; VS.sideTags = null;
  // el lugar del torneo: arranca con el último lugar donde cosecharon (se puede cambiar)
  VS.lugar = (()=>{ try{ return localStorage.getItem('cosecha:vasaLugar') || localStorage.getItem('cosecha:lugar') || ''; }catch(e){ return ''; } })();
  State.vault.forEach(b=>{ delete b._vsOwner; delete b._vsTrope; delete b._vsPlace; });
  return screenVasallajeModes();
}

/* ---------- los 4 modos de selección ---------- */
const vsQuoteOf = b => (b.blindQuote || b.sinopsis || '').trim();
/* cómo se nombra un libro según el modo: a ciegas, solo su frase */
const vsName = b => (VS.blind && !VS.revealed) ? `«${vsQuoteOf(b)}»` : b.titulo;
function vsTropeCounts(){
  const m = new Map();
  State.vault.forEach(b=>(b.tropes||'').split(',').map(t=>t.trim()).filter(Boolean)
    .forEach(t=>m.set(t, (m.get(t)||0)+1)));
  // desde VS_NEED (4) entran al bombo: los gordos (8+) llenan el cuadro solos,
  // los flacos (4-7) se juntan de a dos. Así participan casi todos los tropes.
  return [...m.entries()].filter(([,n])=>n >= VS_NEED).sort((x,y)=>y[1]-x[1]);
}
/* ¿alcanza para un cuadro de trope? uno gordo, o dos flacos */
function vsTropeViable(){
  const t = vsTropeCounts();
  return t.some(([,n])=>n >= VS_NEED*2) || t.length >= 2;
}
/* libros de la bóveda que tienen ese trope y todavía no están en juego */
const vsBooksWith = (trope, usados=[]) => State.vault.filter(b=>
  (b.tropes||'').split(',').map(x=>x.trim()).includes(trope) && !usados.includes(b));

/* ---- la memoria del cuadro: en qué puesto quedó cada libro ---- */
/* puestos con nombre de torneo, sin numeritos: cuartos → semifinal → final → ganador */
const VS_PLACE = {
  campeon:   'ganador',
  finalista: 'final',
  semi:      'semifinal',
  r1:        'cuartos',
};
function vsStampPlace(b, place){
  const modo = b._vsTrope ? `trope: ${b._vsTrope}` : (VS.modeLabel || 'los tributos');
  const hoy = fechaHoy();
  if(evTiene(b, 'puestos', hoy)) return;      // un cuadro por día: no se anota dos veces
  // OJO: '·' y '|' son delimitadores de la bitácora — se sanean para no romper el parseo
  const lug = (VS.lugar||'').replace(/[·|]/g,'-').trim();
  evPush(b, 'puestos', { fecha:hoy, quien:`Vasallaje (${modo})${lug?` 📍${lug}`:''}`, extra: VS_PLACE[place] || place });
}
/* reparte 8 libros en dos lados de 4 (respeta dueño original si se puede) */
function vsSplit(books){
  const eight = shuffled(books).slice(0, VS_NEED*2);
  const A = eight.filter(b=>(b.traidoPor||'').toLowerCase()===State.players.a.toLowerCase());
  const B = eight.filter(b=>(b.traidoPor||'').toLowerCase()===State.players.b.toLowerCase());
  const rest = eight.filter(b=>!A.includes(b) && !B.includes(b));
  const la = A.slice(0, VS_NEED), lb = B.slice(0, VS_NEED);
  const pool = shuffled([...A.slice(VS_NEED), ...B.slice(VS_NEED), ...rest]);
  while(la.length < VS_NEED) la.push(pool.pop());
  while(lb.length < VS_NEED) lb.push(pool.pop());
  la.forEach(b=>b._vsOwner='a'); lb.forEach(b=>b._vsOwner='b');
  VS.picks = { a:la, b:lb };
}

function screenVasallajeModes(){
  const tropes = vsTropeCounts();
  const tropeOk = vsTropeViable();
  const gordos = tropes.filter(([,n])=>n >= VS_NEED*2).length;
  const conQuote = State.vault.filter(b=>vsQuoteOf(b)).length;
  show(`
    <div class="center" style="min-height:78vh;justify-content:center;">
      <div class="eyebrow" style="color:#E8C34A;">⚔️ Vasallaje</div>
      <h1 class="title" style="font-size:clamp(30px,5.5vw,52px);">El torneo<br>de la bóveda</h1>
      <p class="lead mt-s" style="margin-left:auto;margin-right:auto;">
        ${VS_NEED*2} libros entran al cuadro. ¿Cómo los elegimos?</p>
      <label class="vsm-lugar"><span>📍</span>
        <input id="vsLugar" type="text" maxlength="42" placeholder="¿dónde se juega este torneo?" value="${escapeHtml(VS.lugar||'')}">
      </label>
      <div class="vsm-grid" style="width:min(920px,94vw);">
        <div class="vsm-card" id="vm1" style="--i:0">
          <div class="vsm-n">MODO 01</div><div class="vsm-ico">🫵</div>
          <div class="vsm-t">Los tributos</div>
          <div class="vsm-d">Cada uno elige ${VS_NEED}. A dedo y sin excusas.</div>
        </div>
        <div class="vsm-card ${tropeOk?'':'dim'}" id="vm2" style="--i:1">
          <div class="vsm-n">MODO 02</div><div class="vsm-ico">🧬</div>
          <div class="vsm-t">El trope sorteado</div>
          <div class="vsm-d">Girás, sale un trope y arma el cuadro. Si le faltan libros, se gira otro.</div>
          ${tropeOk?`<div class="vsm-d" style="color:#E8C34A;">${tropes.length} en el bombo</div>`
            :`<div class="vsm-warn">Ningún trope llega a ${VS_NEED} libros.</div>`}
        </div>
        <div class="vsm-card ${conQuote>=VS_NEED*2?'':'dim'}" id="vm3" style="--i:2">
          <div class="vsm-n">MODO 03</div><div class="vsm-ico">🎭</div>
          <div class="vsm-t">A ciegas</div>
          <div class="vsm-d">Ocho frases. Ningún título hasta el final.</div>
          ${conQuote<VS_NEED*2?`<div class="vsm-warn">Faltan frases.</div>`:''}
        </div>
        <div class="vsm-card" id="vm4" style="--i:3">
          <div class="vsm-n">MODO 04</div><div class="vsm-ico">🎲</div>
          <div class="vsm-t">Azar puro</div>
          <div class="vsm-d">La bóveda escupe ${VS_NEED*2} y nadie opina.</div>
        </div>
        <div class="vsm-card ${State.vault.length>=32?'':'dim'}" id="vm5" style="--i:4">
          <div class="vsm-n">MODO 05</div><div class="vsm-ico">${State.vault.length>=32?'🏟️':'🔒'}</div>
          <div class="vsm-t">Gran Vasallaje · 32</div>
          <div class="vsm-d">32 al cuadro. Lo que sobra se sortea afuera, y a pelear con alegatos.</div>
          ${State.vault.length>=32?'':`<div class="vsm-warn">Se desbloquea con 32 — tenés ${State.vault.length}.</div>`}
        </div>
        <div class="vsm-card ${State.vault.length>=64?'':'dim'}" id="vm6" style="--i:5">
          <div class="vsm-n">MODO 06</div><div class="vsm-ico">${State.vault.length>=64?'🏟️':'🔒'}</div>
          <div class="vsm-t">Gran Vasallaje · 64</div>
          <div class="vsm-d">El torneo total. Entran 64.</div>
          ${State.vault.length>=64?'':`<div class="vsm-warn">Se desbloquea con 64 — tenés ${State.vault.length}.</div>`}
        </div>
      </div>
      <div class="row mt-l">
        <button class="btn btn-ghost" id="vsBack">← Volver</button>
        <button class="btn btn-ghost" id="vsAny" style="border-color:rgba(232,195,74,.45);color:#E8C34A;">
          🎲 Sorpresa — que el azar elija el modo</button>
      </div>
    </div>
  `);
  $('#vsBack').addEventListener('click', ()=>{ Sound.fx.click(); screenHome(); });
  const lugIn = $('#vsLugar');
  if(lugIn) lugIn.addEventListener('input', ()=>{
    VS.lugar = lugIn.value.trim();
    try{ localStorage.setItem('cosecha:vasaLugar', VS.lugar); }catch(e){}
  });
  const runners = {};
  const go = (id, mode, fn)=>{
    const el = $('#'+id);
    if(!el || el.classList.contains('dim')) return;
    runners[id] = { mode, fn, el };
    el.addEventListener('click', ()=>{ Sound.fx.chosen(); VS.mode = mode; fn(); });
  };
  go('vm1','tributos', ()=>screenVasallajeSorteo());
  go('vm2','trope',    ()=>vsModeTrope());
  go('vm3','quote',    ()=>vsModeQuote());
  go('vm4','random',   ()=>vsModeRandom());
  go('vm5','gran32', ()=>startGranVasallaje(32));
  go('vm6','gran64', ()=>startGranVasallaje(64));

  // el azar elige el modo: recorre las tarjetas disponibles y clava una
  $('#vsAny').addEventListener('click', async ()=>{
    // el Gran Vasallaje (destructivo, saca muchos libros) NO entra en la sorpresa
    const opts = Object.values(runners).filter(o=>!/^gran/.test(o.mode));
    if(!opts.length) return;
    $('#vsAny').disabled = true; $('#vsBack').disabled = true;
    const pick = opts[Math.floor(Math.random()*opts.length)];
    const total = 11 + Math.floor(Math.random()*opts.length*2);
    for(let i=0;i<total;i++){
      opts.forEach((o,j)=>o.el.classList.toggle('lit', j===i%opts.length));
      Sound.fx.tick(i/total);
      await sleep(70 + Math.pow(i/total, 2.6)*320);
    }
    opts.forEach(o=>o.el.classList.remove('lit'));
    pick.el.classList.add('lit');
    Sound.fx.chosen();
    const r = pick.el.getBoundingClientRect();
    sparkleAt(r.left + r.width/2, r.top + r.height/2, 9);
    await sleep(900);
    VS.mode = pick.mode;
    pick.fn();
  });
}

/* ---------- MODO 02: el trope sorteado ----------
   Un solo giro. Si el trope que sale tiene 8+ libros, el cuadro es todo suyo.
   Si tiene 4-7, aporta 4 y se gira un segundo trope para el otro lado. */
async function vsModeTrope(){
  VS.modeLabel = '';
  const taken = [];                                // [{trope, books}]
  show(`
    <div class="center" style="min-height:78vh;justify-content:center;">
      <div class="eyebrow" style="color:#E8C34A;">Modo 02 · el trope sorteado</div>
      <h2 class="serif" style="font-weight:900;font-size:clamp(24px,4vw,40px);margin:0 0 20px;">El ADN decide</h2>
      <div class="vt-slot" id="vtSlot">
        <div class="vt-lab" id="vtLab">TU TROPE ES</div>
        <div class="vt-ico bmj" id="vtIco"></div>
        <div class="vt-win" id="vtWin">?</div>
        <button class="vt-go" id="vtGo">Girá el trope</button>
        <div class="vt-taken" id="vtTaken"></div>
      </div>
      <p class="lead mt-m" id="vtSub" style="margin:auto;font-size:13px;">Lo que salga, se lee.</p>
    </div>
  `);
  const win = $('#vtWin'), go = $('#vtGo'), lab = $('#vtLab'), sub = $('#vtSub'), ico = $('#vtIco');
  const setFace = t => { ico.innerHTML = bookmojiSVG(t); win.textContent = t; };
  const chip = t => `<span>${bookmojiHTML(t.trope)} ${escapeHtml(t.trope)}<b>${t.books.length}</b></span>`;

  async function spin(){
    go.disabled = true;
    const usados = taken.map(t=>t.trope);
    const yaEnJuego = taken.flatMap(t=>t.books);
    const need = taken.length ? VS_NEED*2 - yaEnJuego.length : VS_NEED;
    // candidatos: trope no usado, con libros libres suficientes
    const pool = vsTropeCounts()
      .filter(([t])=>!usados.includes(t))
      .map(([t])=>({ t, libres: vsBooksWith(t, yaEnJuego) }))
      .filter(x=>x.libres.length >= need);
    if(!pool.length){ sub.textContent = 'No quedan tropes con libros suficientes.'; return; }

    Sound.startMusic('vasallaje');
    const target = pool[Math.floor(Math.random()*pool.length)];
    const total = 22 + Math.floor(Math.random()*10);
    $('#vtSlot').classList.add('spinning');
    for(let i=0;i<total;i++){
      setFace(pool[Math.floor(Math.random()*pool.length)].t);
      Sound.fx.tick(i/total);
      await sleep(55 + Math.pow(i/total, 2.7)*300);
    }
    $('#vtSlot').classList.remove('spinning');
    Sound.fx.chosen();
    Sound.stopMusic();
    const r = ico.getBoundingClientRect();
    sparkleAt(r.left + r.width/2, r.top + r.height/2, 12);

    // ¿es de los gordos? entonces se lleva el cuadro entero
    const solo = !taken.length && target.libres.length >= VS_NEED*2;
    const cuantos = solo ? VS_NEED*2 : Math.min(need, VS_NEED);
    setFace(target.t);
    $('#vtSlot').classList.add('landed');
    ico.classList.add('pop');
    win.innerHTML = `${escapeHtml(target.t)}<small>${target.libres.length} libros${
      solo ? ' — le sobra' : ` — pone ${cuantos}`}</small>`;
    const books = shuffled(target.libres).slice(0, cuantos);
    books.forEach(b=>b._vsTrope = target.t);
    ensureColor(books[0]);
    taken.push({ trope: target.t, books });
    $('#vtTaken').innerHTML = taken.map(chip).join('');
    await sleep(solo ? 1800 : 1500);

    const enJuego = taken.flatMap(t=>t.books);
    if(enJuego.length < VS_NEED*2){
      lab.textContent = 'TU SEGUNDO TROPE ES';
      win.textContent = '?';
      ico.innerHTML = ''; ico.classList.remove('pop');
      $('#vtSlot').classList.remove('landed');
      go.textContent = 'Girá el segundo';
      go.disabled = false;
      sub.innerHTML = `<b style="color:#E8C34A">${escapeHtml(taken[0].trope)}</b> puso ${taken[0].books.length}. Falta el otro lado.`;
      return;
    }
    // cuadro completo
    $('#vtSlot').classList.add('done');
    go.remove();
    if(taken.length === 1){
      lab.textContent = 'EL CUADRO ENTERO';
      win.innerHTML = `${escapeHtml(taken[0].trope)}<small>los ${VS_NEED*2} lo tienen</small>`;
      VS.modeLabel = `trope: ${taken[0].trope}`;
      sub.textContent = 'Gana el que lo tenga mejor.';
      vsSplit(taken[0].books);          // un solo trope: los lados vuelven a ser Maru y Uri
      VS.sideTags = null;
    } else {
      lab.textContent = 'EL CUADRO';
      win.innerHTML = `${escapeHtml(taken[0].trope)} <span style="opacity:.45">vs</span> ${escapeHtml(taken[1].trope)}`;
      VS.modeLabel = `${taken[0].trope} + ${taken[1].trope}`;
      sub.textContent = 'Un lado cada uno.';
      taken[0].books.forEach(b=>b._vsOwner='a');
      taken[1].books.forEach(b=>b._vsOwner='b');
      VS.picks = { a: taken[0].books, b: taken[1].books };
      VS.sideTags = [taken[0].trope, taken[1].trope];
    }
    await sleep(2200);
    startBracket();
  }
  go.addEventListener('click', spin);
}

/* ---------- MODO 03: a ciegas (el cuadro entero son frases) ---------- */
async function vsModeQuote(){
  VS.modeLabel = 'a ciegas';
  VS.blind = true;
  const pool = shuffled(State.vault.filter(b=>vsQuoteOf(b))).slice(0, VS_NEED*2);
  vsSplit(pool);                       // el azar reparte: nadie elige
  VS.sideTags = ['LADO A', 'LADO B'];
  show(`
    <div class="center" style="min-height:74vh;justify-content:center;">
      <div class="eyebrow" style="color:#E8C34A;">Modo 03 · a ciegas</div>
      <h2 class="serif" style="font-weight:900;font-size:clamp(26px,4.4vw,44px);margin:0 0 10px;">
        ${VS_NEED*2} frases. Cero portadas.</h2>
      <p class="lead" style="margin:auto;max-width:460px;">Discutan una frase sin saber qué libro es.</p>
      <div class="row mt-l"><button class="btn btn-amber" id="vqGo" data-enter>Entrar a ciegas</button></div>
    </div>
  `);
  $('#vqGo').addEventListener('click', ()=>{ Sound.fx.chosen(); startBracket(); });
}

/* ---------- MODO 04: azar puro ---------- */
async function vsModeRandom(){
  VS.modeLabel = 'azar puro';
  const eight = shuffled(State.vault).slice(0, VS_NEED*2);
  await Promise.all(eight.map(b=>ensureColor(b)));
  const CRIT = { sinopsis:'por sinopsis', titulo:'por título', portada:'por portada' };
  show(`
    <div class="center" style="min-height:70vh;justify-content:center;">
      <div class="eyebrow" style="color:#E8C34A;">Modo 04 · azar puro</div>
      <h2 class="serif" style="font-weight:900;font-size:clamp(24px,4vw,38px);margin:0 0 6px;">La bóveda escupió estos</h2>
      <p class="lead mt-s" style="margin:auto;">Ocho, sin criterio. Abajo, cómo les fue.</p>
      <div class="vr-grid" id="vrGrid" style="width:min(980px,95vw);"></div>
      <div class="row mt-l"><button class="btn btn-amber" id="vrGo">Armar el cuadro →</button></div>
    </div>
  `);
  const grid = $('#vrGrid');
  eight.forEach((b,i)=>{
    const it = document.createElement('div');
    it.className = 'vr-item';
    it.style.setProperty('--i', i);
    it.appendChild(bookEl(b, {size:bs(104)}));
    const cr = evQuien(b,'elegidos');
    const crit = cr ? `<div class="vr-tag crit">${CRIT[cr]||escapeHtml(cr)}</div>`
      : `<div class="vr-tag none">nadie lo eligió</div>`;
    it.insertAdjacentHTML('beforeend', crit + `<div class="vr-t">${escapeHtml(short(b.titulo,22))}</div>`);
    grid.appendChild(it);
    setTimeout(()=>Sound.fx.tick(i/eight.length), i*80);
  });
  $('#vrGo').addEventListener('click', ()=>{
    Sound.fx.chosen();
    vsSplit(eight);
    startBracket();
  });
}

/* ---------- MODO 01: sorteo de quién elige primero ---------- */
function screenVasallajeSorteo(){
  VS.modeLabel = 'los tributos';
  show(`
    <div class="center" style="min-height:82vh;justify-content:center;">
      <div class="eyebrow" style="color:#E8C34A;">Modo 01 · los tributos</div>
      <h1 class="title" style="font-size:clamp(28px,5vw,46px);">¿Quién elige<br>primero?</h1>
      <p class="lead mt-m" style="margin-left:auto;margin-right:auto;">
        Cada uno saca <b>${VS_NEED} libros</b> de la bóveda. Después, cruces al azar
        y cada uno se gana con alegato — o con el dado.
      </p>
      <div class="sorteo-duel mt-l">
        <div class="s-card" id="vc-a" style="--pc:var(--pa);">
          <div class="s-name">${escapeHtml(State.players.a)}</div>
          <div class="s-tag">vasalla uno</div>
        </div>
        <div class="s-card" id="vc-b" style="--pc:var(--pb);">
          <div class="s-name">${escapeHtml(State.players.b)}</div>
          <div class="s-tag">vasallo dos</div>
        </div>
      </div>
      <div class="row mt-l">
        <button class="btn btn-ghost" id="vsBack">← Volver</button>
        <button class="btn btn-amber" id="vsSort">Sortear quién elige primero</button>
      </div>
    </div>
  `);
  $('#vsBack').addEventListener('click', ()=>{ Sound.fx.click(); screenHome(); });
  const cards = { a:$('#vc-a'), b:$('#vc-b') };
  $('#vsSort').addEventListener('click', ()=>{
    $('#vsSort').disabled = true;
    let tick=0; const total = 13 + Math.floor(Math.random()*5);
    (function next(){
      const cur = tick%2 ? 'b' : 'a';
      cards.a.classList.toggle('lit', cur==='a');
      cards.b.classList.toggle('lit', cur==='b');
      Sound.fx.shuffle();
      tick++;
      if(tick<total){ setTimeout(next, 60 + Math.pow(tick/total,2.4)*300); }
      else {
        const w = Math.random()<0.5 ? 'a':'b';
        cards[w].classList.remove('lit'); cards[w].classList.add('win');
        cards[other(w)].classList.remove('lit'); cards[other(w)].classList.add('dim');
        cards[w].querySelector('.s-tag').textContent = 'elige primero';
        Sound.fx.chosen();
        setTimeout(()=>screenVasallajePick(w), 1500);
      }
    })();
  });
}

/* ---------- selección: 4 de la bóveda por cabeza ---------- */
function screenVasallajePick(who){
  Flow.hide();
  App.ambient(`rgba(${PLAYER_RGB[who]},.07)`, 'rgba(30,26,50,.4)');
  show(`
    <div class="eyebrow" style="color:${PLAYER_COLOR[who]};">Vasallaje · elige ${escapeHtml(State.players[who])}</div>
    <h2 class="serif" style="font-weight:700;font-size:clamp(24px,4vw,38px);margin:0;">
      Sacá tus <span id="vsCount" class="vs-count">${VS_NEED}</span> guerreros de la bóveda</h2>
    <p class="lead mt-s">
      ${who==='b'&&VS.picks.a.length?`Los huecos <span style="color:var(--pa)">verdes</span> ya son de ${escapeHtml(State.players.a)}.`
      : who==='a'&&VS.picks.b.length?`Los huecos <span style="color:var(--pb)">celestes</span> ya son de ${escapeHtml(State.players.b)}.`
      : 'Elegí con quién vas a la guerra.'}</p>
    <div id="vsCloset"></div>
    <div class="vs-tray" id="vsTray"><span class="vs-sub" id="vsTrayHint">Acá se apilan tus elegidos…</span></div>
    <div class="row mt-l" style="justify-content:flex-start;">
      <button class="btn btn-ghost" id="vsAbort">← Abandonar</button>
      <button class="btn btn-amber" id="vsConfirm" disabled>Confirmar mis ${VS_NEED}</button>
    </div>
  `);

  const mine = VS.picks[who];
  const lockedIds = new Set(VS.picks[other(who)].map(b=>b.id));
  const tray = $('#vsTray');

  buildCloset($('#vsCloset'), State.vault, {
    mode:'vasallaje',
    onPick(book, slot){
      if(lockedIds.has(book.id)) return;
      const i = mine.indexOf(book);
      if(i>=0){ unpick(book, slot); }
      else if(mine.length < VS_NEED){ pick(book, slot); }
      else { toast(`Ya tenés ${VS_NEED} — devolvé uno si querés cambiar`); }
    }
  });

  // marcar los huecos del otro jugador
  const slots = $$('#vsCloset .vault-slot');
  const slotOf = new Map();
  State.vault.forEach((b,i)=>slotOf.set(b.id, slots[i]));
  VS.picks[other(who)].forEach(b=>{
    const s = slotOf.get(b.id);
    if(s){ s.classList.add('vs-locked','vs-taken'); s.style.setProperty('--pc', PLAYER_COLOR[other(who)]); }
  });
  // restaurar los propios si vuelve a esta pantalla
  mine.slice().forEach(b=>{
    const s = slotOf.get(b.id);
    if(s){ mine.splice(mine.indexOf(b),1); pick(b, s, true); }
  });

  function refresh(){
    $('#vsCount').textContent = VS_NEED - mine.length;
    $('#vsConfirm').disabled = mine.length !== VS_NEED;
    tray.classList.toggle('full', mine.length === VS_NEED);
    const hint = $('#vsTrayHint');
    if(hint) hint.style.display = mine.length ? 'none' : '';
  }
  function pick(book, slot, silent){
    mine.push(book);
    book._vsOwner = who;
    slot.classList.add('vs-taken','vs-mine');
    slot.style.setProperty('--pc', PLAYER_COLOR[who]);
    if(!silent) Sound.fx.reveal();
    const mini = document.createElement('div');
    mini.className = 'vs-slot-mini';
    mini.appendChild(miniBook(book, 46));
    mini.title = book.titulo + ' — tocá para devolverlo';
    mini._bookId = book.id;
    mini.addEventListener('click', ()=>unpick(book, slot));
    tray.appendChild(mini);
    refresh();
  }
  function unpick(book, slot){
    const i = mine.indexOf(book);
    if(i<0) return;
    mine.splice(i,1);
    delete book._vsOwner;
    if(slot) slot.classList.remove('vs-taken','vs-mine');
    Sound.fx.drop();
    $$('.vs-slot-mini', tray).forEach(m=>{ if(m._bookId===book.id) m.remove(); });
    refresh();
  }

  $('#vsAbort').addEventListener('click', ()=>{
    Sound.fx.click();
    VS.picks = { a:[], b:[] };
    screenHome();
  });
  $('#vsConfirm').addEventListener('click', ()=>{
    Sound.fx.chosen();
    if(!VS.picks[other(who)].length) return screenVasallajePick(other(who));
    startBracket();
  });
  refresh();
}

/* ============================================================
   EL MOTOR DE LLAVES — un solo bracket para 8, 16 y 32
   VS.rounds[r] = capa de cruces (r=0 la primera, la última es la final).
   Cada cruce {a,b,winner}. El ganador del cruce i de la capa r llena el
   slot i de la capa r+1. Layout espejado que crece en alto con N.
   ============================================================ */

/* de las hojas en orden (par0=cruce0, par1=cruce1…) al árbol de capas */
function buildRounds(hojas){
  const N = hojas.length;                       // potencia de 2
  const capas = [];
  let cap = [];
  for(let i=0;i<N;i+=2) cap.push({ a:hojas[i], b:hojas[i+1], winner:null });
  capas.push(cap);
  while(cap.length > 1){
    const sig = [];
    for(let i=0;i<cap.length;i+=2) sig.push({ a:null, b:null, winner:null });
    capas.push(sig);
    cap = sig;
  }
  return capas;                                 // capas[K-1] = la final (1 cruce)
}

function startBracket(){
  VS.all = [...VS.picks.a, ...VS.picks.b];
  const ids = new Set(VS.all.map(b=>b.id));
  State.vault = State.vault.filter(b=>!ids.has(b.id));   // salen mientras dura
  // hojas intercaladas: cada cruce de la 1ª ronda es Maru vs Uri
  const ma = shuffled(VS.picks.a), ub = shuffled(VS.picks.b);
  const hojas = [];
  ma.forEach((bk,i)=>{ hojas.push(bk, ub[i]); });
  armarCuadro(hojas);
}

/* punto de entrada único: arma el modelo y dibuja */
function armarCuadro(hojas){
  VS.rounds = buildRounds(hojas);
  VS.N = hojas.length;
  VS.K = Math.log2(hojas.length);               // capas de cruces (la última es la final)
  VS.grand = { a:null, b:null, winners:null };
  VS.finalKeys = null;
  VS.phase = 0;                                 // índice de la capa activa
  if(Sound.startMusic) Sound.startMusic('vasallaje');
  screenBracket();
}

/* nodos por slot: n{r}_{i}. La capa 0 tiene N nodos (los libros); la
   capa r>0 tiene N/2^r nodos (los ganadores que se van llenando). */
/* el cuadro se dibuja DIRECTO al área disponible (boxW×boxH), sin escalar:
   ocupa todo el ancho y alto, las portadas se dimensionan a la fila. */
/* fit-to-height: el cuadro ENTRA en el alto de pantalla (no scrollea para abajo)
   y se estira a lo ANCHO rompiendo el margen. Las portadas se dimensionan a la fila. */
function bracketLayout(N, boxW, boxH){
  const K = Math.log2(N);                       // capas de cruces
  const half = N/2;
  const mid = N>=16, big = N>=32;
  const dense = big;                            // sin títulos en el cuadro grande (sólo portadas)
  const labelH = big?0 : mid?14 : 20;
  const gap = big?10 : 16;
  // dos pasadas: portada tan grande como entre en la fila, sin cortar ni solapar
  let rowH = (boxH - 24) / (half - 1 || 1);
  let coverH = Math.max(20, Math.min(N<=8?178:130, Math.round(rowH - labelH - gap)));
  const topPad = Math.max(12, Math.round(coverH/2 + 8));
  rowH = (boxH - topPad*2) / (half - 1 || 1);
  coverH = Math.max(20, Math.min(coverH, Math.round(rowH - labelH - 6)));
  const coverW = Math.round(coverH*0.66);
  const marginX = Math.round(coverW/2 + 16);
  const centerGap = Math.min(240, Math.round(boxW*0.085));   // aire para que el campeón no pise a los semis
  const colW = K > 1 ? (boxW/2 - marginX - centerGap) / (K-1) : 0;
  const pos = {};                               // key → {x,y, side}
  // capa 0: los libros. Primer N/2 nodos → izquierda, resto → derecha.
  for(let i=0;i<N;i++){
    const side = (i < half) ? 'L' : 'R';
    const row = i % half;
    const x = side==='L' ? marginX : boxW - marginX;
    pos[`n0_${i}`] = { x, y: topPad + row*rowH, side };
  }
  // capas siguientes: cada nodo en el centro vertical de sus dos hijos
  for(let r=1; r<=K; r++){
    const cnt = N / Math.pow(2,r);
    for(let i=0;i<cnt;i++){
      const c1 = pos[`n${r-1}_${2*i}`], c2 = pos[`n${r-1}_${2*i+1}`];
      const y = (c1.y + c2.y) / 2;
      let x, side;
      if(r === K){ x = boxW/2; side = 'C'; }     // el campeón, al centro
      else {
        side = (i < cnt/2) ? 'L' : 'R';
        x = side==='L' ? marginX + r*colW : boxW - marginX - r*colW;
      }
      pos[`n${r}_${i}`] = { x, y, side };
    }
  }
  // cuantos MENOS libros quedan, más grandes se dibujan: cada capa tiene el doble
  // de aire vertical que la anterior, así que la portada crece ronda a ronda.
  const coverAt = [];
  // ...pero sin pisarse: el ancho también está limitado por la separación entre columnas
  // (y en la final, por el aire hasta el campeón).
  const maxW = Math.max(26, Math.min(colW || 999, centerGap) - 18);
  for(let r=0; r<=K; r++){
    const aire = rowH * Math.pow(2, r);                       // alto disponible por nodo en esa capa
    let h = Math.max(coverH, Math.min(190, Math.round(aire - labelH - 14)));
    let w = Math.round(h*0.66);
    if(w > maxW){ w = maxW; h = Math.round(w/0.66); }          // el tope horizontal manda
    coverAt.push({ h, w });
  }
  return { pos, VSBW:boxW, VSBH:boxH, K, coverH, coverW, dense, coverAt };
}

/* ---------- pantalla del bracket ---------- */
let vsUI = null;   // { stage, svg, nodes:{}, edges:{}, K }

function screenBracket(){
  App.ambient('rgba(232,195,74,.07)', 'rgba(30,26,50,.5)');
  // full-bleed: usa TODO el ancho útil (clientWidth NO cuenta la barra de scroll; 100vw sí,
  // y por eso el cuadro se corría y la primera columna quedaba fuera de pantalla)
  const vw = document.documentElement.clientWidth || innerWidth || 1200;
  const boxW = Math.max(320, vw - 24);
  const boxH = Math.max(320, (innerHeight||760) - 232);   // título + eyebrow + fase + contador + botón
  const L = bracketLayout(VS.N, boxW, boxH);
  const nombreTam = VS.N===8 ? 'El cuadro' : `El cuadro de ${VS.N}`;
  show(`
    <div class="center" style="padding-top:0;">
      <div class="eyebrow" style="color:#E8C34A;">⚔️ ${VS.mode==='gran'?'Gran Vasallaje':'Vasallaje'}${VS.modeLabel&&VS.mode!=='gran'?' · '+escapeHtml(VS.modeLabel):''}</div>
      <h2 class="serif" style="font-weight:900;font-size:clamp(24px,4vw,38px);margin:0;">${nombreTam}</h2>
      ${VS.lugar?`<div class="vs-lugar">📍 ${escapeHtml(VS.lugar)}</div>`:''}
      <div class="vs-phase" id="vsPhase"></div>
      <div class="vs-tally" id="vsTally"></div>
      <button class="vs-next-btn" id="vsNext">Siguiente alegato →</button>
      <div class="vs-stage-wrap"><div class="vs-stage" id="vsStage">
        <svg class="vs-svg" id="vsSvg" viewBox="0 0 ${L.VSBW} ${L.VSBH}"></svg>
      </div></div>
    </div>
  `);
  const stage = $('#vsStage');
  stage.style.width = L.VSBW+'px';
  stage.style.height = L.VSBH+'px';
  stage.style.setProperty('--vsn-w', L.coverW+'px');
  stage.style.setProperty('--vsn-h', L.coverH+'px');
  if(L.dense) stage.classList.add('dense');
  // ya está dibujado al tamaño del área: sin escalar
  stage.style.transform = 'none';
  const wrapEl = stage.parentElement;
  wrapEl.style.height = (L.VSBH + 12)+'px';
  // FULL-BLEED A MANO: el truco CSS (100vw + margin negativo) sólo sale bien si el
  // contenedor está perfectamente centrado. Medimos y corregimos, así el cuadro
  // arranca SIEMPRE en el borde y ninguna columna se sale de pantalla.
  const fitBleed = ()=>{
    if(!wrapEl.isConnected) return;
    wrapEl.style.width = (document.documentElement.clientWidth || innerWidth)+'px';
    wrapEl.style.marginLeft = '0px';
    const r = wrapEl.getBoundingClientRect();
    wrapEl.style.marginLeft = (-r.left)+'px';
  };
  fitBleed();
  requestAnimationFrame(fitBleed);        // otra vez cuando ya se asentó el layout

  vsUI = { stage, svg: $('#vsSvg'), nodes:{}, edges:{}, pos:L.pos, K:L.K };
  const ab = $('#abortBtn'); if(ab) ab.classList.add('on');

  const tags = VS.sideTags;
  if(tags){
    mkSideTag(String(tags[0]).toUpperCase(), {x:88, y:20});
    mkSideTag(String(tags[1]).toUpperCase(), {x:L.VSBW-88, y:20});
  }
  const trophy = document.createElement('div');
  trophy.className = 'vs-trophy';
  trophy.style.left = (L.VSBW/2)+'px';
  trophy.style.top  = Math.max(24, L.pos[`n${L.K}_0`].y - 66)+'px';
  trophy.textContent = '🏆';
  stage.appendChild(trophy);

  // dibujar cada slot como nodo, y las líneas hacia su padre
  for(let r=0; r<=L.K; r++){
    const cnt = VS.N / Math.pow(2,r);
    for(let i=0;i<cnt;i++){
      const key = `n${r}_${i}`;
      let book = null;
      if(r===0){ const m = VS.rounds[0][Math.floor(i/2)]; book = (i%2===0)?m.a:m.b; }
      const n = mkNode(key, L.pos[key], book, r===L.K);
      if(L.coverAt && L.coverAt[r]){        // portadas más grandes a medida que quedan menos
        n.style.setProperty('--vsn-w', L.coverAt[r].w+'px');
        n.style.setProperty('--vsn-h', L.coverAt[r].h+'px');
      }
      if(r < L.K){                                // línea hacia el nodo padre
        const parent = `n${r+1}_${Math.floor(i/2)}`;
        mkEdge(key, parent);
      }
    }
  }
  updatePhase();
  wireClicks();
  const nb = $('#vsNext'); if(nb) nb.addEventListener('click', openNextAlegato);
}

/* abre el alegato del próximo cruce sin resolver (o la gran final) */
function openNextAlegato(){
  if(VS.phase === 'grand'){ if(VS.grand && !VS.grand.winners) openGrandFinal(); return; }
  if(typeof VS.phase !== 'number') return;
  const r = VS.phase;
  const m = VS.rounds[r].findIndex(cr=>!cr.winner && cr.a && cr.b);
  if(m < 0) return;
  const cr = VS.rounds[r][m];
  const nombre = granRonda(VS.N / Math.pow(2, r));
  // resalta el cruce un instante y abre su alegato
  [`n${r}_${2*m}`, `n${r}_${2*m+1}`].forEach(k=>{ const n=vsUI.nodes[k]; if(n){ n.el.classList.remove('pop'); void n.el.offsetWidth; n.el.classList.add('pop'); } });
  openDebate(cr, `${nombre} · cruce ${m+1}`, w=>{ cr.winner = w; resolveMatch(r, m); });
}

function mkSideTag(txt, pos){
  const el = document.createElement('div');
  el.className = 'vs-side-tag';
  el.style.left = pos.x+'px'; el.style.top = pos.y+'px';
  el.textContent = txt;
  vsUI.stage.appendChild(el);
}

function mkNode(key, pos, book, champ=false){
  const el = document.createElement('div');
  el.className = 'vs-node' + (book ? '' : ' empty') + (champ ? ' champ' : '');
  el.style.left = pos.x+'px'; el.style.top = pos.y+'px';
  el.innerHTML = `<div class="vsn-cover"></div><div class="vsn-lab"></div>`;
  vsUI.stage.appendChild(el);
  vsUI.nodes[key] = { el, pos, book:null };
  if(book) fillNode(key, book, false);
  return el;
}

function fillNode(key, book, pop=true){
  const n = vsUI.nodes[key];
  n.book = book;
  n.el.classList.remove('empty');
  if(pop){ n.el.classList.remove('pop'); void n.el.offsetWidth; n.el.classList.add('pop'); }
  const cov = n.el.querySelector('.vsn-cover');
  cov.innerHTML = '';
  // A CIEGAS: el nodo es la frase. Ni tapa, ni título.
  if(VS.blind && !VS.revealed){
    n.el.classList.add('blind');
    cov.innerHTML = `<div class="vsn-q">«${escapeHtml(vsQuoteOf(book))}»</div>`;
    n.el.querySelector('.vsn-lab').textContent = '';
    return;
  }
  n.el.classList.remove('blind');
  if(book.portada){
    const img = document.createElement('img');
    img.src = book.portada; img.alt = '';
    img.onerror = ()=>{ img.remove(); paintFallback(cov, book); };
    cov.appendChild(img);
  } else paintFallback(cov, book);
  const lab = n.el.querySelector('.vsn-lab');
  lab.textContent = book.titulo.length>30 ? book.titulo.slice(0,29)+'…' : book.titulo;
}
function paintFallback(cov, book){
  ensureColor(book).then(c=>{
    cov.style.background = c.css;
    cov.style.display='flex'; cov.style.alignItems='center'; cov.style.justifyContent='center';
    cov.innerHTML = `<span style="font-family:Fraunces,serif;font-weight:700;font-size:9px;line-height:1.15;
      text-align:center;padding:4px;color:${contrastText(c)};">${escapeHtml(book.titulo.slice(0,30))}</span>`;
  });
}

function mkEdge(fromKey, toKey){
  const p1 = (vsUI.nodes[fromKey] && vsUI.nodes[fromKey].pos) || vsUI.pos[fromKey];
  const p2 = (vsUI.nodes[toKey] && vsUI.nodes[toKey].pos) || vsUI.pos[toKey];
  const mx = (p1.x+p2.x)/2;
  const d = `M ${p1.x} ${p1.y} C ${mx} ${p1.y}, ${mx} ${p2.y}, ${p2.x} ${p2.y}`;
  const path = document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d', d);
  path.setAttribute('class','base');
  vsUI.svg.appendChild(path);
  const dots = [p1,p2].map(p=>{
    const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx',p.x); c.setAttribute('cy',p.y); c.setAttribute('r',3.6);
    c.setAttribute('class','dot-off');
    vsUI.svg.appendChild(c);
    return c;
  });
  vsUI.edges[`${fromKey}>${toKey}`] = { path, dots };
  return vsUI.edges[`${fromKey}>${toKey}`];
}

/* pinta una línea: dorada animada (ganador) o gris (caído) */
function paintEdge(fromKey, toKey, lit){
  const e = vsUI.edges[`${fromKey}>${toKey}`] || mkEdge(fromKey, toKey);
  if(lit){
    const L = e.path.getTotalLength();
    e.path.setAttribute('class','lit');
    e.path.style.strokeDasharray = L;
    e.path.style.strokeDashoffset = L;
    e.path.getBoundingClientRect();
    e.path.style.transition = 'stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)';
    e.path.style.strokeDashoffset = '0';
    e.dots.forEach(d=>d.setAttribute('class','dot'));
    Sound.noise({dur:.45, vol:.05, lp:3000, hp:700, sweepTo:5000, wet:.4});
  } else {
    e.path.setAttribute('class','dim');
  }
}

/* ---------- fases (genéricas: VS.phase = índice de capa, o 'grand') ---------- */
function updatePhase(){
  const el = $('#vsPhase');
  const nb = $('#vsNext');
  const tally = $('#vsTally');
  const showNext = on => { if(nb) nb.style.display = on ? '' : 'none'; };
  if(!el) return;
  // total de alegatos del torneo y cuántos faltan en TODO el cuadro
  const totalTorneo = VS.N ? VS.N - 1 : 0;
  const jugados = (VS.rounds||[]).reduce((n,capa)=>n + capa.filter(c=>c.winner).length, 0);
  const setTally = (txt)=>{ if(tally) tally.innerHTML = txt; };
  if(VS.phase === 'grand'){
    el.textContent = '⚡ LA GRAN FINAL ⚡ — toquen a los dos finalistas';
    setTally(`<b>1</b> alegato · la final <span>${jugados} de ${totalTorneo} jugados en el torneo</span>`);
    showNext(!(VS.grand&&VS.grand.winners)); if(nb) nb.textContent = 'Abrir la gran final →';
    return;
  }
  if(VS.phase === 'done'){ el.textContent = ''; setTally(''); showNext(false); return; }
  const enJuego = VS.N / Math.pow(2, VS.phase);        // libros vivos en esta capa
  const nombre = granRonda(enJuego);
  const capa = VS.rounds[VS.phase];
  const totalCapa = capa.length, rem = capa.filter(c=>!c.winner).length;
  el.textContent = nombre;
  setTally(`Faltan <b>${rem}</b> de <b>${totalCapa}</b> alegatos de esta ronda`
    + `<span>${jugados} de ${totalTorneo} jugados en todo el cuadro</span>`);
  showNext(rem>0); if(nb) nb.textContent = 'Siguiente alegato →';
}

function clearClickables(){
  Object.values(vsUI.nodes).forEach(n=>{
    n.el.classList.remove('clickable');
    n.el.onclick = null;
  });
}

/* habilita los cruces de la capa activa (o los dos finalistas si es la gran final) */
function wireClicks(){
  clearClickables();
  if(VS.phase === 'grand'){
    if(VS.grand.winners) return;
    [VS.finalKeys.a, VS.finalKeys.b].forEach(k=>{
      const n = vsUI.nodes[k]; if(!n) return;
      n.el.classList.add('clickable');
      n.el.onclick = openGrandFinal;
    });
    return;
  }
  const r = VS.phase;
  VS.rounds[r].forEach((cr,m)=>{
    if(cr.winner || !cr.a || !cr.b) return;
    const nombre = granRonda(VS.N / Math.pow(2, r));
    const open = ()=>openDebate(cr, `${nombre} · cruce ${m+1}`, w=>{
      cr.winner = w;
      resolveMatch(r, m);
    });
    [`n${r}_${2*m}`, `n${r}_${2*m+1}`].forEach(k=>{
      const n = vsUI.nodes[k]; if(!n) return;
      n.el.classList.add('clickable');
      n.el.onclick = open;
    });
  });
}

/* resuelve un cruce: pinta, promueve al ganador y avanza la fase */
function resolveMatch(r, m){
  const cr = VS.rounds[r][m];
  const ka = `n${r}_${2*m}`, kb = `n${r}_${2*m+1}`, kt = `n${r+1}_${m}`;
  const perdedor = cr.winner===cr.a ? cr.b : cr.a;
  perdedor._vsPlace = granPlace(VS.N / Math.pow(2, r));   // dónde quedó, por tamaño de ronda
  paintEdge(cr.winner===cr.a ? ka : kb, kt, true);
  paintEdge(cr.winner===cr.a ? kb : ka, kt, false);
  vsUI.nodes[cr.winner===cr.a ? kb : ka].el.classList.add('out');
  // sube el ganador al slot padre (y al modelo de la capa siguiente)
  const padre = VS.rounds[r+1] && VS.rounds[r+1][Math.floor(m/2)];
  if(padre){ if(m%2===0) padre.a = cr.winner; else padre.b = cr.winner; }
  setTimeout(()=>{ fillNode(kt, cr.winner); Sound.fx.reveal(); }, 650);
  setTimeout(checkPhase, 1200);
}

function checkPhase(){
  const r = VS.phase;
  if(typeof r !== 'number'){ wireClicks(); return; }
  if(!VS.rounds[r].every(c=>c.winner)){ updatePhase(); wireClicks(); return; }   // faltan cruces: el contador baja
  const next = r + 1;
  if(next === VS.K - 1){
    // la capa siguiente es la final: los dos finalistas listos
    const fin = VS.rounds[next][0];
    VS.grand.a = fin.a; VS.grand.b = fin.b;
    VS.finalKeys = { a:`n${next}_0`, b:`n${next}_1`, win:`n${VS.K}_0` };
    VS.phase = 'grand'; updatePhase(); wireClicks();
    Sound.fx.finalBell();
  } else {
    VS.phase = next; updatePhase(); wireClicks();
  }
}

/* ---------- el alegato (con dado de emergencia) ---------- */
const VS_FLAVOR = [
  'Prohibido decir «confiá en mí».',
  'Un minuto cada uno.',
  'Pasión sí. Chicana no.',
  'El libro los está escuchando.',
  'El que grita, pierde.',
  'Citar la sinopsis vale. Inventarla no.',
];
/* un lado del alegato con el libro a la vista: cabecera, tapa, título,
   tropes y sinopsis — todo en filas de alto fijo para que las dos columnas
   queden alineadas y el «vs» caiga justo en el centro de las tapas */
function vsDuelSide(bk, side){
  // side 'a' = izquierda (portada a la izq, info a la der) · 'b' = derecha (espejado)
  const s = document.createElement('div');
  s.className = 'vs-duel-side ' + (side==='b' ? 'right' : 'left');
  const ownerP = bk._vsOwner;
  const head = bk._vsTrope
    ? `<div class="vs-duel-owner" style="color:#E8C34A">${bookmojiHTML(bk._vsTrope)} ${escapeHtml(bk._vsTrope)}</div>`
    : `<div class="vs-duel-owner" style="color:${PLAYER_COLOR[ownerP]||'var(--grey)'}">${
        ownerP ? 'de '+escapeHtml(State.players[ownerP]) : ''}</div>`;
  const tr = (bk.tropes||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,3);
  const meta = [bk.autor, bk.anio, bk.pais, bk.paginas?bk.paginas+' págs':''].filter(Boolean).join(' · ');
  // cuerpo horizontal: portada + info al costado
  const body = document.createElement('div');
  body.className = 'vs-duel-body';
  const cov = document.createElement('div');
  cov.className = 'vs-duel-cover';
  cov.appendChild(bookEl(bk, {size:bs(120)}));
  const info = document.createElement('div');
  info.className = 'vs-duel-info';
  info.innerHTML = head
    + `<div class="vs-duel-title">${escapeHtml(bk.titulo)}</div>`
    + (meta ? `<div class="vs-duel-meta">${escapeHtml(meta)}</div>` : '')
    + (tr.length ? `<div class="vs-duel-tropes">${tr.map(x=>`<span${bk._vsTrope===x?' class="on"':''}>${bookmojiHTML(x)} ${escapeHtml(x)}</span>`).join('')}</div>` : '')
    + `<div class="vs-duel-syn">${escapeHtml(bk.sinopsis || '(sin sinopsis)')}</div>`;
  body.appendChild(cov); body.appendChild(info);
  s.appendChild(body);
  return s;
}
const vsVsEl = ()=>{ const v = document.createElement('div'); v.className = 'vs-vs'; v.textContent = 'vs'; return v; };

function openDebate(cruce, label, onWin){
  Sound.fx.click();
  const ov = overlay(`
    <div class="ov-pop center" style="max-width:min(1040px,94vw);">
      <div class="eyebrow" style="color:#E8C34A;">Alegatos · ${escapeHtml(label)}</div>
      <div class="vs-duel mt-s" id="vsDuel"></div>
      <p class="vs-flavor mt-s">${VS_FLAVOR[Math.floor(Math.random()*VS_FLAVOR.length)]}</p>
      <div class="row mt-m">
        <button class="btn btn-ghost" data-esc id="vsDuelBack">Todavía no</button>
        <button class="btn btn-ghost" id="vsDice" style="border-color:rgba(232,195,74,.4);color:#E8C34A;">🎲 No hay acuerdo — que decida el dado</button>
      </div>
    </div>`);
  const duel = $('#vsDuel', ov);
  if(VS.blind) duel.className = 'vq-duel mt-s';
  [cruce.a, cruce.b].forEach((bk, i)=>{
    const btn = document.createElement('button');
    btn.className = 'btn btn-amber btn-sm vs-duel-go';
    btn.textContent = 'Avanza este';
    btn.addEventListener('click', ()=>{ Sound.fx.chosen(); closeOverlay(ov); onWin(bk); });

    let sideEl;
    if(VS.blind){
      // a ciegas: SOLO la frase. Ni tapa, ni título, ni de quién es.
      sideEl = document.createElement('div');
      sideEl.className = 'vq-side';
      sideEl.innerHTML = `<div class="vq-mark">“</div>
        <div class="vq-text">${escapeHtml(vsQuoteOf(bk))}</div>
        <div class="vq-foot">no saben qué libro es</div>`;
    } else {
      sideEl = vsDuelSide(bk, i===0?'a':'b');
    }
    sideEl.appendChild(btn);
    duel.appendChild(sideEl);
    if(i===0) duel.appendChild(vsVsEl());
  });
  $('#vsDuelBack', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
  $('#vsDice', ov).addEventListener('click', ()=>rollDice(ov, cruce, onWin));
}

const DIE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];
function rollDice(ov, cruce, onWin){
  Sound.fx.click();
  ov.innerHTML = `
    <div class="ov-pop center" style="max-width:520px;">
      <div class="eyebrow" style="color:#E8C34A;">El dado del destino</div>
      <div class="vs-die-map mt-s">
        <div>⚀⚂⚄ impar → <b>${escapeHtml(short(vsName(cruce.a),22))}</b></div>
        <div>⚁⚃⚅ par → <b>${escapeHtml(short(vsName(cruce.b),22))}</b></div>
      </div>
      <div class="vs-die rolling mt-m" id="vsDieFace">⚄</div>
      <p class="lead" id="vsDieSub" style="font-size:13px;">Rodando…</p>
    </div>`;
  const face = $('#vsDieFace', ov);
  const val = 1 + Math.floor(Math.random()*6);
  let tick = 0; const total = 14 + val;
  (function step(){
    face.textContent = DIE_FACES[Math.floor(Math.random()*6)];
    Sound.noise({dur:.05, vol:.07, lp:2200, hp:400});
    tick++;
    if(tick<total){ setTimeout(step, 60 + Math.pow(tick/total,2.5)*240); }
    else {
      face.textContent = DIE_FACES[val-1];
      face.classList.remove('rolling');
      const winner = (val%2===1) ? cruce.a : cruce.b;
      $('#vsDieSub', ov).innerHTML = `Salió <b>${val}</b> — avanza <b class="serif">${escapeHtml(vsName(winner))}</b>`;
      Sound.fx.chosen();
      sparkleAt(innerWidth/2, innerHeight/2, 8);
      setTimeout(()=>{ closeOverlay(ov); onWin(winner); }, 1900);
    }
  })();
}

/* ---------- LA GRAN FINAL ---------- */
function openGrandFinal(){
  Sound.fx.click();
  const A = VS.grand.a, B = VS.grand.b;
  const ov = overlay(`
    <div class="ov-pop center" style="max-width:min(1040px,94vw);">
      <div class="eyebrow" style="color:#E8C34A;">⚡ La Gran Final ⚡</div>
      <div class="vs-duel mt-s" id="gfDuel"></div>
      <p class="lead" style="font-size:14px;margin-top:14px;">¿Cómo lo resuelven?</p>
      <div class="row mt-m" style="flex-direction:column;align-items:stretch;gap:10px;">
        <button class="btn btn-primary" id="gfVote">🗳️ Votamos en secreto — cada uno el suyo</button>
        <button class="btn btn-ghost" id="gfDebate">🗣 Lo debatimos y elegimos</button>
        <button class="btn btn-ghost" id="gfBoth">📚 Leemos los dos — empate de honor</button>
        <button class="btn btn-amber" id="gfEpic">⚡ VS FINAL ÉPICO — que lo decida el destino</button>
      </div>
      <button class="btn btn-ghost btn-sm mt-s" data-esc id="gfBack">Todavía no</button>
    </div>`);
  const duel = $('#gfDuel', ov);
  if(VS.blind) duel.className = 'vq-duel mt-s';
  [A,B].forEach((bk,i)=>{
    let s;
    if(VS.blind){
      s = document.createElement('div');
      s.className = 'vq-side';
      s.innerHTML = `<div class="vq-mark">“</div>
        <div class="vq-text">${escapeHtml(vsQuoteOf(bk))}</div>
        <div class="vq-foot">todavía no saben qué es</div>`;
    } else {
      s = vsDuelSide(bk);
    }
    duel.appendChild(s);
    if(i===0) duel.appendChild(vsVsEl());
  });
  $('#gfBack', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
  $('#gfVote', ov).addEventListener('click', ()=>{
    closeOverlay(ov);
    // la final narrativa: cada uno vota en secreto → acuerdo o ruleta + carta.
    // usa show() (pantalla completa), así que al coronar redibujamos el cuadro
    // para que la coronación (y el velo a ciegas) tengan dónde pintarse.
    vsFinalVote(A, B, VS.modeLabel, (w)=>{
      VS.grand.winners = [w];          // que screenBracket no vuelva a habilitar la final
      screenBracket();
      resolveGrand([w]);
    });
  });
  $('#gfDebate', ov).addEventListener('click', ()=>{
    closeOverlay(ov);
    openDebate({a:A, b:B}, 'la gran final', w=>resolveGrand([w]));
  });
  $('#gfBoth', ov).addEventListener('click', ()=>{
    Sound.fx.chosen();
    closeOverlay(ov);
    resolveGrand([A,B]);
  });
  $('#gfEpic', ov).addEventListener('click', ()=>{ closeOverlay(ov); epicFinal(A,B); });
}

/* el VS épico: drone, agonía y azar */
async function epicFinal(A, B){
  Sound.stopMusic();
  Sound.startDrone();
  $('#vignette').classList.add('on');
  const ov = overlay(`
    <div class="ov-pop center" style="max-width:720px;">
      <div class="eyebrow" style="color:#E8C34A;">⚡ VS FINAL ÉPICO ⚡</div>
      <div class="vs-duel epic mt-m" id="epicDuel" style="gap:clamp(24px,6vw,70px);"></div>
      <p class="lead" id="epicSub" style="margin-top:22px;">Uno de los dos no se lee…</p>
    </div>`);
  const duel = $('#epicDuel', ov);
  const els = [A,B].map((bk,i)=>{
    const d = document.createElement('div');
    d.className = 'duel-book';
    const inner = document.createElement('div');
    inner.className = 'wb-inner';
    if(VS.blind){
      inner.innerHTML = `<div class="vq-side" style="max-width:250px;min-height:150px;">
        <div class="vq-mark">“</div>
        <div class="vq-text">${escapeHtml(vsQuoteOf(bk))}</div></div>`;
      d.appendChild(inner);
    } else {
      inner.appendChild(bookEl(bk, {size:bs(150), baseY: i===0?-26:26}));
      d.appendChild(inner);
      const t = document.createElement('div');
      t.className = 'vs-duel-title'; t.style.marginTop='10px'; t.textContent = bk.titulo;
      d.appendChild(t);
    }
    duel.appendChild(d);
    if(i===0){ const v=document.createElement('div'); v.className='vs-vs'; v.textContent='vs'; duel.appendChild(v); }
    return d;
  });
  await sleep(1400);
  const winIdx = Math.random()<0.5 ? 0 : 1;
  const loops = 12 + Math.floor(Math.random()*4);
  const total = loops*2 + winIdx + 1;
  let tick = 0;
  await new Promise(res=>{
    (function step(){
      els.forEach((e,i)=>e.classList.toggle('lit', i===tick%2));
      const p = tick/total;
      Sound.fx.tickFinal(Math.floor(p*4));
      if(p>0.65 && !step._sw){ step._sw = true; Sound.swellDrone(); $('#epicSub', ov).textContent = '…'; }
      tick++;
      if(tick<total) setTimeout(step, 130 + Math.pow(p,3.6)*1400);
      else res();
    })();
  });
  Sound.fx.riser(1.1);
  await sleep(1150);
  Sound.stopDrone();
  const winner = winIdx===0 ? A : B;
  els.forEach((e,i)=>e.classList.toggle('lit', i===winIdx));
  els[1-winIdx].style.filter = 'grayscale(.9) brightness(.4)';
  $('#epicSub', ov).innerHTML = `El destino habló: <b class="serif">${escapeHtml(vsName(winner))}</b>`;
  $('.screen.in') && $('.screen.in').classList.add('shake');
  Sound.fx.drop();
  await sleep(2200);
  $('#vignette').classList.remove('on');
  closeOverlay(ov);
  resolveGrand([winner]);
}

/* pinta la gran final y dispara el evento del regreso */
function resolveGrand(winners){
  VS.grand.winners = winners;
  VS.phase = 'done';
  updatePhase();
  clearClickables();
  Sound.stopMusic();
  const wA = winners.includes(VS.grand.a);
  const wB = winners.includes(VS.grand.b);
  winners.forEach(w=>w._vsPlace = 'campeon');
  if(!wA) VS.grand.a._vsPlace = 'finalista';
  if(!wB) VS.grand.b._vsPlace = 'finalista';
  const FK = VS.finalKeys || { a:'n0_0', b:'n0_1', win:'n1_0' };
  paintEdge(FK.a, FK.win, wA);
  paintEdge(FK.b, FK.win, wB);
  if(!wA && vsUI.nodes[FK.a]) vsUI.nodes[FK.a].el.classList.add('out');
  if(!wB && vsUI.nodes[FK.b]) vsUI.nodes[FK.b].el.classList.add('out');
  setTimeout(async ()=>{
    // A CIEGAS: acá se cae el velo. Todo el cuadro se revela de golpe.
    if(VS.blind){
      $('#vsPhase') && ($('#vsPhase').textContent = 'Se cae el velo…');
      Sound.fx.riser(1.2);
      await sleep(900);
      VS.revealed = true;
      Object.entries(vsUI.nodes).forEach(([k,n])=>{ if(n.book) fillNode(k, n.book, false); });
      Sound.fx.reveal();
      await sleep(700);
      $('#vsPhase') && ($('#vsPhase').textContent = '');
    }
    fillNode(FK.win, winners[0]);
    if(winners.length>1){
      const cov = vsUI.nodes[FK.win].el.querySelector('.vsn-cover');
      cov.style.boxShadow = '0 0 24px rgba(232,195,74,.8)';
      vsUI.nodes[FK.win].el.querySelector('.vsn-lab').textContent =
        winners.map(w=>w.titulo).join('  +  ').slice(0,60);
    }
    Sound.fx.fanfare();
    const st = vsUI.stage.getBoundingClientRect();
    sparkleAt(st.left + st.width/2, st.top + st.height*0.45, 14);
  }, 700);
  setTimeout(()=>vsReturnEvent(winners), VS.blind ? 5600 : 3400);
}

/* ---------- EL REGRESO — los caídos vuelven al cajón, uno a uno ----------
   (compartido: lo usa el Vasallaje y también la cosecha normal) */
async function vsReturnEvent(winners){
  await renameUndo(`el Vasallaje de «${winners.map(w=>w.titulo).join(' + ')}»`);
  const winIds = new Set(winners.map(w=>w.id));
  const losers = VS.all.filter(b=>!winIds.has(b.id));
  losers.forEach(b=>{
    stampCosecha(b);
    vsStampPlace(b, b._vsPlace || 'r1');
  });
  await drawerReturn(losers, { eyebrow:'El torneo terminó' });
  const loserIds = new Set(losers.map(b=>b.id));
  State.vault = State.vault.filter(v=>!loserIds.has(v.id));   // sin copias viejas sin historial
  State.vault.push(...losers.map(cleanBook));
  await persist();          // el cuadro ya se jugó: se guarda antes de la fiesta
  vsCelebrate(winners);
}

async function drawerReturn(losers, opts={}){
  App.ambient('rgba(90,64,35,.12)', 'rgba(10,18,10,.5)');
  show(`
    <div class="center" style="min-height:20vh;justify-content:flex-end;padding-top:40px;">
      <div class="eyebrow" style="color:var(--grey);">${opts.eyebrow||'La cosecha terminó'}</div>
      <h2 class="serif" style="font-weight:900;font-size:clamp(24px,4.5vw,40px);margin:0;">Los caídos vuelven a la bóveda</h2>
      <p class="lead mt-s" id="vsRetSub">${losers.length>10?'Con honor. En bandada.':'Con honor. Uno por uno.'}</p>
    </div>
    <div class="vs-drawer-zone">
      <div class="vs-flyers" id="vsFlyers"></div>
      <div class="vs-drawer" id="vsDrawer">
        <div class="dw-mouth"></div>
        <div class="dw-box"></div>
        <div class="dw-handle"></div>
      </div>
    </div>
  `);
  const flyers = $('#vsFlyers');
  const drawer = $('#vsDrawer');
  await sleep(1100);

  const zone = flyers.getBoundingClientRect();
  const dr = drawer.getBoundingClientRect();
  const targetX = dr.left + dr.width/2 - zone.left;
  const targetY = dr.top + 26 - zone.top;

  // muchos libros (Gran Vasallaje) → vuelan en bandada, solapados y rápido
  const muchos = losers.length > 10;
  const gap = muchos ? Math.max(45, 900/losers.length) : 240;
  const durVuelo = muchos ? 420 : 520;
  let ultima = null;
  for(let i=0; i<losers.length; i++){
    const b = losers[i];
    const fl = document.createElement('div');
    fl.className = 'vs-flyer';
    const startX = zone.width*0.12 + Math.random()*zone.width*0.76;
    const startY = 30 + Math.random()*Math.max(60, zone.height*0.34);
    fl.style.left = startX+'px';
    fl.style.top = startY+'px';
    if(b.portada){
      const img = document.createElement('img');
      img.src = b.portada;
      img.onerror = ()=>{ img.remove(); ensureColor(b).then(c=>fl.style.background=c.css); };
      fl.appendChild(img);
    } else ensureColor(b).then(c=>fl.style.background=c.css);
    flyers.appendChild(fl);
    fl.animate([{opacity:0, transform:'scale(.4)'},{opacity:1, transform:'scale(1)'}], {duration:muchos?110:180, fill:'forwards'});
    $('#vsRetSub') && ($('#vsRetSub').innerHTML = muchos ? `${losers.length-i} volviendo…` : `«${escapeHtml(b.titulo)}» vuelve a la bóveda…`);
    await sleep(muchos ? 30 : 240);
    if(!muchos || i%3===0) Sound.noise({dur:.3, vol:.08, lp:3400, hp:500, sweepTo:900, wet:.3});
    const dx = targetX - startX - 48, dy = targetY - startY;   // 48 = mitad del flyer grande
    const anim = fl.animate([
      { transform:'translate(0,0) rotate(0deg) scale(1)', offset:0 },
      { transform:`translate(${dx*0.5}px, ${dy*0.35 - 60}px) rotate(${(Math.random()-.5)*40}deg) scale(.9)`, offset:.5 },
      { transform:`translate(${dx}px, ${dy}px) rotate(${(Math.random()-.5)*70}deg) scale(.3)`, opacity:.9, offset:1 },
    ], { duration:durVuelo, easing:'cubic-bezier(.5,0,.9,.4)', fill:'forwards' });
    ultima = anim;
    anim.finished.then(()=>fl.remove()).catch(()=>{});
    Sound.tone({freq:120 - (i%20)*2, dur:.1, type:'sine', vol:.14, glideTo:60});
    drawer.classList.remove('bump'); void drawer.offsetWidth; drawer.classList.add('bump');
    if(!muchos) await anim.finished.catch(()=>{});
    await sleep(muchos ? gap : 120);
  }
  if(ultima) await ultima.finished.catch(()=>{});

  await sleep(400);
  drawer.classList.add('closed','slam');
  Sound.fx.drop();
  Sound.noise({dur:.5, vol:.2, lp:600});
  const dr2 = drawer.getBoundingClientRect();
  sparkleAt(dr2.left + dr2.width/2, dr2.top, 7);
  $('#vsRetSub') && ($('#vsRetSub').textContent = 'Bóveda completa.');
  await sleep(1400);
}

/* ---------- celebración + cierre ---------- */
function vsCelebrate(winners){
  Sound.fx.fanfare();
  setTimeout(()=>Sound.playCelebration(), 500);
  ensureColor(winners[0]).then(c=>{
    App.ambient((winners[0]._haloColor||'rgba(232,195,74,.5)').replace('0.55','0.14'), 'rgba(232,195,74,.07)');
    launchConfetti(c);
    let bursts = 0;
    const bt = setInterval(()=>{
      bursts++;
      if(bursts>4){ clearInterval(bt); return; }
      launchConfetti(c, bursts%2?0.18:0.82, 0.28, 90);
    }, 1500);
    setTimeout(()=>{
      const two = winners.length>1;
      show(`
        <div class="center win-screen" style="min-height:92vh;justify-content:center;position:relative;z-index:4100;">
          <div class="eyebrow" style="color:#E8C34A;animation:winPop .6s var(--ease-pop);">⚔️ ${two?'Empate de honor':'Campeón del Vasallaje'}</div>
          <div id="vsWinBooks" style="display:flex;gap:34px;align-items:flex-end;justify-content:center;animation:winRise 1s var(--ease-pop);"></div>
          <h1 class="serif" style="font-weight:900;font-size:clamp(26px,5vw,54px);margin:26px 0 6px;animation:winPop .8s .2s both var(--ease-pop);text-shadow:0 4px 24px rgba(0,0,0,.7);">
            ${winners.map(w=>escapeHtml(w.titulo)).join('<span style="color:#E8C34A;"> + </span>')}</h1>
          <p class="lead" style="margin:6px auto 0;animation:winPop .8s .35s both var(--ease-pop);">
            ${two?'Se leen los dos. Nadie perdió.':'Salió de la bóveda peleando.'}</p>
          <div class="row mt-l" style="animation:winPop .8s .5s both var(--ease-pop);">
            <button class="btn btn-amber" id="vsAccept">${two?'A leer los dos':'Lo aceptamos, este leemos'}</button>
          </div>
        </div>
      `, {silent:true});
      const wb = $('#vsWinBooks');
      winners.forEach(w=>{
        const el = bookEl(w, {size:bs(two?190:240)});
        wb.appendChild(el);
        setTimeout(()=>{
          const halo = el.querySelector('.book-halo');
          if(halo){ halo.style.opacity='1'; halo.style.animation='haloPulse 2s ease-in-out infinite'; }
        }, 250);
      });
      $('#vsAccept').addEventListener('click', ()=>{
        Sound.fx.click();
        clearInterval(bt);
        finishVasallaje(winners);
      });
    }, 950);
  });
}

async function finishVasallaje(winners){
  const now = new Date();
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  // esta pantalla la comparten el Vasallaje y los juegos de la cosecha (El Naufragio).
  // Si el ganador no salió de un cuadro, es una cosecha: sus caídos también van a la bóveda.
  const enTorneo = (VS.all||[]).some(b=>winners.some(w=>w.id===b.id));
  let premios = [];
  if(!enTorneo){
    await renameUndo(`la cosecha de «${winners.map(w=>w.titulo).join(' + ')}»`);
    returnLosersToVault(winners);
    premios = resolverApuesta(winners);   // el Naufragio también paga apuestas
  }
  winners.forEach(w=>{
    stampCosecha(w);
    if(enTorneo) vsStampPlace(w, w._vsPlace || 'campeon');
    if(!evTiene(w, 'victorias', fechaHoy()))
      evPush(w, 'victorias', {
        quien: w._metodo || ('Vasallaje' + (VS.modeLabel ? ' · '+VS.modeLabel : '')),
        extra: (winners.length>1 || w._empate) ? 'empate de honor' : '' });
    // sale de la bóveda para siempre y sube al estante con TODO su historial
    State.vault = State.vault.filter(v=>v.id!==w.id);
    State.read = State.read.filter(r=>r.id!==w.id);
    const entry = cleanBook(w);
    entry.readDate = `${meses[now.getMonth()]} ${now.getFullYear()}`;
    State.read.push(entry);
  });
  await persist();
  Sound.stopCelebration();
  show(`
    <div class="center" style="min-height:46vh;justify-content:flex-end;">
      <div class="eyebrow" style="color:#E8C34A;">Vasallaje cerrado</div>
      <h1 class="title" style="font-size:clamp(28px,5vw,50px);">A leer<br>${winners.map(w=>escapeHtml(w.titulo)).join(' + ')}</h1>
      ${marcadorBandHTML()}
      <p class="lead mt-m" style="margin-left:auto;margin-right:auto;">Se guardó y sincronizó solo.</p>
      <div class="row mt-l">
        <button class="btn btn-primary" id="vsDl">Descargar el club actualizado</button>
        <button class="btn btn-ghost" id="vsHome">Volver al inicio</button>
      </div>
    </div>
    ${VS.blind?`<section class="mt-l" id="vqrSec">
      <div class="eyebrow" style="color:#E8C34A;">🎭 El velo levantado</div>
      <h2 class="serif" style="font-weight:700;font-size:26px;margin:0 0 16px;">De qué hablaba cada frase</h2>
      <div class="vqr-list" id="vqrList"></div>
    </section>`:''}
    <section class="mt-l">
      <div class="eyebrow">El estante de honor</div>
      <div id="honorShelf"></div>
    </section>
  `);
  // la lista linda: qué libro era cada frase
  if(VS.blind && $('#vqrList')){
    const wonIds = new Set(winners.map(w=>w.id));
    const list = $('#vqrList');
    VS.all.forEach(b=>{
      const won = wonIds.has(b.id);
      const row = document.createElement('div');
      row.className = 'vqr-row' + (won?' win':'');
      row.innerHTML = `
        <div class="vqr-cov" ${b.portada?`style="background-image:url('${b.portada.replace(/'/g,'%27')}')"`:''}></div>
        <div class="vqr-main">
          <div class="vqr-q">«${escapeHtml(vsQuoteOf(b))}»</div>
          <div class="vqr-t">${won?'🏆 <b>':''}${escapeHtml(b.titulo)}${won?'</b>':''}</div>
          <div class="vqr-sub">${[b.autor, b.anio].filter(Boolean).map(escapeHtml).join(' · ')}</div>
        </div>`;
      row.style.cursor = 'pointer';
      row.addEventListener('click', ()=>{
        const all = [...State.read, ...State.vault];
        const i = all.findIndex(x=>x.id===b.id);
        showPlacard(all, i<0?0:i, { source: wonIds.has(b.id)?'honor':'vault' });
      });
      list.appendChild(row);
    });
  }
  renderHonorShelf($('#honorShelf'), { highlightId: winners[winners.length-1].id });
  requestAnimationFrame(()=>animarMarcador());
  $('#vsDl').addEventListener('click', downloadClub);
  $('#vsHome').addEventListener('click', ()=>{ Sound.fx.click(); screenHome(); });
  mostrarPremios(premios);
}

/* ============================================================
   🏟️ GRAN VASALLAJE — torneos de 32 / 64, ronda por ronda.
   · Al empezar se SORTEAN al azar los que quedan afuera (ruleta horizontal).
   · El resto lo definen ustedes: cada cruce, tocan al que pasa.
   · Todo al historial (dieciseisavos → octavos → cuartos → semi → final).
   ============================================================ */
const GRAN_PLACE = {64:'dieciseisavos',32:'dieciseisavos',16:'octavos',8:'cuartos',4:'semifinal',2:'final'};
const GRAN_RONDA = {64:'Ronda de 64',32:'Dieciseisavos',16:'Octavos',8:'Cuartos',4:'Semifinal',2:'Final'};
const granPlace = n => GRAN_PLACE[n] || ('ronda de '+n);
const granRonda = n => GRAN_RONDA[n] || ('Ronda de '+n);

function startGranVasallaje(size){
  if(State.vault.length < size){ toast(`Necesitás ${size} libros en la bóveda (tenés ${State.vault.length})`); return; }
  saveUndo('el Gran Vasallaje a medias');
  VS.picks={a:[],b:[]}; VS.sides=null; VS.grand=null; VS.blind=false; VS.revealed=false;
  VS.mode='gran'; VS.modeLabel=`Gran Vasallaje ${size}`; VS.sideTags=null;
  const pool = shuffled(State.vault.slice());
  const participantes = pool.slice(0, size);
  const excluidos = pool.slice(size);
  VS.all = participantes.slice();
  State._snapVault = State.vault.map(cleanBook);   // foto para restaurar si se abandona (botón ✕)
  const ids = new Set(participantes.map(b=>b.id));
  State.vault = State.vault.filter(b=>!ids.has(b.id));   // salen mientras dura; vuelven al final
  if(Sound.startMusic) Sound.startMusic('vasallaje');
  const ab = $('#abortBtn'); if(ab) ab.classList.add('on');
  // los excluidos se sortean, y después TODOS entran al mismo bracket
  if(excluidos.length) granRuleta(excluidos, participantes, size);
  else armarCuadro(shuffled(participantes));
}

/* ---- la ruleta horizontal que sortea a los que no juegan ---- */
async function granRuleta(excluidos, participantes, size){
  App.ambient('rgba(232,195,74,.06)', 'rgba(30,26,50,.5)');
  const fila = shuffled([...excluidos, ...participantes]);
  show(`
    <div class="center" style="min-height:70vh;justify-content:center;">
      <div class="eyebrow" style="color:#E8C34A;">🏟️ Gran Vasallaje · ${size}</div>
      <h2 class="serif" style="font-weight:900;font-size:clamp(22px,4.5vw,38px);margin:2px 0 4px;">La bóveda tiene de más</h2>
      <p class="lead" id="grSub">Se sortean ${excluidos.length} que miran de afuera…</p>
      <div class="gr-reel-wrap"><div class="gr-reel" id="grReel"></div></div>
    </div>
  `);
  const reel = $('#grReel');
  const cellOf = {};
  fila.forEach(b=>{
    ensureColor(b);
    const c = document.createElement('div');
    c.className = 'gr-cell';
    c.style.cssText = b.portada ? `background-image:url('${b.portada.replace(/'/g,'%27')}')` : `background:${(b._color&&b._color.css)||'#26331f'}`;
    reel.appendChild(c); cellOf[b.id]=c;
  });
  const cells = fila.map(b=>cellOf[b.id]);
  await sleep(300);
  // UN barrido rápido de calentamiento (independiente de cuántos libros haya)
  const warm = 26;
  for(let i=0;i<warm;i++){
    const at = i % cells.length;
    cells.forEach((c,j)=>c.classList.toggle('lit', j===at));
    const c = cells[at]; if(c) c.scrollIntoView({inline:'center', block:'nearest', behavior:'auto'});
    try{ Sound.fx.tick(i/warm); }catch(err){}
    await sleep(26 + Math.pow(i/warm,2.6)*150);
  }
  cells.forEach(c=>c.classList.remove('lit'));
  // eliminación en CASCADA rápida: total acotado (~1.6s máx sin importar la cantidad)
  const step = Math.max(70, Math.min(320, Math.round(1600/Math.max(1,excluidos.length))));
  for(let e=0;e<excluidos.length;e++){
    const target = excluidos[e];
    const c = cellOf[target.id];
    if(c){ c.classList.add('lit'); c.scrollIntoView({inline:'center', block:'nearest', behavior:'auto'}); }
    await sleep(Math.min(step, 140));
    if(c){ c.classList.remove('lit'); c.classList.add('out'); }
    try{ Sound.fx.drop(); }catch(err){}
    if($('#grSub')) $('#grSub').innerHTML = `«${escapeHtml(short(target.titulo,26))}» queda afuera <b style="color:var(--grey)">· ${e+1}/${excluidos.length}</b>`;
    evPush(target, 'puestos', { fecha:fechaHoy(), quien:`Gran Vasallaje ${size}`, extra:'no entró al sorteo' });
    await sleep(step);
  }
  await persist();
  if($('#grSub')) $('#grSub').textContent = '¡A pelear!';
  await sleep(700);
  armarCuadro(shuffled(participantes));            // todos al mismo bracket
}

/* ============================================================
   ⚔️ LA FINAL NARRATIVA — cada uno dice a quién quiere.
   Acuerdo → se lee ese. Desacuerdo → ruleta + "carta" al que acertó.
   El duelo queda en la memoria del club (State.duelos) para las stats.
   ============================================================ */
/* a ciegas: en la final se vota sobre la frase, nunca sobre el título/portada */
const vsFinalSide = (b, side)=> (VS.blind && !VS.revealed)
  ? `<span class="gr-blind-q">“${escapeHtml(vsQuoteOf(b))}”</span>`
  : granSideHTML(b, side);
const vsFinalLabel = (b, n=22)=> (VS.blind && !VS.revealed)
  ? `«${escapeHtml(short(vsQuoteOf(b), n+8))}»`
  : `«${escapeHtml(short(b.titulo, n))}»`;

function vsFinalVote(x, z, modoLabel, onWinner){
  const A = State.players.a, B = State.players.b;
  const votos = {};
  const preguntar = (who, next)=>{
    const quien = who==='a' ? A : B;
    App.ambient('rgba(232,195,74,.07)', 'rgba(30,26,50,.5)');
    show(`
      <div class="center" style="min-height:80vh;justify-content:center;">
        <div class="eyebrow" style="color:#E8C34A;">⚔️ La final${modoLabel?' · '+escapeHtml(modoLabel):''}</div>
        <h2 class="serif" style="font-weight:900;font-size:clamp(23px,5vw,40px);margin:2px 0 4px;">${escapeHtml(quien)}, ¿cuál querés que gane?</h2>
        <p class="lead" style="opacity:.8;">Que no mire el otro. Tocá tu elegido.</p>
        <div class="gr-matches" id="fvPick" style="margin-top:18px;">
          <div class="gr-match">
            <button class="gr-side left${VS.blind?' blind':''}" data-w="x">${vsFinalSide(x,'left')}</button>
            <div class="gr-vs">o</div>
            <button class="gr-side right${VS.blind?' blind':''}" data-w="z">${vsFinalSide(z,'right')}</button>
          </div>
        </div>
      </div>
    `);
    $$('.gr-side', $('#fvPick')).forEach(s=>s.addEventListener('click', ()=>{
      try{ Sound.fx.chosen(); }catch(e){}
      votos[who] = s.dataset.w==='x' ? x : z;
      next();
    }));
  };
  preguntar('a', ()=> vsPassGate(B, ()=> preguntar('b', resolver)));

  function resolver(){
    const acuerdo = votos.a.id === votos.b.id;
    const finish = (ganador, linea)=>{
      const loser = ganador.id===x.id ? z : x;
      loser._vsPlace = 'final';                 // el finalista perdedor queda como "final"
      recordDuelo(x, z, votos, ganador, acuerdo, modoLabel);
      vsFinalReveal(ganador, linea, ()=>onWinner(ganador));
    };
    if(acuerdo){
      finish(votos.a, `Los dos querían ${vsFinalLabel(votos.a,30)}. Sin ruleta: se lee ese.`);
    } else {
      vsFinalRuleta(x, z, votos, (ganador)=>{
        const quienAcerto = votos.a.id===ganador.id ? A : (votos.b.id===ganador.id ? B : null);
        const carta = quienAcerto ? ` 🃏 Carta para <b>${escapeHtml(quienAcerto)}</b>: ganó el que elegiste.` : '';
        finish(ganador, `No hubo acuerdo. La ruleta habló.${carta}`);
      });
    }
  }
}

function vsPassGate(quien, done){
  App.ambient();
  show(`
    <div class="center" style="min-height:70vh;justify-content:center;">
      <div class="eyebrow" style="color:var(--grey);">Pasá el teléfono</div>
      <h2 class="serif" style="font-weight:900;font-size:clamp(26px,6vw,46px);margin:6px 0 16px;">Ahora ${escapeHtml(quien)}</h2>
      <div class="row"><button class="btn btn-amber" id="pgGo">Listo, soy ${escapeHtml(quien)}</button></div>
    </div>
  `);
  $('#pgGo').addEventListener('click', ()=>{ try{ Sound.fx.click(); }catch(e){} done(); });
}

async function vsFinalRuleta(x, z, votos, done){
  App.ambient('rgba(232,195,74,.07)', 'rgba(30,26,50,.5)');
  const ganador = Math.random()<0.5 ? x : z;
  show(`
    <div class="center" style="min-height:78vh;justify-content:center;">
      <div class="eyebrow" style="color:#E8C34A;">No hubo acuerdo</div>
      <h2 class="serif" style="font-weight:900;font-size:clamp(23px,5vw,40px);margin:2px 0 4px;">Que decida la suerte</h2>
      <p class="lead" style="opacity:.85;">${escapeHtml(State.players.a)} quería ${vsFinalLabel(votos.a)} · ${escapeHtml(State.players.b)} quería ${vsFinalLabel(votos.b)}</p>
      <div class="gr-reel-wrap" style="margin-top:20px;"><div class="gr-reel" id="frReel" style="justify-content:center;"></div></div>
    </div>
  `);
  const reel = $('#frReel');
  const seq = [];
  for(let i=0;i<9;i++) seq.push(i%2 ? z : x);
  const cells = seq.map(b=>{
    ensureColor(b);
    const c = document.createElement('div');
    c.className = 'gr-cell';
    c.style.cssText = (b.portada && !(VS.blind && !VS.revealed)) ? `background-image:url('${b.portada.replace(/'/g,'%27')}')` : `background:${(b._color&&b._color.css)||'#26331f'}`;
    reel.appendChild(c); return c;
  });
  await sleep(400);
  let stopIdx = seq.length-1; while(stopIdx>0 && seq[stopIdx].id!==ganador.id) stopIdx--;
  for(let i=0;i<=stopIdx;i++){
    cells.forEach((c,j)=>c.classList.toggle('lit', j===i));
    cells[i].scrollIntoView({inline:'center', block:'nearest', behavior:'smooth'});
    try{ Sound.fx.tick(stopIdx?i/stopIdx:1); }catch(e){}
    await sleep(90 + Math.pow(stopIdx?i/stopIdx:1,2.6)*320);
  }
  try{ Sound.fx.reveal(); }catch(e){}
  await sleep(700);
  done(ganador);
}

function vsFinalReveal(winner, linea, done){
  App.ambient();
  show(`
    <div class="center" style="min-height:72vh;justify-content:center;">
      <div class="eyebrow" style="color:#E8C34A;">La final tiene dueño</div>
      <div id="fvBook" style="margin:14px 0;"></div>
      <h2 class="serif" style="font-weight:900;font-size:clamp(24px,5vw,44px);margin:2px 0 6px;">${escapeHtml(winner.titulo)}</h2>
      <p class="lead" style="max-width:460px;margin:0 auto;">${linea}</p>
      <div class="row mt-l"><button class="btn btn-amber" id="fvGo">Coronar 🏆</button></div>
    </div>
  `);
  $('#fvBook').appendChild(bookEl(winner, {size:bs(200)}));
  $('#fvGo').addEventListener('click', ()=>{ try{ Sound.fx.click(); }catch(e){} done(); });
}

function recordDuelo(x, z, votos, ganador, acuerdo, modoLabel){
  if(!Array.isArray(State.duelos)) State.duelos = [];
  const A = State.players.a, B = State.players.b;
  const cruzado = !acuerdo
    && (votos.a.traidoPor||'').toLowerCase()===B.toLowerCase()
    && (votos.b.traidoPor||'').toLowerCase()===A.toLowerCase();
  State.duelos.push({
    fecha: fechaHoy(), modo: modoLabel||'Vasallaje', lugar:(VS.lugar||'').trim(),
    a:{ quien:A, quiso:votos.a.titulo }, b:{ quien:B, quiso:votos.b.titulo },
    ganador: ganador.titulo, acuerdo, cruzado,
  });
  persistDuelos();
}
function persistDuelos(){
  const raw = JSON.stringify(State.duelos||[]);
  try{ localStorage.setItem('cosecha:duelos', raw); }catch(e){}
  if(HAS_STORAGE){ try{ window.storage.set('cosecha:duelos', raw); }catch(e){} }
  if(typeof onLocalChange === 'function') onLocalChange();
}

function granSideHTML(b, side){
  ensureColor(b);
  const cov = b.portada ? `background-image:url('${b.portada.replace(/'/g,'%27')}')` : `background:${(b._color&&b._color.css)||'#26331f'}`;
  const meta = [b.autor, b.anio, b.pais, b.paginas?b.paginas+' págs':''].filter(Boolean).join(' · ');
  const syn = (b.sinopsis||'').trim();
  const synShort = syn.length>110 ? syn.slice(0,108)+'…' : syn;
  const tropes = (b.tropes||'').split(',').map(t=>t.trim()).filter(Boolean).slice(0,3);
  return `<span class="gr-cover" style="${cov}"></span>
    <span class="gr-info">
      <span class="gr-t">${escapeHtml(b.titulo)}</span>
      ${meta?`<span class="gr-meta">${escapeHtml(meta)}</span>`:''}
      ${synShort?`<span class="gr-syn">${escapeHtml(synShort)}</span>`:''}
      ${tropes.length?`<span class="gr-tropes">${tropes.map(t=>`<i>${escapeHtml(t)}</i>`).join('')}</span>`:''}
    </span>`;
}

/* (screenGranRound / granChampion / granRound eliminados: el Gran Vasallaje
    ahora usa el mismo bracket visual genérico que el de 8) */
