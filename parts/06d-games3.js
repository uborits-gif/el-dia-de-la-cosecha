
/* ============================================================
   MINIJUEGOS — TANDA 3
   Ascensor · Garra · Luz Roja · Papa Caliente · Naufragio ·
   Globo · Espiritismo · Abducción · Dardo
   ============================================================ */

/* ---- bandas sonoras ---- */
(function(){
  const T=(o)=>Sound.tone(o), X=(o)=>Sound.noise(o);
  /* muzak de ascensor + motor */
  Sound.PATTERNS.ascensor = { bpm:92, play(s,t){
    X({at:t, dur:.32, vol:.03, lp:140});                                  // motor
    const arp=[[57,64,69],[55,62,67]][Math.floor(s/16)%2];
    if(s%4===0) T({freq:NOTE(arp[(s/4)%3]+12), at:t, dur:.5, type:'sine', vol:.04, wet:.6});
    if(s%8===0) T({freq:NOTE(45), at:t, dur:.4, type:'triangle', vol:.06});
  }};
  /* fichines */
  Sound.PATTERNS.garra = { bpm:138, play(s,t){
    const mel=[76,79,83,79, 81,79,76,74, 76,79,83,86, 84,83,79,76];
    T({freq:NOTE(mel[s%16]), at:t, dur:.09, type:'square', vol:.035});
    if(s%4===0) T({freq:NOTE(52+[0,-3,-5,-7][(s/4)%4]), at:t, dur:.18, type:'triangle', vol:.07});
    if(s%2===1) X({at:t, dur:.03, vol:.03, hp:7000, lp:12000});
  }};
  /* cajita de música siniestra (luz verde) */
  Sound.PATTERNS.luzroja = { bpm:104, play(s,t){
    const mel=[79,81,79,76, 74,76,74,71, 79,81,84,81, 79,76,74,71];
    if(s%2===0) T({freq:NOTE(mel[(s/2)%16]), at:t, dur:.3, type:'sine', vol:.06, wet:.7});
    if(s%8===0) T({freq:NOTE(43), at:t, dur:.5, type:'triangle', vol:.05});
  }};
  /* tensión de mecha */
  Sound.PATTERNS.papa = { bpm:120, play(s,t){
    T({freq:NOTE([36,36,43,36][s%4]), at:t, dur:.12, type:'triangle', vol:.1});
    X({at:t, dur:.03, vol:.02, hp:6000, lp:11000});
  }};
  /* vals triste de cuerdas */
  Sound.PATTERNS.naufragio = { bpm:80, play(s,t){
    const w=[57,60,64, 55,59,62, 53,57,60, 55,59,62];
    if(s%2===0) T({freq:NOTE(w[(s/2)%12]), at:t, dur:1, type:'sine', vol:.05, wet:.8, detune:5});
    if(s%6===0) T({freq:NOTE(w[(s/2)%12]-24), at:t, dur:1.4, type:'triangle', vol:.06});
  }};
  /* viento y vals aéreo */
  Sound.PATTERNS.globo = { bpm:96, play(s,t){
    if(s%16===0) X({at:t, dur:3.4, vol:.02, lp:900, hp:200, wet:.5});     // viento
    const w=[60,64,67, 59,62,67, 57,60,65, 59,62,67];
    if(s%2===0) T({freq:NOTE(w[(s/2)%12]+12), at:t, dur:.5, type:'sine', vol:.04, wet:.6});
  }};
  /* theremin */
  Sound.PATTERNS.ovni = { bpm:70, play(s,t){
    const m=[72,74.5,71,76];
    if(s%4===0){
      T({freq:NOTE(m[(s/4)%4]), at:t, dur:1.8, type:'sine', vol:.05, wet:.8, detune:14});
      T({freq:NOTE(m[(s/4)%4]), at:t, dur:1.8, type:'sine', vol:.03, wet:.8, detune:-16});
    }
    if(s%8===4) T({freq:NOTE(38), at:t, dur:1, type:'triangle', vol:.05});
  }};
  /* latido del dardo */
  Sound.PATTERNS.dardo = { bpm:72, play(s,t){
    if(s%4===0){ T({freq:62, at:t, dur:.14, type:'sine', vol:.22, glideTo:44}); T({freq:58, at:t+.16, dur:.1, type:'sine', vol:.12, glideTo:42}); }
  }};
})();

/* ============================================================
   🕯️ LA SESIÓN — el minijuego embebido (ouija completa)
   Corre en un iframe a pantalla total con los finalistas reales;
   cuando el espíritu elige, vuelve a la cosecha con el ganador.
   ============================================================ */
async function gameSesion(){
  const kit = gameKit();
  // la mesa de la ouija aguanta 8: si hubiera más, los de más caen antes de entrar
  while(kit.alive.length > 8){
    const v = kit.alive[kit.victimIdx()];
    kit.drop(v, true);
    kit.alive = kit.alive.filter(b=>b!==v);
  }
  const libros = kit.alive.map(b=>({
    titulo: b.titulo,
    por: b._owner ? (State.players[b._owner]||'') : (b.traidoPor||''),
    rescued: !!b._rescued,
    tapa: b.portada || '',
  }));
  let html = decodeURIComponent(escape(atob(SESION_HTML)));
  html = html.replace(/const LIBROS = \[[\s\S]*?\];/, 'const LIBROS = ' + JSON.stringify(libros) + ';');

  Sound.stopMusic();
  const wrap = document.createElement('div');
  wrap.id = 'sesionWrap';
  wrap.innerHTML = `<iframe id="sesionFrame" title="La Sesión"></iframe>
    <button id="sesionSalir" title="Abandonar la sesión">✕</button>`;
  document.body.appendChild(wrap);
  const frame = wrap.querySelector('#sesionFrame');
  frame.srcdoc = html;
  wrap.querySelector('#sesionSalir').addEventListener('click', ()=>{
    Sound.fx.click();
    wrap.remove();
    screenGameSelect();
  });
  frame.addEventListener('load', ()=>{
    try{
      frame.contentWindow.addEventListener('sesion:fin', e=>{
        const t = e.detail && e.detail.ganador;
        const winner = kit.alive.find(b=>b.titulo===t) || kit.alive[0];
        wrap.remove();       // antes del reload interno del juego
        kit.alive.filter(b=>b!==winner).forEach(b=>kit.drop(b, true));
        kit.alive = [winner];
        kit.finish(winner);
      });
    }catch(err){ /* si el iframe no coopera, la ✕ sigue siendo la salida */ }
  });
}

/* ============================================================
   🛗 EL ASCENSOR — piso a piso, exceso de peso
   ============================================================ */
async function gameAscensor(){
  const kit = gameKit();
  gameShell('El Ascensor', 'Exceso de peso', 'Un piso, un expulsado. El que llega arriba, se lee.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const total = kit.alive.length;
  const stage = $('#gStage');
  stage.innerHTML = `
    <div class="asc" id="asc">
      <div class="asc-panel">
        <div class="asc-floor" id="ascFloor">PB</div>
        <div class="asc-sign" id="ascSign">EXCESO DE PESO</div>
      </div>
      <div class="asc-shaft">
        <div class="asc-cabin" id="ascCabin">
          <div class="asc-suite"></div>
          <div class="asc-inside" id="ascInside"></div>
          <div class="asc-doors"><div class="asc-door l"></div><div class="asc-door r"></div></div>
        </div>
      </div>
    </div>`;
  const asc = $('#asc'), cabin = $('#ascCabin'), inside = $('#ascInside');
  const items = kit.alive.map(b=>{
    const el = document.createElement('div');
    el.appendChild(miniBook(b, bs(54)));
    inside.appendChild(el);
    return { book:b, el };
  });

  const ding = ()=>{ Sound.tone({freq:1318, dur:.4, type:'sine', vol:.14, wet:.5}); Sound.tone({freq:1046, dur:.5, type:'sine', vol:.1, delay:.18, wet:.5}); };
  const alarm = (n=4)=>{ for(let i=0;i<n;i++){ Sound.tone({freq:820, dur:.16, type:'square', vol:.1, delay:i*.34}); Sound.tone({freq:620, dur:.16, type:'square', vol:.1, delay:i*.34+.17}); } };
  const creak = ()=>Sound.noise({dur:.5, vol:.06, lp:300});

  gBtn('Subir', async function(){
    this.remove();
    // entran los libros
    asc.classList.add('open');
    Sound.fx.whoosh();
    await sleep(1200);
    asc.classList.remove('open');
    await sleep(1100);
    let floor = 0;
    while(kit.alive.length > 1){
      floor++;
      // sube: motor + crujidos, tensión larga
      cabin.classList.add('shaking');
      gSub('El motor cruje…');
      for(let k=0;k<3;k++){ creak(); await sleep(1400 + Math.random()*800); }
      cabin.classList.remove('shaking');
      $('#ascFloor').textContent = 'P'+floor;
      ding();
      await sleep(900);
      // exceso de peso
      $('#ascSign').classList.add('on');
      alarm(5);
      gSub('⚠ EXCESO DE PESO — alguien tiene que bajarse');
      await sleep(2100);
      // suspenso: parpadeo entre candidatos
      const aliveItems = items.filter(x=>!x.out);
      const vIdx = kit.victimIdx(aliveItems.map(x=>x.book));
      let tick = 0; const spins = 8 + Math.floor(Math.random()*5);
      await new Promise(res=>{
        (function step(){
          aliveItems.forEach((x,i)=>x.el.style.filter = i===tick%aliveItems.length ? 'brightness(1.6) drop-shadow(0 0 10px #E04A3A)' : '');
          Sound.fx.tick(tick/(spins+vIdx));
          tick++;
          if(tick < spins*aliveItems.length/aliveItems.length*aliveItems.length && tick % aliveItems.length !== vIdx || tick < spins) setTimeout(step, 160 + tick*24);
          else res();
        })();
      });
      aliveItems.forEach(x=>x.el.style.filter='');
      const victim = aliveItems[vIdx];
      // puertas + eyección
      asc.classList.add('open');
      await sleep(1000);
      victim.el.classList.add('asc-eject');
      victim.out = true;
      Sound.noise({dur:.4, vol:.14, lp:2000, hp:300});
      Sound.tone({freq:220, dur:.5, type:'sine', vol:.14, glideTo:70});
      kit.drop(victim.book, true);
      Sound.fx.drop();
      kit.alive = kit.alive.filter(b=>b!==victim.book);
      gSub(`P${floor}: se baja «${victim.book.titulo}»`);
      $('#ascSign').classList.remove('on');
      await sleep(1600);
      asc.classList.remove('open');
      await sleep(1000);
    }
    // suite presidencial
    cabin.classList.add('shaking');
    for(let k=0;k<2;k++){ creak(); await sleep(1200); }
    cabin.classList.remove('shaking');
    $('#ascFloor').textContent = '👑';
    ding(); ding();
    asc.classList.add('suite','open');
    Sound.fx.fanfare();
    gSub(`🛎 Suite presidencial: «${kit.alive[0].titulo}»`);
    await sleep(2400);
    kit.finish(kit.alive[0]);
  });
}

/* ============================================================
   🧲 LA GARRA — el milagro de feria
   ============================================================ */
async function gameGarra(){
  const kit = gameKit();
  gameShell('La Garra', 'Milagro de feria', 'Agarra, y se le cae. Al que saque, se lee.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const stage = $('#gStage');
  stage.innerHTML = `
    <div class="claw-cab">
      <div class="claw-marquee">★ LA GARRA ★</div>
      <div class="claw-rail"></div>
      <div class="claw-unit" id="clawUnit">
        <div class="claw-cable" id="clawCable"></div>
        <div class="claw-hand" id="clawHand"></div>
      </div>
      <div class="claw-books" id="clawBooks"></div>
      <div class="claw-chute">PREMIO</div>
      <div class="claw-glass"></div>
    </div>`;
  const unit = $('#clawUnit'), cable = $('#clawCable'), hand = $('#clawHand');
  const booksRow = $('#clawBooks');
  const items = kit.alive.map(b=>{
    const m = miniBook(b, bs(58));
    booksRow.appendChild(m);
    return { book:b, el:m };
  });

  const railSound = ()=>Sound.noise({dur:.8, vol:.04, lp:700, hp:150});
  const setClaw = (drop)=>{ cable.style.height = drop+'px'; hand.style.top = drop+'px'; };

  async function attempt(target, willWin){
    // moverse sobre el objetivo
    const cabRect = stage.querySelector('.claw-cab').getBoundingClientRect();
    const r = target.el.getBoundingClientRect();
    unit.style.left = (r.left + r.width/2 - cabRect.left) + 'px';
    railSound();
    await sleep(1100);
    // bajar
    const dropPx = cabRect.height - (r.height + 92);
    setClaw(dropPx);
    Sound.tone({freq:190, dur:.8, type:'triangle', vol:.05, glideTo:120});
    await sleep(1000);
    hand.classList.add('closed');
    Sound.tone({freq:900, dur:.05, type:'square', vol:.09});
    await sleep(350);
    // subir con el libro
    target.el.style.transition = 'transform .9s ease-in-out';
    target.el.style.transform = `translateY(-${dropPx-8}px)`;
    setClaw(26);
    Sound.tone({freq:140, dur:.9, type:'triangle', vol:.05, glideTo:210});
    await sleep(1000);
    if(!willWin){
      // se cae 😭
      await sleep(300 + Math.random()*700);
      hand.classList.remove('closed');
      target.el.style.setProperty('--fall', (dropPx-8)+'px');
      target.el.style.transition = 'none';
      target.el.classList.add('claw-drop');
      Sound.tone({freq:520, dur:.35, type:'sine', vol:.1, glideTo:130});    // womp
      Sound.noise({dur:.18, vol:.1, lp:900, delay:.35});
      gSub(['¡Nooo! Se le cayó…','Tan cerca…','La garra no tiene fuerza.','Clásico de la garra.','Otra moneda…'][Math.floor(Math.random()*5)]);
      await sleep(900);
      target.el.classList.remove('claw-drop');
      target.el.style.transform = '';
      target.el.style.transition = 'transform .2s';
      await sleep(500);
      return false;
    }
    // ¡LO SACÓ! → al premio
    const chute = stage.querySelector('.claw-chute').getBoundingClientRect();
    unit.style.left = (chute.left + chute.width/2 - cabRect.left) + 'px';
    target.el.style.transition = 'transform 1s ease-in-out';
    target.el.style.transform += ` translateX(${chute.left + chute.width/2 - (r.left + r.width/2)}px)`;
    railSound();
    await sleep(1200);
    hand.classList.remove('closed');
    target.el.style.transition = 'transform .5s ease-in';
    target.el.style.transform = target.el.style.transform.replace(/translateY\([^)]*\)/, 'translateY(-40px)');
    Sound.noise({dur:.2, vol:.1, lp:1200});
    await sleep(700);
    return true;
  }

  gBtn('Meter la ficha', async function(){
    this.remove();
    Sound.tone({freq:1200, dur:.06, type:'square', vol:.1});     // ficha
    await sleep(700);
    const winner = kit.alive[kit.victimIdx()];                   // la garra elige (rescatados menos)
    const fails = 10 + Math.floor(Math.random()*3);
    for(let i=0;i<fails;i++){
      const t = items[Math.floor(Math.random()*items.length)];
      await attempt(t, false);
    }
    gSub('…un intento más.');
    await sleep(700);
    const wItem = items.find(x=>x.book===winner);
    await attempt(wItem, true);
    Sound.fx.fanfare();
    gSub(`🧸 ¡PREMIO! Se lee «${winner.titulo}»`);
    items.filter(x=>x.book!==winner).forEach(x=>kit.drop(x.book, true));
    await sleep(2000);
    kit.finish(winner);
  });
}

/* ============================================================
   🚨 LUZ VERDE, LUZ ROJA
   ============================================================ */
async function gameLuzRoja(){
  const kit = gameKit();
  gameShell('Luz Verde, Luz Roja', 'La muñeca mira', 'En roja, frenalos con las teclas. Uno siempre se mueve.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const stage = $('#gStage');
  stage.innerHTML = `
    <div class="lr-field" id="lrField">
      <div class="lr-light" id="lrLight"><i></i><i></i></div>
      <div class="lr-bush"></div>
      <div class="lr-line"></div>
      <div class="lr-doll" id="lrDoll"><span class="head">🙂</span></div>
    </div>`;
  const field = $('#lrField');
  const doll = $('#lrDoll');
  const KEYPOOL = 'ASDFGHJKLQWERTYUIOP'.split('');
  const runners = kit.alive.map((b,i)=>{
    const el = document.createElement('div');
    el.className = 'lr-run walk';
    el.style.top = (38 + i*(52/Math.max(1,kit.alive.length-1)) )+'%';
    el.style.left = '2%';
    const inner = document.createElement('div');
    inner.className = 'rrb-inner';
    inner.appendChild(miniBook(b, bs(46)));
    el.appendChild(inner);
    const keycap = document.createElement('div');
    keycap.className = 'lr-key';
    el.appendChild(keycap);
    field.appendChild(el);
    return { book:b, el, keycap, p:2, dead:false, crossed:false };
  });

  function setLight(g){
    const [gi, ri] = $$('#lrLight i');
    gi.classList.toggle('g', g); ri.classList.toggle('r', !g);
    doll.classList.toggle('watching', !g);
  }
  const shot = (r)=>{
    Sound.noise({dur:.3, vol:.4, lp:1200});
    Sound.tone({freq:80, dur:.4, type:'sine', vol:.35, glideTo:30});
    $('.screen.in') && $('.screen.in').classList.add('shake');
    setTimeout(()=>{ const s=$('.screen.in'); if(s) s.classList.remove('shake'); }, 500);
    r.dead = true;
    r.el.classList.remove('walk');
    r.el.querySelector('.rrb-inner').classList.add('shot');
    r.el.classList.add('rr-book');
    const blood = document.createElement('div'); blood.className='rr-blood'; r.el.appendChild(blood);
    for(let d=0;d<2;d++){ const drip=document.createElement('div'); drip.className='rr-drip'; drip.style.left=(24+Math.random()*50)+'%'; r.el.querySelector('.rrb-inner').appendChild(drip); }
    kit.drop(r.book, true);
  };

  gBtn('Que empiece el juego', async function(){
    this.remove();
    Sound.startMusic('luzroja');
    let winner = null;
    while(!winner){
      // VERDE
      setLight(true);
      gSub('🟢 luz verde…');
      const greenMs = 2600 + Math.random()*2600;
      const t0 = Date.now();
      while(Date.now()-t0 < greenMs){
        runners.forEach(r=>{
          if(r.dead || r.crossed) return;
          r.p += 1.1 + Math.random()*2.4;
          r.el.style.left = Math.min(84, r.p)+'%';
          if(r.p >= 84 && !r.crossed){ r.crossed = true; r.el.classList.remove('walk'); }
        });
        await sleep(320);
      }
      const crossed = runners.find(r=>r.crossed && !r.dead);
      if(crossed){ winner = crossed.book; break; }
      // ROJA
      Sound.stopMusic();
      setLight(false);
      Sound.tone({freq:1400, dur:.12, type:'square', vol:.12});
      const alive = runners.filter(r=>!r.dead && !r.crossed);
      const keys = shuffled(KEYPOOL).slice(0, alive.length);
      const pressed = new Set();
      alive.forEach((r,i)=>{ r.key = keys[i]; r.keycap.textContent = keys[i]; r.keycap.classList.add('show'); r.keycap.classList.remove('ok'); r.el.classList.remove('walk'); });
      gSub('🔴 ¡ROJA! ¡Aprieten las teclas!');
      const onKey = e=>{
        const k = e.key.toUpperCase();
        const r = alive.find(x=>x.key===k);
        if(r && !pressed.has(k)){ pressed.add(k); r.keycap.classList.add('ok'); Sound.fx.click(); }
      };
      document.addEventListener('keydown', onKey);
      await sleep(2300);
      document.removeEventListener('keydown', onKey);
      // uno siempre se mueve "sin querer": preferimos a los que no frenaron
      const loose = alive.filter(r=>!pressed.has(r.key));
      const pool = loose.length ? loose : alive;
      const victim = pool[kit.victimIdx(pool.map(r=>r.book))];
      victim.el.style.left = (parseFloat(victim.el.style.left)+3)+'%';   // el movimiento fatal
      await sleep(450);
      gSub(`«${victim.book.titulo}» se movió…`);
      await sleep(600);
      shot(victim);
      kit.alive = kit.alive.filter(b=>b!==victim.book);
      alive.forEach(r=>r.keycap.classList.remove('show'));
      await sleep(1500);
      const left = runners.filter(r=>!r.dead);
      if(left.length===1){ winner = left[0].book; break; }
      Sound.startMusic('luzroja');
    }
    Sound.stopMusic();
    runners.filter(r=>!r.dead && r.book!==winner).forEach(r=>kit.drop(r.book, true));
    Sound.fx.chosen();
    gSub(`🏁 Sobrevive «${winner.titulo}»`);
    await sleep(1800);
    kit.finish(winner);
  });
}

/* ============================================================
   💣 LA PAPA CALIENTE
   ============================================================ */
async function gamePapa(){
  const kit = gameKit();
  gameShell('La Papa Caliente', 'No la agarres', 'Al que le explota, a la bóveda.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const stage = $('#gStage');
  stage.innerHTML = `<div class="pp-ring" id="ppRing"><div class="pp-bomb" id="ppBomb">💣</div></div>`;
  const ring = $('#ppRing');
  const bomb = $('#ppBomb');

  function layout(){
    $$('.pp-seat', ring).forEach(e=>e.remove());
    const n = kit.alive.length;
    const R = Math.min(170, 80 + n*16);
    ring.style.width = ring.style.height = (R*2+120)+'px';
    return kit.alive.map((b,i)=>{
      const ang = (i/n)*2*Math.PI - Math.PI/2;
      const el = document.createElement('div');
      el.className = 'pp-seat';
      el.style.cssText = `position:absolute;left:calc(50% + ${Math.cos(ang)*R}px);top:calc(50% + ${Math.sin(ang)*R}px);transform:translate(-50%,-50%);`;
      el.appendChild(miniBook(b, bs(56)));
      ring.appendChild(el);
      return { book:b, el };
    });
  }

  gBtn('Encender la mecha', async function(){
    this.remove();
    while(kit.alive.length > 1){
      const seats = layout();
      const fuse = 5000 + Math.random()*7000;
      const t0 = Date.now();
      let hop = 0, delay = 340;
      let holder = Math.floor(Math.random()*seats.length);
      gSub('🔥 la mecha está corta…');
      while(Date.now()-t0 < fuse){
        holder = (holder+1) % seats.length;
        const r = seats[holder].el;
        bomb.style.left = r.style.left; bomb.style.top = r.style.top;
        const p = (Date.now()-t0)/fuse;
        Sound.tone({freq:300+p*500, dur:.05, type:'square', vol:.07+p*.06});
        delay = Math.max(110, 340 - p*240);
        await sleep(delay);
        hop++;
      }
      // BOOM
      const victim = seats[holder];
      const vr = victim.el.getBoundingClientRect();
      ensureColor(victim.book).then(c=>launchConfetti({r:255,g:130,b:40}, (vr.left+28)/innerWidth, (vr.top+28)/innerHeight, 60));
      Sound.noise({dur:.5, vol:.4, lp:900});
      Sound.tone({freq:70, dur:.5, type:'sine', vol:.4, glideTo:28});
      const flash = document.createElement('div');
      flash.className = 'pp-boomflash';
      document.body.appendChild(flash);
      flash.animate([{opacity:1},{opacity:0}],{duration:600,fill:'forwards'});
      setTimeout(()=>flash.remove(), 650);
      $('.screen.in') && $('.screen.in').classList.add('shake');
      setTimeout(()=>{ const s=$('.screen.in'); if(s) s.classList.remove('shake'); }, 550);
      kit.drop(victim.book, true);
      Sound.fx.drop();
      kit.alive = kit.alive.filter(b=>b!==victim.book);
      gSub(`💥 BOOM — «${victim.book.titulo}» voló a la bóveda`);
      await sleep(2000);
      if(kit.alive.length===2) Sound.fx.finalBell();
    }
    layout();
    bomb.remove();
    Sound.fx.chosen();
    gSub(`El último entero: «${kit.alive[0].titulo}»`);
    await sleep(1700);
    kit.finish(kit.alive[0]);
  });
}

/* ============================================================
   🚢 EL NAUFRAGIO — dos salvavidas, dos enamorados
   ============================================================ */
async function gameNaufragio(){
  const kit = gameKit();
  gameShell('El Naufragio', 'Dos salvavidas', `El barco se parte y caen todos al agua. ${escapeHtml(State.players.a)} salva a UNO, ${escapeHtml(State.players.b)} salva a OTRO. Los dos rescatados… se enamoran. Y se leen.`);
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const stage = $('#gStage');
  stage.innerHTML = `
    <div class="nf-sea" id="nfSea">
      <div class="nf-stars"></div><div class="nf-moon"></div>
      <div class="nf-ship" id="nfShip">
        <div class="nf-hull"></div><div class="nf-deck"></div>
        <div class="nf-chim" style="left:30%;"></div><div class="nf-chim" style="left:48%;"></div><div class="nf-chim" style="left:66%;"></div>
      </div>
      <div class="nf-water"><div class="nf-wave"></div></div>
    </div>`;
  const sea = $('#nfSea');
  let saved = [];

  gBtn('Zarpar', async function(){
    this.remove();
    gSub('Una noche tranquila en el mar…');
    await sleep(2400);
    // CRUJIDO — se hunde
    Sound.noise({dur:1.2, vol:.2, lp:400});
    Sound.tone({freq:90, dur:1.4, type:'sawtooth', vol:.12, glideTo:40, wet:.4});
    $('.screen.in') && $('.screen.in').classList.add('shake');
    gSub('💥 ¡EL BARCO SE PARTE!');
    $('#nfShip').classList.add('sink');
    await sleep(900);
    const s = $('.screen.in'); if(s) s.classList.remove('shake');
    // los libros caen al agua y se ahogan
    const seaRect = sea.getBoundingClientRect();
    const swimmers = kit.alive.map((b,i)=>{
      const el = document.createElement('div');
      el.className = 'nf-book drowning';
      el.style.left = (10 + i*(76/Math.max(1,kit.alive.length-1)))+'%';
      el.style.top = '30%';
      const inner = document.createElement('div');
      inner.className = 'rrb-inner';
      inner.appendChild(miniBook(b, bs(46)));
      el.appendChild(inner);
      el.insertAdjacentHTML('beforeend','<span class="glub">💧</span>');
      sea.appendChild(el);
      requestAnimationFrame(()=>{ el.style.top = (56 + Math.random()*16)+'%'; });
      return { book:b, el, saved:false };
    });
    for(let k=0;k<6;k++){ Sound.noise({dur:.2, vol:.08, lp:1800, hp:300, delay:k*.3}); }   // chapoteo
    await sleep(2200);
    gSub('Se están ahogando…');
    await sleep(1400);

    // turnos de salvataje
    for(const who of shuffled(['a','b'])){
      $('#gEyebrow').innerHTML = `🛟 <b style="color:${PLAYER_COLOR[who]}">${escapeHtml(State.players[who])}</b>: tirá tu salvavidas — tocá al que salvás`;
      gSub('Solo podés salvar a UNO.');
      const pick = await new Promise(res=>{
        swimmers.forEach(sw=>{
          if(sw.saved) return;
          sw.el.style.cursor = 'pointer';
          sw.el.onclick = ()=>res(sw);
        });
      });
      swimmers.forEach(sw=>{ sw.el.onclick=null; sw.el.style.cursor=''; });
      pick.saved = true;
      saved.push(pick);
      // el salvavidas vuela
      const ring = document.createElement('div');
      ring.className = 'nf-ring';
      ring.style.left = '46%'; ring.style.top = '10%';
      sea.appendChild(ring);
      Sound.fx.whoosh();
      await sleep(80);
      ring.style.transition = '.8s cubic-bezier(.4,0,.7,1)';
      ring.style.left = pick.el.style.left;
      ring.style.top = pick.el.style.top;
      await sleep(850);
      Sound.noise({dur:.25, vol:.12, lp:1600, hp:300});
      pick.el.classList.remove('drowning');
      pick.el.classList.add('saved');
      pick.el.style.top = '40%';
      Sound.fx.rescue();
      gSub(`«${pick.book.titulo}» está a salvo 🛟`);
      await sleep(1400);
    }

    // los demás se hunden
    gSub('El mar reclama al resto…');
    for(const sw of swimmers.filter(x=>!x.saved)){
      sw.el.classList.remove('drowning');
      sw.el.classList.add('gone');
      Sound.tone({freq:200, dur:.9, type:'sine', vol:.08, glideTo:60, wet:.5});
      stampCosecha(sw.book);
      kit.drop(sw.book, true);
      await sleep(700);
    }
    await sleep(1400);

    // LA POSE EN LA PROA 💚
    const [A, B] = saved.map(x=>x.book);
    sea.insertAdjacentHTML('beforeend', `<div class="nf-prow" id="nfProw"></div>`);
    const prow = $('#nfProw');
    saved.forEach(sw=>{ sw.el.remove(); prow.appendChild(miniBook(sw.book, bs(64))); });
    for(let h=0;h<7;h++){
      const heart = document.createElement('div');
      heart.className = 'nf-hearts';
      heart.textContent = '💚';
      heart.style.left = (38 + Math.random()*24)+'%';
      heart.style.top = (28 + Math.random()*20)+'%';
      heart.style.animationDelay = (Math.random()*1.6)+'s';
      sea.appendChild(heart);
    }
    // melodía romántica de flauta
    [64,67,72, 71,67, 69,71,72].forEach((n,i)=>Sound.tone({freq:NOTE(n+12), dur:.55, type:'sine', vol:.06, delay:i*.5, wet:.8, detune:6}));
    $('#gEyebrow').textContent = '💚 Jack y Rose';
    gSub(`«${A.titulo}» y «${B.titulo}» se enamoraron en la proa. Se leen los dos.`);
    await sleep(4200);
    Sound.stopMusic();
    saved.forEach(sw=>{ sw.book._metodo = 'El Naufragio'; sw.book._empate = true; });
    vsCelebrate([A, B]);   // doble lectura, como el empate de honor
  });
}

/* ============================================================
   🎈 EL GLOBO — lastre a dedo, por turnos
   ============================================================ */
async function gameGlobo(){
  const kit = gameKit();
  gameShell('El Globo', 'Emergencia aeronáutica', 'Por turnos, tiren lastre. El último a bordo aterriza.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const stage = $('#gStage');
  stage.innerHTML = `
    <div class="gb-sky" id="gbSky">
      <div class="gb-cloud" style="top:14%;animation-duration:26s;"></div>
      <div class="gb-cloud" style="top:34%;animation-duration:38s;animation-delay:-14s;transform:scale(.7);"></div>
      <div class="gb-alt" id="gbAlt">2.400 m</div>
      <div class="gb-balloon" id="gbBalloon">
        <div class="gb-env"></div>
        <div class="gb-basket" id="gbBasket"></div>
      </div>
      <div class="gb-ground" id="gbGround"></div>
    </div>`;
  const balloon = $('#gbBalloon'), basket = $('#gbBasket'), altEl = $('#gbAlt'), ground = $('#gbGround');
  let alt = 2400;
  const items = kit.alive.map(b=>{
    const m = miniBook(b, bs(44));
    m.title = b.titulo;
    basket.appendChild(m);
    return { book:b, el:m };
  });
  const setAlt = v=>{
    alt = v;
    altEl.textContent = Math.max(0, Math.round(alt)).toLocaleString('es-AR')+' m';
    altEl.classList.toggle('low', alt < 700);
    balloon.style.top = (36 + (2400-alt)/2400*180)+'px';
    ground.style.bottom = (-40 + (2400-alt)/2400*46)+'px';
  };
  const beep = ()=>{ Sound.tone({freq:980, dur:.12, type:'square', vol:.09}); Sound.tone({freq:980, dur:.12, type:'square', vol:.09, delay:.2}); };

  gBtn('Despegar', async function(){
    this.remove();
    let turn = Math.random()<0.5 ? 'a' : 'b';
    while(kit.alive.length > 1){
      // el globo cae, alarma
      gSub('El globo pierde altura…');
      for(let k=0;k<4;k++){ setAlt(alt - (180+Math.random()*160)); if(alt<900) beep(); Sound.noise({dur:.5, vol:.03, lp:800, hp:200}); await sleep(900); }
      $('#gEyebrow').innerHTML = `🎈 <b style="color:${PLAYER_COLOR[turn]}">${escapeHtml(State.players[turn])}</b>: tirá un lastre — tocá el libro que sacrificás`;
      gSub('Sin culpa. Bueno, con un poco.');
      const pick = await new Promise(res=>{
        items.forEach(it=>{ if(!it.out) it.el.onclick = ()=>res(it); });
      });
      items.forEach(it=>it.el.onclick=null);
      // confirmación cortita
      const ok = await new Promise(res=>{
        const ov = overlay(`<div class="ov-pop center">
          <div class="eyebrow" style="color:${PLAYER_COLOR[turn]}">¿Lo tirás?</div>
          <div class="serif" style="font-size:24px;font-weight:700;max-width:400px;">«${escapeHtml(pick.book.titulo)}» al vacío</div>
          <div class="row mt-m">
            <button class="btn btn-ghost" data-esc id="gbNo">No puedo</button>
            <button class="btn btn-danger" data-enter id="gbYes">Chau chau</button>
          </div></div>`);
        $('#gbNo', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); res(false); });
        $('#gbYes', ov).addEventListener('click', ()=>{ closeOverlay(ov); res(true); });
      });
      if(!ok) continue;   // mismo turno elige de nuevo
      pick.out = true;
      pick.el.classList.add('gb-toss');
      Sound.noise({dur:.9, vol:.08, lp:2200, hp:500, sweepTo:400});
      Sound.tone({freq:600, dur:1.1, type:'sine', vol:.06, glideTo:120});
      stampCosecha(pick.book);
      kit.drop(pick.book, true);
      Sound.fx.drop();
      kit.alive = kit.alive.filter(b=>b!==pick.book);
      gSub(`«${pick.book.titulo}» es lastre. El globo respira.`);
      setAlt(Math.min(2400, alt + 600));
      await sleep(1600);
      pick.el.remove();
      turn = other(turn);
    }
    // aterrizaje suave
    $('#gEyebrow').textContent = '🎈 Aterrizaje';
    gSub('El globo baja despacio, con un solo pasajero…');
    for(let k=0;k<4;k++){ setAlt(alt*0.55); await sleep(1000); }
    setAlt(0);
    Sound.fx.chosen();
    [72,76,79].forEach((n,i)=>Sound.tone({freq:NOTE(n), dur:.5, type:'sine', vol:.06, delay:i*.3, wet:.6}));   // pajaritos
    gSub(`🌿 Aterrizó «${kit.alive[0].titulo}». Se lee.`);
    await sleep(2200);
    kit.finish(kit.alive[0]);
  });
}

/* ============================================================
   🕯️ LA SESIÓN DE ESPIRITISMO — terror y ouija
   ============================================================ */
async function gameEspiritismo(){
  const kit = gameKit();
  gameShell('La Sesión', 'No enciendan la luz', 'Uno se queda. Los demás ya no están solos.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  Sound.stopMusic();

  const esp = document.createElement('div');
  esp.className = 'esp';
  esp.innerHTML = `
    <div class="esp-frost"></div>
    <div class="esp-table" id="espTable">
      <div class="esp-candle"><div class="esp-flame" id="espFlame"></div><div class="esp-wax"></div></div>
    </div>
    <div class="esp-whisper" id="espWhisper"></div>`;
  document.body.appendChild(esp);
  requestAnimationFrame(()=>esp.classList.add('on'));

  const breath = ()=>{ Sound.noise({dur:1.6, vol:.05, lp:600, hp:120, wet:.5}); Sound.noise({dur:1.1, vol:.03, lp:500, hp:150, delay:1.9}); };
  const whisper = async (txt, ms=2600)=>{
    const w = $('#espWhisper', esp);
    w.textContent = txt;
    w.classList.add('on');
    Sound.noise({dur:1.4, vol:.03, lp:3000, hp:1200, wet:.8});
    await sleep(ms);
    w.classList.remove('on');
    await sleep(600);
  };

  breath(); const breathIv = setInterval(breath, 3400);
  await sleep(2600);

  // los libros aparecen en círculo, cada uno con su velita
  const table = $('#espTable', esp);
  const R = table.clientWidth/2 * 0.72;
  const seats = kit.alive.map((b,i)=>{
    const ang = (i/kit.alive.length)*2*Math.PI - Math.PI/2;
    const el = document.createElement('div');
    el.className = 'esp-book';
    el.style.left = `calc(50% + ${Math.cos(ang)*R}px)`;
    el.style.top = `calc(50% + ${Math.sin(ang)*R}px)`;
    el.style.transform = 'translate(-50%,-50%)';
    el.style.opacity = '0';
    const inner = document.createElement('div');
    inner.className = 'rrb-inner';
    inner.appendChild(miniBook(b, bs(48)));
    el.appendChild(inner);
    el.insertAdjacentHTML('beforeend','<div class="esp-mini-candle"></div>');
    table.appendChild(el);
    setTimeout(()=>{ el.style.transition='opacity 1.6s'; el.style.opacity='1'; }, 400+i*350);
    return { book:b, el, dead:false };
  });
  await sleep(kit.alive.length*350 + 2000);
  await whisper('«Los hemos traído… Ahora, uno debe quedarse.»', 3400);

  const LAMENTOS = ['«Ayúdanos»','«No nos dejes ir»','«Él viene»','«Hace tanto frío»','«¿Por qué nosotros?»'];
  const hiss = ()=>Sound.noise({dur:.4, vol:.12, hp:2500, lp:9000});
  const moan = ()=>Sound.tone({freq:90, dur:1.6, type:'sawtooth', vol:.09, glideTo:55, wet:.7});
  const scream = ()=>{ Sound.tone({freq:1600, dur:.7, type:'sawtooth', vol:.1, glideTo:900, wet:.6}); Sound.noise({dur:.7, vol:.12, hp:1800, lp:8000}); };

  while(kit.alive.length > 1){
    await sleep(1800 + Math.random()*1800);
    const alive = seats.filter(s=>!s.dead);
    const victim = alive[kit.victimIdx(alive.map(s=>s.book))];
    const evento = 1 + Math.floor(Math.random()*3);
    if(evento===1){
      // LA POSESIÓN: vibra, brota alquitrán, la vela se apaga
      victim.el.classList.add('poss');
      Sound.noise({dur:2, vol:.08, lp:220});
      await sleep(2000);
      for(let d=0; d<3; d++){
        const tar = document.createElement('div');
        tar.className = 'esp-tar';
        tar.style.left = (20+Math.random()*56)+'%';
        tar.style.animationDelay = (d*.3)+'s';
        victim.el.querySelector('.rrb-inner').appendChild(tar);
      }
      await sleep(1400);
      victim.el.classList.add('out'); hiss();
      await sleep(600);
      victim.el.classList.remove('poss');
      victim.el.classList.add('esp-swallow');
    } else if(evento===2){
      // LA GARRA: la mano esquelética
      $('#espFlame', esp).style.opacity = '.4';
      const hand = document.createElement('div');
      hand.className = 'esp-hand';
      hand.innerHTML = `<svg viewBox="0 0 120 60"><g fill="none" stroke="#B9C8D4" stroke-width="4" stroke-linecap="round" opacity=".85">
        <path d="M0 34 L58 30"/><path d="M58 30 L86 12"/><path d="M58 30 L96 22"/><path d="M58 30 L100 34"/><path d="M58 30 L92 46"/>
        <path d="M20 30 l4 8 M34 29 l4 8" stroke-width="2" opacity=".5"/></g></svg>`;
      const vr = victim.el.getBoundingClientRect();
      hand.style.left = '-140px';
      hand.style.top = (vr.top + vr.height/2 - esp.getBoundingClientRect().top - 24)+'px';
      esp.appendChild(hand);
      hand.animate([{left:'-140px',opacity:0},{left:(vr.left-60)+'px',opacity:1}],{duration:420, easing:'cubic-bezier(.3,0,.7,1)', fill:'forwards'});
      moan(); hiss();
      await sleep(500);
      victim.el.classList.add('out');
      victim.el.animate([{transform:'translate(-50%,-50%)',filter:'blur(0)'},{transform:'translate(-320%,-50%)',filter:'blur(4px)',opacity:0}],{duration:380, easing:'ease-in', fill:'forwards'});
      hand.animate([{left:(vr.left-60)+'px'},{left:'-160px'}],{duration:420, delay:200, fill:'forwards'});
      await sleep(900);
      hand.remove();
      $('#espFlame', esp).style.opacity = '1';
    } else {
      // EL ROSTRO: la cara gritando en la tapa
      const face = document.createElement('div');
      face.className = 'esp-face';
      victim.el.querySelector('.rrb-inner').appendChild(face);
      face.classList.add('show');
      scream();
      await sleep(900);
      sparkleAt(innerWidth/2, innerHeight/2, 6);
      victim.el.classList.add('out','esp-swallow');
    }
    victim.dead = true;
    kit.drop(victim.book, true);
    kit.alive = kit.alive.filter(b=>b!==victim.book);
    await sleep(1200);
    if(kit.alive.length > 1 && Math.random()<0.8) await whisper(LAMENTOS[Math.floor(Math.random()*LAMENTOS.length)]);
  }

  // LA OUIJA deletrea al ganador
  clearInterval(breathIv);
  const winner = kit.alive[0];
  await whisper('«El espíritu va a nombrar… al elegido.»', 3000);
  esp.querySelector('.esp-table').style.display = 'none';
  const ouija = document.createElement('div');
  ouija.className = 'esp-ouija';
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  ouija.innerHTML = `<div class="esp-letters">${LETTERS.map(l=>`<span data-l="${l}">${l}</span>`).join('')}</div>
    <div class="esp-plank" id="espPlank" style="left:45%;top:40%;"></div>
    <div class="esp-spell" id="espSpell"></div>`;
  esp.insertBefore(ouija, esp.querySelector('.esp-whisper'));
  await sleep(1200);
  const word = winner.titulo.toUpperCase().replace(/[^A-ZÑ]/g,'').slice(0,10).replace(/Ñ/g,'N');
  const plank = $('#espPlank', esp);
  for(const ch of word){
    const span = ouija.querySelector(`[data-l="${ch}"]`);
    if(!span) continue;
    const or = ouija.getBoundingClientRect(), sr = span.getBoundingClientRect();
    plank.style.left = (sr.left - or.left + sr.width/2 - 26)+'px';
    plank.style.top = (sr.top - or.top + sr.height/2 - 26)+'px';
    Sound.noise({dur:.3, vol:.05, lp:500});
    await sleep(620);
    span.classList.add('hot');
    Sound.tone({freq:520, dur:.2, type:'sine', vol:.06, wet:.7});
    $('#espSpell', esp).textContent += ch;
    await sleep(280);
  }
  await sleep(1000);
  await whisper(`«${winner.titulo}». Ahora, VÁYANSE.`, 3200);
  esp.classList.remove('on');
  await sleep(1800);
  esp.remove();
  kit.finish(winner);
}

/* ============================================================
   👽 LA ABDUCCIÓN — los seres superiores eligen
   ============================================================ */
async function gameAbduccion(){
  const kit = gameKit();
  gameShell('La Abducción', 'Criterio superior', 'Al que se lleva el platillo, se lee.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const stage = $('#gStage');
  stage.innerHTML = `
    <div class="ab-field" id="abField">
      <div class="ab-stars"></div><div class="ab-moon"></div>
      <div class="ab-grass"></div>
      <div class="ab-ufo" id="abUfo">
        <div class="ab-dome"></div>
        <div class="ab-disc"><i></i><i></i><i></i></div>
        <div class="ab-beam"></div>
      </div>
    </div>`;
  const field = $('#abField'), ufo = $('#abUfo');
  const seats = kit.alive.map((b,i)=>{
    const el = document.createElement('div');
    el.className = 'ab-book';
    el.style.left = (8 + i*(80/Math.max(1,kit.alive.length-1)))+'%';
    el.style.animationDelay = (Math.random()*2)+'s';
    el.appendChild(miniBook(b, bs(48)));
    field.appendChild(el);
    return { book:b, el };
  });

  gBtn('Mirar el cielo', async function(){
    this.remove();
    gSub('Una noche cualquiera en el campo…');
    await sleep(2000);
    // entra el platillo
    ufo.style.left = '38%';
    Sound.tone({freq:180, dur:2.4, type:'sawtooth', vol:.05, glideTo:240, wet:.6});
    gSub('…o no.');
    await sleep(2200);
    // duda: sobrevuela varios con amagues de rayo
    const winner = kit.alive[kit.victimIdx()];
    const wSeat = seats.find(s=>s.book===winner);
    const fakeouts = 3 + Math.floor(Math.random()*3);
    for(let k=0; k<fakeouts; k++){
      const t = seats[Math.floor(Math.random()*seats.length)];
      const x = parseFloat(t.el.style.left);
      ufo.style.left = `calc(${x}% - 30px)`;
      Sound.fx.tickFinal(1);
      await sleep(1300);
      ufo.classList.add('beaming');
      Sound.tone({freq:300, dur:.8, type:'sine', vol:.05, glideTo:420, wet:.6});
      await sleep(800 + Math.random()*700);
      ufo.classList.remove('beaming');   // …mmm no.
      gSub(['Mmm… no.','Lo está dudando…','Escaneando…','Ese no pasa el filtro.'][Math.floor(Math.random()*4)]);
      await sleep(700);
    }
    // EL ELEGIDO
    const wx = parseFloat(wSeat.el.style.left);
    ufo.style.left = `calc(${wx}% - 30px)`;
    await sleep(1300);
    ufo.classList.add('beaming');
    Sound.tone({freq:260, dur:2.6, type:'sine', vol:.08, glideTo:640, wet:.7});
    gSub('…');
    await sleep(1000);
    wSeat.el.classList.add('ab-rise');
    Sound.fx.rescue();
    await sleep(2400);
    ufo.classList.remove('beaming');
    ufo.classList.add('gone');
    Sound.noise({dur:.7, vol:.1, lp:4000, hp:600, sweepTo:8000});
    seats.filter(s=>s.book!==winner).forEach(s=>{ stampCosecha(s.book); kit.drop(s.book, true); });
    $('#gEyebrow').textContent = '👽 Veredicto superior';
    gSub(`Se llevaron a «${winner.titulo}». Los seres superiores leen mejor. Se lee.`);
    Sound.fx.chosen();
    await sleep(2600);
    kit.finish(winner);
  });
}

/* ============================================================
   🎯 EL DARDO DEL DESTINO — un tiro, un destino
   ============================================================ */
async function gameDardo(){
  const kit = gameKit();
  gameShell('El Dardo del Destino', 'Un tiro', 'El pulso tiembla. Donde clava, se lee.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const stage = $('#gStage');
  stage.innerHTML = `
    <div class="dd-wrap">
      <div class="dd-board" id="ddBoard"></div>
      <div class="dd-cross" id="ddCross" style="left:50%;top:50%;"></div>
      <div class="dd-dart" id="ddDart">🎯</div>
    </div>`;
  const board = $('#ddBoard');
  const seats = kit.alive.map(b=>{
    const pin = document.createElement('div');
    pin.className = 'dd-pin';
    pin.appendChild(miniBook(b, bs(62)));
    board.appendChild(pin);
    return { book:b, el:pin };
  });

  gBtn('Tirar el dardo', async function(){
    this.remove();
    Sound.startMusic('dardo');
    const cross = $('#ddCross');
    const wrap = stage.querySelector('.dd-wrap').getBoundingClientRect();
    const winner = kit.alive[kit.victimIdx()];
    const wSeat = seats.find(s=>s.book===winner);
    const target = ()=>{ const r = wSeat.el.getBoundingClientRect(); return { x:r.left + r.width/2 - wrap.left, y:r.top + r.height/2 - wrap.top }; };
    // el pulso: 10 segundos de temblor que converge
    gSub('Respirá. Apuntá. No mires a los ojos de los libros.');
    const t0 = Date.now(), DUR = 9500;
    while(Date.now()-t0 < DUR){
      const p = (Date.now()-t0)/DUR;
      const any = seats[Math.floor(Math.random()*seats.length)].el.getBoundingClientRect();
      const tgt = target();
      const jx = (any.left + any.width/2 - wrap.left)*(1-p) + tgt.x*p + (Math.random()-.5)*90*(1-p);
      const jy = (any.top + any.height/2 - wrap.top)*(1-p) + tgt.y*p + (Math.random()-.5)*70*(1-p);
      cross.style.left = jx+'px'; cross.style.top = jy+'px';
      if(Math.random()<.3) Sound.fx.tickFinal(Math.floor(p*3));
      if(p>.8) gSub('…');
      await sleep(190 - p*80);
    }
    Sound.stopMusic();
    // EL TIRO
    const tgt = target();
    const dart = $('#ddDart');
    dart.style.left = tgt.x+'px'; dart.style.top = tgt.y+'px';
    Sound.noise({dur:.3, vol:.14, lp:3000, hp:700, sweepTo:500});
    dart.classList.add('fly');
    await sleep(500);
    dart.classList.remove('fly'); dart.classList.add('stuck');
    dart.style.opacity = '1';
    Sound.tone({freq:180, dur:.1, type:'square', vol:.2});          // THUNK
    Sound.noise({dur:.12, vol:.12, lp:1500});
    cross.remove();
    $('.screen.in') && $('.screen.in').classList.add('shake');
    setTimeout(()=>{ const s=$('.screen.in'); if(s) s.classList.remove('shake'); }, 400);
    seats.filter(s=>s.book!==winner).forEach(s=>{ stampCosecha(s.book); kit.drop(s.book, true); });
    gSub(`🎯 Clavado en «${winner.titulo}». Un tiro, un destino.`);
    Sound.fx.chosen();
    await sleep(2200);
    kit.finish(winner);
  });
}
