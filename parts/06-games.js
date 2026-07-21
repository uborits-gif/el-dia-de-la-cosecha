
/* ============================================================
   LOS MINIJUEGOS — selector + framework + bandas sonoras
   Cada juego recibe los finalistas y termina llamando kit.finish(ganador).
   Los eliminados van a la bóveda vía kit.drop(libro).
   ============================================================ */

/* ---------- framework compartido ---------- */
const TRAY_HTML = `<div class="fallen-tray" id="fallenTray">
  <div class="ft-label">la bóveda recibe</div>
  <div class="ft-spines" id="ftSpines"></div>
</div>`;

function gameKit(){
  const kit = {
    alive: State.finalists.slice(),
    fell: [],
    drop(book, silent){
      sendToVault(book);
      kit.fell.push(book.id);
      if(!silent) Sound.fx.drop();
      const trayEl = $('#fallenTray');
      if(trayEl){
        trayEl.classList.add('on');
        ensureColor(book).then(c=>{
          const sp = document.createElement('div');
          sp.className = 'ft-spine';
          sp.title = book.titulo;
          sp.style.background = `linear-gradient(90deg, color-mix(in srgb, ${c.css} 70%, black), ${c.css})`;
          const s = $('#ftSpines'); if(s) s.appendChild(sp);
        });
      }
    },
    revive(book){
      State.vault = State.vault.filter(b=>b.id!==book.id);
      kit.fell = kit.fell.filter(id=>id!==book.id);
      kit.alive.push(book);
    },
    /* índice de víctima con peso (rescatado cae más fácil; el amuleto cubre) */
    victimIdx(list){
      const arr = list || kit.alive;
      const w = arr.map(pesoCaida);
      const tot = w.reduce((a,b)=>a+b,0);
      let r = Math.random()*tot;
      for(let i=0;i<arr.length;i++){ r-=w[i]; if(r<=0) return i; }
      return arr.length-1;
    },
    /* libros de un jugador (para los duelos) */
    ownedBy(p){ return kit.alive.filter(b=>b._owner===p); },
    finish(winner){
      Sound.stopMusic();
      celebrate(winner, kit.fell);
    },
  };
  return kit;
}

/* cabecera común de juego */
function gameShell(eyebrow, title, sub){
  return show(`
    <div class="center" style="min-height:92vh;justify-content:center;position:relative;">
      <div class="eyebrow" id="gEyebrow">${eyebrow}</div>
      <h2 class="serif" id="gTitle" style="font-weight:700;font-size:clamp(22px,3.5vw,34px);margin:0 0 8px;">${title}</h2>
      <p class="lead" id="gSub" style="margin:auto;min-height:1.5em;">${sub}</p>
      <div id="gStage" class="g-stage"></div>
      <div id="gControls" class="row mt-m"></div>
      ${TRAY_HTML}
    </div>
  `);
}
function gSub(txt){ const el=$('#gSub'); if(el) el.textContent = txt; }
function gBtn(label, fn, cls='btn-amber'){
  const b = document.createElement('button');
  b.className = 'btn '+cls;
  b.textContent = label;
  b.addEventListener('click', fn);
  $('#gControls').appendChild(b);
  return b;
}

/* mini ruleta: resalta en ciclo y elige uno (rescatados caen más fácil) */
async function miniRoulette(books, title, sub=''){
  const ov = overlay(`
    <div class="ov-pop center" style="max-width:600px;">
      <div class="eyebrow" style="color:#E8C34A;">${title}</div>
      ${sub?`<p class="lead" style="font-size:13px;margin-top:4px;">${sub}</p>`:''}
      <div class="row mt-m" id="mrRow" style="gap:20px;"></div>
    </div>`);
  const row = $('#mrRow', ov);
  const cards = books.map(b=>{
    const holder = document.createElement('div');
    holder.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px;border-radius:12px;transition:.2s;';
    holder.appendChild(miniBook(b, bs(76)));
    const lab = document.createElement('div');
    lab.className = 'mp-lab';
    lab.textContent = b.titulo.length>16 ? b.titulo.slice(0,15)+'…' : b.titulo;
    holder.appendChild(lab);
    row.appendChild(holder);
    return holder;
  });
  await sleep(600);
  const w = books.map(pesoCaida);
  const tot = w.reduce((a,b)=>a+b,0);
  let r = Math.random()*tot, idx = w.length-1;
  for(let i=0;i<w.length;i++){ r-=w[i]; if(r<=0){ idx=i; break; } }
  const n = books.length;
  const total = (2 + Math.floor(Math.random()*2))*n + idx + 1;
  let tick = 0;
  await new Promise(res=>{
    (function step(){
      cards.forEach((c,i)=>{
        c.style.background = i===tick%n ? 'rgba(232,195,74,.15)' : '';
        c.style.transform = i===tick%n ? 'translateY(-5px)' : '';
      });
      Sound.fx.tick(tick/total);
      tick++;
      if(tick<total) setTimeout(step, 70 + Math.pow(tick/total,2.5)*280);
      else res();
    })();
  });
  Sound.fx.chosen();
  const rc = cards[idx].getBoundingClientRect();
  sparkleAt(rc.left+rc.width/2, rc.top+rc.height/2, 7);
  await sleep(1300);
  closeOverlay(ov);
  return books[idx];
}

/* anuncio gigante */
async function bigAnnounce(html, ms=2100){
  const ov = overlay(`<div class="hum-slide"><div class="hum-big">${html}</div></div>`);
  ov.style.background = 'rgba(4,8,4,.95)';
  Sound.fx.finalBell();
  await sleep(ms);
  closeOverlay(ov);
}

/* mini libro plano para tableros (barato y clickeable) */
function miniBook(book, size=54){
  const el = bookEl(book, {size, still:true, tilt:false, baseY:0});
  el.classList.add('mini-book');
  return el;
}

/* ============================================================
   BANDAS SONORAS (secuenciador synth) — una por juego
   ============================================================ */
const NOTE = m => 440*Math.pow(2,(m-69)/12);
(function definePatterns(){
  const T = (o)=>Sound.tone(o), X = (o)=>Sound.noise(o);
  /* lobby del selector: vibráfono relajado */
  Sound.PATTERNS.lobby = { bpm:96, play(s,t){
    const seq=[60,64,67,71, 59,62,67,70, 57,60,64,69, 55,59,62,67];
    if(s%2===0) T({freq:NOTE(seq[(s/2)%16]), at:t, dur:.5, type:'sine', vol:.06, wet:.6});
    if(s%8===0) T({freq:NOTE(36+[0,-2,-4,-5][(s/8)%4]), at:t, dur:.9, type:'triangle', vol:.07});
  }};
  /* rueda de la fortuna: show televisivo */
  Sound.PATTERNS.fortuna = { bpm:128, play(s,t){
    const bass=[36,43,41,43];
    T({freq:NOTE(bass[s%4]+12), at:t, dur:.12, type:'triangle', vol:.1});
    if(s%2===1) X({at:t, dur:.03, vol:.045, hp:7000, lp:12000});
    const stab=[[60,64,67],[59,62,67]][Math.floor(s/8)%2];
    if(s%8===4) stab.forEach(n=>T({freq:NOTE(n+12), at:t, dur:.14, type:'square', vol:.035, wet:.4}));
  }};
  /* bolillero: cumbia de tómbola */
  Sound.PATTERNS.bolillero = { bpm:112, play(s,t){
    const bass=[38,45,36,43];
    if(s%2===0) T({freq:NOTE(bass[(s/2)%4]), at:t, dur:.16, type:'triangle', vol:.12});
    if(s%2===1) [62,65,69].forEach(n=>T({freq:NOTE(n), at:t, dur:.09, type:'sawtooth', vol:.02, wet:.3}));
    if(s%4===2) X({at:t, dur:.05, vol:.05, hp:3000, lp:9000});
  }};
  /* plinko: marimba juguetona */
  Sound.PATTERNS.plinko = { bpm:120, play(s,t){
    const pent=[60,62,65,67,70,72,74,77];
    if(s%2===0) T({freq:NOTE(pent[Math.floor(Math.random()*8)]), at:t, dur:.18, type:'sine', vol:.05, wet:.5});
    if(s%4===0) T({freq:NOTE(41), at:t, dur:.18, type:'sine', vol:.09, glideTo:NOTE(36)});
  }};
  /* carrera: galope */
  Sound.PATTERNS.carrera = { bpm:150, play(s,t){
    const g=[36,36,43,36,36,41];
    T({freq:NOTE(g[s%6]), at:t, dur:.08, type:'triangle', vol:.1});
    if(s%12===0) [64,67,72].forEach((n,i)=>T({freq:NOTE(n), at:t+i*.04, dur:.1, type:'square', vol:.03}));
    if(s%6===3) X({at:t, dur:.04, vol:.04, hp:5000, lp:10000});
  }};
  /* ruleta rusa: western de mediodía */
  Sound.PATTERNS.rusa = { bpm:86, play(s,t){
    const g=[33,33,40,33];
    if(s%2===0) T({freq:NOTE(g[(s/2)%4]), at:t, dur:.24, type:'triangle', vol:.1});
    if(s%4===2) X({at:t, dur:.1, vol:.035, lp:2200, hp:900});             // maraca
    const whistle=[76,79,76,74, 72,74,76,71];                              // silbido del duelo
    if(s%32<8 && s%4===0){
      const n = whistle[(Math.floor(s/4))%8];
      T({freq:NOTE(n), at:t, dur:1.1, type:'sine', vol:.05, wet:.85, detune:6});
      T({freq:NOTE(n), at:t, dur:1.1, type:'sine', vol:.03, wet:.85, detune:-7});
    }
    if(s%32===20) [52,55,59].forEach(n=>T({freq:NOTE(n), at:t, dur:1.4, type:'sawtooth', vol:.025, wet:.6}));
    if(s%16===14) T({freq:NOTE(45), at:t, dur:.5, type:'sine', vol:.05, wet:.7, glideTo:NOTE(44)});
  }};
  /* tateti: chiptune alegre */
  Sound.PATTERNS.tateti = { bpm:132, play(s,t){
    const mel=[72,74,76,72, 76,74,72,69, 71,72,74,71, 67,69,71,67];
    T({freq:NOTE(mel[s%16]), at:t, dur:.09, type:'square', vol:.035});
    if(s%4===0) T({freq:NOTE(48+[0,-3,-5,-7][(s/4)%4]), at:t, dur:.2, type:'triangle', vol:.08});
  }};
  /* shifumi: dojo pentatónico */
  Sound.PATTERNS.shifumi = { bpm:100, play(s,t){
    if(s%8===0||s%8===3) T({freq:NOTE(38), at:t, dur:.3, type:'sine', vol:.13, glideTo:NOTE(36)});
    const pent=[62,64,67,69,74];
    if(s%8===6) T({freq:NOTE(pent[Math.floor(s/8)%5]+12), at:t, dur:.3, type:'triangle', vol:.05, wet:.5});
  }};
  /* cinchada: hemencia de puerto */
  Sound.PATTERNS.cinchada = { bpm:116, play(s,t){
    T({freq:NOTE([36,48][s%2]), at:t, dur:.14, type:'triangle', vol:s%2?.05:.12});
    if(s%8===4) X({at:t, dur:.09, vol:.08, lp:2500, hp:600});
    const horn=[55,55,58,60];
    if(s%16===8) T({freq:NOTE(horn[Math.floor(s/16)%4]), at:t, dur:.5, type:'sawtooth', vol:.04, wet:.4});
  }};
  /* vasitos: pizzicato sospechoso */
  Sound.PATTERNS.vasitos = { bpm:108, play(s,t){
    const walk=[45,48,51,52, 51,48,45,43];
    if(s%2===0) T({freq:NOTE(walk[(s/2)%8]), at:t, dur:.12, type:'triangle', vol:.1});
    if(s%8===7) T({freq:NOTE(69), at:t, dur:.06, type:'sine', vol:.05, wet:.6});
  }};
  /* bola 8: pad místico */
  Sound.PATTERNS.bola8 = { bpm:60, play(s,t){
    if(s%8===0) [57,60,64].forEach(n=>T({freq:NOTE(n), at:t, dur:3.4, type:'sine', vol:.035, wet:.8}));
    if(s%8===4) T({freq:NOTE(76), at:t, dur:1.2, type:'sine', vol:.025, wet:.9, detune:8});
    if(s%16===12) X({at:t, dur:1.2, vol:.015, hp:8000, lp:14000, wet:.8});
  }};
  /* cartas del caos: casino nocturno */
  Sound.PATTERNS.cartas = { bpm:104, play(s,t){
    const walk=[41,45,48,50, 48,45,41,38];
    if(s%2===0) T({freq:NOTE(walk[(s/2)%8]), at:t, dur:.2, type:'triangle', vol:.1});
    X({at:t, dur:.05, vol:.02, hp:6000, lp:11000});
    if(s%16===14) [65,69,72].forEach(n=>T({freq:NOTE(n), at:t, dur:.3, type:'sine', vol:.03, wet:.6}));
  }};
  /* microondas: bossa de ascensor + zumbido */
  Sound.PATTERNS.micro = { bpm:118, play(s,t){
    T({freq:60, at:t, dur:.26, type:'sawtooth', vol:.018});  // zumbido eléctrico
    const arp=[[48,60,64,67],[46,58,62,65]][Math.floor(s/16)%2];
    if(s%2===0) T({freq:NOTE(arp[(s/2)%4]+12), at:t, dur:.16, type:'sine', vol:.045, wet:.4});
    if(s%8===0) T({freq:NOTE(36), at:t, dur:.2, type:'triangle', vol:.08});
  }};
  /* circo de la humillación */
  Sound.PATTERNS.circo = { bpm:140, play(s,t){
    T({freq:NOTE([36,48,43,48][s%4]), at:t, dur:.11, type:'triangle', vol:.1});
    const mel=[72,71,72,74, 76,74,72,71, 69,71,72,69, 67,64,67,60];
    T({freq:NOTE(mel[s%16]), at:t, dur:.1, type:'square', vol:.04});
  }};
})();

/* ============================================================
   REGISTRO + SELECTOR
   ============================================================ */
const LOCK_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor"
  d="M12 2a5 5 0 0 1 5 5v2h.5A2.5 2.5 0 0 1 20 11.5v8A2.5 2.5 0 0 1 17.5 22h-11A2.5 2.5 0 0 1 4 19.5v-8A2.5 2.5 0 0 1 6.5 9H7V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v2h6V7a3 3 0 0 0-3-3Zm0 10.5a1.6 1.6 0 0 0-.8 3v1.3a.8.8 0 0 0 1.6 0v-1.3a1.6 1.6 0 0 0-.8-3Z"/></svg>`;

/* el ícono del juego: la ilustración propia si la tiene; si no, el emoji */
function gameIcon(g){
  const img = (typeof GAME_IMG !== 'undefined') && GAME_IMG[g.id];
  return img ? `<img class="gt-img" src="data:image/webp;base64,${img}" alt="">` : g.icon;
}

const GAMES = [
  { id:'ruleta',    icon:'🎡', name:'La Ruleta Clásica',      desc:'La de siempre: la rueda mata de a uno.',         run:()=>screenRoulette() },
  { id:'fortuna',   icon:'🎰', name:'La Rueda de la Fortuna', desc:'Una sola girada. Un solo destino.',              run:()=>gameFortuna() },
  { id:'bolillero', icon:'🎟️', name:'El Bolillero',           desc:'Bolilla que sale, libro que cae.',               run:()=>gameBolillero() },
  { id:'plinko',    icon:'🪙', name:'Plinko',                 desc:'La ficha rebota. El libro paga.',                run:()=>gamePlinko() },
  { id:'carrera',   icon:'🏁', name:'La Gran Carrera',        desc:'El primero en llegar, se lee.',                  run:()=>gameCarrera() },
  { id:'rusa',      icon:'🔫', name:'Ruleta Rusa',            desc:'Click. Click. BANG.',                            run:()=>gameRusa() },
  { id:'tateti',    icon:'⭕', name:'Ta-Te-Ti Mortal',        desc:'Ganás la partida, bajás un libro.',              run:()=>gameTateti() },
  { id:'shifumi',   icon:'✂️', name:'Piedra, Papel o Libro',  desc:'Perdés la mano, perdés un libro.',               run:()=>gameShifumi() },
  { id:'cinchada',  icon:'🪢', name:'Tira la Soga',           desc:'El que arrasa, saca.',                           run:()=>gameSoga() },
  { id:'vasitos',   icon:'🥤', name:'Los Vasitos',            desc:'Eliminás sin saber qué eliminás.',               run:()=>gameVasitos() },
  { id:'bola8',     icon:'🎱', name:'La Bola 8',              desc:'El oráculo no apela.',                           run:()=>gameBola8() },
  { id:'cartas',    icon:'🃏', name:'Cartas del Caos',        desc:'La ruleta, con trampa.',                         run:()=>gameCartas() },
  { id:'micro',     icon:'♨️', name:'El Microondas del Terror', desc:'Sobrevive el que no explota.',                 run:()=>gameMicro() },
  { id:'eligeA',    icon:'👸', name:'Elige Maru',             desc:'Maru decide. Uri paga.',                         run:()=>gameElige('a') },
  { id:'eligeB',    icon:'🤴', name:'Elige Uri',              desc:'Uri decide. Maru paga.',                         run:()=>gameElige('b') },
  /* — todavía en el taller: se ven, no se juegan — */
  { id:'ascensor',  icon:'🛗', name:'El Ascensor',            desc:'Piso por piso, alguien se baja.',       wip:true, run:()=>gameAscensor() },
  { id:'garra',     icon:'🧲', name:'La Garra',               desc:'El milagro de la feria.',               wip:true, run:()=>gameGarra() },
  { id:'luzroja',   icon:'🚨', name:'Luz Verde, Luz Roja',    desc:'El que se mueve, no vuelve.',           wip:true, run:()=>gameLuzRoja() },
  { id:'papa',      icon:'💣', name:'La Papa Caliente',       desc:'La mecha corre. Vos rezá.',             wip:true, run:()=>gamePapa() },
  { id:'naufragio', icon:'🚢', name:'El Naufragio',           desc:'Dos salvavidas para diez.',             wip:true, run:()=>gameNaufragio() },
  { id:'globo',     icon:'🎈', name:'El Globo',               desc:'Alguien tiene que pesar menos.',        wip:true, run:()=>gameGlobo() },
  { id:'espiritismo',icon:'🕯️', name:'La Sesión',             desc:'Que lo elijan los muertos.',            run:()=>gameSesion() },
  { id:'ovni',      icon:'👽', name:'La Abducción',           desc:'Al que se llevan, se lee.',             wip:true, run:()=>gameAbduccion() },
  { id:'dardo',     icon:'🎯', name:'El Dardo del Destino',   desc:'Un tiro. Sin apelación.',               wip:true, run:()=>gameDardo() },
];

function screenGameSelect(){
  Flow.set(5);
  App.ambient('rgba(201,248,57,.05)', 'rgba(50,24,60,.4)');
  Sound.startMusic('lobby');
  show(`
    <div class="eyebrow">Los finalistas están listos</div>
    <h1 class="title" style="font-size:clamp(30px,5vw,50px);">¿Cómo se decide hoy?</h1>
    <p class="lead mt-s">A dedo, o <b>Sorpresa</b> y que el azar elija cómo elige.</p>
    <div class="game-grid mt-l" id="gameGrid"></div>
    <div class="row mt-l">
      <button class="btn btn-amber" id="surpriseBtn">🎲 Sorpresa</button>
    </div>
  `);
  const grid = $('#gameGrid');
  GAMES.forEach((g,i)=>{
    const tile = document.createElement('div');
    tile.className = 'game-tile' + (g.wip ? ' wip' : '');
    tile.style.setProperty('--i', i);
    tile.innerHTML = `<div class="gt-icon">${gameIcon(g)}</div>
      <div class="gt-name">${g.name}</div>
      <div class="gt-desc">${g.desc}</div>
      ${g.wip ? `<div class="gt-lock" title="Todavía en el taller">${LOCK_SVG}</div>` : ''}`;
    if(!g.wip) tile.addEventListener('click', ()=>{ if(!grid._spinning) launchGame(g, tile); });
    grid.appendChild(tile);
  });

  $('#surpriseBtn').addEventListener('click', ()=>{
    if(grid._spinning) return;
    grid._spinning = true;
    $('#surpriseBtn').disabled = true;
    // la sorpresa sólo recorre los que se pueden jugar: nunca cae en uno con candado
    const todas = $$('.game-tile', grid);
    const libres = GAMES.map((g,i)=>({ g, tile:todas[i] })).filter(x=>!x.g.wip);
    const target = Math.floor(Math.random()*libres.length);
    const loops = 2 + Math.floor(Math.random()*2);
    const total = loops*libres.length + target + 1;
    let tick = 0;
    (function step(){
      libres.forEach(x=>x.tile.classList.remove('lit'));
      const cur = tick % libres.length;
      libres[cur].tile.classList.add('lit');
      Sound.fx.tick(tick/total);
      tick++;
      if(tick < total){
        const p = tick/total;
        setTimeout(step, 55 + Math.pow(p,2.6)*300);
      } else {
        const { g, tile } = libres[cur];
        tile.classList.add('chosen');
        Sound.fx.chosen();
        const r = tile.getBoundingClientRect();
        sparkleAt(r.left+r.width/2, r.top+r.height/2, 8);
        setTimeout(()=>launchGame(g, tile), 1200);
      }
    })();
  });
}

let currentGame = null;   // el método que se está jugando (para "volver a jugar")
function launchGame(g, tile){
  currentGame = g;
  Sound.stopMusic();
  Sound.fx.click();
  if(tile) tile.classList.add('chosen');
  setTimeout(()=>{
    if(Sound.PATTERNS[g.id]) Sound.startMusic(g.id);
    g.run();
  }, 350);
}

/* después de "Volver a jugar": repetir el mismo método o elegir otro */
function offerReplay(){
  App.ambient('rgba(201,248,57,.05)', 'rgba(50,24,60,.4)');
  const g = currentGame;
  const ov = overlay(`
    <div class="ov-pop center" style="max-width:500px;">
      <div class="eyebrow">Otra vuelta</div>
      <h2 class="serif" style="font-size:28px;font-weight:700;margin:4px 0 0;">¿Cómo seguimos?</h2>
      <p class="lead" style="font-size:14px;margin-top:10px;">Los ${State.finalists.length} finalistas vuelven a estar en pie.</p>
      <div class="row mt-m" style="flex-direction:column;align-items:stretch;">
        ${g?`<button class="btn btn-amber" id="orAgain" data-enter>${g.icon} Volver a jugar «${escapeHtml(g.name)}»</button>`:''}
        <button class="btn btn-ghost" id="orOther" ${g?'':'data-enter'}>Elegir otro método</button>
      </div>
    </div>`);
  if(g) $('#orAgain', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); launchGame(g); });
  $('#orOther', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); screenGameSelect(); });
}

/* ============================================================
   🎰 LA RUEDA DE LA FORTUNA — una girada, gana el señalado
   ============================================================ */
async function gameFortuna(){
  const kit = gameKit();
  gameShell('La Rueda de la Fortuna', 'Girá y rezá', 'Una vuelta. El puntero corona.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));

  const S = Math.min(520, Math.floor(innerWidth*0.86));
  const cv = document.createElement('canvas');
  cv.width = S*2; cv.height = S*2;              // retina
  cv.style.cssText = `width:${S}px;height:${S}px;display:block;`;
  // marquesina: el aro de lucecitas alrededor de la rueda
  const wrap = document.createElement('div');
  wrap.className = 'fort-wrap';
  wrap.style.cssText = `position:relative;width:${S+58}px;height:${S+58}px;display:flex;align-items:center;justify-content:center;`;
  const luces = document.createElement('div');
  luces.className = 'fort-lights';
  for(let i=0;i<20;i++){
    const l = document.createElement('i');
    l.style.setProperty('--a', (i/20*360)+'deg');
    l.style.setProperty('--r', (S/2+22)+'px');
    l.style.setProperty('--i', i);
    luces.appendChild(l);
  }
  const ptr = document.createElement('div');
  ptr.className = 'wheel-pointer';
  wrap.append(luces, cv, ptr);
  $('#gStage').style.position = 'relative';
  $('#gStage').appendChild(wrap);
  const ctx = cv.getContext('2d');

  // sectores con peso (rescatado más chico)
  const weights = kit.alive.map(b=> b._rescued ? 0.55 : 1);
  const totW = weights.reduce((a,b)=>a+b,0);
  const arcs = [];
  let acc = 0;
  kit.alive.forEach((b,i)=>{
    const a0 = acc/totW*Math.PI*2;
    acc += weights[i];
    arcs.push({ book:b, a0, a1: acc/totW*Math.PI*2 });
  });

  let angle = Math.random()*Math.PI*2;
  let vel = 0, spinning = false, lastIdx = -1;

  function sectorAt(pointerAng){
    // puntero arriba (-90°): qué sector queda bajo él
    const a = ((-Math.PI/2 - pointerAng) % (Math.PI*2) + Math.PI*2) % (Math.PI*2);
    return arcs.findIndex(s=> a>=s.a0 && a<s.a1);
  }

  function draw(){
    const R = S; // en px retina el radio es S (mitad de 2S)
    ctx.clearRect(0,0,S*2,S*2);
    ctx.save();
    ctx.translate(S,S);
    ctx.rotate(angle);
    arcs.forEach((s)=>{
      const c = s.book._color || {r:120,g:120,b:120};
      // sector con profundidad: oscuro al eje, color pleno, más vivo en el borde
      const g = ctx.createRadialGradient(0,0,R*0.1, 0,0,R-10);
      g.addColorStop(0, `rgb(${Math.max(0,c.r-55)},${Math.max(0,c.g-55)},${Math.max(0,c.b-55)})`);
      g.addColorStop(0.65, `rgb(${c.r},${c.g},${c.b})`);
      g.addColorStop(1, `rgb(${Math.min(255,c.r+42)},${Math.min(255,c.g+42)},${Math.min(255,c.b+42)})`);
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.arc(0,0,R-10, s.a0, s.a1);
      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();
      // separadores dorados finitos
      ctx.strokeStyle = 'rgba(232,195,74,.75)';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      // etiqueta radial: brutalista, ancha, con sombra
      const mid = (s.a0+s.a1)/2;
      ctx.save();
      ctx.rotate(mid);
      ctx.translate(R*0.58, 0);
      ctx.rotate(Math.abs(((mid+angle)%(2*Math.PI)))>Math.PI/2 && Math.abs(((mid+angle)%(2*Math.PI)))<Math.PI*1.5 ? Math.PI : 0);
      const lum = 0.299*c.r+0.587*c.g+0.114*c.b;
      ctx.font = `900 ${Math.max(19, S*0.062)}px sztos-variable, Inter, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      let t = s.book.titulo.toUpperCase();
      if(t.length>14) t = t.slice(0,13)+'…';
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillText(t, 1.5, 2.5);
      ctx.fillStyle = lum>150 ? 'rgba(10,15,10,.92)' : 'rgba(255,255,255,.96)';
      ctx.fillText(t, 0, 0);
      ctx.restore();
    });
    // llanta dorada doble, de feria
    ctx.beginPath(); ctx.arc(0,0,R-7,0,Math.PI*2);
    ctx.strokeStyle = '#E8C34A'; ctx.lineWidth = 9; ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,R-16,0,Math.PI*2);
    ctx.strokeStyle = 'rgba(10,18,9,.55)'; ctx.lineWidth = 3; ctx.stroke();
    // eje central dorado
    ctx.beginPath(); ctx.arc(0,0,S*0.085,0,Math.PI*2);
    ctx.fillStyle = '#E8C34A'; ctx.fill();
    ctx.beginPath(); ctx.arc(0,0,S*0.058,0,Math.PI*2);
    ctx.fillStyle = '#0A1209'; ctx.fill();
    ctx.beginPath(); ctx.arc(0,0,S*0.02,0,Math.PI*2);
    ctx.fillStyle = '#F2F5EC'; ctx.fill();
    ctx.restore();
  }
  draw();

  const btn = gBtn('Girar la rueda', ()=>{
    if(spinning) return;
    spinning = true; btn.disabled = true;
    luces.classList.add('spin');       // las lucecitas se vuelven locas
    Sound.fx.click();
    vel = 0.26 + Math.random()*0.14;
    gSub('…');
    (function frame(){
      angle += vel;
      vel *= 0.9915;
      const idx = sectorAt(angle);
      if(idx !== lastIdx){ Sound.fx.tick(Math.min(1, 1-vel*3)); lastIdx = idx; }
      draw();
      if(vel > 0.0016){ requestAnimationFrame(frame); }
      else {
        luces.classList.remove('spin');
        const win = arcs[sectorAt(angle)].book;
        gSub(`La rueda habló: «${win.titulo}»`);
        Sound.fx.chosen();
        setTimeout(()=>kit.finish(win), 1400);
      }
    })();
  });
}

/* ============================================================
   🎟️ EL BOLILLERO — bolillas que salen, libros que caen
   ============================================================ */
async function gameBolillero(){
  const kit = gameKit();
  gameShell('El Bolillero', 'Quiniela literaria', 'La que sale, cae. La última adentro, se lee.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));

  const S = Math.min(440, Math.floor(innerWidth*0.8));
  const cv = document.createElement('canvas');
  cv.width = S*2; cv.height = S*2;
  cv.style.cssText = `width:${S}px;height:${S}px;`;
  $('#gStage').appendChild(cv);
  const ctx = cv.getContext('2d');
  const CX = S, CY = S, CAGE = S*0.82;

  let balls = kit.alive.map((b,i)=>({
    book:b, n:i+1,
    x:CX+(Math.random()-.5)*CAGE, y:CY+(Math.random()-.5)*CAGE,
    vx:(Math.random()-.5)*7, vy:(Math.random()-.5)*7,
    r:S*0.085, out:false, ox:0, oy:0,
  }));
  let stir = 1, drawing = null, running = true;

  function physics(){
    balls.forEach(p=>{
      if(p.out) return;
      p.vy += 0.16;
      if(stir>0){ p.vx += (Math.random()-.5)*stir; p.vy += (Math.random()-.5)*stir; }
      p.x += p.vx; p.y += p.vy;
      const dx=p.x-CX, dy=p.y-CY, d=Math.hypot(dx,dy);
      if(d > CAGE-p.r){
        const nx=dx/d, ny=dy/d;
        p.x = CX+nx*(CAGE-p.r); p.y = CY+ny*(CAGE-p.r);
        const dot = p.vx*nx+p.vy*ny;
        p.vx -= 1.75*dot*nx; p.vy -= 1.75*dot*ny;
        p.vx += -ny*1.6; p.vy += nx*1.6;  // la jaula arrastra
        if(Math.random()<0.12) Sound.fx.tick(Math.random()*.4);
      }
    });
  }
  function render(){
    ctx.clearRect(0,0,S*2,S*2);
    const t = performance.now();
    // jaula dorada de bronce, con alambres que giran
    ctx.beginPath(); ctx.arc(CX,CY,CAGE+6,0,Math.PI*2);
    ctx.strokeStyle='rgba(232,195,74,.75)'; ctx.lineWidth=7; ctx.stroke();
    ctx.beginPath(); ctx.arc(CX,CY,CAGE+14,0,Math.PI*2);
    ctx.strokeStyle='rgba(232,195,74,.18)'; ctx.lineWidth=2.5; ctx.stroke();
    for(let k=0;k<8;k++){
      ctx.beginPath();
      ctx.ellipse(CX,CY,CAGE+6,(CAGE+6)*Math.abs(Math.cos(k/8*Math.PI + t/(stir>1?260:900))),k/8*Math.PI,0,Math.PI*2);
      ctx.strokeStyle='rgba(232,195,74,.10)'; ctx.lineWidth=2; ctx.stroke();
    }
    // el eje y la manivela, girando con la agitada
    const giro = t/(stir>1?120:600);
    ctx.save();
    ctx.translate(CX+CAGE+26, CY);
    ctx.rotate(giro);
    ctx.strokeStyle='#E8C34A'; ctx.lineWidth=8; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-S*0.11); ctx.lineTo(S*0.07,-S*0.11); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,10,0,Math.PI*2); ctx.fillStyle='#E8C34A'; ctx.fill();
    ctx.restore();
    balls.forEach(p=>{
      if(p.out) return;
      const c = p.book._color || {r:150,g:150,b:150};
      const g = ctx.createRadialGradient(p.x-p.r*.35,p.y-p.r*.35,p.r*.1, p.x,p.y,p.r);
      g.addColorStop(0,`rgb(${Math.min(255,c.r+70)},${Math.min(255,c.g+70)},${Math.min(255,c.b+70)})`);
      g.addColorStop(1,`rgb(${c.r},${c.g},${c.b})`);
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=g; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*.55,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,.88)'; ctx.fill();
      ctx.fillStyle='#0A1209';
      ctx.font=`700 ${p.r*.7}px Inter`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(p.n, p.x, p.y+1);
    });
  }
  (function loop(){
    if(!running) return;
    physics(); render();
    requestAnimationFrame(loop);
  })();

  async function drawBall(){
    const quedan = balls.filter(p=>!p.out).length;
    stir = 2.6;                      // agita fuerte
    gSub(quedan===2 ? 'Quedan DOS. La manivela tiembla…' : 'Girando el bolillero…');
    await sleep(quedan===2 ? 3400 : 2600);
    stir = 0.4;
    // redoble antes de que escupa la bolilla
    for(let i=0;i<12;i++){ Sound.fx.tick(i/12); await sleep(55 + i*16); }
    const inside = balls.filter(p=>!p.out);
    const idx = kit.victimIdx(inside.map(p=>p.book));
    const chosen = inside[idx];
    // succión: la bolilla viaja al tubo (abajo a la derecha)
    const tx = CX+CAGE*0.95, ty = CY+CAGE*0.95;
    for(let k=0;k<26;k++){
      chosen.x += (tx-chosen.x)*0.22;
      chosen.y += (ty-chosen.y)*0.22;
      chosen.vx = chosen.vy = 0;
      await sleep(26);
    }
    chosen.out = true;
    kit.drop(chosen.book);
    gSub(`Salió la ${chosen.n}: «${chosen.book.titulo}» → a la bóveda`);
    await sleep(1900);
    const left = balls.filter(p=>!p.out);
    if(left.length === 1){
      stir = 0;
      gSub(`¡Queda una sola bolilla! «${left[0].book.titulo}»`);
      Sound.fx.chosen();
      await sleep(1600);
      running = false;
      kit.finish(left[0].book);
    } else {
      drawBall();
    }
  }
  gBtn('Arrancar el sorteo', function once(){ this.remove(); drawBall(); });
}

/* ============================================================
   🪙 PLINKO — la ficha rebota y elimina
   ============================================================ */
async function gamePlinko(){
  const kit = gameKit();
  gameShell('Plinko', 'La ficha decide', 'Donde cae la ficha, cae un libro.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));

  const W = Math.min(560, Math.floor(innerWidth*0.88)), H = 470;
  const cv = document.createElement('canvas');
  cv.width = W*2; cv.height = H*2;
  cv.style.cssText = `width:${W}px;height:${H}px;`;
  $('#gStage').appendChild(cv);
  const ctx = cv.getContext('2d');
  ctx.scale(2,2);

  const ROWS = 8, PR = 4.5, CHIP = 9;
  const pegs = [];
  const top = 46, bottom = H-64;
  for(let r=0;r<ROWS;r++){
    const y = top + (bottom-top-40)*(r/(ROWS-1));
    const n = 9 + (r%2);
    for(let i=0;i<n;i++){
      const x = (W/(n+1))*(i+1) + (r%2? 0 : W/(n+1)/2 - W/(n+1)/2);
      pegs.push({x: (W/(n+1))*(i+1), y});
    }
  }
  let slots = kit.alive.slice();  // ranuras vivas
  let chip = null, running = true, busy = false;

  function slotAt(x){
    const sw = W/slots.length;
    return Math.max(0, Math.min(slots.length-1, Math.floor(x/sw)));
  }
  function render(){
    ctx.clearRect(0,0,W,H);
    // clavos dorados con halo
    pegs.forEach(p=>{
      ctx.beginPath(); ctx.arc(p.x,p.y,PR*2.2,0,Math.PI*2);
      ctx.fillStyle='rgba(232,195,74,.10)'; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x,p.y,PR,0,Math.PI*2);
      ctx.fillStyle='#E8C34A'; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x-1,p.y-1,PR*0.4,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,.75)'; ctx.fill();
    });
    // canastas: copas con labio dorado y tipografía ancha
    const sw = W/slots.length;
    slots.forEach((b,i)=>{
      const c = b._color || {r:120,g:120,b:120};
      const x = i*sw+3, y = H-48, w = sw-6, h = 42;
      const g = ctx.createLinearGradient(0,y,0,y+h);
      g.addColorStop(0, `rgb(${Math.min(255,c.r+48)},${Math.min(255,c.g+48)},${Math.min(255,c.b+48)})`);
      g.addColorStop(1, `rgb(${Math.max(0,c.r-38)},${Math.max(0,c.g-38)},${Math.max(0,c.b-38)})`);
      ctx.beginPath(); ctx.roundRect(x, y, w, h, [3,3,10,10]);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.stroke();
      // el labio dorado de la copa
      ctx.fillStyle = '#E8C34A';
      ctx.beginPath(); ctx.roundRect(x-1, y-3.5, w+2, 4, 2); ctx.fill();
      const lum = 0.299*c.r+0.587*c.g+0.114*c.b;
      ctx.font = '800 10.5px sztos-variable, Inter';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      let t = b.titulo.toUpperCase();
      if(t.length>Math.floor(sw/6.4)) t = t.slice(0, Math.floor(sw/6.4)-1)+'…';
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.fillText(t, i*sw+sw/2+1, H-26);
      ctx.fillStyle = lum>150 ? 'rgba(10,15,10,.92)' : 'rgba(255,255,255,.95)';
      ctx.fillText(t, i*sw+sw/2, H-27);
    });
    if(chip){
      ctx.beginPath(); ctx.arc(chip.x,chip.y,CHIP,0,Math.PI*2);
      const g=ctx.createRadialGradient(chip.x-3,chip.y-3,1,chip.x,chip.y,CHIP);
      g.addColorStop(0,'#DFFF7A'); g.addColorStop(1,'#C9F839');
      ctx.fillStyle=g; ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,.4)'; ctx.stroke();
    }
  }
  (function loop(){
    if(!running) return;
    if(chip){
      chip.vy += 0.22;
      chip.x += chip.vx; chip.y += chip.vy;
      if(chip.x<CHIP){ chip.x=CHIP; chip.vx*=-0.7; }
      if(chip.x>W-CHIP){ chip.x=W-CHIP; chip.vx*=-0.7; }
      pegs.forEach(p=>{
        const dx=chip.x-p.x, dy=chip.y-p.y, d=Math.hypot(dx,dy);
        if(d < CHIP+PR){
          const nx=dx/d, ny=dy/d;
          chip.x = p.x+nx*(CHIP+PR); chip.y = p.y+ny*(CHIP+PR);
          const dot = chip.vx*nx+chip.vy*ny;
          chip.vx -= 1.6*dot*nx; chip.vy -= 1.6*dot*ny;
          chip.vx += (Math.random()-.5)*1.4;
          Sound.tone({freq:600+Math.random()*500, dur:.04, type:'sine', vol:.05});
        }
      });
      if(chip.y > H-52){
        const i = slotAt(chip.x);
        const victim = slots[i];
        chip = null;
        onLand(victim);
      }
    }
    render();
    requestAnimationFrame(loop);
  })();

  async function onLand(victim){
    kit.drop(victim);
    gSub(`La ficha entró en «${victim.titulo}» → a la bóveda`);
    slots = slots.filter(b=>b!==victim);
    await sleep(1500);
    if(slots.length===1){
      gSub(`¡Sobrevive «${slots[0].titulo}»!`);
      Sound.fx.chosen();
      await sleep(1300);
      running = false;
      kit.finish(slots[0]);
    } else {
      busy = false;
      dropBtn.disabled = false;
      gSub('Otra ficha…');
    }
  }
  const dropBtn = gBtn('Soltar la ficha', async ()=>{
    if(busy || chip) return;
    busy = true; dropBtn.disabled = true;
    Sound.fx.click();
    // las canastas se barajan ANTES de cada ficha, a la vista
    gSub('🔀 Mezclando las canastas…');
    for(let k=0; k<5; k++){
      slots = shuffled(slots);
      Sound.noise({dur:.08, vol:.05, lp:3200, hp:800});
      await sleep(130);
    }
    gSub('Ahí van. Soltando…');
    await sleep(450);
    chip = { x: W/2 + (Math.random()-.5)*60, y: 14, vx:(Math.random()-.5)*1.6, vy:0 };
  });
}

/* ============================================================
   🏁 LA GRAN CARRERA — larga, sucia, infartante
   ============================================================ */
async function gameCarrera(){
  const kit = gameKit();
  gameShell('La Gran Carrera', 'Gran Premio de la Bóveda', 'Larga y sucia. El primero en la meta, se lee.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));

  const stage = $('#gStage');
  stage.innerHTML = `
    <div class="race-lights" id="raceLights"><i></i><i></i><i></i></div>
    <div class="race-caller serif" id="raceCaller">Los motores calientan…</div>
    <div class="race-track" id="raceTrack"></div>`;
  const track = $('#raceTrack');
  const caller = $('#raceCaller');

  const racers = kit.alive.map((b)=>{
    const lane = document.createElement('div');
    lane.className = 'race-lane';
    const c = b._color || {r:130,g:130,b:130};
    lane.innerHTML = `
      <div class="rl-pos">–</div>
      <div class="rl-main">
        <div class="rl-name">${escapeHtml(b.titulo)}${b._rescued?' <span style="color:var(--grey);font-size:9px;">⛏</span>':''}</div>
        <div class="rl-bar">
          <div class="rl-trail" style="background:rgb(${c.r},${c.g},${c.b});"></div>
          <div class="rl-runner"></div>
        </div>
      </div>`;
    const runner = lane.querySelector('.rl-runner');
    if(b.portada){
      const img = document.createElement('img');
      img.src = b.portada;
      img.onerror = ()=>{ img.remove(); runner.style.background = `rgb(${c.r},${c.g},${c.b})`; };
      runner.appendChild(img);
    } else runner.style.background = `rgb(${c.r},${c.g},${c.b})`;
    track.appendChild(lane);
    return { book:b, p:0, lane, runner, trail:lane.querySelector('.rl-trail'), pos:lane.querySelector('.rl-pos') };
  });

  const short = t => t.length>20 ? t.slice(0,19)+'…' : t;
  const LINES = [
    p=>`¡Se despega «${p}»!`,
    p=>`«${p}» tropieza con una nota al pie…`,
    p=>`¡«${p}» viene por afuera!`,
    p=>`«${p}» pide agua. No hay.`,
    p=>`¡Qué remontada de «${p}»!`,
    p=>`«${p}» perdió el señalador. Igual sigue.`,
    p=>`«${p}» va leyendo mientras corre. Peligroso.`,
    p=>`La tribuna corea a «${p}».`,
    p=>`«${p}» dobló mal en una curva que no existe.`,
    p=>`«${p}» negocia con su editor en plena recta.`,
    p=>`Spoiler: «${p}» no aflojó.`,
  ];
  let lineAt = 0;
  function sayLine(txt, force){
    const now = Date.now();
    if(!force && now - lineAt < 1700) return;
    lineAt = now;
    caller.textContent = txt;
  }

  let iv = null, stretch = false, prevLeader = null;
  const said = {};

  function paint(){
    racers.forEach(r=>{
      const f = (Math.min(100, r.p)/100).toFixed(4);
      r.runner.style.left = `calc((100% - 52px) * ${f})`;
      r.trail.style.width = `calc((100% - 52px) * ${f} + 14px)`;
    });
    const now = racers.slice().sort((a,b)=>b.p-a.p);
    now.forEach((r,i)=>{
      r.pos.textContent = (i+1)+'°';
      r.pos.classList.toggle('p1', i===0);
    });
    return now;
  }

  function step(){
    const sorted = racers.slice().sort((a,b)=>b.p-a.p);
    racers.forEach(r=>{
      let adv = Math.random()*1.15;
      if(Math.random()<0.04) adv += 3.2 + Math.random()*3.8;                       // arranque heroico
      if(Math.random()<0.03 && r.p>8){ adv -= 2.4; sayLine(`«${short(r.book.titulo)}» se tropieza…`); }
      if(r.book._rescued) adv *= 0.86;
      if(r===sorted[0]) adv *= stretch ? 0.68 : 0.8;                               // el líder se cansa
      if(r===sorted[sorted.length-1]) adv *= 1.25;                                 // el último se inspira
      if(stretch) adv *= 0.52;                                                     // última recta: agonía
      r.p = Math.max(0, Math.min(100, r.p + adv));
    });
    const now = paint();
    const lead = now[0];

    if(prevLeader && lead!==prevLeader && lead.p>6) sayLine(`¡«${short(lead.book.titulo)}» toma la punta!`, true);
    prevLeader = lead;
    [20,40,60,75].forEach(m=>{
      if(lead.p>=m && !said[m]){ said[m]=true; sayLine(LINES[Math.floor(Math.random()*LINES.length)](short(lead.book.titulo))); }
    });
    if(Math.random()<0.05){
      const any = racers[Math.floor(Math.random()*racers.length)];
      sayLine(LINES[Math.floor(Math.random()*LINES.length)](short(any.book.titulo)));
    }
    if(!stretch && lead.p>=84){
      stretch = true;
      caller.classList.add('hot');
      sayLine('¡¡ÚLTIMA RECTA!! ¡Esto se define por una página!', true);
      Sound.fx.riser(1.4);
      clearInterval(iv);
      iv = setInterval(step, 210);
      return;
    }
    if(stretch){
      if(Math.random()<0.55) Sound.noise({dur:.24, vol:.028 + Math.min(.05,(lead.p-84)*.004), lp:3400, hp:300});
      if(now[1] && lead.p - now[1].p < 2.5 && lead.p > 92 && !said.ff){
        said.ff = true;
        sayLine('¡¡FOTO FINISH!! ¡NO SE LO CUENTEN A NADIE!', true);
      }
    } else if(Math.random()<0.12) Sound.noise({dur:.3, vol:.018, lp:3000, hp:400});

    const winner = now.find(r=>r.p>=100);
    if(winner){
      clearInterval(iv);
      racers.forEach(r=>r.lane.classList.remove('go'));
      caller.classList.remove('hot');
      caller.textContent = `🏁 ¡GANA «${winner.book.titulo}»!`;
      winner.lane.classList.add('rl-win');
      Sound.fx.chosen();
      Sound.noise({dur:1.3, vol:.09, lp:4200, hp:300, wet:.4});
      setTimeout(()=>kit.finish(winner.book), 2400);
    }
  }

  gBtn('¡A sus marcas!', async function(){
    this.remove();
    const lights = $$('#raceLights i');
    caller.textContent = 'A sus marcas…';
    await sleep(900);
    lights[0].classList.add('red'); Sound.tone({freq:440, dur:.24, type:'square', vol:.1});
    caller.textContent = 'Listos…';
    await sleep(900);
    lights[1].classList.add('red'); Sound.tone({freq:440, dur:.24, type:'square', vol:.1});
    await sleep(900 + Math.random()*900);
    lights.forEach(l=>{ l.classList.remove('red'); l.classList.add('green'); });
    Sound.tone({freq:660, dur:.5, type:'square', vol:.14});
    caller.textContent = '¡¡LARGARON!!';
    racers.forEach(r=>r.lane.classList.add('go'));
    iv = setInterval(step, 300);
  });
}

/* ============================================================
   🔫 RULETA RUSA — la mesa, el arma, la sangre
   Primer plano del tambor cargándose, después el arma en primera
   persona recorre la mesa disparando SOLA. El baleado queda
   en la mesa, sangrando. Nadie elige a quién se dispara.
   ============================================================ */
const RR_GUN_SVG = `<svg viewBox="0 0 84 170" style="width:100%;height:100%;">
  <defs><linearGradient id="gunG" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#15171a"/><stop offset="45%" stop-color="#3f444c"/>
    <stop offset="62%" stop-color="#22252a"/><stop offset="100%" stop-color="#0e1013"/>
  </linearGradient></defs>
  <rect x="38" y="0" width="8" height="10" rx="2" fill="#1a1d21"/>
  <rect x="34" y="6" width="16" height="76" rx="4" fill="url(#gunG)"/>
  <ellipse cx="42" cy="94" rx="26" ry="22" fill="url(#gunG)"/>
  <circle cx="42" cy="94" r="8" fill="#0a0c0e"/>
  <circle cx="29" cy="85" r="5" fill="#0a0c0e"/><circle cx="55" cy="85" r="5" fill="#0a0c0e"/>
  <circle cx="29" cy="103" r="5" fill="#0a0c0e"/><circle cx="55" cy="103" r="5" fill="#0a0c0e"/>
  <path d="M28 114 L56 114 L61 150 Q62 163 50 165 L36 167 Q25 167 25 154 Z" fill="#241a12" stroke="#0d0906" stroke-width="2"/>
  <path d="M31 119 L53 119 L56 147 L34 151 Z" fill="none" stroke="rgba(255,255,255,.07)"/>
</svg>`;

function rrCylSVG(){
  let holes = '';
  for(let i=0;i<6;i++){
    const a = i*60 * Math.PI/180;
    const x = 50 + Math.cos(a)*26, y = 50 + Math.sin(a)*26;
    holes += `<circle cx="${x}" cy="${y}" r="11" fill="#08090a" stroke="#2c2f33" stroke-width="1.5"/>
      <circle id="cylB${i+1}" cx="${x}" cy="${y}" r="7.5" fill="url(#bulletG)" opacity="0"/>`;
  }
  return `<svg viewBox="0 0 100 100">
    <defs>
      <radialGradient id="cylG" cx="38%" cy="34%"><stop offset="0%" stop-color="#4a4f55"/><stop offset="70%" stop-color="#23262a"/><stop offset="100%" stop-color="#101214"/></radialGradient>
      <radialGradient id="bulletG" cx="40%" cy="35%"><stop offset="0%" stop-color="#F2D98C"/><stop offset="100%" stop-color="#8f6c2a"/></radialGradient>
    </defs>
    <circle cx="50" cy="50" r="47" fill="url(#cylG)" stroke="#000" stroke-width="2.5"/>
    <circle cx="50" cy="50" r="7" fill="#101214" stroke="#2c2f33"/>
    ${holes}
  </svg>`;
}

async function gameRusa(){
  const kit = gameKit();
  gameShell('Ruleta Rusa', 'Una bala. Una mesa. Silencio.',
    'El arma recorre la mesa y dispara sola. Sobrevive uno.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const stage = $('#gStage');
  stage.innerHTML = `
    <div class="rr-scene">
      <div class="rr-table" id="rrTable"></div>
      <div class="rr-gun" id="rrGun">${RR_GUN_SVG}<div class="rr-flash"></div></div>
    </div>`;
  const table = $('#rrTable');
  const gun = $('#rrGun');

  // asientos fijos alrededor de la mesa: los muertos se quedan sangrando
  const seats = kit.alive.map((b, i)=>{
    const n = kit.alive.length;
    const t = n===1 ? 0.5 : i/(n-1);
    const ang = Math.PI * (1 - t)*0.94 + Math.PI*0.03;   // arco superior
    const cx = 50 + Math.cos(ang)*43;
    const cy = 66 - Math.sin(ang)*34;
    const el = document.createElement('div');
    el.className = 'rr-book';
    el.style.left = cx+'%';
    el.style.top = cy+'%';
    const inner = document.createElement('div');
    inner.className = 'rrb-inner';
    inner.appendChild(miniBook(b, bs(52)));
    el.appendChild(inner);
    const lab = document.createElement('div');
    lab.className = 'rrb-lab';
    lab.textContent = b.titulo.length>16 ? b.titulo.slice(0,15)+'…' : b.titulo;
    el.appendChild(lab);
    table.appendChild(el);
    return { book:b, el, dead:false };
  });

  function aimAt(seat){
    const gr = gun.getBoundingClientRect();
    const px = gr.left + gr.width/2, py = gr.bottom - gr.height*0.08;
    const br = seat.el.getBoundingClientRect();
    const deg = Math.atan2((br.left + br.width/2) - px, py - (br.top + br.height/2)) * 180/Math.PI;
    gun.style.setProperty('--aim', deg.toFixed(1)+'deg');
  }

  async function cylinderIntro(){
    const ov = overlay(`
      <div class="ov-pop center">
        <div class="eyebrow" style="color:var(--danger);">El tambor</div>
        <div class="rr-cyl" id="rrCyl">${rrCylSVG()}</div>
        <p class="lead" id="rrCylSub" style="font-size:13px;">Una bala…</p>
      </div>`);
    await sleep(750);
    const slot = 1 + Math.floor(Math.random()*6);
    const bullet = ov.querySelector('#cylB'+slot);
    bullet.style.opacity = '1';
    bullet.classList.add('rr-bullet-in');
    Sound.tone({freq:1500, dur:.06, type:'square', vol:.12});
    Sound.noise({dur:.12, vol:.1, lp:3000, hp:800});
    await sleep(950);
    $('#rrCylSub', ov).textContent = 'Girando…';
    $('#rrCyl', ov).classList.add('spin');
    for(let k=0;k<13;k++){ Sound.tone({freq:2200, dur:.02, type:'square', vol:.05}); await sleep(55 + k*13); }
    await sleep(420);
    closeOverlay(ov);
  }

  let busy = false;
  const btn = gBtn('Cargar y girar', async ()=>{
    if(busy) return;
    busy = true;
    btn.classList.add('hidden');
    await cylinderIntro();

    const aliveSeats = seats.filter(s=>!s.dead);
    const order = shuffled(aliveSeats);
    const victimSeat = aliveSeats[kit.victimIdx(aliveSeats.map(s=>s.book))];

    for(const seat of order){
      aimAt(seat);
      seat.el.classList.add('aimed');
      Sound.fx.tickFinal(1);
      await sleep(640 + Math.random()*520);
      if(seat !== victimSeat){
        Sound.tone({freq:1700, dur:.03, type:'square', vol:.14});
        Sound.tone({freq:300, dur:.05, type:'square', vol:.1, delay:.02});
        seat.el.classList.add('flinch');
        gSub('click…');
        setTimeout(()=>seat.el.classList.remove('flinch'), 420);
        seat.el.classList.remove('aimed');
        await sleep(430);
      } else {
        await sleep(340);
        gun.classList.remove('fire'); void gun.offsetWidth; gun.classList.add('fire');
        Sound.noise({dur:.3, vol:.45, lp:1200});
        Sound.tone({freq:80, dur:.4, type:'sine', vol:.4, glideTo:30});
        Sound.noise({dur:.8, vol:.1, lp:400, delay:.1});
        $('.screen.in') && $('.screen.in').classList.add('shake');
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;inset:0;background:rgba(190,30,20,.25);z-index:4000;pointer-events:none;';
        document.body.appendChild(flash);
        flash.animate([{opacity:1},{opacity:0}], {duration:800, fill:'forwards'});
        setTimeout(()=>flash.remove(), 850);
        // el muerto sangra y SE QUEDA en la mesa
        seat.dead = true;
        seat.el.classList.remove('aimed');
        seat.el.classList.add('shot');
        const blood = document.createElement('div');
        blood.className = 'rr-blood';
        seat.el.appendChild(blood);
        const nd = 2 + Math.floor(Math.random()*2);
        for(let d=0; d<nd; d++){
          const drip = document.createElement('div');
          drip.className = 'rr-drip';
          drip.style.left = (20 + Math.random()*58)+'%';
          drip.style.animationDelay = (Math.random()*0.5)+'s';
          seat.el.querySelector('.rrb-inner').appendChild(drip);
        }
        kit.drop(seat.book, true);
        gSub(`💥 «${seat.book.titulo}» — a la bóveda, sangrando`);
        setTimeout(()=>{ const s=$('.screen.in'); if(s) s.classList.remove('shake'); }, 650);
        break;
      }
    }

    kit.alive = kit.alive.filter(b=>b !== victimSeat.book);
    await sleep(1700);
    gun.style.setProperty('--aim', '0deg');
    if(kit.alive.length === 1){
      const surv = seats.find(s=>!s.dead);
      surv.el.classList.add('aimed');
      gSub(`Sobrevive «${kit.alive[0].titulo}». Bajen el arma.`);
      Sound.fx.chosen();
      await sleep(2000);
      kit.finish(kit.alive[0]);
    } else {
      gSub(`${kit.alive.length} siguen respirando en la mesa.`);
      btn.textContent = 'Cargar y girar otra vez';
      btn.classList.remove('hidden');
      busy = false;
      if(kit.alive.length===2) Sound.fx.finalBell();
    }
  });
}
