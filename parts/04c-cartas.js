
/* ============================================================
   🃏 LA APUESTA Y EL MAZO
   Con los finalistas a la vista, cada uno apuesta EN SECRETO
   cuál gana esa noche. Acertar da una carta. Las cartas son
   poderes que se juegan en cosechas futuras: UNA por cabeza
   por cosecha. Si nadie acierta, no pasa nada — perdimos.
   ============================================================ */

const DECK = [
  { id:'sexto',      icon:'🃏', nombre:'El Sexto Tributo',
    poder:'Esta noche traés seis libros en vez de cinco.',
    momento:'se juega al cargar los libros' },
  { id:'salvavidas', icon:'🛟', nombre:'El Salvavidas',
    poder:'Rescatás un segundo caído de la bóveda.',
    momento:'se juega en tu rescate' },
  { id:'escudo',     icon:'🛡️', nombre:'El Escudo',
    poder:'Blindás un libro de tu preselección: no puede ser descartado.',
    momento:'se juega en tu rescate' },
  { id:'veto',       icon:'🗡️', nombre:'El Veto',
    poder:'Mandás un finalista del otro a la bóveda antes del juego.',
    momento:'se juega al apostar' },
  { id:'amuleto',    icon:'🔮', nombre:'El Amuleto',
    poder:'Un finalista tuyo esquiva la mitad de los golpes del azar.',
    momento:'se juega al apostar' },
  { id:'doble',      icon:'🎲', nombre:'Doble o Nada',
    poder:'Si tu apuesta acierta, robás dos cartas. Si falla, la perdiste.',
    momento:'se juega al apostar' },
];
const cartaDef = id => DECK.find(c=>c.id===id);
const MANO_MAX = 5;

const Cartas = { mano:{ a:[], b:[] }, historial:[] };

/* ---------- persistencia ---------- */
async function loadCartas(){
  let raw = null;
  if(HAS_STORAGE){ try{ const r = await window.storage.get('cosecha:cartas'); if(r && r.value) raw = r.value; }catch(e){} }
  if(!raw){ try{ raw = localStorage.getItem('cosecha:cartas'); }catch(e){} }
  try{
    const d = raw ? JSON.parse(raw) : null;
    if(d && d.mano){ Cartas.mano = d.mano; Cartas.historial = d.historial || []; }
  }catch(e){}
}
async function persistCartas(){
  const raw = JSON.stringify(Cartas);
  try{ localStorage.setItem('cosecha:cartas', raw); }catch(e){}
  if(HAS_STORAGE){ try{ await window.storage.set('cosecha:cartas', raw); }catch(e){} }
  if(typeof onLocalChange === 'function') onLocalChange();   // ☁️ sube a la nube (Firestore)
}

/* al archivo del club: legible y editable a mano */
function serializeMazo(){
  const lista = who => Cartas.mano[who].map(id=>cartaDef(id).nombre).join(' | ') || '—';
  const ap = h => `apuesta: ${h.fecha} · ${State.players.a}→${h.a.titulo} ${h.a.acerto?'✓':'✗'} · ${State.players.b}→${h.b.titulo} ${h.b.acerto?'✓':'✗'} · ganó ${h.ganador}`;
  return `cartas ${State.players.a.toLowerCase()}: ${lista('a')}\n`
       + `cartas ${State.players.b.toLowerCase()}: ${lista('b')}\n`
       + Cartas.historial.map(ap).join('\n');
}
function parseMazo(texto){
  const out = { mano:{ a:[], b:[] }, historial:[] };
  const porNombre = n => DECK.find(c=>metaNorm(c.nombre)===metaNorm(n));
  texto.split('\n').forEach(l=>{
    const mc = l.match(/^cartas\s+(.+?):\s*(.*)$/i);
    if(mc){
      const who = metaNorm(mc[1])===metaNorm(State.players.a) ? 'a'
                : metaNorm(mc[1])===metaNorm(State.players.b) ? 'b' : null;
      if(who) out.mano[who] = mc[2].split('|').map(s=>porNombre(s.trim())).filter(Boolean).map(c=>c.id);
      return;
    }
    const ma = l.match(/^apuesta:\s*(.+)$/i);
    if(ma){
      const p = ma[1].split('·').map(s=>s.trim());
      const lado = s => { const m = s.match(/^(.+?)→(.+?)\s*(✓|✗)$/); return m ? { titulo:m[2].trim(), acerto:m[3]==='✓' } : null; };
      const a = lado(p[1]||''), b = lado(p[2]||'');
      if(a && b) out.historial.push({ fecha:p[0], a, b, ganador:(p[3]||'').replace(/^ganó\s*/,'') });
    }
  });
  return out;
}

/* ---------- helpers de juego ---------- */
const tieneCarta = (who, id) => Cartas.mano[who].includes(id);
const puedeJugar = who => !State.cartaJugada || !State.cartaJugada[who];
function consumirCarta(who, id){
  const i = Cartas.mano[who].indexOf(id);
  if(i < 0) return false;
  Cartas.mano[who].splice(i, 1);
  State.cartaJugada = State.cartaJugada || {};
  State.cartaJugada[who] = id;
  persistCartas();
  return true;
}
function robarCartas(who, n){
  const ganadas = [];
  for(let i=0; i<n; i++){
    if(Cartas.mano[who].length >= MANO_MAX) break;   // mano llena: no entra más
    const c = DECK[Math.floor(Math.random()*DECK.length)];
    Cartas.mano[who].push(c.id);
    ganadas.push(c.id);
  }
  persistCartas();
  return ganadas;
}
/* peso de caída unificado: rescatados caen más fácil, el amuleto los cubre */
const pesoCaida = b => (b && b._amuleto ? 0.45 : 1) * (b && b._rescued ? 2.2 : 1);

/* ---------- la carta como objeto físico ---------- */
function cartaEl(id, opts={}){
  const c = cartaDef(id);
  const el = document.createElement('div');
  el.className = 'carta' + (opts.mini ? ' mini' : '') + (opts.dorso ? ' dorso' : '');
  el.innerHTML = `
    <div class="carta-inner">
      <div class="carta-frente">
        <div class="carta-esq tl">🌾</div><div class="carta-esq br">🌾</div>
        <div class="carta-ico">${c.icon}</div>
        <div class="carta-nom">${escapeHtml(c.nombre)}</div>
        <div class="carta-poder">${escapeHtml(c.poder)}</div>
        <div class="carta-momento">${escapeHtml(c.momento)}</div>
      </div>
      <div class="carta-dorso"><span>🌾</span></div>
    </div>`;
  return el;
}
/* ver una carta en grande */
function verCarta(id){
  Sound.fx.click();
  const ov = overlay(`<div class="ov-pop center"><div id="cartaZoom"></div>
    <button class="btn btn-ghost btn-sm mt-m" data-esc id="czOk">Cerrar</button></div>`);
  $('#cartaZoom', ov).appendChild(cartaEl(id));
  $('#czOk', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
}

/* ---------- LA APUESTA: en secreto, uno y después el otro ---------- */
function screenApuesta(){
  State.bets = { a:null, b:null };
  State.doble = { a:false, b:false };
  screenPassTo('a', ()=>screenApuestaTurno('a'));
}

function screenApuestaTurno(who){
  Flow.set(5, 'la apuesta');
  App.ambient(`rgba(${PLAYER_RGB[who]},.07)`, 'rgba(232,195,74,.05)');
  show(`
    <div class="center" style="min-height:86vh;justify-content:center;">
      <div class="eyebrow" style="color:${PLAYER_COLOR[who]};">🃏 La apuesta · ${escapeHtml(State.players[who])}</div>
      <h2 class="serif" style="font-weight:900;font-size:clamp(26px,4.5vw,44px);margin:0 0 4px;">¿Quién gana hoy?</h2>
      <p class="lead" style="font-size:13px;margin:0 auto;">Acertar da una carta.</p>
      <div class="ap-grid stagger mt-l" id="apGrid"></div>
      <div class="ap-cartas" id="apCartas"></div>
    </div>
  `);
  const grid = $('#apGrid');
  State.finalists.forEach((b, i)=>{
    const it = document.createElement('div');
    it.className = 'ap-item';
    it.style.setProperty('--i', i);
    it.appendChild(bookEl(b, { size:bs(128), still:true }));
    it.insertAdjacentHTML('beforeend', `<div class="ap-t">${escapeHtml(short(b.titulo, 22))}${b._amuleto?' 🔮':''}</div>`);
    it.addEventListener('click', ()=>{
      Sound.fx.chosen();
      State.bets[who] = b.id;
      $$('.ap-item', grid).forEach(x=>x.classList.remove('on'));
      it.classList.add('on');
      const r = it.getBoundingClientRect();
      sparkleAt(r.left + r.width/2, r.top + r.height/2, 6);
      setTimeout(()=>{
        if(who === 'a') screenPassTo('b', ()=>screenApuestaTurno('b'));
        else screenGameSelect();
      }, 900);
    });
    grid.appendChild(it);
  });
  pintarCartasApuesta(who);
}

/* la tira de cartas jugables en el momento de la apuesta */
function pintarCartasApuesta(who){
  const zona = $('#apCartas');
  if(!zona) return;
  zona.innerHTML = '';
  if(!puedeJugar(who)) return;
  const jugables = ['veto','amuleto','doble'].filter(id=>tieneCarta(who, id));
  if(!jugables.length) return;
  zona.insertAdjacentHTML('beforeend', `<div class="ap-cartas-lab">tus cartas</div>`);
  jugables.forEach(id=>{
    const mini = cartaEl(id, { mini:true });
    mini.addEventListener('click', ()=>confirmarCarta(who, id, ()=>{
      if(id === 'doble'){
        State.doble[who] = true;
        toast('Doble o Nada en la mesa');
        pintarCartasApuesta(who);
      }
      if(id === 'veto') jugarVeto(who);
      if(id === 'amuleto') jugarAmuleto(who);
    }));
    zona.appendChild(mini);
  });
}

function confirmarCarta(who, id, onOk){
  Sound.fx.click();
  const ov = overlay(`<div class="ov-pop center">
      <div id="ccCarta"></div>
      <div class="row mt-m">
        <button class="btn btn-ghost" data-esc id="ccNo">Todavía no</button>
        <button class="btn btn-amber" data-enter id="ccSi">Jugarla</button>
      </div>
      <p class="lead" style="font-size:11.5px;margin-top:10px;color:var(--grey);">una carta por cosecha</p>
    </div>`);
  $('#ccCarta', ov).appendChild(cartaEl(id));
  $('#ccNo', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
  $('#ccSi', ov).addEventListener('click', ()=>{
    closeOverlay(ov);
    consumirCarta(who, id);
    Sound.fx.reveal();
    onOk();
  });
}

function jugarVeto(who){
  const rivales = State.finalists.filter(b=>b._owner === other(who));
  const ov = overlay(`<div class="ov-pop center" style="max-width:720px;">
      <div class="eyebrow" style="color:var(--danger);">🗡️ El Veto</div>
      <h2 class="serif" style="font-size:24px;font-weight:700;margin:4px 0 14px;">¿Cuál no juega esta noche?</h2>
      <div class="row" id="vetoRow" style="gap:20px;flex-wrap:wrap;justify-content:center;"></div>
    </div>`);
  rivales.forEach(b=>{
    const h = document.createElement('div');
    h.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;';
    h.appendChild(bookEl(b, { size:bs(110), still:true, tilt:false }));
    h.insertAdjacentHTML('beforeend', `<div class="mp-lab">${escapeHtml(short(b.titulo, 18))}</div>`);
    h.addEventListener('click', ()=>{
      closeOverlay(ov);
      // el vetado cae a la bóveda con la carta anotada en su historial
      evPush(b, 'descartes', { quien: State.players[who], extra: 'con El Veto' });
      State.finalists = State.finalists.filter(x=>x.id !== b.id);
      sendToVault(b);
      Sound.fx.drop();
      toast(`«${short(b.titulo, 26)}» vetado — a la bóveda`);
      screenApuestaTurno(who);          // la mesa cambió: se vuelve a apostar
    });
    $('#vetoRow', ov).appendChild(h);
  });
}

function jugarAmuleto(who){
  const mios = State.finalists.filter(b=>b._owner === who);
  const ov = overlay(`<div class="ov-pop center" style="max-width:720px;">
      <div class="eyebrow" style="color:#E8C34A;">🔮 El Amuleto</div>
      <h2 class="serif" style="font-size:24px;font-weight:700;margin:4px 0 14px;">¿A cuál protegés?</h2>
      <div class="row" id="amuRow" style="gap:20px;flex-wrap:wrap;justify-content:center;"></div>
    </div>`);
  mios.forEach(b=>{
    const h = document.createElement('div');
    h.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;';
    h.appendChild(bookEl(b, { size:bs(110), still:true, tilt:false }));
    h.insertAdjacentHTML('beforeend', `<div class="mp-lab">${escapeHtml(short(b.titulo, 18))}</div>`);
    h.addEventListener('click', ()=>{
      closeOverlay(ov);
      b._amuleto = true;
      Sound.fx.reveal();
      toast(`«${short(b.titulo, 24)}» lleva el amuleto`);
      screenApuestaTurno(who);
    });
    $('#amuRow', ov).appendChild(h);
  });
}

/* ---------- resolver: acertar roba cartas; fallar, silencio ---------- */
function resolverApuesta(winners){
  if(!State.bets || (!State.bets.a && !State.bets.b)) return [];
  const todos = cosechaParticipants();
  const tituloDe = id => (todos.find(b=>b.id===id) || {}).titulo || '?';
  const premios = [];
  const registro = { fecha: fechaHoy(), ganador: winners.map(w=>w.titulo).join(' + ') };
  ['a','b'].forEach(who=>{
    const bet = State.bets[who];
    const acerto = !!bet && winners.some(w=>w.id === bet);
    registro[who] = { titulo: tituloDe(bet), acerto };
    if(acerto){
      const ganadas = robarCartas(who, State.doble && State.doble[who] ? 2 : 1);
      if(ganadas.length) premios.push({ who, cartas: ganadas });
    }
  });
  Cartas.historial.push(registro);
  persistCartas();
  State.bets = null;
  return premios;
}

/* el momento del premio: la carta se da vuelta. Si nadie acertó, no existe. */
async function mostrarPremios(premios){
  if(!premios || !premios.length) return;
  for(const p of premios){
    await new Promise(done=>{
      Sound.fx.finalBell();
      const ov = overlay(`<div class="ov-pop center">
          <div class="eyebrow" style="color:${PLAYER_COLOR[p.who]};">🃏 ${escapeHtml(State.players[p.who])} la vio venir</div>
          <div class="row mt-m" id="premioRow" style="gap:26px;justify-content:center;"></div>
          <button class="btn btn-amber mt-l" data-enter id="premioOk">A la mano</button>
        </div>`);
      p.cartas.forEach((id, i)=>{
        const c = cartaEl(id, { dorso:true });
        $('#premioRow', ov).appendChild(c);
        setTimeout(()=>{
          c.classList.remove('dorso');
          Sound.fx.reveal();
          const r = c.getBoundingClientRect();
          sparkleAt(r.left + r.width/2, r.top + r.height/2, 8);
        }, 700 + i*900);
      });
      $('#premioOk', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); done(); });
    });
  }
}

/* ---------- EL MAZO en el home ---------- */
function renderMazo(box){
  if(!box) return;
  box.innerHTML = '';
  const total = Cartas.mano.a.length + Cartas.mano.b.length;
  if(!total && !Cartas.historial.length){
    box.innerHTML = `<div class="mazo-void"><p>El mazo está vacío. Se gana apostando.</p></div>`;
    return;
  }
  ['a','b'].forEach(who=>{
    const fila = document.createElement('div');
    fila.className = 'mazo-fila';
    fila.innerHTML = `<div class="mazo-quien" style="--pc:var(--p${who})">${escapeHtml((State.players[who]||'?')[0].toUpperCase())}</div>
      <div class="mazo-cartas"></div>`;
    const zona = fila.querySelector('.mazo-cartas');
    if(!Cartas.mano[who].length){
      zona.innerHTML = `<span class="mazo-nada">sin cartas</span>`;
    } else {
      Cartas.mano[who].forEach((id, i)=>{
        const c = cartaEl(id, { mini:true });
        c.style.setProperty('--i', i);
        c.addEventListener('click', ()=>verCarta(id));
        zona.appendChild(c);
      });
    }
    box.appendChild(fila);
  });
}
