
/* ============================================================
   RULETA DE ELIMINACIÓN + FINAL 1v1 + FIESTA
   ============================================================ */
function screenRoulette(){
  Flow.set(5);
  App.ambient('rgba(201,248,57,.04)', 'rgba(40,16,12,.4)');
  let alive = State.finalists.slice();
  const fellThisRun = [];              // para "volver a girar"
  alive.forEach(b=>ensureColor(b));

  const scr = show(`
    <div class="center" style="min-height:92vh;justify-content:center;position:relative;">
      <div class="eyebrow" id="rouletteEyebrow">La ruleta</div>
      <h2 class="serif" id="rouletteTitle" style="font-weight:700;font-size:clamp(22px,3.5vw,34px);margin:0 0 8px;">
        Alguien va a caer</h2>
      <p class="lead" id="rouletteSub" style="margin:auto;">La rueda elige quién se descarta. El que sobrevive, se lee.</p>
      <div id="wheelStage" class="wheel-stage"></div>
      <button class="btn btn-amber mt-m" id="spinBtn">Girar</button>
      <div class="fallen-tray" id="fallenTray">
        <div class="ft-label">la bóveda recibe</div>
        <div class="ft-spines" id="ftSpines"></div>
      </div>
    </div>
  `);

  const stage = $('#wheelStage');

  function layoutWheel(){
    stage.innerHTML='';
    stage.style.height='';
    if(alive.length<=2){ return layoutFinal(); }
    const n = alive.length;
    const R = stage.clientWidth/2;
    alive.forEach((book,i)=>{
      const ang = (i/n)*2*Math.PI - Math.PI/2;
      const x = R + Math.cos(ang)*R*0.63;
      const y = R + Math.sin(ang)*R*0.63;
      const holder = document.createElement('div');
      holder.className = 'wheel-book';
      holder.dataset.idx = i;
      holder.style.cssText = `left:${x}px;top:${y}px;transform:translate(-50%,-50%);`;
      const inner = document.createElement('div');
      inner.className = 'wb-inner';
      inner.appendChild(bookEl(book, {size:bs(115), still:true, tilt:false, baseY:-16}));
      holder.appendChild(inner);
      if(book._rescued){
        const tag = document.createElement('div');
        tag.className = 'wb-tag';
        tag.textContent = 'rescatado';
        holder.appendChild(tag);
      }
      stage.appendChild(holder);
    });
    const ring = document.createElement('div');
    ring.className = 'wheel-ring';
    const core = document.createElement('div');
    core.className = 'wheel-core';
    core.innerHTML = `<div class="wc-num">${alive.length}</div><div class="wc-sub">en pie</div>`;
    stage.append(ring, core);
  }

  function layoutFinal(){
    stage.innerHTML='';
    $('#rouletteEyebrow').textContent = 'La final';
    $('#rouletteTitle').textContent = 'Mano a mano';
    $('#rouletteSub').textContent = 'Dos libros. Uno se lee, el otro vuelve al polvo.';
    stage.style.height = 'auto';
    const duel = document.createElement('div');
    duel.className = 'duel';
    const mk = (book, i)=>{
      const d = document.createElement('div');
      d.className = 'duel-book';
      d.dataset.idx = i;
      const inner = document.createElement('div');
      inner.className = 'wb-inner';
      inner.appendChild(bookEl(book, {size:bs(230), baseY: i===0 ? -26 : 26}));
      d.appendChild(inner);
      if(book._rescued){
        const tag = document.createElement('div');
        tag.className='wb-tag'; tag.textContent='rescatado';
        d.appendChild(tag);
      }
      return d;
    };
    const vs = document.createElement('div');
    vs.className = 'duel-vs';
    vs.textContent = 'vs';
    duel.append(mk(alive[0],0), vs, mk(alive[1],1));
    stage.appendChild(duel);
  }

  /* la víctima según peso: rescatado pesa más para caer; el amuleto cubre */
  function pickVictimIdx(){
    const fallW = alive.map(pesoCaida);
    const total = fallW.reduce((a,b)=>a+b,0);
    let r = Math.random()*total;
    for(let i=0;i<fallW.length;i++){ r-=fallW[i]; if(r<=0) return i; }
    return fallW.length-1;
  }

  layoutWheel();

  $('#spinBtn').addEventListener('click', ()=>{ Sound.fx.click(); spin(); });

  function setLit(books, cursor){
    books.forEach((b,i)=>b.classList.toggle('lit', i===cursor));
  }

  function spin(){
    const btn = $('#spinBtn');
    btn.disabled = true;
    const isFinal = alive.length<=2;
    const victimIdx = pickVictimIdx();
    const books = $$(isFinal?'.duel-book':'.wheel-book', stage);
    const n = alive.length;

    if(isFinal) return spinFinal(victimIdx, books, n);

    const loops = 2 + Math.floor(Math.random()*2);
    const total = loops*n + victimIdx + 1;
    let tick = 0;
    (function step(){
      const cursor = tick % n;
      setLit(books, cursor);
      Sound.fx.tick(tick/total);
      tick++;
      if(tick<total){
        const p = tick/total;
        setTimeout(step, 50 + Math.pow(p,2.6)*330);
      } else {
        setTimeout(()=>eliminate(victimIdx, false, books), 350);
      }
    })();
  }

  /* FINAL 1v1 — larga, agónica */
  function spinFinal(victimIdx, books, n){
    Sound.startDrone();
    $('#vignette').classList.add('on');
    $('#rouletteSub').textContent = 'Uno de los dos no se lee…';
    const loops = 11 + Math.floor(Math.random()*4);
    const total = loops*n + victimIdx + 1;
    let tick = 0;
    (function step(){
      const cursor = tick % n;
      setLit(books, cursor);
      const p = tick/total;
      Sound.fx.tickFinal(Math.floor(p*4));
      if(p > 0.65 && !step._swelled){
        step._swelled = true;
        Sound.swellDrone();
        $('#rouletteSub').textContent = '…';
      }
      tick++;
      if(tick<total){
        const delay = 130 + Math.pow(p, 3.6)*1500;
        setTimeout(step, delay);
      } else {
        Sound.fx.riser(1.1);
        setTimeout(()=>{
          Sound.stopDrone();
          eliminate(victimIdx, true, books);
        }, 1150);
      }
    })();
  }

  function eliminate(victimIdx, isFinal, books){
    const victim = alive[victimIdx];
    const vEl = books[victimIdx];
    Sound.fx.drop();
    if(isFinal) $('.screen.in').classList.add('shake');
    if(vEl){
      // polvo al caer
      const r = vEl.getBoundingClientRect();
      const dust = document.createElement('div');
      dust.className = 'dust';
      dust.style.cssText += `position:fixed;left:${r.left + r.width/2 - 45}px;top:${r.top + r.height - 50}px;`;
      document.body.appendChild(dust);
      setTimeout(()=>dust.remove(), 800);
      vEl.classList.remove('lit');
      vEl.style.transition = '.75s ease';
      vEl.style.transform += ' translateY(52px) rotate(5deg) scale(.68)';
      vEl.style.filter = 'saturate(.15) brightness(.35)';
      vEl.style.opacity = '.15';
    }
    sendToVault(victim);
    fellThisRun.push(victim.id);
    // la bandeja recibe un lomo
    const tray = $('#fallenTray');
    tray.classList.add('on');
    ensureColor(victim).then(c=>{
      const sp = document.createElement('div');
      sp.className = 'ft-spine';
      sp.title = victim.titulo;
      sp.style.background = `linear-gradient(90deg, color-mix(in srgb, ${c.css} 70%, black), ${c.css})`;
      $('#ftSpines').appendChild(sp);
    });

    setTimeout(()=>{
      alive = alive.filter((_,i)=>i!==victimIdx);
      if(alive.length===1){
        celebrate(alive[0], fellThisRun);
      } else {
        $('#vignette').classList.remove('on');
        $('#spinBtn').disabled = false;
        const goingFinal = alive.length<=2;
        $('#spinBtn').textContent = goingFinal ? 'Girar la final' : 'Girar';
        if(goingFinal) Sound.fx.finalBell();
        layoutWheel();
      }
    }, 950);
  }
}

/* ============================================================
   FIESTA
   ============================================================ */
async function celebrate(winner, fellThisRun){
  Flow.hide();
  // Los libros que no ganan vuelven a la bóveda en UNA sola animación, recién
  // después de festejar al ganador (más abajo, al aceptar). Antes se animaban
  // los caídos acá y de nuevo los finalistas al final → la animación se veía dos veces.
  Sound.fx.fanfare();
  setTimeout(()=>Sound.playCelebration(), 500);   // canción sorpresa (sin mostrar el nombre)
  ensureColor(winner).then(c=>{
    $('#vignette').classList.remove('on');
    App.ambient(winner._haloColor.replace('0.55','0.14'), 'rgba(201,248,57,.06)');
    const wash = document.createElement('div');
    wash.style.cssText = `position:fixed;inset:0;z-index:4000;pointer-events:none;
      background:radial-gradient(circle at 50% 42%, ${winner._haloColor.replace('0.55','0.35')} 0%, transparent 58%);
      opacity:0;transition:opacity 1.2s ease;`;
    document.body.appendChild(wash);
    requestAnimationFrame(()=>wash.style.opacity='1');

    launchConfetti(c);
    let bursts = 0;
    const burstTimer = setInterval(()=>{
      bursts++;
      if(bursts>4){ clearInterval(burstTimer); return; }
      launchConfetti(c, bursts%2 ? 0.18 : 0.82, 0.28, 90);
    }, 1500);

    setTimeout(()=>{
      const { hook } = splitHook(winner.sinopsis);
      show(`
        <div class="center win-screen" style="min-height:92vh;justify-content:center;position:relative;z-index:4100;">
          <div class="eyebrow" style="color:var(--amber);animation:winPop .6s var(--ease-pop);text-shadow:0 2px 12px rgba(0,0,0,.6);">El destino habló</div>
          <div id="winBook" style="animation:winRise 1s var(--ease-pop);"></div>
          <h1 class="serif" style="font-weight:900;font-size:clamp(30px,6vw,64px);margin:26px 0 6px;animation:winPop .8s .2s both var(--ease-pop);text-shadow:0 4px 24px rgba(0,0,0,.7);">
            ${escapeHtml(winner.titulo)}</h1>
          <p class="serif" style="font-style:italic;font-size:17px;line-height:1.55;color:var(--bone-dim);margin:6px auto 0;max-width:480px;animation:winPop .8s .35s both var(--ease-pop);">${escapeHtml(hook)}</p>
          ${winner._rescued?`<p style="color:var(--amber);font-size:13px;margin-top:14px;animation:winPop .8s .45s both var(--ease-pop);">
            ⛏ Rescatado de la bóveda${evCount(winner,'rescates')>1?` (×${evCount(winner,'rescates')})`:''}. Tenía todo en contra. Fue el destino.</p>`:''}
          <div class="row mt-l" style="animation:winPop .8s .5s both var(--ease-pop);">
            <button class="btn btn-amber" id="acceptWin">Lo aceptamos, este leemos</button>
            <button class="btn btn-ghost" id="respin">Volver a jugar</button>
          </div>
        </div>
      `, {silent:true});
      const wb = $('#winBook');
      const el = bookEl(winner, {size:bs(290)});
      wb.appendChild(el);
      setTimeout(()=>{
        const halo = el.querySelector('.book-halo');
        if(halo){ halo.style.opacity='1'; halo.style.animation='haloPulse 2s ease-in-out infinite'; }
      }, 250);

      $('#acceptWin').addEventListener('click', async ()=>{
        Sound.fx.click();
        clearInterval(burstTimer);
        await renameUndo(`la cosecha de «${winner.titulo}»`);
        // TODOS los que jugaron (menos el ganador) vuelven a la bóveda con su historial
        // al día, en UNA sola animación (después del festejo del ganador).
        const losers = returnLosersToVault([winner]);
        if(losers.length){
          wash.remove();
          await drawerReturn(losers);
          finishHarvest(winner, null);
        } else {
          finishHarvest(winner, wash);
        }
      });
      $('#respin').addEventListener('click', ()=>{
        Sound.fx.click();
        Sound.stopCelebration();
        Sound.stopMusic();
        Sound.stopDrone();
        clearInterval(burstTimer);
        wash.remove();
        // ganó… pero decidieron volver a sortear. Queda anotado, y se puede repetir.
        evPush(winner, 'anulaciones', {
          quien: 'volvieron a sortear',
          extra: (typeof currentGame!=='undefined' && currentGame) ? currentGame.name : '' });
        // los caídos de esta tirada salen de la bóveda y todos los finalistas vuelven en pie
        const fell = new Set(fellThisRun);
        State.vault = State.vault.filter(b=>!fell.has(b.id));
        buildFinalists();
        persist();                     // la anulación se guarda ya, no al final
        offerReplay();
      });
    }, 950);
  });
}

/* confeti: papelitos + serpentinas del color del ganador */
function launchConfetti(c, ox=0.5, oy=0.4, count=170){
  const cv = document.createElement('canvas');
  cv.style.cssText = 'position:fixed;inset:0;z-index:4500;pointer-events:none;';
  cv.width = innerWidth; cv.height = innerHeight;
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const colors = [`rgb(${c.r},${c.g},${c.b})`, '#C9F839', '#F2F5EC', '#DFFF7A', '#7CD4FF'];
  const parts = [];
  for(let i=0;i<count;i++){
    const streamer = Math.random()<0.22;
    parts.push({
      x:innerWidth*ox, y:innerHeight*oy,
      vx:(Math.random()-.5)*17, vy:(Math.random()-1.15)*17,
      g:0.3+Math.random()*0.22,
      s:streamer ? 3+Math.random()*3 : 5+Math.random()*7,
      len:streamer ? 14+Math.random()*12 : 0,
      rot:Math.random()*6, vr:(Math.random()-.5)*.42,
      c:colors[Math.floor(Math.random()*colors.length)],
      life:1, decay:0.005+Math.random()*0.004,
    });
  }
  let frame = 0;
  (function draw(){
    ctx.clearRect(0,0,cv.width,cv.height);
    parts.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.vy+=p.g; p.vx*=0.992; p.rot+=p.vr; p.life-=p.decay;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0,p.life);
      ctx.fillStyle = p.c;
      if(p.len) ctx.fillRect(-p.s/2, -p.len/2, p.s*0.5, p.len);
      else ctx.fillRect(-p.s/2, -p.s/2, p.s, p.s*0.62);
      ctx.restore();
    });
    frame++;
    if(frame<240) requestAnimationFrame(draw); else cv.remove();
  })();
}

/* ============================================================
   CIERRE DE LA COSECHA
   ============================================================ */
async function finishHarvest(winner, wash){
  if(wash) wash.remove();
  // si venía de la bóveda, sale para siempre
  State.vault = State.vault.filter(b=>b.id!==winner.id);
  stampCosecha(winner);
  // una victoria nueva se APILA: si antes ganó y se anuló, esa historia no se pisa
  if(!evTiene(winner, 'victorias', fechaHoy()))
    evPush(winner, 'victorias', {
      quien: winner._metodo || ((typeof currentGame !== 'undefined' && currentGame) ? currentGame.name : '') });
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const now = new Date();
  const entry = cleanBook(winner);   // se lleva TODO su historial al estante
  entry.readDate = `${meses[now.getMonth()]} ${now.getFullYear()}`;
  State.read.push(entry);
  const premios = resolverApuesta([winner]);   // si nadie acertó, silencio
  await persist();
  screenHarvestEnd(winner);
  mostrarPremios(premios);
}

function screenHarvestEnd(winner){
  Flow.hide();
  App.ambient();
  show(`
    <div class="center" style="min-height:46vh;justify-content:flex-end;">
      <div class="eyebrow">Cosecha cerrada</div>
      <h1 class="title" style="font-size:clamp(30px,5vw,52px);">A leer<br>${escapeHtml(winner.titulo)}</h1>
      ${marcadorBandHTML()}
      <p class="lead mt-m" style="margin-left:auto;margin-right:auto;">Se guardó y sincronizó solo.</p>
      <div class="row mt-l">
        <button class="btn btn-primary" id="dlVault">Descargar el club actualizado</button>
        <button class="btn btn-ghost" id="goHome">Volver al inicio</button>
      </div>
    </div>
    <section class="mt-l">
      <div class="eyebrow">El estante de honor</div>
      <div id="honorShelf"></div>
    </section>
  `);
  renderHonorShelf($('#honorShelf'), { highlightId:winner.id });
  requestAnimationFrame(()=>animarMarcador());
  $('#dlVault').addEventListener('click', downloadClub);
  $('#goHome').addEventListener('click', ()=>{ Sound.fx.click(); screenHome(); });
}

function serializeBook(b, {placeholders=false}={}){
  let s = `titulo: ${b.titulo}\nportada: ${b.portada||''}\nsinopsis: ${b.sinopsis||''}`;
  META_FIELDS.filter(f=>!f.legacy).forEach(f=>{     // las casillas viejas ya migraron: no se reescriben
    const v = b[f.key];
    if(v!==undefined && v!=='' && v!==null) s += `\n${f.file}: ${v}`;
    else if(placeholders && ['traidoPor','cosechas','rescates','descartes'].includes(f.key)) s += `\n${f.file}: `;
  });
  if(b.readDate) s += `\nleído: ${b.readDate}`;
  return s;
}
/* el club entero en un archivo: estante de honor, bóveda y el mazo */
function serializeClub(){
  const sec = (nombre, lista)=>`===== ${nombre} =====\n\n` +
    lista.map(b=>serializeBook(b)).join('\n---\n');
  // el sello sólo informa cuándo se hizo este respaldo (lo lee un humano al abrir el .txt)
  return `# actualizado: ${new Date().toISOString()}\n\n`
       + sec('ESTANTE DE HONOR', State.read) + '\n\n' + sec('THE VAULT', State.vault)
       + '\n\n===== EL MAZO =====\n\n' + serializeMazo() + '\n';
}
function downloadClub(){
  downloadText('el-club.txt', serializeClub());
  toast(`El club en un archivo · ${State.read.length} leídos + ${State.vault.length} en la bóveda`);
}
function downloadVault(){
  downloadText('the-vault.txt', State.vault.map(serializeBook).join('\n---\n'));
  toast('Bóveda descargada');
}
function downloadRead(){
  downloadText('estante-de-honor.txt', State.read.map(serializeBook).join('\n---\n'));
  toast('Estante descargado');
}

/* ---------- reiniciar todo / borrar memoria ---------- */
async function resetEverything(opts={}){
  const keys = ['cosecha:read','cosecha:vault','cosecha:names','cosecha:cartas','cosecha:undo'];
  if(opts.fotos) keys.push(FOTOS_KEY);      // las fotos sólo si lo pidieron a propósito
  keys.forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
  if(HAS_STORAGE) for(const k of keys){ try{ await window.storage.delete(k); }catch(e){} }
  Cartas.mano = { a:[], b:[] };
  Cartas.historial = [];
  if(opts.fotos) State.fotos = [];
  State.players = { a:'Maru', b:'Uri' };
  State.booksA = []; State.booksB = [];
  State.vault = [];
  State.read = DEFAULT_READ.slice();
  State.picks = { a:null, b:null };
  State.finalists = [];
  await persist();
  toast('Memoria borrada · todo de cero');
  screenHome();
}
/* ---------- abandonar la cosecha en curso (la bóveda vuelve a como estaba) ---------- */
function confirmAbort(){
  Sound.fx.click();
  const ov = overlay(`
    <div class="ov-pop center" style="max-width:440px;">
      <div class="eyebrow" style="color:var(--grey);">Abandonar</div>
      <h2 class="serif" style="font-size:26px;font-weight:700;margin:4px 0 0;">¿Dejamos esta cosecha?</h2>
      <p class="lead" style="font-size:13.5px;margin-top:10px;">No se guarda nada: la bóveda y el estante quedan como estaban.</p>
      <div class="row mt-m">
        <button class="btn btn-ghost" data-esc id="abNo">Seguimos jugando</button>
        <button class="btn btn-danger" data-enter id="abYes">Sí, abandonar</button>
      </div>
    </div>`);
  $('#abNo', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
  $('#abYes', ov).addEventListener('click', ()=>{
    closeOverlay(ov);
    Sound.stopMusic(); Sound.stopDrone(); Sound.stopCelebration(); Sound.stopClips();
    if(State._snapVault) State.vault = State._snapVault.map(b=>({...b}));
    if(State._snapCartas){             // las cartas jugadas esa noche vuelven a la mano
      Cartas.mano = State._snapCartas.mano;
      Cartas.historial = State._snapCartas.historial;
      persistCartas();
    }
    State.picks = { a:null, b:null };
    State.finalists = [];
    clearUndo();                       // una partida abandonada no deja nada que deshacer
    $('#vignette').classList.remove('on');
    toast('Cosecha abandonada · todo como estaba');
    screenHome();
  });
}

function confirmReset(){
  Sound.fx.click();
  const n = State.fotos.length;
  const ov = overlay(`
    <div class="ov-pop center" style="max-width:480px;">
      <div class="eyebrow" style="color:var(--danger);">Reiniciar todo</div>
      <h2 class="serif" style="font-size:26px;font-weight:700;margin:4px 0 0;">¿Borro toda la memoria?</h2>
      <p class="lead" style="font-size:14px;margin-top:10px;">Se vacían la bóveda y el estante de honor, y vuelven los 4 leídos por defecto. No se puede deshacer.</p>
      ${n?`<label class="rs-fotos">
        <input type="checkbox" id="rsFotos">
        <span>Borrar también los <b>${n} recuerdo${n>1?'s':''}</b>.
          Los libros los tenés en los .txt; las fotos <b>no se recuperan</b>.</span>
      </label>`:''}
      <div class="row mt-m">
        <button class="btn btn-ghost" data-esc id="rsNo">No, dejá todo</button>
        ${n?`<button class="btn btn-ghost" id="rsDl">↓ Bajar los recuerdos</button>`:''}
        <button class="btn btn-danger" data-enter id="rsYes">Sí, borrar</button>
      </div>
    </div>`);
  $('#rsNo', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
  if($('#rsDl', ov)) $('#rsDl', ov).addEventListener('click', ()=>{ Sound.fx.click(); downloadRecuerdos(); });
  $('#rsYes', ov).addEventListener('click', ()=>{
    const conFotos = !!($('#rsFotos', ov) && $('#rsFotos', ov).checked);
    closeOverlay(ov);
    resetEverything({ fotos: conFotos });
  });
}

/* ============================================================
   ARRANQUE
   ============================================================ */
(async function init(){
  startEmoji();                 // los emojis de iOS, antes de pintar nada
  await loadPersisted();
  await loadFotos();
  await loadCartas();
  await revertirSiQuedoAMedias();  // se cerró la tab a mitad de una partida → todo vuelve como estaba
  await syncAlArrancar();          // trae del club de GitHub si hay uno conectado
  const rb = document.getElementById('resetBtn');
  if(rb) rb.addEventListener('click', confirmReset);
  const ab = document.getElementById('abortBtn');
  if(ab) ab.addEventListener('click', confirmAbort);
  const h = location.hash.replace('#','');
  if(h==='vault') screenVault();
  else if(h==='seed') window.__seed();
  else if(h==='vasa'){
    if(State.vault.length<8){
      const T=['El bosque sumergido','Manual del insomnio','La cosecha amarga','Nieve en marzo','El archivo secreto','Un animal salvaje','La biblioteca de arena','Todo lo que fuimos','La casa vacía','El río invisible','Los días del fuego','Cartas a nadie','El último verano','Vidas ajenas'];
      State.vault = T.map((t,i)=>({ id:'vz'+i, titulo:t, portada:'', sinopsis:'Una historia sobre '+t.toLowerCase()+'.', rescates:i%4===0?1:0 }));
    }
    screenVasallaje();
  }
  else screenHome();
})();

/* ---------- ayudita de desarrollo (consola): __seed() carga una partida de prueba ---------- */
window.__seed = function(){
  const mk = (t,i)=>({ id:uid(), titulo:t, portada:'', sinopsis:
    `Una historia sobre ${t.toLowerCase()}. Alguien descubre un secreto que lo cambia todo y ya no puede volver atrás. `+
    `Lo que empieza como una vida común se convierte en una espiral de decisiones imposibles, lealtades rotas y un final que nadie ve venir.` });
  State.booksA = ['La casa vacía','El río invisible','Los días del fuego','Cartas a nadie','El último verano'].map(mk);
  State.booksB = ['Nieve en marzo','El archivo secreto','Un animal salvaje','La biblioteca de arena','Todo lo que fuimos'].map(mk);
  State.vault = [
    { id:uid(), titulo:'El bosque sumergido', portada:'', sinopsis:'Un pueblo entero desaparece bajo el agua y alguien vuelve a buscarlo.', rescates:0 },
    { id:uid(), titulo:'Manual del insomnio', portada:'', sinopsis:'Una mujer que no duerme empieza a ver la ciudad como realmente es.', rescates:1 },
    { id:uid(), titulo:'La cosecha amarga', portada:'', sinopsis:'Dos hermanos heredan un campo que guarda más huesos que semillas.', rescates:2 },
  ];
  toast('Partida de prueba cargada');
  screenSorteo();
};
