
/* ============================================================
   ELECCIÓN POR CAPAS
   Reglamento:
   1) A elige 3 de los libros de B; B elige 3 de los de A → 6.
   2) Cada uno puede rescatar 1 de la bóveda (después de los 6).
      Rescatar SACA el libro de la bóveda y suma +1 a su contador.
   3) Descarte cruzado: cada uno saca 1 de los que el otro le eligió.
   4) Ruleta. Todo lo que cae VUELVE a la bóveda (rescatados incluidos).
   ============================================================ */

function booksOf(player){ return player==='a' ? State.booksA : State.booksB; }
function other(p){ return p==='a'?'b':'a'; }

const LAYERS = [
  { key:'sinopsis', label:'Solo por la sinopsis', help:'Leé y quedate con uno.' },
  { key:'titulo',   label:'Solo por el título',   help:'Otro más, solo por cómo suena.' },
  { key:'portada',  label:'Solo por la portada',  help:'El último, solo con los ojos.' },
];
const CRITERIO_LABEL = { sinopsis:'por sinopsis', titulo:'por título', portada:'por portada' };

function screenChoose(chooser){
  Flow.set(2, `elige ${State.players[chooser]}`);
  App.ambient(`rgba(${PLAYER_RGB[chooser]},.07)`, 'rgba(10,25,14,.45)');
  const ownerOfBooks = other(chooser);
  const pool = booksOf(ownerOfBooks).slice();
  const layers = LAYERS.slice(0, Math.min(3, pool.length-0));
  const chosen = [];
  let layerIdx = 0;

  function renderLayer(){
    const layer = layers[layerIdx];
    const remaining = shuffled(pool.filter(b=>!chosen.includes(b)));
    show(`
      <div class="choose-head">
        <div class="eyebrow" style="color:${PLAYER_COLOR[chooser]};">
          ${escapeHtml(State.players[chooser])}, elegí entre los libros de ${escapeHtml(State.players[ownerOfBooks])}</div>
        <h2 class="serif" style="font-weight:700;font-size:clamp(26px,4vw,40px);margin:0;">${layer.label}</h2>
        <p class="lead" style="margin-top:6px;">${layer.help}
          <span style="color:var(--grey)">· Ronda ${layerIdx+1} de ${layers.length}</span></p>
      </div>
      <div id="layerZone"></div>
      <div id="miniPanel"></div>
    `);
    const zone = $('#layerZone');

    if(layer.key==='sinopsis'){
      synopsisDeck(zone, remaining, (book)=>pick(book));
    } else {
      const grid = document.createElement('div');
      grid.className = 'layer-grid stagger';
      remaining.forEach((book, i)=>{
        const el = bookEl(book, {
          size:bs(205),
          mode: layer.key==='titulo' ? 'wrapped' : 'cover',
          onClick: ()=>confirmPick(layer.key, book, ()=>pick(book)),
        });
        el.classList.add('pick-card');
        el.style.setProperty('--i', i);
        grid.appendChild(el);
      });
      zone.appendChild(grid);
    }
    renderMiniPanel($('#miniPanel'), chosen, layers);
  }

  function pick(book){
    book._pickedBy = layers[layerIdx].key;
    evPush(book, 'elegidos', { quien: layers[layerIdx].key });   // con qué criterio entró, esta vez
    book._owner = ownerOfBooks;   // de quién es el libro (para los duelos)
    chosen.push(book);
    revealChosen(book, ()=>{
      layerIdx++;
      if(layerIdx < layers.length){ renderLayer(); }
      else { State.picks[chooser] = chosen.slice(); afterChoose(chooser); }
    });
  }
  renderLayer();
}

/* confirmación antes de comprometerse (rondas título/portada).
   OJO: solo muestra lo que la ronda permite ver. */
function confirmPick(layerKey, book, onYes){
  Sound.fx.click();
  const ov = overlay(`
    <div class="ov-pop center">
      <div class="eyebrow">¿Te quedás con este?</div>
      <div id="cfBook"></div>
      <div class="row mt-m">
        <button class="btn btn-ghost" id="cfNo" data-esc>Ver los otros</button>
        <button class="btn btn-amber" id="cfYes" data-enter>Elegir este</button>
      </div>
    </div>`);
  const el = bookEl(book, {
    size:bs(250),
    mode: layerKey==='titulo' ? 'wrapped' : 'cover',
  });
  $('#cfBook', ov).appendChild(el);
  $('#cfNo', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
  $('#cfYes', ov).addEventListener('click', ()=>{ closeOverlay(ov); onYes(); });
}

/* ---------- LOS EXPEDIENTES (ronda de sinopsis) ---------- */
function synopsisDeck(container, books, onChoose){
  let idx = 0;
  const seen = new Set([0]);

  container.innerHTML = `
    <div class="deck-zone">
      <div class="deck-stage">
        <div class="deck-ghost g2"></div>
        <div class="deck-ghost g1"></div>
        <div id="dossierHolder" style="display:flex;width:100%;"></div>
        <button class="deck-arrow left" id="dkPrev" title="anterior">←</button>
        <button class="deck-arrow right" id="dkNext" title="siguiente">→</button>
      </div>
      <div class="deck-tabs" id="dkTabs"></div>
    </div>`;

  const holder = $('#dossierHolder', container);
  const tabs = $('#dkTabs', container);

  function renderTabs(){
    tabs.innerHTML = '';
    books.forEach((_, i)=>{
      const t = document.createElement('div');
      t.className = 'dtab' + (i===idx?' act':'') + (seen.has(i)?' seen':'');
      t.title = `Expediente ${String(i+1).padStart(2,'0')}`;
      t.addEventListener('click', ()=>{ if(i!==idx) go(i, i>idx?1:-1); });
      tabs.appendChild(t);
    });
  }

  function dossierEl(book, i){
    const { hook, rest } = splitHook(book.sinopsis);
    const d = document.createElement('div');
    d.className = 'dossier';
    const words = hook.split(/\s+/).map((w,k)=>
      `<span class="w" style="--i:${k}">${escapeHtml(w)}</span>`).join(' ');
    d.innerHTML = `
      <div class="dossier-tab">Expediente <b>${String(i+1).padStart(2,'0')}</b> de ${String(books.length).padStart(2,'0')}</div>
      <p class="dossier-hook">${words}</p>
      <div class="dossier-rule"></div>
      <p class="dossier-body">${escapeHtml(rest)}</p>
      <div class="dossier-actions">
        <button class="btn btn-amber" id="dkChoose">Elegir este</button>
        <div class="dossier-kbd"><b>←</b><b>→</b> pasar expediente</div>
      </div>`;
    $('#dkChoose', d).addEventListener('click', ()=>{
      Sound.fx.click();
      onChoose(book);
    });
    return d;
  }

  function go(to, dir){
    // candado: pasar rápido no puede apilar tarjetas ni romper el layout
    if(holder._lock) return;
    holder._lock = true;
    setTimeout(()=>{ holder._lock = false; }, 330);
    holder.style.position = 'relative';
    const cur = holder.firstElementChild;
    if(cur){
      // la saliente flota en absoluto: no empuja a la entrante ni genera scroll
      cur.style.position = 'absolute';
      cur.style.inset = '0 0 auto 0';
      cur.style.pointerEvents = 'none';
      cur.classList.add(dir>0 ? 'out-l' : 'out-r');
      setTimeout(()=>cur.remove(), 300);
    }
    // higiene por si quedó alguna colgada
    $$('.dossier', holder).forEach(d=>{ if(d!==cur) d.remove(); });
    idx = (to + books.length) % books.length;
    seen.add(idx);
    Sound.fx.whoosh();
    const next = dossierEl(books[idx], idx);
    next.classList.add(dir>0 ? 'in-r' : 'in-l');
    holder.appendChild(next);
    renderTabs();
  }

  $('#dkPrev', container).addEventListener('click', ()=>go(idx-1, -1));
  $('#dkNext', container).addEventListener('click', ()=>go(idx+1, 1));
  App.keys['ArrowLeft'] = ()=>go(idx-1, -1);
  App.keys['ArrowRight'] = ()=>go(idx+1, 1);

  holder.appendChild(dossierEl(books[0], 0));
  renderTabs();
}

/* ---------- mini panel de progreso de la selección ---------- */
function renderMiniPanel(container, chosen, layers){
  if(!container) return;
  container.className = 'mini-panel';
  container.innerHTML = '';
  layers.forEach((layer, i)=>{
    const slot = document.createElement('div');
    slot.className = 'mp-slot';
    const book = chosen[i];
    if(book){
      slot.classList.add('full');
      const mini = bookEl(book, {size:60, still:true, tilt:false});
      mini.style.animation = 'slotFill .5s var(--ease-pop)';
      slot.appendChild(mini);
      const lab = document.createElement('div');
      lab.className = 'mp-lab';
      lab.textContent = CRITERIO_LABEL[book._pickedBy]||'';
      slot.appendChild(lab);
    } else {
      const empty = document.createElement('div');
      empty.className = 'mp-empty';
      slot.appendChild(empty);
      const lab = document.createElement('div');
      lab.className = 'mp-lab';
      lab.textContent = CRITERIO_LABEL[layer.key];
      slot.appendChild(lab);
    }
    container.appendChild(slot);
  });
}

/* ---------- REVELACIÓN del elegido ---------- */
function revealChosen(book, done){
  Sound.fx.reveal();
  const { hook } = splitHook(book.sinopsis);
  const ov = overlay(`
    <div class="ov-pop center" style="max-width:560px;">
      <div class="eyebrow" style="color:var(--amber);">elegido</div>
      <div id="rvBook" style="margin:6px 0 4px;"></div>
      <div class="serif" style="font-size:28px;font-weight:700;margin-top:18px;">${escapeHtml(book.titulo)}</div>
      <p class="serif" style="font-style:italic;font-size:16px;line-height:1.5;color:var(--bone-dim);margin:10px auto 0;max-width:440px;">${escapeHtml(hook)}</p>
      <button class="btn btn-primary mt-m" id="rvGo" data-enter>Seguir</button>
    </div>`);
  const wasWrapped = book._pickedBy === 'titulo';
  const el = bookEl(book, {size:bs(270), mode: wasWrapped ? 'wrapped' : 'cover'});
  $('#rvBook', ov).appendChild(el);
  // tinte con el color del libro
  ensureColor(book).then(()=>{
    ov.style.background = `radial-gradient(90% 90% at 50% 40%, ${book._haloColor.replace('0.55','0.18')} 0%, rgba(4,8,4,.92) 62%)`;
  });
  if(wasWrapped) setTimeout(()=>unwrap(el), 480);
  $('#rvGo', ov).addEventListener('click', ()=>{
    Sound.fx.click();
    closeOverlay(ov);
    done();
  });
}

function afterChoose(chooser){
  const bothChose = State.picks.a && State.picks.b;
  if(bothChose){ screenPassTo('a', ()=>screenRescue('a')); }
  else { const next = other(chooser); screenPassTo(next, ()=>screenChoose(next)); }
}

/* ============================================================
   RESCATE — el armario abre sus puertas
   ============================================================ */
function screenRescue(who){
  if(!State.vault.length){ nextRescue(who); return; }
  Flow.set(3, `rescata ${State.players[who]}`);
  App.ambient('rgba(255,214,120,.05)', `rgba(${PLAYER_RGB[who]},.06)`);
  const ownerOfBooks = other(who);
  State.rescN = State.rescN || { a:0, b:0 };
  State.rescMax = State.rescMax || { a:1, b:1 };
  const segunda = State.rescN[who] > 0;
  show(`
    <div class="eyebrow" style="color:var(--grey);">The Vault</div>
    <h2 class="serif" style="font-weight:700;font-size:clamp(24px,4vw,38px);margin:0;">
      ${escapeHtml(State.players[who])}, ${segunda ? 'el segundo rescate' : '¿rescatás un caído?'}</h2>
    <p class="lead mt-s">${segunda ? 'El Salvavidas te da otro.' : 'Uno solo. Y va a tu preselección.'}</p>
    <div id="closet"></div>
    <div class="row mt-l" style="justify-content:flex-start;align-items:center;">
      <button class="btn btn-ghost" id="skipRescue">No rescato a nadie</button>
      <span id="rescCartas" style="display:inline-flex;gap:10px;align-items:center;"></span>
    </div>
  `);
  // cartas jugables en este momento: el Salvavidas y el Escudo
  if(!segunda && puedeJugar(who)){
    const zona = $('#rescCartas');
    ['salvavidas','escudo'].filter(id=>tieneCarta(who, id)).forEach(id=>{
      const mini = cartaEl(id, { mini:true });
      mini.addEventListener('click', ()=>confirmarCarta(who, id, ()=>{
        if(id === 'salvavidas'){
          State.rescMax[who] = 2;
          toast('El Salvavidas está en juego: dos rescates');
          zona.innerHTML = '';
        }
        if(id === 'escudo') jugarEscudo(who);
      }));
      zona.appendChild(mini);
    });
  }
  buildCloset($('#closet'), State.vault, {
    mode:'rescue',
    onPick(book, slot){
      slot.classList.add('sel');
      const ov = overlay(`
        <div class="ov-pop center" style="max-width:520px;">
          <div class="eyebrow" style="color:var(--amber);">¿Lo rescatás?</div>
          <div id="rcBook"></div>
          <div class="serif" style="font-size:24px;font-weight:700;margin-top:16px;">${escapeHtml(book.titulo)}</div>
          ${evCount(book,'rescates')?`<div class="vd-badge">⛏ ya fue rescatado ×${evCount(book,'rescates')}${
            ultimoRescate(book)?' (la última, por '+escapeHtml(ultimoRescate(book))+')':''} — y volvió a caer</div>`:''}
          <p class="lead" style="font-size:13.5px;margin-top:10px;">${escapeHtml(book.sinopsis||'')}</p>
          <div class="row mt-m">
            <button class="btn btn-ghost" id="rcNo" data-esc>Dejarlo donde está</button>
            <button class="btn btn-amber" id="rcYes" data-enter>Rescatarlo</button>
          </div>
        </div>`);
      $('#rcBook', ov).appendChild(bookEl(book, {size:bs(215)}));
      $('#rcNo', ov).addEventListener('click', ()=>{ Sound.fx.click(); slot.classList.remove('sel'); closeOverlay(ov); });
      $('#rcYes', ov).addEventListener('click', ()=>{
        closeOverlay(ov);
        // sale de la bóveda y ANOTA el rescate (quién y cuándo, sin pisar los anteriores)
        State.vault = State.vault.filter(b=>b.id!==book.id);
        const rescued = { ...book, _rescued:true, _owner:other(who) };
        evPush(rescued, 'rescates', { quien: State.players[who] });
        State.picks[who].push(rescued);
        Sound.fx.rescue();
        State.rescN[who]++;
        // con el Salvavidas jugado hay un segundo rescate
        showRescueJoin(who, rescued, ()=>
          State.rescN[who] < State.rescMax[who] ? screenRescue(who) : nextRescue(who));
      });
    }
  });
  $('#skipRescue').addEventListener('click', ()=>{ Sound.fx.click(); nextRescue(who); });
}

/* 🛡️ El Escudo: blindás un libro de TU preselección — el pool que
   el otro va a mirar con ojos de descarte (screenDiscard(otro) descarta
   de picks[who], así que se marca ahí, no al revés) */
function jugarEscudo(who){
  const mios = State.picks[who] || [];
  const ov = overlay(`<div class="ov-pop center" style="max-width:720px;">
      <div class="eyebrow" style="color:#E8C34A;">🛡️ El Escudo</div>
      <h2 class="serif" style="font-size:24px;font-weight:700;margin:4px 0 14px;">¿A cuál blindás?</h2>
      <div class="row" id="escRow" style="gap:20px;flex-wrap:wrap;justify-content:center;"></div>
    </div>`);
  mios.forEach(b=>{
    const h = document.createElement('div');
    h.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;';
    h.appendChild(bookEl(b, { size:bs(110), still:true, tilt:false }));
    h.insertAdjacentHTML('beforeend', `<div class="mp-lab">${escapeHtml(short(b.titulo, 18))}</div>`);
    h.addEventListener('click', ()=>{
      closeOverlay(ov);
      b._escudo = true;
      Sound.fx.reveal();
      toast(`«${short(b.titulo, 24)}» está blindado`);
    });
    $('#escRow', ov).appendChild(h);
  });
}

/* la preselección recibe al rescatado */
function showRescueJoin(who, rescued, done){
  const presel = State.picks[who];
  const ov = overlay(`
    <div class="ov-pop center" style="max-width:760px;">
      <div class="eyebrow" style="color:var(--amber);">rescatado de la bóveda</div>
      <div id="rjRow" style="display:flex;gap:26px;align-items:flex-end;justify-content:center;flex-wrap:wrap;margin-top:10px;"></div>
      <div class="serif" style="font-size:24px;font-weight:700;margin-top:26px;">${escapeHtml(rescued.titulo)}</div>
      <p class="lead" style="margin:8px auto 0;font-size:13px;">sale del polvo y se suma a tu preselección de ${escapeHtml(State.players[other(who)])}</p>
      ${evCount(rescued,'rescates')>1?`<div class="vd-badge" style="margin-top:10px;">⛏ rescatado ×${evCount(rescued,'rescates')}</div>`:''}
      <button class="btn btn-amber mt-m" id="rjGo" data-enter>Seguir</button>
    </div>`);
  const row = $('#rjRow', ov);
  presel.forEach(b=>{
    const holder = document.createElement('div');
    holder.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:9px;';
    const isRescued = b===rescued;
    const el = bookEl(b, {size:bs(isRescued?185:132), still:!isRescued});
    if(isRescued) el.style.animation = 'rescueIn .9s var(--ease-pop)';
    holder.appendChild(el);
    const lab = document.createElement('div');
    lab.className = 'mp-lab';
    lab.style.color = isRescued ? 'var(--amber)' : 'var(--grey)';
    lab.textContent = isRescued ? 'rescatado' : (CRITERIO_LABEL[b._pickedBy]||'');
    holder.appendChild(lab);
    row.appendChild(holder);
  });
  $('#rjGo', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); done(); });
}

function nextRescue(who){
  if(who==='a'){ screenPassTo('b', ()=>screenRescue('b')); }
  else { screenPassTo('a', ()=>screenDiscard('a')); }
}

/* ============================================================
   DESCARTE CRUZADO
   ============================================================ */
function screenDiscard(who){
  const target = other(who);              // el otro, que hizo la preselección
  const pool = State.picks[target] || [];
  Flow.set(4, `descarta ${State.players[who]}`);
  App.ambient(`rgba(224,106,94,.05)`, `rgba(${PLAYER_RGB[who]},.05)`);
  show(`
    <div class="eyebrow" style="color:${PLAYER_COLOR[who]};">${escapeHtml(State.players[who])}, el descarte</div>
    <h2 class="serif" style="font-weight:700;font-size:clamp(24px,4vw,40px);margin:0;">
      Sacá uno de los que eligió ${escapeHtml(State.players[target])}</h2>
    <p class="lead mt-s">Estos son tus libros que ${escapeHtml(State.players[target])} preseleccionó.
      Podés mandar <b>uno</b> a la bóveda para darle más chances a los demás, o dejarlos a todos.</p>
    <div id="discardGrid" class="layer-grid stagger mt-m"></div>
    <div class="row mt-l"><button class="btn btn-ghost" id="skipDiscard">Los dejo a todos</button></div>
  `);
  const grid = $('#discardGrid');
  pool.forEach((book, i)=>{
    const holder = document.createElement('div');
    holder.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;';
    holder.style.setProperty('--i', i);
    holder.appendChild(bookEl(book, {size:bs(190)}));
    const crit = document.createElement('div');
    crit.className = 'mp-lab';
    crit.style.color = 'var(--amber)';
    crit.textContent = book._rescued ? `rescatado${evCount(book,'rescates')>1?' ×'+evCount(book,'rescates'):''}` : (CRITERIO_LABEL[book._pickedBy]||'');
    holder.appendChild(crit);
    const tit = document.createElement('div');
    tit.style.cssText = 'font-family:Fraunces,serif;font-size:13px;color:var(--bone);text-align:center;max-width:150px;line-height:1.2;';
    tit.textContent = book.titulo;
    holder.appendChild(tit);
    const btn = document.createElement('button');
    btn.className = 'btn btn-danger btn-sm';
    btn.textContent = book._escudo ? '🛡️ Blindado' : 'Descartar este';
    if(book._escudo) btn.disabled = true;
    btn.addEventListener('click', ()=>{
      const ov = overlay(`
        <div class="ov-pop center">
          <div class="eyebrow" style="color:var(--danger);">¿Seguro?</div>
          <div class="serif" style="font-size:24px;font-weight:700;max-width:420px;">${escapeHtml(book.titulo)} cae a la bóveda</div>
          <div class="row mt-m">
            <button class="btn btn-ghost" id="dcNo" data-esc>No, que se quede</button>
            <button class="btn btn-danger" id="dcYes" data-enter>Descartarlo</button>
          </div>
        </div>`);
      $('#dcNo', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
      $('#dcYes', ov).addEventListener('click', ()=>{
        closeOverlay(ov);
        Sound.fx.drop();
        evPush(book, 'descartes', { quien: State.players[who] });   // cada traición queda anotada
        State.picks[target] = State.picks[target].filter(b=>b!==book);
        sendToVault(book);
        toast(`${book.titulo} cae a la bóveda`);
        nextDiscard(who);
      });
    });
    holder.appendChild(btn);
    grid.appendChild(holder);
  });
  $('#skipDiscard').addEventListener('click', ()=>{ Sound.fx.click(); nextDiscard(who); });
}

function nextDiscard(who){
  if(who==='a'){ screenPassTo('b', ()=>screenDiscard('b')); }
  else { buildFinalists(); screenApuesta(); }   // antes del juego, la apuesta
}

/* ---------- la bóveda recibe (rescatados incluidos: siempre vuelven) ---------- */
function sendToVault(book){
  if(State.vault.some(b=>b.id===book.id)) return;
  State.vault.push(cleanBook(book));
}

function buildFinalists(){
  const all = [...(State.picks.a||[]), ...(State.picks.b||[])];
  State.finalists = all.map(b=>({ ...b }));
}

/* TODOS los que jugaron esta cosecha (los 10 + rescatados), sin repetir */
function cosechaParticipants(){
  const map = new Map();
  [...State.booksA, ...State.booksB, ...(State.finalists||[])].forEach(b=>{
    if(b && b.id && !map.has(b.id)) map.set(b.id, b);
  });
  return [...map.values()];
}

/* TODO libro que jugó y no ganó vuelve a la bóveda, con su historial al día.
   Único camino: lo usan la cosecha, la unánime y el Vasallaje — así ninguna
   partida puede terminar dejando libros tirados fuera de la bóveda. */
function returnLosersToVault(winners, extra=[]){
  const winIds = new Set((winners||[]).map(w=>w.id));
  const pool = new Map();
  [...cosechaParticipants(), ...extra].forEach(b=>{
    if(b && b.id && !winIds.has(b.id) && !pool.has(b.id)) pool.set(b.id, b);
  });
  const losers = [...pool.values()];
  losers.forEach(stampCosecha);
  const loserIds = new Set(losers.map(b=>b.id));
  State.vault = State.vault.filter(v=>!loserIds.has(v.id));   // pisa copias viejas sin historial
  losers.forEach(b=>State.vault.push(cleanBook(b)));
  // el ganador sale de la bóveda para siempre
  State.vault = State.vault.filter(v=>!winIds.has(v.id));
  return losers;
}
