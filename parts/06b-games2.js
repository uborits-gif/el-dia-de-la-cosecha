
/* ============================================================
   ⭕ TA-TE-TI MORTAL — ganás la partida, bajás un libro
   ============================================================ */
async function gameTateti(){
  const kit = gameKit();
  gameShell('Ta-Te-Ti Mortal', 'Al mejor de todos', 'Ganás la partida, bajás un libro.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const stage = $('#gStage');
  stage.innerHTML = `
    <div class="ttt-turn serif" id="tttTurn"></div>
    <div class="ttt-board" id="tttBoard"></div>
    <div class="ttt-books" id="tttBooks"></div>`;
  const board = $('#tttBoard');
  const turnEl = $('#tttTurn');
  const booksEl = $('#tttBooks');
  let cells, turn, starter = Math.random()<0.5 ? 'a':'b', picking = false;

  function renderBooks(){
    booksEl.innerHTML = '';
    kit.alive.forEach(b=>{
      const holder = document.createElement('div');
      holder.className = 'ttt-book' + (picking ? ' pickable' : '');
      holder.appendChild(miniBook(b, bs(62)));
      const lab = document.createElement('div');
      lab.className = 'mp-lab';
      lab.textContent = b.titulo.length>16 ? b.titulo.slice(0,15)+'…' : b.titulo;
      holder.appendChild(lab);
      if(picking){
        holder.addEventListener('click', ()=>{
          picking = false;
          kit.drop(b);
          gSub(`«${b.titulo}» baja a la bóveda`);
          kit.alive = kit.alive.filter(x=>x!==b);
          setTimeout(()=>{
            if(kit.alive.length===1){
              Sound.fx.chosen();
              gSub(`¡Queda «${kit.alive[0].titulo}»!`);
              setTimeout(()=>kit.finish(kit.alive[0]), 1400);
            } else {
              starter = other(starter);
              newRound();
            }
          }, 1100);
        });
      }
      booksEl.appendChild(holder);
    });
  }

  function setTurn(p){
    turn = p;
    turnEl.innerHTML = `Le toca a <b style="color:${PLAYER_COLOR[p]}">${escapeHtml(State.players[p])}</b> (${p==='a'?'✕':'◯'})`;
  }
  function mark(cell, i, grid){
    if(grid[i] || picking) return;
    grid[i] = turn;
    cell.textContent = turn==='a' ? '✕' : '◯';
    cell.style.color = PLAYER_COLOR[turn];
    cell.classList.add('filled');
    Sound.tone({freq:turn==='a'?620:480, dur:.07, type:'triangle', vol:.1});
    const W = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    const line = W.find(w=>w.every(x=>grid[x]===turn));
    if(line){
      line.forEach(x=>cells[x].classList.add('win'));
      Sound.fx.chosen();
      turnEl.innerHTML = `🏆 <b style="color:${PLAYER_COLOR[turn]}">${escapeHtml(State.players[turn])}</b> ganó la partida`;
      gSub(`${State.players[turn]}: tocá el libro que mandás a la bóveda.`);
      picking = true;
      renderBooks();
      return;
    }
    if(grid.every(Boolean)){
      gSub('Empate. Va de nuevo…');
      Sound.fx.drop();
      setTimeout(newRound, 1200);
      return;
    }
    setTurn(other(turn));
  }
  function newRound(){
    const grid = Array(9).fill(null);
    board.innerHTML = '';
    cells = [];
    for(let i=0;i<9;i++){
      const c = document.createElement('button');
      c.className = 'ttt-cell';
      c.addEventListener('click', ()=>mark(c, i, grid));
      board.appendChild(c);
      cells.push(c);
    }
    gSub(`Arranca ${State.players[starter]}. El que gana, elimina.`);
    setTurn(starter);
    renderBooks();
  }
  newRound();
}

/* ============================================================
   ✂️ PIEDRA, PAPEL O LIBRO
   Maru: A(✊) S(✋) D(✌) · Uri: J(✊) K(✋) L(✌)
   ============================================================ */
async function gameShifumi(){
  const kit = gameKit();
  gameShell('Piedra, Papel o Libro', 'Manos arriba', 'A las tres. Mano perdida, libro perdido.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const stage = $('#gStage');
  const HANDS = { r:'✊', p:'✋', s:'✌️' };
  const BEATS = { r:'s', p:'r', s:'p' };
  stage.innerHTML = `
    <div class="shifumi">
      <div class="sf-side" id="sfA">
        <div class="sf-name" style="color:var(--pa)">${escapeHtml(State.players.a)}</div>
        <div class="sf-keys">✊ <b>A</b> · ✋ <b>S</b> · ✌️ <b>D</b></div>
        <div class="sf-hand" id="sfHandA">🤜</div>
        <div class="sf-tap" data-p="a"><button data-h="r">✊</button><button data-h="p">✋</button><button data-h="s">✌️</button></div>
        <div class="sf-books" id="sfBooksA"></div>
      </div>
      <div class="sf-mid serif" id="sfMid">—</div>
      <div class="sf-side" id="sfB">
        <div class="sf-name" style="color:var(--pb)">${escapeHtml(State.players.b)}</div>
        <div class="sf-keys">✊ <b>J</b> · ✋ <b>K</b> · ✌️ <b>L</b></div>
        <div class="sf-hand" id="sfHandB">🤛</div>
        <div class="sf-tap" data-p="b"><button data-h="r">✊</button><button data-h="p">✋</button><button data-h="s">✌️</button></div>
        <div class="sf-books" id="sfBooksB"></div>
      </div>
    </div>`;
  const mid = $('#sfMid');
  const KEYMAP = { a:['a','r'], s:['a','p'], d:['a','s'], j:['b','r'], k:['b','p'], l:['b','s'] };
  let picks = {}, listening = false;
  // elegir la mano tocando (teléfono): el mismo camino que el teclado
  const elegir = (p, hand)=>{
    if(!listening || picks[p]) return;
    picks[p] = hand;
    $(p==='a'?'#sfHandA':'#sfHandB').textContent = '✅';
    stage.querySelectorAll(`.sf-tap[data-p="${p}"] button`).forEach(b=>b.classList.toggle('on', b.dataset.h===hand));
    Sound.fx.click();
  };
  stage.querySelectorAll('.sf-tap button').forEach(btn=>{
    btn.addEventListener('click', ()=>elegir(btn.parentElement.dataset.p, btn.dataset.h));
  });

  function renderSides(){
    ['a','b'].forEach(p=>{
      const el = $(p==='a'?'#sfBooksA':'#sfBooksB');
      el.innerHTML = '';
      kit.ownedBy(p).forEach(b=>{
        const m = miniBook(b, bs(44));
        m.title = b.titulo;
        el.appendChild(m);
      });
    });
  }
  renderSides();

  document.addEventListener('keydown', function onKey(e){
    if(!$('#sfMid')){ document.removeEventListener('keydown', onKey); return; }
    if(!listening) return;
    const m = KEYMAP[e.key.toLowerCase()];
    if(!m) return;
    const [p, hand] = m;
    if(picks[p]) return;
    picks[p] = hand;
    $(p==='a'?'#sfHandA':'#sfHandB').textContent = '✅';
    Sound.fx.click();
  });

  async function round(){
    picks = {};
    $('#sfHandA').textContent = '🤜';
    $('#sfHandB').textContent = '🤛';
    stage.querySelectorAll('.sf-tap button.on').forEach(b=>b.classList.remove('on'));
    for(const n of ['3','2','1']){
      mid.textContent = n;
      Sound.fx.shuffle();
      await sleep(650);
    }
    mid.textContent = '¡YA!';
    Sound.fx.chosen();
    listening = true;
    await sleep(2400);
    listening = false;
    const ra = picks.a || ['r','p','s'][Math.floor(Math.random()*3)];
    const rb = picks.b || ['r','p','s'][Math.floor(Math.random()*3)];
    $('#sfHandA').textContent = HANDS[ra];
    $('#sfHandB').textContent = HANDS[rb];
    Sound.noise({dur:.15, vol:.12, lp:2000});
    await sleep(900);
    if(ra===rb){
      mid.textContent = 'EMPATE';
      gSub('Otra vez…');
      await sleep(1100);
      return round();
    }
    const winner = BEATS[ra]===rb ? 'a' : 'b';
    const loser = other(winner);
    mid.textContent = HANDS[winner==='a'?ra:rb];
    gSub(`¡Gana ${State.players[winner]}!`);
    Sound.fx.reveal();
    await sleep(1000);
    // el perdedor pierde un libro propio (si no le quedan, cae uno al azar)
    let pool = kit.ownedBy(loser);
    let note = `${State.players[loser]} pierde un libro`;
    if(!pool.length){ pool = kit.alive; note = `${State.players[loser]} no tiene libros: el destino cobra igual`; }
    const victim = pool[kit.victimIdx(pool)];
    kit.drop(victim);
    gSub(`${note}: «${victim.titulo}» → bóveda`);
    kit.alive = kit.alive.filter(b=>b!==victim);
    renderSides();
    await sleep(1800);
    if(kit.alive.length===1){
      Sound.fx.chosen();
      gSub(`¡Sobrevive «${kit.alive[0].titulo}»!`);
      await sleep(1400);
      kit.finish(kit.alive[0]);
    } else {
      round();
    }
  }
  gBtn('Jugar la mano', function(){ this.remove(); round(); });
}

/* ============================================================
   🪢 TIRA LA SOGA — Maru: tecla A · Uri: tecla L
   Ganás la tirada → mini ruleta sobre los libros del otro.
   Sin libros → anuncio grande + ruleta final con los del ganador.
   1 vs 1 → mano final: el que gana, se lee.
   ============================================================ */
async function gameSoga(){
  const kit = gameKit();
  gameShell('Tira la Soga', 'A pura fuerza', `${escapeHtml(State.players.a)} machaca la <b>A</b> — ${escapeHtml(State.players.b)} machaca la <b>L</b>. El que arrasa, le vuela un libro al otro.`);
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const stage = $('#gStage');
  stage.innerHTML = `
    <div class="soga-wrap">
      <div class="soga-side" style="color:var(--pa)">${escapeHtml(State.players.a)}<br><b>A</b></div>
      <svg id="sogaSvg" viewBox="0 0 700 130">
        <line class="soga-flag" x1="120" y1="20" x2="120" y2="110"/>
        <line class="soga-flag" x1="580" y1="20" x2="580" y2="110"/>
        <path id="sogaRope" class="soga-rope"/>
        <path id="sogaTwist" class="soga-twist"/>
        <circle id="sogaKnot" class="soga-knotc" r="11"/>
      </svg>
      <div class="soga-side" style="color:var(--pb)">${escapeHtml(State.players.b)}<br><b>L</b></div>
    </div>
    <div class="soga-tap">
      <button class="soga-btn" data-p="a" style="--pc:var(--pa)">${escapeHtml(State.players.a)} ¡TIRÁ!</button>
      <button class="soga-btn" data-p="b" style="--pc:var(--pb)">${escapeHtml(State.players.b)} ¡TIRÁ!</button>
    </div>
    <div class="soga-books">
      <div class="soga-team" id="teamA"></div>
      <div class="soga-team" id="teamB"></div>
    </div>`;

  let pos = 0, active = false, finalHand = false, lastPress = 0;
  let fav = null, drift = null;
  const held = new Set();

  function renderBooks(){
    ['a','b'].forEach(p=>{
      const el = $(p==='a' ? '#teamA' : '#teamB');
      if(!el) return;
      el.innerHTML = '';
      kit.ownedBy(p).forEach(b=>{
        const m = miniBook(b, bs(52));
        m.title = b.titulo;
        el.appendChild(m);
      });
    });
  }
  renderBooks();

  /* la soga con física: se comba floja, se tensa cuando machacan */
  (function ropeLoop(){
    const rope = document.getElementById('sogaRope');
    if(!rope) return;                    // pantalla muerta: frenar
    const twist = document.getElementById('sogaTwist');
    const knotEl = document.getElementById('sogaKnot');
    const slack = Math.max(0, 1 - (Date.now()-lastPress)/900);
    const sag = 10 + 30*(1-slack);       // tensa al machacar
    const wob = Math.sin(performance.now()/150)*(2.5 - slack*1.5);
    const kx = 350 + pos*2.3;
    const ky = 62 + sag*0.55 + wob;
    const d = `M 12 54 Q ${(12+kx)/2} ${54+sag+wob} ${kx} ${ky} Q ${(kx+688)/2} ${54+sag-wob} 688 54`;
    rope.setAttribute('d', d);
    twist.setAttribute('d', d);
    knotEl.setAttribute('cx', kx);
    knotEl.setAttribute('cy', ky);
    requestAnimationFrame(ropeLoop);
  })();

  // un tirón, venga del teclado o del botón táctil
  function tirar(p){
    if(!active) return;
    if(p==='a') pos -= 3.4 * (fav==='a' ? 1.25+Math.random()*.35 : 0.8+Math.random()*.25);
    else        pos += 3.4 * (fav==='b' ? 1.25+Math.random()*.35 : 0.8+Math.random()*.25);
    lastPress = Date.now();
    Sound.noise({dur:.07, vol:.07, lp:1200, hp:150});
    Sound.tone({freq:70 + Math.abs(pos)*1.3, dur:.06, type:'triangle', vol:.05});
    check();
  }
  document.addEventListener('keydown', function onKey(e){
    if(!document.getElementById('sogaRope')){ document.removeEventListener('keydown', onKey); clearInterval(drift); return; }
    const k = e.key.toLowerCase();
    if(held.has(k)) return;
    held.add(k);
    if(k==='a') tirar('a');
    else if(k==='l') tirar('b');
  });
  document.addEventListener('keyup', e=>held.delete(e.key.toLowerCase()));
  // los botones: cada toque es un tirón (machacar con el dedo)
  stage.querySelectorAll('.soga-btn').forEach(btn=>{
    const go = e=>{ e.preventDefault(); tirar(btn.dataset.p);
      btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit'); };
    btn.addEventListener('pointerdown', go);
  });

  function check(){
    if(Math.abs(pos) >= 100 && active){
      active = false;
      clearInterval(drift);
      endPull(pos<0 ? 'a' : 'b');
    }
  }

  async function endPull(winner){
    const loser = other(winner);
    // el arrastre: la soga vuela, ruido de caída
    pos = pos<0 ? -160 : 160;
    Sound.noise({dur:.5, vol:.16, lp:2600, hp:300, sweepTo:500});          // whoosh
    Sound.tone({freq:110, dur:.3, type:'sine', vol:.3, glideTo:35, delay:.18}); // porrazo
    Sound.noise({dur:.4, vol:.14, lp:500, delay:.2});                      // polvo
    $('.screen.in') && $('.screen.in').classList.add('shake');
    gSub(`¡${State.players[winner]} ARRASÓ!`);
    await sleep(1300);
    $('.screen.in') && $('.screen.in').classList.remove('shake');

    // mano final: acá se define todo
    if(finalHand){
      const champ = kit.ownedBy(winner)[0];
      const lb = kit.ownedBy(loser)[0];
      if(lb){ kit.drop(lb); kit.alive = kit.alive.filter(b=>b!==lb); }
      gSub(`🏆 ¡Se lee «${champ.titulo}»!`);
      Sound.fx.chosen();
      await sleep(1600);
      return kit.finish(champ);
    }

    // botín normal: mini ruleta sobre los libros del perdedor
    let lB = kit.ownedBy(loser);
    if(lB.length){
      const victim = await miniRoulette(lB, `Botín de ${escapeHtml(State.players[winner])}`,
        `La suerte elige cuál de ${escapeHtml(State.players[loser])} cae`);
      kit.drop(victim);
      kit.alive = kit.alive.filter(b=>b!==victim);
      renderBooks();
      await sleep(600);
    }

    lB = kit.ownedBy(loser);
    const wB = kit.ownedBy(winner);
    if(!lB.length){
      await bigAnnounce(`¡${escapeHtml(State.players[loser]).toUpperCase()}<br>SE QUEDÓ SIN LIBROS!`, 2400);
      let champ;
      if(wB.length === 1){ champ = wB[0]; }
      else {
        champ = await miniRoulette(wB, 'La definición',
          `La suerte elige entre los ${wB.length} que le quedan a ${escapeHtml(State.players[winner])}`);
      }
      wB.filter(x=>x!==champ).forEach(x=>kit.drop(x, true));
      gSub(`🏆 ¡Se lee «${champ.titulo}»!`);
      Sound.fx.chosen();
      await sleep(1600);
      return kit.finish(champ);
    }
    if(lB.length===1 && wB.length===1){
      finalHand = true;
      await bigAnnounce('⚡ MANO FINAL ⚡<br><span style="font-size:.6em;">el que gana esta tirada, SE LEE</span>', 2400);
    }
    pos = 0;
    gSub(finalHand ? 'Todo o nada. Manos a la soga…' : 'Nueva tirada…');
    startBtn.textContent = finalHand ? '¡LA MANO FINAL!' : '¡Otra tirada!';
    startBtn.classList.remove('hidden');
    startBtn.disabled = false;
  }

  const startBtn = gBtn('¡Tirar!', ()=>{
    startBtn.disabled = true;
    startBtn.classList.add('hidden');
    pos = 0;
    let c = 3;
    gSub('3…');
    const iv = setInterval(()=>{
      c--;
      if(c>0){ gSub(c+'…'); Sound.fx.shuffle(); }
      else {
        clearInterval(iv);
        gSub('¡AHORA! ¡A machacar!');
        Sound.fx.chosen();
        fav = Math.random()<0.5 ? 'a' : 'b';   // el favorito secreto de esta tirada
        active = true;
        drift = setInterval(()=>{               // la soga cede de a poco hacia el favorito
          if(!active){ clearInterval(drift); return; }
          pos += (fav==='a' ? -0.6 : 0.6);
          check();
        }, 240);
      }
    }, 700);
  });
}

/* ============================================================
   🥤 LOS VASITOS — eliminás sin saber qué eliminás
   ============================================================ */
async function gameVasitos(){
  const kit = gameKit();
  gameShell('Los Vasitos', 'Memoria y mala suerte', 'Se mezclan. El último vaso cerrado, se lee.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const stage = $('#gStage');
  stage.innerHTML = `<div class="cups-row" id="cupsRow"></div>`;
  const row = $('#cupsRow');
  const CW = bs(96), GAP = 14;
  const n = kit.alive.length;
  row.style.height = (CW*1.6)+'px';
  row.style.width = (n*(CW+GAP))+'px';

  // slots con posición fija; cups mapean slot→libro
  let order = kit.alive.slice();       // order[slot] = libro bajo ese vaso
  const cups = order.map((b, i)=>{
    const cup = document.createElement('div');
    cup.className = 'cup';
    cup.style.width = CW+'px';
    cup.style.setProperty('--x', (i*(CW+GAP))+'px');
    cup.innerHTML = `<div class="cup-book"></div>
      <div class="cup-shape"><div class="cup-rim"></div><div class="cup-stripe"></div></div>`;
    cup.querySelector('.cup-book').appendChild(miniBook(b, CW*0.66));
    row.appendChild(cup);
    return cup;
  });

  function place(){ cups.forEach((c,slot)=>{ c.style.transform = `translateX(var(--x))`; }); }
  function setX(cup, slot){ cup.style.setProperty('--x', (slot*(CW+GAP))+'px'); }

  let slotOf = cups.map((_,i)=>i);   // slotOf[cupIdx] = slot actual

  async function shuffle(){
    gSub('Miralos bien…');
    await sleep(1900);
    cups.forEach(c=>c.classList.add('down'));   // el vaso tapa el libro
    Sound.fx.unwrap();
    await sleep(700);
    gSub('¡Mezclando!');
    // ritmo humano: se PUEDE seguir con la vista si te concentrás —
    // arranca lento, mete unos pocos cruces rápidos en el medio, y afloja
    const swaps = 8 + n;
    for(let k=0;k<swaps;k++){
      const i = Math.floor(Math.random()*n);
      let j = Math.floor(Math.random()*n);
      if(i===j) j = (j+1)%n;
      const si = slotOf[i], sj = slotOf[j];
      slotOf[i] = sj; slotOf[j] = si;
      setX(cups[i], sj); setX(cups[j], si);
      Sound.noise({dur:.09, vol:.05, lp:3600, hp:900});
      const fase = k/swaps;
      await sleep((fase<0.3 ? 520 : fase<0.65 ? 270 : 460) + Math.random()*80);
    }
    await sleep(400);
    turn = Math.random()<0.5 ? 'a':'b';
    nextTurn();
  }

  let turn, lifted = 0, busy = false;
  function nextTurn(){
    gSub('');
    $('#gEyebrow').innerHTML = `Le toca a <b style="color:${PLAYER_COLOR[turn]}">${escapeHtml(State.players[turn])}</b> — levantá un vaso`;
  }
  cups.forEach((cup, ci)=>{
    cup.addEventListener('click', async ()=>{
      if(busy || !cup.classList.contains('down') || cup.classList.contains('done')) return;
      busy = true;
      cup.classList.add('lift');
      Sound.fx.reveal();
      const book = order[ci];
      await sleep(800);
      lifted++;
      if(lifted < n-1){
        kit.drop(book);
        gSub(`Apareció «${book.titulo}» → a la bóveda`);
        cup.classList.add('done');
        cup.querySelector('.cup-book').style.opacity = '.25';
        turn = other(turn);
        await sleep(1400);
        nextTurn();
        busy = false;
      } else {
        // quedó uno tapado: ese gana
        cup.classList.add('done');
        kit.drop(book);
        gSub(`«${book.titulo}» también cae…`);
        await sleep(1500);
        const winCupIdx = cups.findIndex(c=>c.classList.contains('down') && !c.classList.contains('done'));
        const winner = order[winCupIdx];
        cups[winCupIdx].classList.add('lift');
        Sound.fx.chosen();
        $('#gEyebrow').textContent = 'El vaso final';
        gSub(`🏆 «${winner.titulo}»`);
        const r = cups[winCupIdx].getBoundingClientRect();
        sparkleAt(r.left+r.width/2, r.top, 9);
        await sleep(1800);
        kit.finish(winner);
      }
    });
  });
  gBtn('Tapar y mezclar', function(){ this.remove(); shuffle(); });
}

/* ============================================================
   🎱 LA BOLA 8 — el oráculo responde
   ============================================================ */
async function gameBola8(){
  const kit = gameKit();
  gameShell('La Bola 8', 'El oráculo', 'Responde críptico. Nadie apela.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const stage = $('#gStage');
  stage.innerHTML = `
    <div class="ball8" id="ball8">
      <div class="b8-circle"><span>8</span></div>
      <div class="b8-window" id="b8Win"><div class="b8-tri" id="b8Tri">…</div></div>
    </div>
    <div class="sf-books" id="b8Books" style="justify-content:center;margin-top:20px;"></div>`;
  const ball = $('#ball8');
  const tri = $('#b8Tri');
  const CRYPTIC = [
    'Mis fuentes dicen que no…',
    'El destino frunce el ceño…',
    'Las señales son poco amables…',
    'Veo polvo. Veo bóveda.',
    'Pregunté dos veces. Peor la segunda.',
    'El universo ya decidió. Ustedes recién se enteran.',
  ];
  function renderBooks(){
    const el = $('#b8Books');
    el.innerHTML = '';
    kit.alive.forEach(b=>{
      const holder = document.createElement('div');
      holder.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';
      holder.appendChild(miniBook(b, bs(48)));
      const lab = document.createElement('div');
      lab.className = 'mp-lab';
      lab.textContent = b.titulo.length>13 ? b.titulo.slice(0,12)+'…' : b.titulo;
      holder.appendChild(lab);
      el.appendChild(holder);
    });
  }
  renderBooks();

  let busy = false;
  const btn = gBtn('Consultar al oráculo', async ()=>{
    if(busy) return;
    busy = true; btn.disabled = true;
    tri.textContent = '';
    ball.classList.add('shaking');
    Sound.noise({dur:.9, vol:.07, lp:500});
    await sleep(950);
    ball.classList.remove('shaking');
    tri.textContent = CRYPTIC[Math.floor(Math.random()*CRYPTIC.length)];
    tri.classList.add('show');
    Sound.tone({freq:220, dur:1.4, type:'sine', vol:.06, wet:.8});
    await sleep(2100);
    const victim = kit.alive[kit.victimIdx()];
    tri.classList.remove('show');
    await sleep(300);
    tri.textContent = `«${victim.titulo}» no se leerá.`;
    tri.classList.add('show');
    Sound.fx.drop();
    kit.drop(victim, true);
    kit.alive = kit.alive.filter(b=>b!==victim);
    renderBooks();
    await sleep(2300);
    if(kit.alive.length===1){
      tri.classList.remove('show');
      await sleep(300);
      tri.textContent = `Sin ninguna duda: «${kit.alive[0].titulo}».`;
      tri.classList.add('show');
      Sound.fx.chosen();
      await sleep(2200);
      kit.finish(kit.alive[0]);
    } else {
      tri.classList.remove('show');
      busy = false; btn.disabled = false;
      gSub(`Quedan ${kit.alive.length}. Preguntá de nuevo.`);
    }
  });
}

/* ============================================================
   🃏 CARTAS DEL CAOS — la ruleta con eventos
   ============================================================ */
async function gameCartas(){
  const kit = gameKit();
  gameShell('Cartas del Caos', 'La ruleta intervenida', 'Cada giro rompe algo.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const stage = $('#gStage');
  stage.innerHTML = `<div class="cc-wrap">
    <div class="cc-card" id="ccCard"><div class="cc-face cc-back">🃏</div><div class="cc-face cc-front" id="ccFront"></div></div>
    <div class="cc-ring" id="ccRing"></div>
  </div>`;
  const ring = $('#ccRing');
  const card = $('#ccCard');
  let immune = null;

  function layout(){
    ring.innerHTML = '';
    const n = kit.alive.length;
    const R = Math.min(170, 80 + n*14);
    ring.style.width = ring.style.height = (R*2+110)+'px';
    kit.alive.forEach((b,i)=>{
      const ang = (i/n)*2*Math.PI - Math.PI/2;
      const el = document.createElement('div');
      el.className = 'cc-book';
      el.style.left = `calc(50% + ${Math.cos(ang)*R}px)`;
      el.style.top = `calc(50% + ${Math.sin(ang)*R}px)`;
      const inner = document.createElement('div');
      inner.className = 'wb-inner';
      inner.appendChild(miniBook(b, bs(58)));
      el.appendChild(inner);
      if(b===immune){
        const sh = document.createElement('div');
        sh.className = 'cc-shield';
        sh.textContent = '🛡️';
        el.appendChild(sh);
      }
      ring.appendChild(el);
    });
  }
  layout();

  const CARDS = [
    { w:3, name:'GIRO LIMPIO',   icon:'🎡', txt:'Sin trampas: la rueda decide.', fx:()=>{} },
    { w:2, name:'INMUNIDAD',     icon:'🛡️', txt:'Un libro queda protegido este giro.',
      fx:()=>{ immune = kit.alive[Math.floor(Math.random()*kit.alive.length)]; layout(); gSub(`🛡️ «${immune.titulo}» es intocable este giro.`); } },
    { w:2, name:'DOBLE CAÍDA',   icon:'💀', txt:'Este giro caen DOS.', fx:()=>{} },
    { w:2, name:'RENACER',       icon:'🌱', txt:'Un caído vuelve de la bóveda.',
      fx:()=>{
        const back = State.vault.filter(b=>kit.fell.includes(b.id));
        if(back.length){
          const b = back[Math.floor(Math.random()*back.length)];
          kit.revive(b);
          gSub(`🌱 «${b.titulo}» VUELVE. Nadie lo puede creer.`);
          Sound.fx.rescue();
          layout();
        } else { gSub('🌱 Renacer… pero no hay muertos todavía.'); }
      } },
    { w:2, name:'BARAJAR',       icon:'🌪️', txt:'Los libros cambian de lugar.',
      fx:()=>{ kit.alive = shuffled(kit.alive); layout(); Sound.fx.whoosh(); } },
  ];
  function drawCard(){
    const tot = CARDS.reduce((a,c)=>a+c.w,0);
    let r = Math.random()*tot;
    for(const c of CARDS){ r-=c.w; if(r<=0) return c; }
    return CARDS[0];
  }

  const btn = gBtn('Sacar carta y girar', async ()=>{
    btn.disabled = true;
    immune = null;
    const c = drawCard();
    $('#ccFront').innerHTML = `<div class="cc-icon">${c.icon}</div><div class="cc-name">${c.name}</div><div class="cc-txt">${c.txt}</div>`;
    card.classList.remove('flip'); void card.offsetWidth;
    card.classList.add('flip');
    Sound.fx.unwrap();
    await sleep(900);
    c.fx();
    await sleep(c.name==='GIRO LIMPIO' ? 500 : 1600);
    const falls = c.name==='DOBLE CAÍDA' ? Math.min(2, kit.alive.length-1) : 1;
    for(let f=0; f<falls; f++){
      // giro con luz
      const books = $$('.cc-book', ring);
      let vIdx = kit.victimIdx();
      if(immune && kit.alive[vIdx]===immune){
        vIdx = (vIdx+1) % kit.alive.length;
        if(kit.alive[vIdx]===immune) vIdx = (vIdx+1)%kit.alive.length;
      }
      const n = kit.alive.length;
      const total = (2+Math.floor(Math.random()*2))*n + vIdx + 1;
      let tick = 0;
      await new Promise(res=>{
        (function step(){
          books.forEach((b,i)=>b.classList.toggle('lit', i===tick%n));
          Sound.fx.tick(tick/total);
          tick++;
          if(tick<total) setTimeout(step, 45 + Math.pow(tick/total,2.5)*260);
          else res();
        })();
      });
      const victim = kit.alive[vIdx];
      kit.drop(victim);
      gSub(`«${victim.titulo}» cae${immune?` (y «${immune.titulo}» mira desde su burbuja)`:''}`);
      kit.alive = kit.alive.filter(b=>b!==victim);
      layout();
      await sleep(1300);
      if(kit.alive.length===1) break;
    }
    if(kit.alive.length===1){
      Sound.fx.chosen();
      gSub(`¡Sobrevive al caos «${kit.alive[0].titulo}»!`);
      await sleep(1500);
      kit.finish(kit.alive[0]);
    } else {
      btn.disabled = false;
      if(kit.alive.length===2) Sound.fx.finalBell();
    }
  });
}

/* ============================================================
   ♨️ EL MICROONDAS DEL TERROR
   ============================================================ */
async function gameMicro(){
  const kit = gameKit();
  gameShell('El Microondas del Terror', 'Cocción a máxima potencia', 'El que aguanta el DING, se lee.');
  await Promise.all(kit.alive.map(b=>ensureColor(b)));
  const stage = $('#gStage');
  stage.innerHTML = `
    <div class="mw">
      <div class="mw-window">
        <div class="mw-plate" id="mwPlate"></div>
        <div class="mw-glass"></div>
      </div>
      <div class="mw-panel">
        <div class="mw-timer" id="mwTimer">0:59</div>
        <div class="mw-btns"><i></i><i></i><i></i></div>
      </div>
    </div>`;
  const plate = $('#mwPlate');
  const timerEl = $('#mwTimer');
  const items = kit.alive.map((b,i)=>{
    const el = document.createElement('div');
    el.className = 'mw-book';
    const n = kit.alive.length;
    const ang = (i/n)*360;
    el.style.transform = `rotate(${ang}deg) translateY(-58px) rotate(${-ang}deg)`;
    el.appendChild(miniBook(b, bs(44)));
    plate.appendChild(el);
    return { book:b, el };
  });

  let t = 59, sirenPlayed = false;
  const total = kit.alive.length;
  // momentos de explosión repartidos en la cuenta
  const bangAt = [];
  for(let k=0; k<total-1; k++) bangAt.push(Math.round(52 - (k*(44/(total-1))) - Math.random()*3));

  gBtn('Cocinar', async function(){
    this.remove();
    plate.classList.add('spin');
    Sound.tone({freq:660, dur:.1, type:'sine', vol:.12});
    const iv = setInterval(async ()=>{
      t--;
      timerEl.textContent = '0:' + String(Math.max(0,t)).padStart(2,'0');
      if(t%2===0) Sound.tone({freq:120, dur:.06, type:'sawtooth', vol:.02});
      const aliveItems = items.filter(x=>!x.dead);
      if(aliveItems.length===2 && !sirenPlayed){
        sirenPlayed = true;
        Sound.playClip('sirena', {vol:.4});
        $('#gEyebrow').innerHTML = '<span style="color:var(--danger)">⚠️ ALERTA MÁXIMA ⚠️</span>';
      }
      if(bangAt.includes(t) && aliveItems.length>1){
        const idx = kit.victimIdx(aliveItems.map(x=>x.book));
        const item = aliveItems[idx];
        item.dead = true;
        item.el.classList.add('inflate');
        const r0 = item.el.getBoundingClientRect();
        sparkleAt(r0.left+22, r0.top+22, 5);
        Sound.tone({freq:300, dur:.7, type:'sawtooth', vol:.05, glideTo:880});
        setTimeout(()=>{
          const r = item.el.getBoundingClientRect();
          ensureColor(item.book).then(c=>launchConfetti(c, (r.left+22)/innerWidth, (r.top+22)/innerHeight, 46));
          Sound.noise({dur:.3, vol:.28, lp:1600});
          Sound.tone({freq:90, dur:.3, type:'sine', vol:.2, glideTo:40});
          item.el.classList.add('boom');
          kit.drop(item.book, true);
          gSub(`💥 «${item.book.titulo}» explotó`);
        }, 900);
      }
      if(t<=0){
        clearInterval(iv);
        plate.classList.remove('spin');
        const surv = items.find(x=>!x.dead);
        Sound.stopMusic();
        Sound.tone({freq:1568, dur:1.6, type:'sine', vol:.2, wet:.7});   // DING
        Sound.tone({freq:2093, dur:1.2, type:'sine', vol:.08, wet:.7, delay:.05});
        timerEl.textContent = '0:00';
        $('#gEyebrow').textContent = '¡DING!';
        gSub(`Sobrevivió a la radiación: «${surv.book.titulo}»`);
        surv.el.classList.add('mw-win');
        await sleep(2200);
        kit.finish(surv.book);
      }
    }, 620);
  });
}

/* ============================================================
   👑 ELIGE MARU / ELIGE URI — poder absoluto + humillación
   ============================================================ */
async function gameElige(chooser){
  const kit = gameKit();
  const victim = other(chooser);
  const cName = State.players[chooser], vName = State.players[victim];
  Sound.stopMusic();
  gameShell(`Elige ${escapeHtml(cName)}`, 'Poder absoluto',
    `${escapeHtml(vName)}: ojos cerrados. ${escapeHtml(cName)} decide sin democracia.`);
  await Promise.all(kit.alive.map(b=>ensureColor(b)));

  gBtn(`${escapeHtml(vName)} ya cerró los ojos 🙈`, function(){
    this.remove();
    $('#gEyebrow').innerHTML = `Dale ${escapeHtml(cName)}, es todo tuyo`;
    gSub('Tocá el libro que van a leer. Sin culpa.');
    const grid = document.createElement('div');
    grid.className = 'layer-grid stagger';
    $('#gStage').appendChild(grid);
    kit.alive.forEach((b,i)=>{
      const el = bookEl(b, {size:bs(180), onClick:()=>{
        const ov = overlay(`
          <div class="ov-pop center">
            <div class="eyebrow" style="color:${PLAYER_COLOR[chooser]}">¿Este leemos?</div>
            <div id="egBook"></div>
            <div class="serif" style="font-size:24px;font-weight:700;margin-top:14px;">${escapeHtml(b.titulo)}</div>
            <div class="row mt-m">
              <button class="btn btn-ghost" data-esc id="egNo">Mmm, no</button>
              <button class="btn btn-amber" data-enter id="egYes">Este. Punto.</button>
            </div>
          </div>`);
        $('#egBook', ov).appendChild(bookEl(b, {size:bs(215)}));
        $('#egNo', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
        $('#egYes', ov).addEventListener('click', ()=>{
          closeOverlay(ov);
          humiliate(chooser, victim, ()=>kit.finish(b));
        });
      }});
      el.classList.add('pick-card');
      el.style.setProperty('--i', i);
      grid.appendChild(el);
    });
  });
}

/* el show de humillación */
async function humiliate(chooser, victim, done){
  const cName = State.players[chooser], vName = State.players[victim];
  Sound.startMusic('circo');
  const ov = overlay('', 'humiliation');
  ov.style.background = 'rgba(4,8,4,.97)';
  const slide = (html)=>{
    ov.innerHTML = `<div class="hum-slide">${html}</div>`;
    Sound.tone({freq:180, dur:.25, type:'sawtooth', vol:.12, glideTo:120});
  };
  const S = [
    `<div class="hum-big">${escapeHtml(vName)}…</div>`,
    `<div class="hum-big">YA PODÉS ABRIR LOS OJOS 👁️👁️</div>`,
    `<div class="hum-big">MIENTRAS NO MIRABAS…</div>`,
    `<div class="hum-big" style="color:${PLAYER_COLOR[chooser]}">${escapeHtml(cName).toUpperCase()} DECIDIÓ TODO.</div>`,
    `<div class="hum-big">VOS NO OPINASTE <u>NADA</u>.</div>`,
    `<div class="hum-big">NADA.</div>`,
    `<div class="hum-clown">🤡</div>`,
  ];
  for(const s of S){
    slide(s);
    await sleep(1450);
  }
  // lluvia de payasos + trombón triste
  [392,370,349,330].forEach((f,i)=>Sound.tone({freq:f, dur:.55, type:'sawtooth', vol:.09, glideTo:f*0.94, delay:i*.5, wet:.4}));
  for(let i=0;i<26;i++){
    const e = document.createElement('div');
    e.className = 'emoji-fall';
    e.textContent = ['🤡','😂','👏','🎪'][Math.floor(Math.random()*4)];
    e.style.left = Math.random()*100+'%';
    e.style.animationDelay = (Math.random()*1.6)+'s';
    e.style.fontSize = (18+Math.random()*30)+'px';
    ov.appendChild(e);
  }
  await sleep(2600);
  ov.insertAdjacentHTML('beforeend', `
    <div class="hum-slide" style="position:relative;z-index:2;">
      <div class="hum-big" style="font-size:clamp(22px,4vw,40px);">El poder fue de ${escapeHtml(cName)}.<br>La lectura, de los dos. 💚</div>
      <button class="btn btn-primary mt-l" id="humOk" data-enter>Acepto mi destino</button>
    </div>`);
  $('#humOk', ov).addEventListener('click', ()=>{
    Sound.stopMusic();
    closeOverlay(ov);
    done();
  });
}
