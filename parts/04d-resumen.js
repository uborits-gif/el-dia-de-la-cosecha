
/* ============================================================
   🏆 RESUMEN DE LECTURAS — el wrapped + los premios del año
   Un evento largo de fin de año: primero los números del año,
   pantalla por pantalla; después LOS PREMIOS, votados ahí mismo.
   Los ganadores quedan en la metadata de cada libro (`premios`),
   así que el resumen se reconstruye solo desde los datos:
   un año está "cerrado" si algún libro tiene premio de ese año.
   ============================================================ */

const PREMIOS_DEF = [
  { icon:'🏆', nombre:'Libro del Año',      modo:'secreto', frase:'El favorito. Cada uno vota en secreto.' },
  { icon:'💎', nombre:'El Descubrimiento',  modo:'juntos',  frase:'La joya que nadie vio venir.' },
  { icon:'💔', nombre:'La Decepción',       modo:'juntos',  frase:'Prometía. No cumplió.' },
  { icon:'🔥', nombre:'El Más Discutido',   modo:'juntos',  frase:'El que casi los separa.' },
];

/* libros leídos de un año (por fecha de victoria o de lectura) */
function librosDelAnio(anio){
  return State.read.filter(b=>
    String(fechaVictoria(b)).includes(anio) || String(b.readDate||'').includes(anio));
}
/* años ya cerrados: los que dejaron premios en la metadata */
function aniosCerrados(){
  const ys = new Set();
  State.read.forEach(b=>evList(b,'premios').forEach(e=>{
    const m = String(e.quien||'').match(/(20\d\d)/);
    if(m) ys.add(m[1]);
  }));
  return [...ys].sort();
}

/* ---------- EL EVENTO ---------- */
async function screenResumenEvento(){
  const anio = String(new Date().getFullYear());
  const libros = librosDelAnio(anio);
  if(libros.length < 2){ toast(`Todavía no hay año que cerrar: se leyeron ${libros.length} en ${anio}`); return; }
  if(aniosCerrados().includes(anio)){ toast(`El ${anio} ya está cerrado — el resumen vive abajo de las estadísticas`); return; }
  Flow.hide();
  Sound.ac(); Sound.startMusic('lobby');

  /* una pantalla del wrapped: cifra gigante + bajada; toca para seguir */
  const paso = (eyebrow, htmlGrande, bajada, ambiente)=>new Promise(res=>{
    App.ambient(ambiente || 'rgba(232,195,74,.07)', 'rgba(20,40,24,.5)');
    show(`
      <div class="center rz-paso" style="min-height:92vh;justify-content:center;cursor:pointer;" id="rzPaso">
        <div class="eyebrow" style="color:#E8C34A;--i:0;">${eyebrow}</div>
        <div class="rz-big" style="--i:1;">${htmlGrande}</div>
        ${bajada?`<p class="lead mt-m" style="--i:2;margin-left:auto;margin-right:auto;max-width:520px;">${bajada}</p>`:''}
        <div class="rz-sigue">tocá para seguir</div>
      </div>`);
    Sound.fx.reveal();
    const go = ()=>{ Sound.fx.click(); document.removeEventListener('keydown', onK); res(); };
    const onK = e=>{ if(e.key==='Enter'||e.key===' ') go(); };
    $('#rzPaso').addEventListener('click', go, { once:true });
    document.addEventListener('keydown', onK);
  });

  /* ---- ACTO I: los números del año ---- */
  const pags = libros.reduce((s,b)=>s+(parseInt(b.paginas,10)||0), 0);
  const noches = new Set(State.read.concat(State.vault)
    .flatMap(b=>evList(b,'cosechas').map(e=>e.fecha))
    .filter(f=>f.includes(anio))).size;
  const golA = libros.filter(b=>creditoDe(b).toLowerCase()===State.players.a.toLowerCase()).length;
  const golB = libros.filter(b=>creditoDe(b).toLowerCase()===State.players.b.toLowerCase()).length;
  const tropes = {};
  libros.forEach(b=>String(b.tropes||'').split(',').map(t=>t.trim()).filter(Boolean)
    .forEach(t=>tropes[t]=(tropes[t]||0)+1));
  const topTropes = Object.entries(tropes).sort((x,y)=>y[1]-x[1]).slice(0,3);
  const conDias = libros.filter(b=>parseInt(b.diasLectura,10));
  const rapido = conDias.slice().sort((x,y)=>x.diasLectura-y.diasLectura)[0];
  const lento  = conDias.slice().sort((x,y)=>y.diasLectura-x.diasLectura)[0];
  const conStars = libros.filter(b=>ratingAvg(b)!=null);
  const brillo = conStars.slice().sort((x,y)=>ratingAvg(y)-ratingAvg(x))[0];
  const num = v => String(Math.round(v*10)/10).replace('.', ',');

  await paso(`Resumen de lecturas`, `<span class="rz-anio">${anio}</span>`,
    'El año del club, contado por sus libros.');
  await paso('Lo que leyeron', `${libros.length}<small>libros</small>`,
    pags ? `${pags.toLocaleString('es-AR')} páginas entre los dos.` : '');
  if(noches) await paso('Las noches', `${noches}<small>cosechas</small>`,
    'Cada una con su ganador y sus caídos.');
  await paso('El marcador del año', `<span style="color:var(--pa)">${golA}</span> — <span style="color:var(--pb)">${golB}</span>`,
    `${escapeHtml(State.players.a)} contra ${escapeHtml(State.players.b)}. ${golA===golB?'Empate: nadie manda.':`Manda ${escapeHtml(golA>golB?State.players.a:State.players.b)}.`}`);
  if(topTropes.length) await paso('El ADN del año',
    topTropes.map(([t])=>`<span class="rz-chip">${escapeHtml(t)}</span>`).join(''),
    'Los tropes que más los llamaron.');
  if(rapido) await paso('El vértigo', `${rapido.diasLectura}<small>días</small>`,
    `«${escapeHtml(rapido.titulo)}» — el más rápido del año.`);
  if(lento && lento!==rapido) await paso('La agonía', `${lento.diasLectura}<small>días</small>`,
    `«${escapeHtml(lento.titulo)}» se tomó su tiempo.`);
  if(brillo) await paso('Las estrellas', `★ ${num(ratingAvg(brillo))}`,
    `«${escapeHtml(brillo.titulo)}» — el mejor puntuado.`);
  await paso('Y ahora…', `<span class="rz-anio" style="font-size:.55em">LOS PREMIOS</span>`,
    'Los deciden ustedes. Quedan grabados para siempre.', 'rgba(232,195,74,.12)');

  /* ---- ACTO II: los premios ---- */
  Sound.stopMusic();
  const yaPremiados = new Set();
  for(const P of PREMIOS_DEF){
    let ganador = null;
    if(P.modo === 'secreto'){
      const votos = {};
      for(const who of ['a','b']){
        await new Promise(res=>screenPassTo(who, res));
        votos[who] = await elegirPremio(P, libros, anio, State.players[who]);
      }
      if(votos.a.id === votos.b.id){
        ganador = votos.a;
        await avisoPremio(`Los dos votaron lo mismo`, `«${escapeHtml(ganador.titulo)}»`, true);
      } else {
        ganador = await desempatePremio(P, votos);
      }
    } else {
      ganador = await elegirPremio(P, libros.filter(b=>!yaPremiados.has(b.id)), anio, null, true);
    }
    if(ganador){
      yaPremiados.add(ganador.id);
      evPush(ganador, 'premios', { quien:`${P.nombre} ${anio}` });
      await persist();                       // cada premio se guarda al toque
      await avisoPremio(`${P.icon} ${P.nombre} ${anio}`, `«${escapeHtml(ganador.titulo)}»`);
    }
  }

  /* ---- cierre ---- */
  const ldA = State.read.find(b=>evList(b,'premios').some(e=>String(e.quien).includes(`Libro del Año ${anio}`)));
  if(ldA){ ensureColor(ldA).then(c=>launchConfetti(c)); }
  Sound.fx.fanfare();
  setTimeout(()=>Sound.playCelebration(), 500);
  show(`
    <div class="center win-screen" style="min-height:92vh;justify-content:center;">
      <div class="eyebrow" style="color:#E8C34A;animation:winPop .6s var(--ease-pop);">El año quedó escrito</div>
      <div id="rzFinBook" style="animation:winRise 1s var(--ease-pop);"></div>
      <h1 class="serif" style="font-weight:900;font-size:clamp(28px,5.5vw,56px);margin:24px 0 6px;animation:winPop .8s .2s both var(--ease-pop);">
        ${ldA?escapeHtml(ldA.titulo):anio}</h1>
      <p class="lead" style="animation:winPop .8s .35s both var(--ease-pop);">Libro del Año ${anio}. El resumen vive abajo de las estadísticas.</p>
      <button class="btn btn-amber mt-l" id="rzHome" style="animation:winPop .8s .5s both var(--ease-pop);">Volver al club</button>
    </div>`, {silent:true});
  if(ldA) $('#rzFinBook').appendChild(bookEl(ldA, { size:bs(230) }));
  $('#rzHome').addEventListener('click', ()=>{ Sound.stopCelebration(); Sound.fx.click(); screenHome(); });
}

/* la pantalla de elegir un premio (con "no hubo" para los opcionales) */
function elegirPremio(P, libros, anio, quien, opcional=false){
  return new Promise(res=>{
    App.ambient('rgba(232,195,74,.09)', 'rgba(20,40,24,.5)');
    show(`
      <div class="center" style="min-height:88vh;justify-content:center;">
        <div class="eyebrow" style="color:#E8C34A;">${P.icon} ${P.nombre} ${anio}${quien?` · vota ${escapeHtml(quien)}`:''}</div>
        <h2 class="serif" style="font-weight:900;font-size:clamp(24px,4vw,40px);margin:0 0 4px;">${P.frase}</h2>
        <div class="ap-grid stagger mt-l" id="przGrid"></div>
        ${opcional?`<div class="row mt-l"><button class="btn btn-ghost" id="przNo">Este año no hubo</button></div>`:''}
      </div>`);
    libros.forEach((b,i)=>{
      const it = document.createElement('div');
      it.className = 'ap-item';
      it.style.setProperty('--i', i);
      it.appendChild(bookEl(b, { size:bs(120), still:true }));
      it.insertAdjacentHTML('beforeend', `<div class="ap-t">${escapeHtml(short(b.titulo,22))}</div>`);
      it.addEventListener('click', ()=>{
        Sound.fx.chosen();
        it.classList.add('on');
        const r = it.getBoundingClientRect();
        sparkleAt(r.left+r.width/2, r.top+r.height/2, 7);
        setTimeout(()=>res(b), 800);
      });
      $('#przGrid').appendChild(it);
    });
    if(opcional) $('#przNo').addEventListener('click', ()=>{ Sound.fx.click(); res(null); });
  });
}

function desempatePremio(P, votos){
  return new Promise(res=>{
    show(`
      <div class="center" style="min-height:88vh;justify-content:center;">
        <div class="eyebrow" style="color:var(--danger);">${P.icon} No coinciden</div>
        <h2 class="serif" style="font-weight:900;font-size:clamp(24px,4vw,40px);margin:0 0 6px;">Defiéndanlos. Y elijan uno.</h2>
        <div class="row mt-l" id="dzRow" style="gap:clamp(24px,6vw,70px);justify-content:center;"></div>
      </div>`);
    [['a',votos.a],['b',votos.b]].forEach(([who,b])=>{
      const h = document.createElement('div');
      h.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;';
      h.innerHTML = `<div class="vs-duel-owner" style="color:var(--p${who})">el voto de ${escapeHtml(State.players[who])}</div>`;
      h.appendChild(bookEl(b, { size:bs(150), still:true }));
      h.insertAdjacentHTML('beforeend', `<div class="ap-t">${escapeHtml(short(b.titulo,24))}</div>
        <button class="btn btn-amber btn-sm">Este</button>`);
      h.querySelector('button').addEventListener('click', ()=>{ Sound.fx.chosen(); res(b); });
      $('#dzRow').appendChild(h);
    });
  });
}

function avisoPremio(eyebrow, grande, suave=false){
  return new Promise(res=>{
    Sound.fx[suave?'reveal':'finalBell']();
    const ov = overlay(`<div class="ov-pop center">
        <div class="eyebrow" style="color:#E8C34A;">${eyebrow}</div>
        <h2 class="serif" style="font-weight:900;font-size:clamp(26px,4.5vw,44px);margin:10px 0 0;">${grande}</h2>
        <button class="btn btn-amber mt-l" data-enter id="apOk">Sigue</button>
      </div>`);
    $('#apOk', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); res(); });
  });
}

/* ---------- LA SECCIÓN del home: un bloque por año cerrado ---------- */
function renderResumen(box){
  if(!box) return;
  const anios = aniosCerrados();
  const sec = box.closest('section');
  if(!anios.length){ if(sec) sec.style.display = 'none'; return; }
  if(sec) sec.style.display = '';
  box.innerHTML = '';
  anios.forEach(anio=>{
    const libros = librosDelAnio(anio);
    const pags = libros.reduce((s,b)=>s+(parseInt(b.paginas,10)||0), 0);
    const premiados = [];
    State.read.forEach(b=>evList(b,'premios').forEach(e=>{
      if(String(e.quien).includes(anio)) premiados.push({ b, premio: e.quien.replace(' '+anio,'') });
    }));
    const def = n => PREMIOS_DEF.find(p=>p.nombre===n) || { icon:'🏅' };
    const bloque = document.createElement('div');
    bloque.className = 'rz-bloque';
    bloque.innerHTML = `
      <div class="rz-head"><span class="rz-y">${anio}</span>
        <span class="rz-meta">${libros.length} libros${pags?` · ${pags.toLocaleString('es-AR')} páginas`:''}</span></div>
      <div class="rz-podio"></div>`;
    const podio = bloque.querySelector('.rz-podio');
    premiados.forEach(({b, premio}, i)=>{
      const card = document.createElement('div');
      card.className = 'rz-premio' + (premio==='Libro del Año' ? ' oro' : '');
      card.style.setProperty('--i', i);
      card.innerHTML = `<div class="rz-cov" ${b.portada?`style="background-image:url('${b.portada.replace(/'/g,'%27')}')"`:''}></div>
        <div class="rz-p-nom">${def(premio).icon} ${escapeHtml(premio)}</div>
        <div class="rz-p-lib">${escapeHtml(short(b.titulo,26))}</div>`;
      card.addEventListener('click', ()=>{
        const i2 = State.read.indexOf(b);
        showPlacard(State.read, i2<0?0:i2, { source:'honor' });
      });
      podio.appendChild(card);
    });
    box.appendChild(bloque);
  });
}
