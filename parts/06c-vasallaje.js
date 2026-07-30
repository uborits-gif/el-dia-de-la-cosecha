
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
  evPush(b, 'puestos', { fecha:hoy, quien:`Vasallaje (${modo})`, extra: VS_PLACE[place] || place });
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
          <div class="vsm-n">MODO 05</div><div class="vsm-ico">🏟️</div>
          <div class="vsm-t">Gran Vasallaje · 32</div>
          <div class="vsm-d">32 entran al cuadro. Los que sobran se sortean afuera; cada cruce lo votan ustedes.</div>
          ${State.vault.length>=32?'':`<div class="vsm-warn">Necesitás 32 — tenés ${State.vault.length}.</div>`}
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
    const opts = Object.values(runners).filter(o=>o.mode!=='gran32' && o.mode!=='gran64');
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
        <div class="vt-win" id="vtWin">?</div>
        <button class="vt-go" id="vtGo">Girá el trope</button>
        <div class="vt-taken" id="vtTaken"></div>
      </div>
      <p class="lead mt-m" id="vtSub" style="margin:auto;font-size:13px;">Lo que salga, se lee.</p>
    </div>
  `);
  const win = $('#vtWin'), go = $('#vtGo'), lab = $('#vtLab'), sub = $('#vtSub');
  const chip = t => `<span>${escapeHtml(t.trope)}<b>${t.books.length}</b></span>`;

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
    win.classList.add('spin');
    for(let i=0;i<total;i++){
      win.textContent = pool[Math.floor(Math.random()*pool.length)].t;
      Sound.fx.tick(i/total);
      await sleep(55 + Math.pow(i/total, 2.7)*300);
    }
    win.classList.remove('spin');
    Sound.fx.chosen();
    Sound.stopMusic();
    const r = win.getBoundingClientRect();
    sparkleAt(r.left + r.width/2, r.top + r.height/2, 10);

    // ¿es de los gordos? entonces se lleva el cuadro entero
    const solo = !taken.length && target.libres.length >= VS_NEED*2;
    const cuantos = solo ? VS_NEED*2 : Math.min(need, VS_NEED);
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

/* ---------- armar el cuadro (8 → 4 → 2 → 1, sin sorteos) ---------- */
function startBracket(){
  VS.all = [...VS.picks.a, ...VS.picks.b];
  // salen de la bóveda mientras dura el torneo (los caídos vuelven al final)
  const ids = new Set(VS.all.map(b=>b.id));
  State.vault = State.vault.filter(b=>!ids.has(b.id));

  const ma = shuffled(VS.picks.a), ub = shuffled(VS.picks.b);
  const mkSide = (m,u)=>({
    r1: m.map((bk,i)=>({ a:bk, b:u[i], winner:null })),   // 2 cruces
    fin:{ a:null, b:null, winner:null },                   // semifinal de ala
    champ:null,
  });
  VS.sides = { L: mkSide(ma.slice(0,2), ub.slice(0,2)), R: mkSide(ma.slice(2,4), ub.slice(2,4)) };
  VS.grand = { a:null, b:null, winners:null };
  VS.phase = 'r1';
  Sound.startMusic('vasallaje');
  screenBracket();
}

/* ---------- geometría del cuadro ---------- */
const VSBW = 1060, VSBH = 520;
function vsCoords(side){
  const X = x => side==='R' ? VSBW - x : x;
  return {
    book: i => ({x:X(92),  y:70 + i*112}),                    // 4 filas
    w1:   i => ({x:X(268), y:(70+2*i*112 + 70+(2*i+1)*112)/2}),
    champ:     {x:X(438), y:238},
  };
}
const VS_GWIN = { x:VSBW/2, y:352 };
const VS_TROPHY = { x:VSBW/2, y:172 };

/* ---------- pantalla del bracket ---------- */
let vsUI = null;   // { stage, svg, nodes:{}, edges:{} }

function screenBracket(){
  App.ambient('rgba(232,195,74,.07)', 'rgba(30,26,50,.5)');
  show(`
    <div class="center" style="padding-top:0;">
      <div class="eyebrow" style="color:#E8C34A;">⚔️ Vasallaje${VS.modeLabel?' · '+escapeHtml(VS.modeLabel):''}</div>
      <h2 class="serif" style="font-weight:900;font-size:clamp(24px,4vw,38px);margin:0;">El cuadro</h2>
      <div class="vs-phase" id="vsPhase"></div>
      <div class="vs-stage-wrap"><div class="vs-stage" id="vsStage">
        <svg class="vs-svg" id="vsSvg" viewBox="0 0 ${VSBW} ${VSBH}"></svg>
      </div></div>
    </div>
  `);
  const stage = $('#vsStage');
  stage.style.height = VSBH+'px';
  const availW = Math.min(innerWidth - 24, 1080);
  const sc = Math.min(1, availW / VSBW);
  stage.style.transform = `scale(${sc})`;
  stage.parentElement.style.height = (VSBH*sc + 10)+'px';

  vsUI = { stage, svg: $('#vsSvg'), nodes:{}, edges:{} };
  const ab = $('#abortBtn'); if(ab) ab.classList.add('on');   // salida de emergencia también acá

  const tags = VS.sideTags || [`LADO ${State.players.a.toUpperCase()}`, `LADO ${State.players.b.toUpperCase()}`];
  mkSideTag(String(tags[0]).toUpperCase(), {x:92, y:16});
  mkSideTag(String(tags[1]).toUpperCase(), {x:VSBW-92, y:16});
  const trophy = document.createElement('div');
  trophy.className = 'vs-trophy';
  trophy.style.left = VS_TROPHY.x+'px';
  trophy.style.top  = VS_TROPHY.y+'px';
  trophy.textContent = '🏆';
  stage.appendChild(trophy);

  ['L','R'].forEach(side=>{
    const C = vsCoords(side);
    const S = VS.sides[side];
    S.r1.forEach((cr,i)=>{
      mkNode(`${side}-b${2*i}`,   C.book(2*i),   cr.a);
      mkNode(`${side}-b${2*i+1}`, C.book(2*i+1), cr.b);
      mkNode(`${side}-w${i}`,     C.w1(i),       null);
      mkEdge(`${side}-b${2*i}`,   `${side}-w${i}`);
      mkEdge(`${side}-b${2*i+1}`, `${side}-w${i}`);
    });
    mkNode(`${side}-champ`, C.champ, null);
    mkEdge(`${side}-w0`, `${side}-champ`);
    mkEdge(`${side}-w1`, `${side}-champ`);
    mkEdge(`${side}-champ`, 'G-win');
  });
  mkNode('G-win', VS_GWIN, null, true);

  updatePhase();
  wireClicks();
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
  const p1 = vsUI.nodes[fromKey].pos;
  const p2 = (toKey==='G-win') ? VS_GWIN : vsUI.nodes[toKey].pos;
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

/* ---------- fases ---------- */
const VS_PHASE_LABEL = {
  r1:'Primera ronda — toquen un cruce para el alegato',
  semi:'Semifinales de ala — un cruce por lado',
  grand:'⚡ LA GRAN FINAL ⚡ — toquen a los campeones',
  done:'',
};
function updatePhase(){
  const el = $('#vsPhase');
  if(el) el.textContent = VS_PHASE_LABEL[VS.phase] || '';
}

function clearClickables(){
  Object.values(vsUI.nodes).forEach(n=>{
    n.el.classList.remove('clickable');
    n.el.onclick = null;
  });
}

function wireClicks(){
  clearClickables();
  ['L','R'].forEach(side=>{
    const S = VS.sides[side];
    if(VS.phase==='r1'){
      S.r1.forEach((cr,i)=>{
        if(cr.winner) return;
        const open = ()=>openDebate(cr, `cruce ${i+1} · ala ${side==='L'?'izquierda':'derecha'}`, w=>{
          cr.winner = w;
          resolveR1(side, i);
        });
        [`${side}-b${2*i}`, `${side}-b${2*i+1}`].forEach(k=>{
          vsUI.nodes[k].el.classList.add('clickable');
          vsUI.nodes[k].el.onclick = open;
        });
      });
    }
    if(VS.phase==='semi' && !S.fin.winner){
      const open = ()=>openDebate(S.fin, `semifinal · ala ${side==='L'?'izquierda':'derecha'}`, w=>{
        S.fin.winner = w;
        resolveFin(side);
      });
      [`${side}-w0`, `${side}-w1`].forEach(k=>{
        vsUI.nodes[k].el.classList.add('clickable');
        vsUI.nodes[k].el.onclick = open;
      });
    }
  });
  if(VS.phase==='grand' && !VS.grand.winners){
    ['L-champ','R-champ'].forEach(k=>{
      vsUI.nodes[k].el.classList.add('clickable');
      vsUI.nodes[k].el.onclick = openGrandFinal;
    });
  }
}

function resolveR1(side, i){
  const cr = VS.sides[side].r1[i];
  const ka = `${side}-b${2*i}`, kb = `${side}-b${2*i+1}`, kt = `${side}-w${i}`;
  (cr.winner===cr.a ? cr.b : cr.a)._vsPlace = 'r1';
  paintEdge(cr.winner===cr.a ? ka : kb, kt, true);
  paintEdge(cr.winner===cr.a ? kb : ka, kt, false);
  vsUI.nodes[cr.winner===cr.a ? kb : ka].el.classList.add('out');
  setTimeout(()=>{ fillNode(kt, cr.winner); Sound.fx.reveal(); }, 650);
  setTimeout(checkPhase, 1200);
}

function resolveFin(side){
  const S = VS.sides[side];
  const kw = S.fin.winner === S.fin.a ? `${side}-w0` : `${side}-w1`;
  const kl = kw===`${side}-w0` ? `${side}-w1` : `${side}-w0`;
  (S.fin.winner === S.fin.a ? S.fin.b : S.fin.a)._vsPlace = 'semi';
  paintEdge(kw, `${side}-champ`, true);
  paintEdge(kl, `${side}-champ`, false);
  vsUI.nodes[kl].el.classList.add('out');
  S.champ = S.fin.winner;
  VS.grand[side==='L'?'a':'b'] = S.champ;
  setTimeout(()=>{ fillNode(`${side}-champ`, S.champ); Sound.fx.reveal(); }, 650);
  setTimeout(checkPhase, 1200);
}

function checkPhase(){
  const allR1 = ['L','R'].every(s=>VS.sides[s].r1.every(c=>c.winner));
  if(VS.phase==='r1' && allR1){
    // preparar las semifinales de ala
    ['L','R'].forEach(s=>{
      VS.sides[s].fin.a = VS.sides[s].r1[0].winner;
      VS.sides[s].fin.b = VS.sides[s].r1[1].winner;
    });
    VS.phase='semi'; updatePhase(); wireClicks();
    return;
  }
  const allFin = ['L','R'].every(s=>VS.sides[s].fin.winner);
  if(VS.phase==='semi' && allFin){
    VS.phase='grand'; updatePhase(); wireClicks();
    Sound.fx.finalBell();
    return;
  }
  wireClicks();
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
function vsDuelSide(bk){
  const s = document.createElement('div');
  s.className = 'vs-duel-side';
  const ownerP = bk._vsOwner;
  const head = bk._vsTrope
    ? `<div class="vs-duel-owner" style="color:#E8C34A">🧬 ${escapeHtml(bk._vsTrope)}</div>`
    : `<div class="vs-duel-owner" style="color:${PLAYER_COLOR[ownerP]||'var(--grey)'}">${
        ownerP ? 'de '+escapeHtml(State.players[ownerP]) : ''}</div>`;
  s.innerHTML = head;
  const cov = document.createElement('div');
  cov.className = 'vs-duel-cover';
  cov.appendChild(bookEl(bk, {size:bs(118)}));
  s.appendChild(cov);
  const t = document.createElement('div');
  t.className = 'vs-duel-title';
  t.textContent = bk.titulo;
  s.appendChild(t);
  // hasta 3 tropes, como en la ficha
  const tr = (bk.tropes||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,3);
  if(tr.length){
    const chips = document.createElement('div');
    chips.className = 'vs-duel-tropes';
    chips.innerHTML = tr.map(x=>`<span${bk._vsTrope===x?' class="on"':''}>${escapeHtml(x)}</span>`).join('');
    s.appendChild(chips);
  }
  const syn = document.createElement('div');
  syn.className = 'vs-duel-syn';
  syn.textContent = bk.sinopsis || '(sin sinopsis)';
  s.appendChild(syn);
  return s;
}
const vsVsEl = ()=>{ const v = document.createElement('div'); v.className = 'vs-vs'; v.textContent = 'vs'; return v; };

function openDebate(cruce, label, onWin){
  Sound.fx.click();
  const ov = overlay(`
    <div class="ov-pop center" style="max-width:640px;">
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
      sideEl = vsDuelSide(bk);
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
    <div class="ov-pop center" style="max-width:640px;">
      <div class="eyebrow" style="color:#E8C34A;">⚡ La Gran Final ⚡</div>
      <div class="vs-duel mt-s" id="gfDuel"></div>
      <p class="lead" style="font-size:14px;margin-top:14px;">¿Cómo lo resuelven?</p>
      <div class="row mt-m" style="flex-direction:column;align-items:stretch;gap:10px;">
        <button class="btn btn-primary" id="gfDebate">🗣 Lo debatimos y elegimos</button>
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
  paintEdge('L-champ', 'G-win', wA);
  paintEdge('R-champ', 'G-win', wB);
  if(!wA) vsUI.nodes['L-champ'].el.classList.add('out');
  if(!wB) vsUI.nodes['R-champ'].el.classList.add('out');
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
    fillNode('G-win', winners[0]);
    if(winners.length>1){
      const cov = vsUI.nodes['G-win'].el.querySelector('.vsn-cover');
      cov.style.boxShadow = '0 0 24px rgba(232,195,74,.8)';
      vsUI.nodes['G-win'].el.querySelector('.vsn-lab').textContent =
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
      <p class="lead mt-s" id="vsRetSub">Con honor. Uno por uno.</p>
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
    fl.animate([{opacity:0, transform:'scale(.4)'},{opacity:1, transform:'scale(1)'}], {duration:180, fill:'forwards'});
    $('#vsRetSub') && ($('#vsRetSub').innerHTML = `«${escapeHtml(b.titulo)}» vuelve a la bóveda…`);
    await sleep(240);
    Sound.noise({dur:.35, vol:.09, lp:3400, hp:500, sweepTo:900, wet:.3});
    const dx = targetX - startX - 48, dy = targetY - startY;   // 48 = mitad del flyer grande
    const anim = fl.animate([
      { transform:'translate(0,0) rotate(0deg) scale(1)', offset:0 },
      { transform:`translate(${dx*0.5}px, ${dy*0.35 - 60}px) rotate(${(Math.random()-.5)*40}deg) scale(.9)`, offset:.5 },
      { transform:`translate(${dx}px, ${dy}px) rotate(${(Math.random()-.5)*70}deg) scale(.3)`, opacity:.9, offset:1 },
    ], { duration:520, easing:'cubic-bezier(.5,0,.9,.4)', fill:'forwards' });
    await anim.finished.catch(()=>{});
    fl.remove();
    Sound.tone({freq:120 - i*2, dur:.12, type:'sine', vol:.16, glideTo:60});
    drawer.classList.remove('bump'); void drawer.offsetWidth; drawer.classList.add('bump');
    await sleep(120);
  }

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
  VS.mode='gran'; VS.modeLabel=`Gran Vasallaje ${size}`; VS.sideTags=null; VS.phase='gran';
  const pool = shuffled(State.vault.slice());
  const participantes = pool.slice(0, size);
  const excluidos = pool.slice(size);
  VS.all = participantes.slice();
  State._snapVault = State.vault.map(cleanBook);   // foto para restaurar si se abandona (botón ✕)
  const ids = new Set(participantes.map(b=>b.id));
  State.vault = State.vault.filter(b=>!ids.has(b.id));   // salen mientras dura; vuelven al final
  if(Sound.startMusic) Sound.startMusic('vasallaje');
  const ab = $('#abortBtn'); if(ab) ab.classList.add('on');
  if(excluidos.length) granRuleta(excluidos, participantes, size);
  else granRound(participantes.slice(), size);
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
  await sleep(450);
  for(let e=0;e<excluidos.length;e++){
    const target = excluidos[e];
    const tIdx = fila.findIndex(b=>b.id===target.id);
    // la ruleta DESACELERA y frena justo en el que va a quedar afuera (2 vueltas + tIdx)
    const total = 2*cells.length + tIdx + 1;
    for(let i=0;i<total;i++){
      const at = i % cells.length;
      cells.forEach((c,j)=>c.classList.toggle('lit', j===at));
      const c = cells[at]; if(c) c.scrollIntoView({inline:'center', block:'nearest', behavior:'smooth'});
      try{ Sound.fx.tick(i/total); }catch(err){}
      await sleep(40 + Math.pow(i/total,2.8)*280);
    }
    cells.forEach(c=>c.classList.remove('lit'));
    cellOf[target.id].classList.add('out');   // el mismo en el que frenó
    try{ Sound.fx.drop(); }catch(err){}
    if($('#grSub')) $('#grSub').innerHTML = `«${escapeHtml(target.titulo)}» queda afuera`;
    evPush(target, 'puestos', { fecha:fechaHoy(), quien:`Gran Vasallaje ${size}`, extra:'no entró al sorteo' });
    await sleep(750);
  }
  await persist();
  if($('#grSub')) $('#grSub').textContent = '¡A pelear!';
  await sleep(700);
  granRound(participantes.slice(), size);
}

/* ---- una ronda: los cruces los votan ustedes ---- */
function granRound(books, size){
  if(books.length <= 1) return granChampion(books[0], size);
  if(books.length === 2) return vsFinalVote(books[0], books[1], `Gran Vasallaje ${size}`, w=>granChampion(w, size));
  const pares = [];
  for(let i=0;i<books.length;i+=2) pares.push({ a:books[i], b:books[i+1]||null, winner:null });
  VS.gran = { size, n:books.length, nombre:granRonda(books.length), pares, decididos:0 };
  screenGranRound();
}

/* ============================================================
   ⚔️ LA FINAL NARRATIVA — cada uno dice a quién quiere.
   Acuerdo → se lee ese. Desacuerdo → ruleta + "carta" al que acertó.
   El duelo queda en la memoria del club (State.duelos) para las stats.
   ============================================================ */
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
            <button class="gr-side left" data-w="x">${granSideHTML(x,'left')}</button>
            <div class="gr-vs">o</div>
            <button class="gr-side right" data-w="z">${granSideHTML(z,'right')}</button>
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
      finish(votos.a, `Los dos querían «${escapeHtml(short(votos.a.titulo,30))}». Sin ruleta: se lee ese.`);
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
      <p class="lead" style="opacity:.85;">${escapeHtml(State.players.a)} quería «${escapeHtml(short(votos.a.titulo,22))}» · ${escapeHtml(State.players.b)} quería «${escapeHtml(short(votos.b.titulo,22))}»</p>
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
    c.style.cssText = b.portada ? `background-image:url('${b.portada.replace(/'/g,'%27')}')` : `background:${(b._color&&b._color.css)||'#26331f'}`;
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
    fecha: fechaHoy(), modo: modoLabel||'Vasallaje',
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

function screenGranRound(){
  const G = VS.gran;
  App.ambient('rgba(232,195,74,.06)', 'rgba(30,26,50,.5)');
  const cruces = G.pares.filter(p=>p.b).length;
  show(`
    <div class="center" style="padding-top:6px;">
      <div class="eyebrow" style="color:#E8C34A;">🏟️ Gran Vasallaje · ${G.size}</div>
      <h2 class="serif" style="font-weight:900;font-size:clamp(22px,4vw,36px);margin:2px 0 2px;">${escapeHtml(G.nombre)}</h2>
      <p class="lead" id="grHint">Toquen al que pasa · <b id="grCount">0</b>/${cruces}</p>
      <div class="gr-matches" id="grMatches"></div>
      <div class="row mt-l" id="grNextRow" style="display:none;justify-content:center;">
        <button class="btn btn-amber" id="grNext">${G.n<=2?'Coronar campeón 🏆':'Siguiente ronda →'}</button>
      </div>
    </div>
  `);
  const wrap = $('#grMatches');
  G.pares.forEach(p=>{
    if(!p.b){ p.winner = p.a; return; }
    const card = document.createElement('div');
    card.className = 'gr-match';
    card.innerHTML = `
      <button class="gr-side" data-w="a">${granSideHTML(p.a)}</button>
      <div class="gr-vs">vs</div>
      <button class="gr-side" data-w="b">${granSideHTML(p.b)}</button>`;
    wrap.appendChild(card);
    card.querySelectorAll('.gr-side').forEach(s=>s.addEventListener('click', ()=>{
      if(card.classList.contains('done')) return;
      const w = s.dataset.w;
      p.winner = (w==='a') ? p.a : p.b;
      const loser = (w==='a') ? p.b : p.a;
      loser._vsPlace = granPlace(G.n);
      card.classList.add('done');
      s.classList.add('win');
      const otro = card.querySelector(`.gr-side[data-w="${w==='a'?'b':'a'}"]`);
      if(otro) otro.classList.add('lose');
      try{ Sound.fx.chosen(); }catch(e){}
      G.decididos++;
      if($('#grCount')) $('#grCount').textContent = G.decididos;
      if(G.decididos >= cruces){
        $('#grNextRow').style.display = 'flex';
        if($('#grHint')) $('#grHint').innerHTML = 'Pasan los elegidos.';
      }
    }));
  });
  if(cruces === 0){ granRound(G.pares.map(p=>p.winner), G.size); return; }
  $('#grNext').addEventListener('click', ()=>{ try{ Sound.fx.click(); }catch(e){}
    granRound(G.pares.map(p=>p.winner), G.size); });
}

/* ---- campeón: retorno rápido (son muchos libros) + festejo reusado ---- */
async function granChampion(champ, size){
  champ._vsPlace = 'campeon';
  VS.modeLabel = `Gran Vasallaje ${size}`;
  await renameUndo(`el Gran Vasallaje de «${champ.titulo}»`);
  const losers = VS.all.filter(b=>b.id!==champ.id);
  losers.forEach(b=>{ stampCosecha(b); vsStampPlace(b, b._vsPlace || granPlace(size)); });
  const loserIds = new Set(losers.map(b=>b.id));
  State.vault = State.vault.filter(v=>!loserIds.has(v.id));
  State.vault.push(...losers.map(cleanBook));
  await persist();
  vsCelebrate([champ]);
}
