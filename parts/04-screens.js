
/* ============================================================
   PANTALLA INICIO
   ============================================================ */
async function screenHome(){
  Flow.hide();
  App.ambient();
  show(`
    <div class="home-hero center" style="min-height:64vh;justify-content:center;">
      <div class="stagger" style="display:flex;flex-direction:column;align-items:center;">
        <div class="eyebrow" style="--i:0;">Club de lectura · ${escapeHtml(State.players.a)} &amp; ${escapeHtml(State.players.b)}</div>
        <h1 class="title sz-hero" style="--i:1;">El Día<br>de la Cosecha</h1>
        <p class="lead mt-m" style="--i:2;margin-left:auto;margin-right:auto;">
          Cinco libros cada uno. Se elige a ciegas: sinopsis, título, portada.
          Un minijuego decide cuál se lee.
        </p>
        <div class="row mt-l" style="--i:3;">
          <button class="btn btn-amber" id="startBtn">Empezar el Día de la Cosecha</button>
        </div>
        <div class="vasallaje-cta">
          <button class="btn btn-ghost" id="vasallajeBtn">⚔️ Hacer Vasallaje</button>
          <div class="vasallaje-note">sin libros nuevos: que peleen los de la bóveda</div>
        </div>
      </div>
    </div>

    <div id="syncBox" class="mt-l"></div>

    <section class="mt-l" id="honorSection">
      <div class="section-head">
        <div>
          <div class="eyebrow">El estante de honor</div>
          <h2 class="serif" style="font-weight:700;font-size:28px;margin:0;">Lo que ya leímos</h2>
        </div>
        <div class="home-load">
          <button class="load-btn" id="loadHonor">↑ Cargar el club</button>
          <button class="load-btn" id="dlHonor">↓ Descargar el club</button>
          ${getUndo()?`<button class="load-btn" id="undoBtn" title="Volver a como estaba antes de ${escapeHtml(getUndo().etiqueta)}">↩ Deshacer</button>`:''}
          ${(typeof loadSnapshots==='function' && loadSnapshots().length>1)?`<button class="load-btn" id="histBtn" title="Volver a cualquier punto guardado">🕑 Historial</button>`:''}
        </div>
      </div>
      <div id="honorShelf"></div>
    </section>

    <section class="mt-l" id="vaultSection">
      <div class="section-head">
        <div>
          <div class="eyebrow" style="color:var(--grey);">La bóveda de los caídos</div>
          <h2 class="serif" style="font-weight:700;font-size:28px;margin:0;">The Vault${State.vault.length?` <span style="color:var(--grey);font-size:18px;">· ${State.vault.length}</span>`:''}</h2>
        </div>
        <div class="home-load">
          <button class="load-btn" id="loadVault">↑ Cargar el club</button>
          <button class="load-btn" id="dlVaultHome">↓ Descargar el club</button>
          <button class="load-btn" id="openVault">⤢ Abrir grande</button>
        </div>
      </div>
      <div id="vfHome"></div>
      <div id="homeCloset"></div>
    </section>

    <section class="mt-l" id="recSection">
      <div class="section-head">
        <div>
          <div class="eyebrow" style="color:var(--grey);">El club en fotos</div>
          <h2 class="serif" style="font-weight:700;font-size:28px;margin:0;">Recuerdos${
            State.fotos.length?` <span style="color:var(--grey);font-size:18px;">· ${State.fotos.length}</span>`:''}</h2>
        </div>
        <div class="home-load">
          <button class="load-btn" id="loadRec">↑ Cargar álbum</button>
          <button class="load-btn" id="dlRec">↓ Descargar</button>
          <button class="load-btn" id="addRec">+ Agregar fotos</button>
          <input type="file" id="recFile" accept="application/json,.json" hidden>
          <input type="file" id="recAddFile" accept="image/*" multiple hidden>
        </div>
      </div>
      <div id="recBox"></div>
    </section>

    <section class="mt-l" id="mazoSection">
      <div class="section-head">
        <div>
          <div class="eyebrow" style="color:#E8C34A;">La apuesta paga</div>
          <h2 class="serif" style="font-weight:700;font-size:28px;margin:0;">El Mazo${
            (Cartas.mano.a.length + Cartas.mano.b.length) ? ` <span style="color:var(--grey);font-size:18px;">· ${Cartas.mano.a.length + Cartas.mano.b.length}</span>` : ''}</h2>
        </div>
      </div>
      <div id="mazoBox"></div>
    </section>

    <section class="mt-l" id="statsSection">
      <div class="section-head">
        <div>
          <div class="eyebrow">El club en números</div>
          <h2 class="serif" style="font-weight:700;font-size:28px;margin:0;">Estadísticas</h2>
        </div>
        <div class="home-load">
          <button class="load-btn" id="wrapBtn">🏆 Cerrar el año</button>
        </div>
      </div>
      <div id="statsBox"></div>
    </section>

    <section class="mt-l" id="resumenSection">
      <div class="section-head">
        <div>
          <div class="eyebrow" style="color:#E8C34A;">Lo que quedó escrito</div>
          <h2 class="serif" style="font-weight:700;font-size:28px;margin:0;">Resumen de lecturas</h2>
        </div>
      </div>
      <div id="resumenBox"></div>
    </section>
  `, {silent:true});

  renderHonorShelf($('#honorShelf'), { interactive:true });
  buildHomeCloset();
  mountVaultFilter($('#vfHome'), ()=>$('#homeCloset'));
  renderRecuerdos($('#recBox'));
  renderMazo($('#mazoBox'));
  renderSync($('#syncBox'));
  renderResumen($('#resumenBox'));
  $('#wrapBtn').addEventListener('click', ()=>{ Sound.fx.click(); screenResumenEvento(); });
  try{ renderStats($('#statsBox')); }catch(e){ $('#statsBox').innerHTML = `<div class="st-hint" style="margin-top:14px;">No pude calcular las estadísticas: ${escapeHtml(e.message)}</div>`; }

  // recuerdos: cargar álbum · descargar · agregar fotos sueltas
  $('#dlRec').addEventListener('click', ()=>{ Sound.fx.click(); downloadRecuerdos(); });
  $('#loadRec').addEventListener('click', ()=>{ Sound.fx.click(); $('#recFile').click(); });
  $('#recFile').addEventListener('change', async e=>{
    const f = e.target.files[0]; e.target.value = '';
    if(f) await cargarRecuerdos(await f.text());
    screenHome();
  });
  $('#addRec').addEventListener('click', ()=>{ Sound.fx.click(); $('#recAddFile').click(); });
  $('#recAddFile').addEventListener('change', async e=>{
    const files = [...e.target.files]; e.target.value = '';
    if(!files.length) return;
    const n = await agregarFotos(files, { lugar:'', libro:'' });
    if(n.length){ Sound.fx.reveal(); screenHome(); }
  });

  $('#startBtn').addEventListener('click', ()=>{ Sound.ac(); Sound.fx.click(); screenUpload(); });
  $('#vasallajeBtn').addEventListener('click', ()=>{ Sound.ac(); Sound.fx.click(); screenVasallaje(); });
  $('#openVault').addEventListener('click', ()=>{ Sound.fx.click(); screenVault(); });
  $('#dlHonor').addEventListener('click', downloadClub);
  $('#dlVaultHome').addEventListener('click', downloadClub);
  // un archivo de club llena las dos secciones; uno viejo (lista sola) llena la suya
  const cargar = destino => ()=>{
    Sound.fx.click();
    pickFile((txt)=>{
      const club = parseClub(txt);
      if(club){
        if(club.read.length) State.read = club.read;
        if(club.vault.length) State.vault = club.vault;
        if(club.mazo){ Cartas.mano = club.mazo.mano; Cartas.historial = club.mazo.historial; persistCartas(); }
        persist();
        Sound.fx.reveal();
        screenHome();
        toast(`El club cargado · ${club.read.length} leídos + ${club.vault.length} en la bóveda`);
        return;
      }
      const { books } = parseBooks(txt);
      if(!books.length){ toast('No encontré libros en el archivo'); return; }
      State[destino] = books;
      persist();
      Sound.fx.reveal();
      screenHome();
      toast(`${destino==='read'?'Estante cargado':'Bóveda cargada'} · ${books.length} libros`);
    });
  };
  $('#loadHonor').addEventListener('click', cargar('read'));
  $('#loadVault').addEventListener('click', cargar('vault'));
  if($('#undoBtn')) $('#undoBtn').addEventListener('click', ()=>{
    const u = getUndo();
    if(!u) return;
    Sound.fx.click();
    const ov = overlay(`
      <div class="ov-pop center" style="max-width:480px;">
        <div class="eyebrow" style="color:var(--amber);">Deshacer</div>
        <h2 class="serif" style="font-size:26px;font-weight:700;margin:4px 0 0;">¿Volvemos atrás?</h2>
        <p class="lead" style="font-size:14px;margin-top:10px;">Se deshace ${escapeHtml(u.etiqueta)}
          (${escapeHtml(u.fecha)}). El estante y la bóveda vuelven a como estaban justo antes de cerrarla.</p>
        <div class="row mt-m">
          <button class="btn btn-ghost" data-esc id="unNo">No, dejá todo</button>
          <button class="btn btn-amber" data-enter id="unYes">Sí, deshacer</button>
        </div>
      </div>`);
    $('#unNo', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
    $('#unYes', ov).addEventListener('click', async ()=>{
      closeOverlay(ov);
      const s = await restoreUndo();
      Sound.fx.drop();
      await screenHome();
      toast(`Deshecho: ${s.etiqueta}`);
    });
  });
  if($('#histBtn')) $('#histBtn').addEventListener('click', openHistorial);
}

/* 🕑 EL RESPALDO — anillo de fotos con fecha. El "Deshacer" vuelve un paso;
   esto deja volver a cualquier punto de los últimos 30. Mata el miedo a perder todo. */
function openHistorial(){
  Sound.fx.click();
  const snaps = (typeof loadSnapshots==='function' ? loadSnapshots() : []).slice().reverse();
  const filas = snaps.map((s,idx)=>{
    const actual = idx===0;
    return `
      <button class="hist-row${actual?' now':''}" data-ts="${s.ts}" ${actual?'disabled':''}>
        <div class="hist-when">
          <div class="hist-fecha">${escapeHtml(s.fecha||'')}</div>
          <div class="hist-hora">${escapeHtml(s.hora||'')}</div>
        </div>
        <div class="hist-mid">
          <div class="hist-cnt"><b>${s.nR}</b> en el estante · <b>${s.nV}</b> en la bóveda</div>
          ${actual?'<div class="hist-tag">ahora</div>':'<div class="hist-go">Volver a este punto →</div>'}
        </div>
      </button>`;
  }).join('');
  const ov = overlay(`
    <div class="ov-pop" style="max-width:560px;width:100%;">
      <div class="eyebrow" style="color:var(--amber);">Respaldo automático</div>
      <h2 class="serif" style="font-size:26px;font-weight:700;margin:4px 0 2px;">Volver a un punto guardado</h2>
      <p class="lead" style="font-size:13px;margin:0 0 12px;">Cada vez que algo cambia, se guarda una foto. Elegí a cuál volver — antes de restaurar se saca otra foto, así que no perdés nada.</p>
      <div class="hist-list">${filas || '<div class="hist-empty">Todavía no hay respaldos.</div>'}</div>
      <div class="row mt-m" style="justify-content:flex-end;">
        <button class="btn btn-ghost" data-esc id="histClose">Cerrar</button>
      </div>
    </div>`);
  $('#histClose', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
  ov.querySelectorAll('.hist-row:not(.now)').forEach(row=>{
    row.addEventListener('click', ()=>{
      const ts = +row.getAttribute('data-ts');
      const s = (typeof loadSnapshots==='function' ? loadSnapshots() : []).find(x=>x.ts===ts);
      if(!s) return;
      Sound.fx.click();
      const cf = overlay(`
        <div class="ov-pop center" style="max-width:440px;">
          <div class="eyebrow" style="color:var(--amber);">Restaurar</div>
          <h2 class="serif" style="font-size:24px;font-weight:700;margin:4px 0 0;">¿Volvemos a este punto?</h2>
          <p class="lead" style="font-size:13.5px;margin-top:10px;">${escapeHtml(s.fecha)} · ${escapeHtml(s.hora)} — <b>${s.nR}</b> leídos, <b>${s.nV}</b> en la bóveda.</p>
          <div class="row mt-m">
            <button class="btn btn-ghost" data-esc id="hcNo">No</button>
            <button class="btn btn-amber" data-enter id="hcYes">Sí, volver acá</button>
          </div>
        </div>`);
      $('#hcNo', cf).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(cf); });
      $('#hcYes', cf).addEventListener('click', async ()=>{
        closeOverlay(cf); closeOverlay(ov);
        await restoreSnapshot(ts);
        Sound.fx.drop();
        await screenHome();
        toast(`Volviste al ${s.fecha} ${s.hora}`);
      });
    });
  });
}

function buildHomeCloset(){
  buildCloset($('#homeCloset'), State.vault, {
    mode:'browse',
    deletable:true,
    onPick(book){
      const i = State.vault.indexOf(book);
      showPlacard(State.vault, i<0?0:i, { source:'vault' });
    },
    onDelete(book){ removeFromList(State.vault, book, 'la bóveda', buildHomeCloset); },
  });
}

/* estante de madera con los leídos (el último entra al final)
   opts: { highlightId, interactive } */
function renderHonorShelf(container, opts={}){
  const highlightId = opts.highlightId;
  container.className = 'honor-shelf';
  if(!State.read.length){
    container.innerHTML = `<p class="lead" style="margin-top:14px;">Todavía no leyeron nada juntos. El primer ganador inaugura el estante${opts.interactive?', o cargá un archivo':''}.</p>`;
    return;
  }
  container.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'hshelf-row';
  State.read.forEach((book, i)=>{
    const holder = document.createElement('div');
    holder.className = 'hbook';
    holder.style.cssText = `opacity:0;animation:rise .6s var(--ease-out) forwards;animation-delay:${i*90}ms;`;
    const el = bookEl(book, {size:bs(150), baseY:-18});
    holder.appendChild(el);
    // el último elegido es el que están leyendo AHORA — hasta que le pongan estrellas
    const esActual = i === State.read.length - 1 && ratingAvg(book) == null;
    if(esActual){
      const tag = document.createElement('div');
      tag.className = 'hc-now';
      tag.textContent = 'lectura actual';
      holder.appendChild(tag);
    }
    const cap = document.createElement('div');
    cap.className = 'hcap';
    const avg = ratingAvg(book);
    cap.innerHTML = `<div class="hc-t">${escapeHtml(book.titulo)}</div>
      <div class="hc-d">${escapeHtml(book.readDate||'')}${avg!=null?` <span class="hc-r">★ ${(''+ (Math.round(avg*10)/10)).replace('.',',')}</span>`:''}</div>`;
    holder.appendChild(cap);
    if(opts.interactive){
      el.style.cursor = 'pointer';
      el.addEventListener('click', ()=>{ Sound.fx.click(); showPlacard(State.read, i, { source:'honor' }); });
      attachDelete(holder, ()=>removeFromList(State.read, book, 'el estante', ()=>renderHonorShelf(container, opts)));
    }
    if(highlightId && book.id===highlightId){
      holder.style.animation = 'rescueIn 1s var(--ease-pop) forwards';
      holder.style.animationDelay = (State.read.length*90+300)+'ms';
      setTimeout(()=>{
        const r = holder.getBoundingClientRect();
        sparkleAt(r.left + r.width/2, r.top + r.height/2, 9);
        Sound.fx.reveal();
      }, State.read.length*90+900);
    }
    row.appendChild(holder);
  });
  const board = document.createElement('div');
  board.className = 'shelf-board';
  container.append(row, board);
}

/* ---------- helpers compartidos: carga de archivo, borrar, placa ---------- */
function pickFile(cb){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.txt,text/plain'; inp.style.display = 'none';
  inp.addEventListener('change', e=>{
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader(); r.onload = ev=>cb(ev.target.result); r.readAsText(f);
  });
  document.body.appendChild(inp);
  inp.click();
  setTimeout(()=>inp.remove(), 60000);
}

function removeFromList(list, book, label, refresh){
  const i = list.indexOf(book);
  if(i<0) return;
  list.splice(i, 1);
  persist();
  Sound.fx.drop();
  toast(`«${book.titulo}» fuera de ${label}`);
  if(refresh) refresh();
}

/* X escondida: solo asoma cerca de la esquina superior derecha del libro */
function attachDelete(holder, onDel){
  if(getComputedStyle(holder).position === 'static') holder.style.position = 'relative';
  const x = document.createElement('button');
  x.className = 'del-x';
  x.textContent = '✕';
  x.title = 'Sacar de la lista';
  holder.appendChild(x);
  holder.addEventListener('pointermove', e=>{
    const r = holder.getBoundingClientRect();
    const nearTop = e.clientY - r.top < 44;
    const nearRight = r.right - e.clientX < 52;
    x.classList.toggle('peek', nearTop && nearRight);
  });
  holder.addEventListener('pointerleave', ()=>x.classList.remove('peek'));
  x.addEventListener('click', e=>{ e.stopPropagation(); onDel(); });
}

/* el cuentagotas de verdad: saca el color de cualquier pixel de la pantalla
   (la portada del libro, sin ir más lejos). Chrome/Edge lo traen de fábrica. */
const DROPPER_SVG = `<svg class="pt-drop" viewBox="0 0 2401 2401" aria-hidden="true"><path d="M 1401.679688 656.96875 C 1470.390625 597.730469 1506.128906 562.429688 1558.03125 484.089844 C 1568.660156 454.910156 1586.699219 426.191406 1611.699219 401.191406 C 1684.398438 328.488281 1788.46875 314.710938 1844.160156 370.390625 C 1899.839844 426.078125 1886.058594 530.148438 1813.359375 602.851562 C 1788.359375 627.851562 1759.640625 645.878906 1730.460938 656.519531 C 1652.121094 708.421875 1616.820312 744.160156 1557.578125 812.871094 L 1607.738281 863.03125 C 1628.160156 883.449219 1628.160156 916.871094 1607.738281 937.300781 L 1604.03125 941.011719 C 1583.601562 961.429688 1550.179688 961.429688 1529.761719 941.011719 L 1273.539062 684.789062 C 1253.121094 664.371094 1253.121094 630.949219 1273.539062 610.519531 L 1277.25 606.808594 C 1297.679688 586.390625 1331.101562 586.390625 1351.519531 606.808594 Z M 550.605469 1876.230469 C 581.03125 1833.316406 611.796875 1789.921875 626.242188 1709.28125 C 626.460938 1708.070312 626.671875 1706.851562 626.882812 1705.621094 C 627.3125 1702.558594 629.703125 1700.140625 632.746094 1699.675781 C 635.253906 1699.292969 637.882812 1700.289062 639.46875 1702.484375 L 642.964844 1707.3125 C 679.335938 1757.546875 734.394531 1833.59375 751.519531 1891.683594 C 760.523438 1922.222656 761.417969 1952.46875 753.28125 1979.183594 C 745.539062 2004.597656 729.703125 2026.707031 704.992188 2042.753906 C 686.546875 2054.730469 665.195312 2062.203125 643.601562 2063.882812 C 557.75 2070.566406 496.582031 1971.21875 532.757812 1902.679688 C 537.460938 1893.761719 544.734375 1884.511719 550.605469 1876.230469 Z M 1292.140625 764.699219 L 1448.101562 920.660156 L 930.671875 1439.835938 C 869.226562 1501.488281 849.511719 1436.828125 794.207031 1492.128906 L 659.90625 1626.429688 C 640.164062 1646.171875 607.859375 1646.171875 588.117188 1626.429688 C 568.378906 1606.6875 568.378906 1574.382812 588.117188 1554.640625 L 723.65625 1419.101562 C 776.921875 1365.839844 713.523438 1345.269531 774.714844 1283.871094 Z"/></svg>`;
async function pickColorFromScreen(){
  if(!window.EyeDropper) return null;
  try{ return (await new window.EyeDropper().open()).sRGBHex; }
  catch(e){ return null; }        // lo cancelaron con Escape
}

/* placa de info estilo Criterion Closet: portada grande + flechas + link.
   El MARCO (cerrar, flechas) no se mueve nunca: la ficha entera se desliza
   adentro, en X, y se va de la pantalla. Sin fundidos. */
function showPlacard(list, startIdx, opts={}){
  if(!list.length) return;
  let idx = ((startIdx % list.length) + list.length) % list.length;
  const ov = overlay('', 'placard-ov');
  ov.innerHTML = `
    <div class="pl2-frame ov-pop" id="plFrame">
      <button class="btn btn-ghost btn-sm" data-esc id="plClose">✕</button>
      ${list.length>1?`<button class="pl2-arrow prev" id="plPrev">‹</button>
                       <button class="pl2-arrow next" id="plNext">›</button>`:''}
      <div class="pl2-view" id="plView"></div>
    </div>`;

  const CRIT_ICON = { sinopsis:'📖', titulo:'✒️', portada:'🎨' };
  function render(dir, editing=false){
    const b = list[idx];
    ensureColor(b);
    const row = (label, val, suffix='')=> (val!==undefined && val!=='' && val!==null)
      ? `<div class="pl2-row"><b>${label}</b><span>${escapeHtml(String(val))}${suffix}</span></div>` : '';
    // IZQUIERDA: identidad del libro (sinopsis + técnica + tropes)
    const tecRows = [ row('Año', b.anio), row('País', b.pais), row('Género', b.genero),
      row('Páginas', b.paginas), row('Idioma', b.idioma) ].join('');
    const tropes = (b.tropes||'').split(',').map(t=>t.trim()).filter(Boolean);
    // DERECHA: pills en su lugar
    const nResc = evCount(b,'rescates'), nDesc = evCount(b,'descartes'), nVas = nVasallajes(b);
    const esLeido = opts.source==='honor' || evCount(b,'victorias') > 0 || !!b.readDate;
    const esActual = esLeido && State.read.length
      && State.read[State.read.length-1].id === b.id && ratingAvg(b) == null;
    const pills = [];
    if(esActual)
      pills.push(`<span class="pl-badge now">📖 LECTURA ACTUAL</span>`);
    if(opts.source==='honor' || evCount(b,'victorias'))
      pills.push(`<span class="pl-badge win">🏆 GANADOR${evCount(b,'victorias')>1?' ×'+evCount(b,'victorias'):''}</span>`);
    if(esEmpate(b))
      pills.push(`<span class="pl-badge">🤝 EMPATE DE HONOR</span>`);
    if(nResc)
      pills.push(`<span class="pl-badge verde">⛏ RESCATADO${nResc>1?' ×'+nResc:''}</span>`);
    if(nDesc)
      pills.push(`<span class="pl-badge rojo">🗑 DESCARTADO${nDesc>1?' ×'+nDesc:''}</span>`);
    if(evCount(b,'anulaciones'))
      pills.push(`<span class="pl-badge rojo">🚫 GANÓ Y SE ANULÓ${evCount(b,'anulaciones')>1?' ×'+evCount(b,'anulaciones'):''}</span>`);
    if(nVas)
      pills.push(`<span class="pl-badge gris">⚔️ VASALLAJE ×${nVas}</span>`);
    // LA LÍNEA DE TIEMPO: todos los hechos de la bitácora, en orden cronológico.
    // Nada se pisa: si lo rescataron 29 veces, están las 29.
    const tl = [];
    const tItem = (icon, main, sub)=>tl.push(
      `<div class="tl-item"><div class="tl-dot">${icon}</div><div class="tl-body">
         <div class="tl-main">${main}</div>${sub?`<div class="tl-sub">${sub}</div>`:''}</div></div>`);
    // Varios hechos caen el MISMO día: se desempatan por la fase del ritual,
    // que es el orden real en que pasan (Flow.STEPS): selección → rescate →
    // descarte → el juego. A Dorayaki lo rescató Uri y DESPUÉS lo descartó Maru.
    const FASE = { cosechas:0, elegidos:1, rescates:2, descartes:3, puestos:4, anulaciones:5, victorias:6, premios:7 };
    const hechos = [];
    const push = (key, icon, fn)=>evList(b,key).forEach((e,i,arr)=>{
      const r = fn(e, i, arr.length);
      if(r) hechos.push({ fecha:e.fecha, fase:FASE[key], icon, ...r });
    });

    const SINF = '<span class="tl-n">no anotamos cuándo</span>';
    const fSub = e => evVal(e.fecha) ? escapeHtml(e.fecha) : SINF;
    const porQuien = e => evVal(e.quien) ? ` por <b>${escapeHtml(e.quien)}</b>` : '';
    const deN = (i,n) => n>1 ? ` <span class="tl-n">${i+1}/${n}</span>` : '';

    // las participaciones sin fecha no valen como ítem: ya están en el contador
    // del final. Y no se numeran: que volvió a jugar lo cuentan los otros hechos.
    // las noches de Vasallaje llevan espaditas, y el puesto va como entrada aparte abajo
    const nochesVasallaje = new Set(evList(b,'puestos').map(e=>e.fecha).filter(Boolean));
    evList(b,'cosechas').forEach((e,i)=>{
      if(!evVal(e.fecha)) return;
      const esVas = nochesVasallaje.has(e.fecha);
      hechos.push({ fecha:e.fecha, fase:FASE.cosechas, icon: esVas ? '⚔️' : '🌾',
        main: esVas ? 'Entró al Vasallaje' : (i===0 ? 'Entró a la cosecha' : 'Jugó la cosecha'),
        sub: [escapeHtml(e.fecha), escapeHtml(evVal(e.quien))].filter(Boolean).join(' · ') });
      // la temática de esa noche, como entrada propia justo debajo
      if(evVal(e.extra)){
        const partes = e.extra.trim().split(/\s+/);
        const emo = /\p{Extended_Pictographic}/u.test(partes[0]) ? partes.shift() : '🎪';
        hechos.push({ fecha:e.fecha, fase:FASE.cosechas + 0.5, icon: emo,
          main:`Temática: <b>${escapeHtml(partes.join(' '))}</b>`, sub:escapeHtml(e.fecha) });
      }
    });
    push('elegidos', '', (e)=>{
      const lab = ({sinopsis:'la sinopsis', titulo:'el título', portada:'la portada'})[e.quien] || e.quien;
      return { icon: CRIT_ICON[e.quien]||'👁', main:`Elegido solo por <b>${escapeHtml(lab)}</b>`, sub:fSub(e) };
    });
    // si el hecho vino de una carta (extra), queda dicho
    const conCarta = e => evVal(e.extra) ? ` <span class="tl-n">${escapeHtml(e.extra)}</span>` : '';
    push('rescates',  '⛏', (e,i,n)=>({ main:`Rescatado${porQuien(e)}${deN(i,n)}${conCarta(e)}`, sub:fSub(e) }));
    push('descartes', '🗑', (e,i,n)=>({ main:`Descartado${porQuien(e)}${deN(i,n)}${conCarta(e)}`, sub:fSub(e) }));
    push('anulaciones', '🚫', (e)=>({
      main:`Ganó… y decidieron <b>volver a sortear</b>`,
      sub:[evVal(e.fecha)?escapeHtml(e.fecha):SINF, escapeHtml(e.extra||'')].filter(Boolean).join(' · ') }));
    // puestos legibles: cuartos / semifinal / final / ganador
    // (normaliza también lo viejo, que venía con numeritos tipo "3º/4º")
    const PODIO = { ganador:'🥇', final:'🥈', semifinal:'🥉', cuartos:'⚔️' };
    const puestoDe = e => {
      const s = (e.extra||'').toLowerCase();
      if(/semifinal|3º/.test(s)) return 'semifinal';
      if(/cuartos|primera ronda|5º/.test(s)) return 'cuartos';
      if(/ganador|campeón|1º/.test(s)) return 'ganador';
      if(/final|2º/.test(s)) return 'final';
      return evVal(e.extra) || 'participó';
    };
    const fechasVictoria = new Set(evList(b,'victorias').map(v=>v.fecha).filter(Boolean));
    push('puestos', '⚔️', (e)=>{
      const p = puestoDe(e);
      // el ganador no se anota dos veces: su puesto ya lo cuenta la entrada GANÓ
      if(p === 'ganador' && fechasVictoria.has(e.fecha)) return null;
      const modo = (String(e.quien||'').match(/\(([^)]+)\)/)||[])[1] || evVal(e.quien) || '';
      return { icon: PODIO[p] || '⚔️',
        main:`<b>${escapeHtml(p[0].toUpperCase()+p.slice(1))}</b>${modo?` — ${escapeHtml(modo)}`:''}`,
        sub:fSub(e) };
    });
    push('victorias', '🏆', (e)=>({
      main:`<b>GANÓ</b>${evVal(e.quien)?` — ${escapeHtml(e.quien)}`:''}${e.extra?' · '+escapeHtml(e.extra):''}`,
      sub:fSub(e) }));
    push('premios', '🏅', (e)=>({
      main:`<b>${escapeHtml(evVal(e.quien)||'Mención')}</b>${e.extra?' · '+escapeHtml(e.extra):''}`,
      sub:fSub(e) }));
    // orden cronológico de verdad. (Antes devolvía 0 para los sin fecha, que no
    // es un comparador válido: el orden salía a la buena de Dios.)
    // Lo que no tiene fecha no se puede ubicar: va al final, y lo dice.
    const ord = h => fechaOrd(h.fecha) || Infinity;
    hechos.sort((x,y)=>(ord(x) - ord(y)) || (x.fase - y.fase));
    hechos.forEach(h=>tItem(h.icon, h.main, h.sub));
    if(b.readDate)
      tItem('📚', 'Leído', [escapeHtml(b.readDate), b.diasLectura?`en ${b.diasLectura} días`:'', b.encuentros?`${b.encuentros} encuentros`:''].filter(Boolean).join(' · '));
    if(evCount(b,'cosechas'))
      tItem('🔁', `${evCount(b,'cosechas')} ${evCount(b,'cosechas')>1?'cosechas jugadas':'cosecha jugada'}`, '');
    // "lo trajo" — pop, del lado del club
    const who = b.traidoPor||'';
    const pc = who && who.toLowerCase()===String(State.players.a).toLowerCase() ? 'var(--pa)'
             : who && who.toLowerCase()===String(State.players.b).toLowerCase() ? 'var(--pb)' : 'var(--grey)';
    const subBits = [b.autor, b.anio, b.pais, b.paginas?b.paginas+' págs':null].filter(Boolean).join(' · ');
    // formulario de edición (el lápiz ✎). Las bitácoras se editan como texto:
    // "fecha · quién" y varios hechos separados por " | ".
    const EDITF = [
      ['traidoPor','Lo trajo', ''],
      ['cosechas','Cosechas', 'fecha · lugar | fecha · lugar'],
      ['elegidos','Lo eligieron por', 'fecha · sinopsis|titulo|portada'],
      ['rescates','Rescates', 'fecha · quién | fecha · quién'],
      ['descartes','Descartes', 'fecha · quién | fecha · quién'],
      ['victorias','Victorias', 'fecha · método · empate de honor'],
      ['anulaciones','Anulaciones', 'fecha · motivo'],
      ['puestos','Puestos', 'fecha · torneo · puesto'],
      ['puntajes','Puntajes', 'Maru 4.5 | Uri 3'],
      ['diasLectura','Leído en (días)', ''],['encuentros','Encuentros', ''],['nota','Nota', ''],
    ];
    const editForm = `<div class="pl2-edit">${EDITF.map(([k,l,ph])=>
      `<label><b>${l}</b><input data-k="${k}" placeholder="${escapeHtml(ph)}" value="${escapeHtml(String(b[k]??''))}"></label>`).join('')}
      <div class="row" style="justify-content:flex-end;gap:8px;margin-top:10px;">
        <button class="btn btn-ghost btn-sm" id="plEditCancel">Cancelar</button>
        <button class="btn btn-amber btn-sm" id="plEditSave">Guardar</button>
      </div></div>`;
    const scene = document.createElement('div');
    scene.className = 'placard2';
    scene.innerHTML = `
        <div class="pl2-panel pl2-left">
          <h4 class="pl2-h">Sinopsis</h4>
          <p class="pl2-syn">${escapeHtml(b.sinopsis||'(sin sinopsis)')}</p>
          ${tecRows?`<div class="pl2-sec"><div class="pl2-rows">${tecRows}</div></div>`:''}
          ${tropes.length?`<div class="pl2-sec"><h4 class="pl2-h">Tropes</h4>
            <div class="pl2-chips">${tropes.map(t=>`<span>${escapeHtml(t)}</span>`).join('')}</div></div>`:''}
          <div class="pl2-tools" id="plTools">
            <div class="pl2-tool">
              <label class="pt-swatch" title="Color del lomo — tocá el círculo">
                <i class="pt-dot" id="ptDot"></i><input type="color" id="ptColor">
              </label>
              <button class="pt-pick" id="ptPick" title="Cuentagotas: sacá el color de la portada">${DROPPER_SVG}</button>
            </div>
            <div class="pl2-tool">
              <label class="pt-swatch" title="Color de la tipografía del lomo">
                <i class="pt-dot" id="ptInkDot"></i><input type="color" id="ptInk">
              </label>
              <button class="pt-pick" id="ptPickInk" title="Cuentagotas: sacá la tinta de la portada">${DROPPER_SVG}</button>
            </div>
            <div class="pl2-tool">
              <i class="pt-aa" id="ptAa">Aa</i>
              <button class="pt-pick" id="ptFont" title="Otra tipografía para el lomo">🎲</button>
            </div>
            <button class="pl2-tool pt-reset" id="ptReset" title="Volver al lomo automático">↺</button>
          </div>
        </div>
        <div class="pl2-book" id="plBook"></div>
        <div class="pl2-panel pl2-right">
          <h4 class="pl2-h" style="display:flex;align-items:center;justify-content:space-between;">Historial del club
            <button class="pl2-pencil" id="plEdit" title="Editar historial">✎</button></h4>
          ${editing ? editForm : `
            ${who?`<div class="pb-row" style="margin:2px 0 14px;">
              <div class="pl2-avatar" style="--pc:${pc}">${escapeHtml(who[0].toUpperCase())}</div>
              <div><div class="pl2-who">${escapeHtml(who)}</div><div class="pl2-sub" style="margin-top:1px;">lo trajo al club</div></div>
            </div>`:''}
            ${pills.length?`<div class="pl-badges" style="margin:0 0 14px;">${pills.join('')}</div>`:''}
            ${esActual?`<button class="btn btn-amber btn-sm fin-btn" id="fichaFin">Terminamos el libro</button>`
              : esLeido?`<div class="rate-box" id="rateBox"></div>`:''}
            ${tl.length?`<div class="tl">${tl.join('')}</div>`:`<div class="pl-empty">Todavía sin historia. Ya va a tener.</div>`}
            ${b.nota?`<p class="pl-nota">${escapeHtml(b.nota)}</p>`:''}
            ${opts.source==='vault'?`<button class="pl2-del" id="plDel">🗑 Sacar de la bóveda</button>`:''}`}
        </div>
        <div class="pl2-pill">
          <span class="pl2-num">#${idx+1}</span>
          <div style="flex:1;min-width:0;">
            <div class="pl2-t">${escapeHtml(b.titulo)}</div>
            ${subBits?`<div class="pl2-sub">${escapeHtml(subBits)}</div>`:''}
          </div>
          <button class="pl2-exp" id="plExpand" aria-label="Ver la ficha completa">⌄</button>
        </div>`;
    $('.pl2-book', scene).appendChild(bookEl(b, { size:bs(270), baseY:-26 }));

    // CARRUSEL: la ficha ENTERA viaja en X hasta salir de cuadro. Cero opacidad.
    const view = $('#plView', ov);
    const saliente = render._scene;
    view.appendChild(scene);
    placeArrows(scene);                       // medir ANTES de transformar nada
    if(dir && saliente){
      const EASE = 'cubic-bezier(.62,.02,.24,1)', MS = 620, D = 112;
      saliente.classList.add('going');
      saliente.animate([{ transform:'translateX(0)' }, { transform:`translateX(${-dir*D}%)` }],
        { duration:MS, easing:EASE, fill:'forwards' });
      scene.animate([{ transform:`translateX(${dir*D}%)` }, { transform:'translateX(0)' }],
        { duration:MS, easing:EASE, fill:'forwards' });
      setTimeout(()=>saliente.remove(), MS+30);
      Sound.fx.whoosh();
    } else if(saliente){
      saliente.remove();
    }
    render._scene = scene;
    const plExp = $('#plExpand', scene);
    if(plExp) plExp.addEventListener('click', ()=>{ try{ Sound.fx.click(); }catch(e){}
      scene.classList.toggle('pl2-open');
      plExp.setAttribute('aria-label', scene.classList.contains('pl2-open') ? 'Cerrar la ficha' : 'Ver la ficha completa');
    });
    const plDel = $('#plDel', scene);
    if(plDel) plDel.addEventListener('click', async ()=>{
      try{ Sound.fx.click(); }catch(e){}
      if(!confirm(`¿Sacar «${b.titulo}» de la bóveda? Si algún día lo rescatan, vuelve.`)) return;
      State.vault = State.vault.filter(v=>v.id!==b.id);
      await persist();
      toast('Sacado de la bóveda');
      close();
      if(document.querySelector('#homeCloset')) buildHomeCloset();
      else if(document.querySelector('#closet')) screenVault();
    });
    wireSpineTools(b, scene);
    wireRatings(b, scene);
    if($('#fichaFin', scene)) $('#fichaFin', scene).addEventListener('click', ()=>ceremoniaFinal(b));
    // lápiz: editar y guardar en la app
    $('#plEdit', ov).addEventListener('click', ()=>{ Sound.fx.click(); render(0, !editing); });
    if(editing){
      $('#plEditCancel', ov).addEventListener('click', ()=>{ Sound.fx.click(); render(0, false); });
      $('#plEditSave', ov).addEventListener('click', async ()=>{
        $$('.pl2-edit input', ov).forEach(inp=>{
          const k = inp.dataset.k, v = inp.value.trim();
          if(v==='') delete b[k];
          else b[k] = /^(diasLectura|encuentros)$/.test(k) ? (parseInt(v,10)||v) : v;
        });
        await persist();
        Sound.fx.chosen();
        toast('Historial guardado');
        render(0, false);
      });
    }
  }

  /* las flechas viven en el marco: se plantan al lado del libro y no se mueven más.
     Se mide con offset* y NO con getBoundingClientRect: el rect viene escalado
     mientras corre la animación de entrada y las flechas quedaban 22px arriba. */
  function placeArrows(scene){
    const bk = $('.pl2-book', scene), fr = $('#plFrame', ov);
    const prev = $('#plPrev', ov), next = $('#plNext', ov);
    if(!bk || !fr || !prev || !bk.offsetWidth) return;
    let x = 0, y = 0;
    for(let el = bk; el && el !== fr; el = el.offsetParent){ x += el.offsetLeft; y += el.offsetTop; }
    [prev, next].forEach(a=>{ a.style.top = (y + bk.offsetHeight/2) + 'px'; });
    prev.style.left = (x - 4) + 'px';
    next.style.left = (x + bk.offsetWidth - 42) + 'px';
    next.style.right = 'auto';
  }

  /* 💧 lomo · 💧 tinta · 🎲 tipografía — el lomo a gusto del club.
     El círculo abre el selector; el cuentagotas chupa el color de la pantalla. */
  function wireSpineTools(b, scene){
    const dot = $('#ptDot', scene), inkDot = $('#ptInkDot', scene);
    const col = $('#ptColor', scene), ink = $('#ptInk', scene);
    const aa = $('#ptAa', scene);
    if(!dot) return;
    const guardar = async ()=>{ syncBook(b); await persist(); repintarLomo(b); };

    const setLomo = (hex)=>{ b.spineColor = hex; dot.style.background = hex; col.value = hex;
      dot.classList.add('mano'); guardar(); };
    const setTinta = (hex)=>{ b.spineInk = hex; inkDot.style.background = hex; ink.value = hex;
      inkDot.classList.add('mano'); guardar(); };

    ensureEdgeColor(b).then(c=>{
      const hex = b.spineColor || rgbToHex(c || {r:60,g:60,b:60});
      dot.style.background = hex; col.value = hex;
      const ih = b.spineInk || (contrastText(c||{r:0,g:0,b:0}).includes('255') ? '#ffffff' : '#0a0f0a');
      inkDot.style.background = ih; ink.value = ih;
      dot.classList.toggle('mano', !!b.spineColor);
      inkDot.classList.toggle('mano', !!b.spineInk);
    });
    applySpineFont(aa, b, 1.15);

    col.addEventListener('input', ()=>{ b.spineColor = col.value; dot.style.background = col.value; dot.classList.add('mano'); });
    col.addEventListener('change', ()=>{ Sound.fx.chosen(); guardar(); });
    ink.addEventListener('input', ()=>{ b.spineInk = ink.value; inkDot.style.background = ink.value; inkDot.classList.add('mano'); });
    ink.addEventListener('change', ()=>{ Sound.fx.chosen(); guardar(); });

    const cuentagotas = async (set)=>{
      if(!window.EyeDropper){ toast('Este navegador no tiene cuentagotas — usá el círculo'); return; }
      Sound.fx.click();
      const hex = await pickColorFromScreen();
      if(hex){ set(hex); Sound.fx.chosen(); }
    };
    $('#ptPick', scene).addEventListener('click', ()=>cuentagotas(setLomo));
    $('#ptPickInk', scene).addEventListener('click', ()=>cuentagotas(setTinta));

    $('#ptFont', scene).addEventListener('click', ()=>{
      let n = Math.floor(Math.random()*SPINE_FONTS.length);
      if(n === spineFontIdx(b)) n = (n+1) % SPINE_FONTS.length;   // que siempre cambie
      b.spineFont = n;
      applySpineFont(aa, b, 1.15);
      Sound.fx.click();
      guardar();
    });
    $('#ptReset', scene).addEventListener('click', ()=>{
      delete b.spineColor; delete b.spineInk; delete b.spineFont; delete b._edge;
      Sound.fx.drop();
      guardar();
      render(0);
    });
  }
  /* el lomo del libro que está a la vista se repinta al toque, sin recargar */
  function repintarLomo(b){
    delete b._edge;
    ensureEdgeColor(b).then(c=>{
      $$('.book3d', ov).forEach(el=>el.style.setProperty('--sc', c.css));
      $$('.bf-spine', ov).forEach(el=>{ el.style.color = spineInkOf(b, c); });
    });
  }
  /* el libro de la lista es una copia: hay que escribir también en la bóveda/estante */
  function syncBook(b, keys=['spineColor','spineInk','spineFont']){
    keys.forEach(k=>{
      [State.vault, State.read].forEach(arr=>{
        const t = arr.find(x=>x.id===b.id);
        if(t && t!==b){ if(b[k]===undefined) delete t[k]; else t[k] = b[k]; }
      });
    });
  }

  /* 🏁 la ceremonia del final: pantalla grande, cada uno pone sus estrellas,
     y el libro deja de ser "lectura actual". Los días de lectura salen solos. */
  function ceremoniaFinal(b){
    Sound.fx.click();
    const ov = overlay(`
      <div class="ov-pop center" style="max-width:660px;">
        <div class="eyebrow" style="color:var(--amber);">Terminamos el libro</div>
        <h1 class="serif" style="font-weight:900;font-size:clamp(28px,5vw,46px);margin:6px 0 20px;">${escapeHtml(b.titulo)}</h1>
        <div class="fin-rows" id="finRows"></div>
        <p class="lead" id="finMsg" style="min-height:1.6em;margin-top:20px;font-size:15px;"></p>
        <div class="row mt-m" id="finBtns">
          <button class="btn btn-ghost" data-esc id="finNo">Todavía no</button>
          <button class="btn btn-amber" data-enter id="finOk" disabled>Queda escrito</button>
        </div>
      </div>`);
    const vals = { a:null, b:null };
    const num = v => String(Math.round(v*10)/10).replace('.', ',');
    ['a','b'].forEach(who=>{
      const row = document.createElement('div');
      row.className = 'fin-row';
      row.innerHTML = `<div class="fin-name" style="color:var(--p${who})">${escapeHtml(State.players[who])}</div>
        <div class="rate-stars big"><span class="rate-base">★★★★★</span><span class="rate-fill">★★★★★</span></div>
        <em class="rate-val big"></em>`;
      const st = row.querySelector('.rate-stars'), fill = row.querySelector('.rate-fill'), val = row.querySelector('.rate-val');
      const pintar = v =>{ fill.style.width = ((v||0)/5*100)+'%'; val.textContent = v!=null ? num(v) : ''; };
      const deEv = e =>{
        const r = st.getBoundingClientRect();
        return Math.max(.5, Math.ceil(Math.min(1, Math.max(0, (e.clientX-r.left)/r.width))*10)/2);
      };
      st.addEventListener('pointermove', e=>pintar(deEv(e)));
      st.addEventListener('pointerleave', ()=>pintar(vals[who]));
      st.addEventListener('click', e=>{
        vals[who] = deEv(e);
        Sound.fx.click();
        pintar(vals[who]);
        $('#finOk', ov).disabled = vals.a==null || vals.b==null;
      });
      $('#finRows', ov).appendChild(row);
    });
    $('#finNo', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
    $('#finOk', ov).addEventListener('click', async ()=>{
      $('#finBtns', ov).style.visibility = 'hidden';
      setRating(b, State.players.a, vals.a);
      setRating(b, State.players.b, vals.b);
      syncBook(b, ['puntajes']);
      // días de lectura automáticos: desde que lo ganaron hasta hoy
      if(!b.diasLectura){
        const d0 = parseFecha(fechaVictoria(b));
        if(d0){
          const dias = Math.round((Date.now() - new Date(d0.y, d0.m, d0.d)) / 86400000);
          if(dias >= 1 && dias < 400){ b.diasLectura = dias; syncBook(b, ['diasLectura']); }
        }
      }
      await persist();
      const avg = ratingAvg(b), diff = Math.abs(vals.a - vals.b);
      const msg = diff >= 2 ? 'Va a haber discusión.'
        : avg >= 4.3 ? 'Directo al panteón del club.'
        : avg <= 2 ? 'Se leyó, se sufrió, se archiva.'
        : 'Queda escrito.';
      $('#finMsg', ov).textContent = `★ ${num(avg)} — ${msg}`;
      Sound.fx.chosen();
      sparkleAt(innerWidth/2, innerHeight/2, 9);
      setTimeout(()=>{ closeOverlay(ov); render(0); }, 2600);
    });
  }

  /* ⭐ los puntajes, tipo Letterboxd: una fila de estrellas por cabeza,
     medio punto con la mitad de la estrella, y el promedio abajo. */
  function wireRatings(b, scene){
    const box = $('#rateBox', scene);
    if(!box) return;
    const fila = who => `<div class="rate-row">
        <i class="rate-ini" style="--pc:var(--p${who})">${escapeHtml((State.players[who]||'?')[0].toUpperCase())}</i>
        <div class="rate-stars" data-who="${who}">
          <span class="rate-base">★★★★★</span><span class="rate-fill">★★★★★</span>
        </div>
        <em class="rate-val"></em>
      </div>`;
    box.innerHTML = fila('a') + fila('b') + `<div class="rate-avg"></div>`;
    const num = v => String(Math.round(v*10)/10).replace('.', ',');
    const pintarAvg = ()=>{
      const avg = ratingAvg(b);
      $('.rate-avg', box).textContent = avg!=null ? `★ ${num(avg)} entre los dos` : '';
    };
    $$('.rate-stars', box).forEach(st=>{
      const name = State.players[st.dataset.who];
      const fill = st.querySelector('.rate-fill');
      const valEl = st.parentElement.querySelector('.rate-val');
      const actual = ()=>ratingOf(b, name);
      const pintar = v =>{
        fill.style.width = ((v||0)/5*100) + '%';
        valEl.textContent = v!=null ? num(v) : '';
      };
      const deEvento = e =>{
        const r = st.getBoundingClientRect();
        const f = Math.min(1, Math.max(0, (e.clientX - r.left)/r.width));
        return Math.max(0.5, Math.ceil(f*10)/2);
      };
      st.addEventListener('pointermove', e=>pintar(deEvento(e)));
      st.addEventListener('pointerleave', ()=>pintar(actual()));
      st.addEventListener('click', async e=>{
        let v = deEvento(e);
        if(actual() === v) v = null;        // repetir el puntaje lo borra
        setRating(b, name, v);
        syncBook(b, ['puntajes']);
        await persist();
        Sound.fx.click();
        pintar(actual());
        pintarAvg();
      });
      pintar(actual());
    });
    pintarAvg();
  }

  function go(d){ idx = (idx + d + list.length) % list.length; Sound.fx.whoosh(); render(d); }
  function onKey(e){
    if(e.key==='ArrowLeft') go(-1);
    else if(e.key==='ArrowRight') go(1);
  }
  function close(){
    Sound.fx.click();
    document.removeEventListener('keydown', onKey);
    removeEventListener('resize', onResize);
    closeOverlay(ov);
  }
  const onResize = ()=>{ if(render._scene) placeArrows(render._scene); };
  // el marco se cablea UNA vez: no se vuelve a crear en cada libro
  $('#plClose', ov).addEventListener('click', close);
  if($('#plPrev', ov)) $('#plPrev', ov).addEventListener('click', ()=>go(-1));
  if($('#plNext', ov)) $('#plNext', ov).addEventListener('click', ()=>go(1));
  document.addEventListener('keydown', onKey);
  addEventListener('resize', onResize);
  render(0);
  requestAnimationFrame(()=>placeArrows(render._scene));   // ya con las fuentes medidas
}

/* ============================================================
   EL FILTRO DE LA BÓVEDA — lentes, no formularios
   No saca libros del estante: apaga los que no cumplen y deja
   brillar los que sí. Los lentes se combinan y quedan puestos
   hasta que los soltás (sobreviven al ir y volver de pantalla).
   ============================================================ */
const VF = { traidoPor:null, autor:null, anio:null, trope:null };
const VF_CATS = [
  { key:'traidoPor', lab:'lo trajo', of:b=>[b.traidoPor] },
  { key:'autor',     lab:'autor',    of:b=>[b.autor] },
  { key:'anio',      lab:'año',      of:b=>[b.anio] },
  { key:'trope',     lab:'trope',    of:b=>String(b.tropes||'').split(',').map(t=>t.trim()) },
];
const vfOn = ()=>VF_CATS.some(c=>VF[c.key]);
const vfMatch = b => VF_CATS.every(c=>!VF[c.key]
  || c.of(b).filter(Boolean).map(v=>String(v).toLowerCase()).includes(String(VF[c.key]).toLowerCase()));

function vfApply(closet, bar){
  if(!closet) return;
  let ok = 0, tot = 0;
  $$('.vault-slot', closet).forEach(s=>{
    if(!s._vfBook) return;
    tot++;
    const pasa = !vfOn() || vfMatch(s._vfBook);
    if(pasa) ok++;
    s.classList.toggle('vf-out', !pasa);
  });
  const n = bar && $('.vf-n', bar);
  if(n) n.textContent = vfOn() ? `${ok} de ${tot}` : '';
}

function mountVaultFilter(host, getCloset){
  if(!host) return;
  if(State.vault.length < 3){ host.innerHTML = ''; return; }
  host.classList.add('vf-bar');

  function paint(){
    host.innerHTML = VF_CATS.map(c=>{
      const val = VF[c.key];
      return `<button class="vf-lens${val?' on':''}" data-k="${c.key}">${
        val ? `${escapeHtml(String(val))}<i>✕</i>` : c.lab}</button>`;
    }).join('') + `<span class="vf-n"></span>`;
    $$('.vf-lens', host).forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const k = btn.dataset.k;
        if(VF[k]){ VF[k] = null; Sound.fx.drop(); paint(); }
        else openPop(btn, k);
      });
    });
    vfApply(getCloset(), host);
  }

  function openPop(btn, k){
    Sound.fx.click();
    $$('.vf-pop', host).forEach(p=>p.remove());
    const cat = VF_CATS.find(c=>c.key===k);
    const m = new Map();
    State.vault.forEach(b=>cat.of(b).filter(Boolean).forEach(v=>{
      v = String(v).trim();
      if(v) m.set(v, (m.get(v)||0)+1);
    }));
    const opts = [...m.entries()].sort(k==='anio'
      ? (x,y)=>y[0]-x[0]
      : (x,y)=>(y[1]-x[1]) || String(x[0]).localeCompare(y[0]));
    if(!opts.length) return toast('La bóveda todavía no tiene ese dato');
    const pop = document.createElement('div');
    pop.className = 'vf-pop';
    pop.style.left = Math.min(btn.offsetLeft, 40) + 'px';
    pop.innerHTML = opts.map(([v,n])=>
      `<button data-v="${escapeHtml(v)}">${escapeHtml(v)}<i>${n}</i></button>`).join('');
    $$('button', pop).forEach(b=>b.addEventListener('click', ()=>{
      VF[k] = b.dataset.v;
      Sound.fx.chosen();
      paint();
    }));
    host.appendChild(pop);
    setTimeout(()=>{
      const cerrar = e=>{ if(!pop.contains(e.target)){ pop.remove(); document.removeEventListener('pointerdown', cerrar); } };
      document.addEventListener('pointerdown', cerrar);
    }, 0);
  }

  paint();
}

/* ============================================================
   THE VAULT — armario de los caídos
   ============================================================ */
function screenVault(){
  Flow.hide();
  App.ambient('rgba(255,214,120,.05)', 'rgba(30,30,50,.5)');
  show(`
    <div class="eyebrow" style="color:var(--grey);">La bóveda de los caídos</div>
    <h1 class="title" style="font-size:clamp(34px,5vw,54px);">The Vault</h1>
    <p class="lead mt-s">Todos perdieron alguna vez. Ninguno está afuera.</p>
    ${State.vault.length?`<div class="row mt-m" style="justify-content:flex-start;">
      <button class="load-btn" id="vaultViewBtn">☰ Ver como lista</button></div>`:''}
    <div id="vfBig"></div>
    <div id="closet"></div>
    <div class="row mt-l" style="justify-content:flex-start;">
      <button class="btn btn-ghost" id="backBtn">← Volver</button>
      ${State.vault.length?'<button class="btn btn-ghost" id="dlBtn">Descargar el club</button>':''}
    </div>
  `);
  let vaultModo = 'estante';
  const rebuild = ()=>{
    if(vaultModo === 'lista'){
      $('#vfBig').innerHTML = '';
      buildVaultList($('#closet'), State.vault, closetOpts);
      if($('#vaultViewBtn')) $('#vaultViewBtn').textContent = '▦ Ver como estante';
    } else {
      buildCloset($('#closet'), State.vault, closetOpts);
      mountVaultFilter($('#vfBig'), ()=>$('#closet'));
      if($('#vaultViewBtn')) $('#vaultViewBtn').textContent = '☰ Ver como lista';
    }
  };
  const closetOpts = {
    mode:'browse',
    deletable:true,
    onPick(book){
      const i = State.vault.indexOf(book);
      showPlacard(State.vault, i<0?0:i, { source:'vault' });
    },
    onDelete(book){ removeFromList(State.vault, book, 'la bóveda', rebuild); },
  };
  rebuild();
  if($('#vaultViewBtn')) $('#vaultViewBtn').addEventListener('click', ()=>{
    Sound.fx.click(); vaultModo = vaultModo === 'estante' ? 'lista' : 'estante'; rebuild();
  });
  $('#backBtn').addEventListener('click', ()=>{ Sound.fx.click(); screenHome(); });
  if($('#dlBtn')) $('#dlBtn').addEventListener('click', downloadClub);
}

/* ---------- la bóveda como LISTA (portadas + título), alternativa al armario 3D ---------- */
function buildVaultList(container, books, opts={}){
  container.innerHTML = '';
  if(!books.length){
    container.innerHTML = `<div class="closet-empty">La bóveda está vacía.</div>`;
    return;
  }
  const list = document.createElement('div');
  list.className = 'vault-list';
  books.forEach(book=>{
    ensureColor(book);
    const meta = [book.autor, book.anio, book.pais].filter(Boolean).join(' · ');
    const nRes = evCount(book,'rescates');
    const row = document.createElement('div');
    row.className = 'vl-row';
    row._vfBook = book;
    row.innerHTML = `
      <div class="vl-cover" style="${book.portada
        ? `background-image:url('${book.portada.replace(/'/g,'%27')}')`
        : `background:${(book._color&&book._color.css)||'#26331f'}`}"></div>
      <div class="vl-body">
        <div class="vl-title">${escapeHtml(book.titulo)}</div>
        ${meta?`<div class="vl-meta">${escapeHtml(meta)}</div>`:''}
      </div>
      ${nRes?`<div class="vl-badge">⛏ ${nRes}</div>`:''}`;
    row.addEventListener('click', ()=>{
      try{ Sound.fx.click(); }catch(e){}
      const idx = books.indexOf(book);
      if(opts.onPick) opts.onPick(book);
      else showPlacard(books, idx<0?0:idx, { source:'vault' });
    });
    list.appendChild(row);
  });
  container.appendChild(list);
}

/* tipografías de lomo: cada libro recibe una fija según su título → estante ecléctico */
const SPINE_FONTS = [
  {f:'"Oswald"',        s:12,   w:600, up:1, ls:'.03em'},
  {f:'"Bringbold"',     s:12.5, w:400, up:1, ls:'.02em'},
  {f:'"ModernRomance"', s:14.5, w:400, up:0, ls:'.01em'},
  {f:'"Griffiths"',     s:14,   w:400, up:0, ls:'0'},
  {f:'"Oskon"',         s:12.5, w:400, up:0, ls:'.03em'},
  {f:'"Neogen"',        s:11.5, w:400, up:1, ls:'.04em'},
  {f:'"Bricolage"',     s:12.5, w:600, up:0, ls:'.01em'},
  {f:'"AppleGaramond"', s:14.5, w:700, up:0, ls:'.01em'},
  {f:'"Quicksand"',     s:12.5, w:600, up:0, ls:'.02em'},
];
/* la fuente del lomo: la elegida a dedo, o la que le tocó por hash del título */
function spineFontIdx(book){
  const n = parseInt(book && book.spineFont, 10);
  return (!isNaN(n) && n>=0 && n<SPINE_FONTS.length)
    ? n : hashStr('sp'+((book&&book.titulo)||(book&&book.id)||'')) % SPINE_FONTS.length;
}
function applySpineFont(el, book, scale=1){
  const f = SPINE_FONTS[spineFontIdx(book)];
  el.style.fontFamily = f.f + ',"Fraunces",serif';
  el.style.fontSize = (f.s*scale).toFixed(1) + 'px';
  el.style.fontWeight = f.w;
  el.style.letterSpacing = f.ls;
  if(f.up) el.style.textTransform = 'uppercase';
}

/* el título NUNCA se corta: achica la tipografía y, si aún no entra,
   permite una segunda línea vertical. Se re-ajusta al cargar las fuentes. */
function fitSpineTitle(container, span, reserve){
  const fit = ()=>{
    if(!container.isConnected) return;
    span.classList.remove('wrap2');
    span.style.fontSize = '';               // arranca del tamaño base de la fuente elegida
    const avail = container.clientHeight - 26 - reserve;
    if(avail <= 0) return;
    let size = parseFloat(getComputedStyle(span).fontSize) || 12;
    let guard = 26;
    while(guard-- > 0 && span.getBoundingClientRect().height > avail && size > 8){
      size -= 0.5;
      span.style.fontSize = size + 'px';
    }
    if(span.getBoundingClientRect().height > avail){
      // dos líneas verticales: se duplica el espacio, arrancamos de nuevo del tamaño base
      span.classList.add('wrap2');
      span.style.fontSize = '';
      size = parseFloat(getComputedStyle(span).fontSize) || 12;
      guard = 26;
      while(guard-- > 0 && span.getBoundingClientRect().height > avail && size > 6.5){
        size -= 0.5;
        span.style.fontSize = size + 'px';
      }
    }
  };
  requestAnimationFrame(fit);
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>requestAnimationFrame(fit));
}

/* construye el armario: estantes de madera + libros lomo afuera
   opts: { mode:'browse'|'rescue', onPick(book), deletable, onDelete(book) } */
function buildCloset(container, books, opts={}){
  container.innerHTML = '';
  const closet = document.createElement('div');
  closet.className = 'closet';

  if(!books.length){
    closet.innerHTML = `<div class="closet-empty">La bóveda está vacía.<br>
      Se va a ir llenando con los libros que caigan en la ruleta.</div>`;
    container.appendChild(closet);
    return;
  }

  // capacidad por estante según el ancho disponible.
  // En mobile los libros van más chicos y entran más por fila.
  const mob = innerWidth < 560 ? 0.78 : 1;
  const availW = Math.min(1080, innerWidth) - (innerWidth < 560 ? 36 : 156);
  const perShelf = innerWidth < 560
    ? Math.min(7, Math.max(5, Math.floor(availW / (52 * mob))))
    : Math.max(4, Math.floor(availW / 52));
  const shelves = [];
  for(let i=0;i<books.length;i+=perShelf) shelves.push(books.slice(i, i+perShelf));

  // panel de detalle compartido
  const detail = document.createElement('div');
  detail.id = 'vaultDetail';
  detail.innerHTML = `<div class="vd-hint">Pasá por los lomos para verlos de cerca…</div>`;
  function showDetail(book){
    ensureColor(book);
    detail.classList.add('on');
    detail.innerHTML = `
      <div class="vd-cover" style="${book.portada?`background-image:url('${book.portada.replace(/'/g,"%27")}')`:''}"></div>
      <div class="vd-info">
        <div class="vd-title">${escapeHtml(book.titulo)}</div>
        <div class="vd-syn">${escapeHtml(book.sinopsis||'(sin sinopsis)')}</div>
        ${evCount(book,'rescates')?`<div class="vd-badge">⛏ rescatado ×${evCount(book,'rescates')}</div>`:''}
      </div>
      ${opts.mode==='rescue'?'<div class="vd-hint" style="flex:none;">clic para rescatarlo</div>':''}`;
  }

  shelves.forEach(group=>{
    const shelf = document.createElement('div');
    shelf.className = 'closet-shelf';
    group.forEach((book, i)=>{
      const len = (book.titulo||'').length;
      // alto orgánico, sesgado: título más largo → libro más alto
      const h = Math.round((Math.min(196, 146 + Math.max(0, len-10)*1.1) + (hashStr(book.titulo||book.id) % 12)) * mob);
      const d = Math.round((30 + (hashStr(book.id+book.titulo) % 12)) * mob);   // grosor orgánico
      const w = Math.round(h/1.5);
      const slot = document.createElement('div');
      slot.className = 'vault-slot';
      slot._vfBook = book;                       // para el filtro de la bóveda
      slot.style.setProperty('--sw', (d+8)+'px');
      slot.style.setProperty('--h', h+'px');
      slot.style.setProperty('--i', i);

      const scene = bookEl(book, {size:w, still:true, tilt:false});
      scene.style.setProperty('--d', d+'px');
      scene.style.left = Math.round((d+8-w)/2)+'px';
      scene.querySelector('.book-shadow').remove();
      // en el estante: lomo hacia afuera (rotación por variable, no inline)
      scene._book.style.setProperty('--baseY', '90deg');

      // lomo premium: color exacto del borde de la tapa + tipografía variada + tally
      const spine = scene.querySelector('.bf-spine');
      spine.classList.add('vb-solid');
      const st = document.createElement('div');
      st.className = 'vb-title';
      const stSpan = document.createElement('span');
      stSpan.textContent = book.titulo;
      st.appendChild(stSpan);
      applySpineFont(st, book);
      spine.appendChild(st);
      if(hashStr('deco'+(book.titulo||book.id)) % 3 === 0){
        // filetes clásicos arriba y abajo en un tercio de los libros
        [12, 16, h-17, h-13].forEach(y=>{
          const rule = document.createElement('div');
          rule.className = 'vb-deco';
          rule.style.top = y+'px';
          spine.appendChild(rule);
        });
      }
      const nRes = evCount(book,'rescates');
      const hasTally = !!nRes;
      if(hasTally){
        const tally = document.createElement('div');
        tally.className = 'vb-tally';
        for(let k=0;k<Math.min(nRes,5);k++) tally.appendChild(document.createElement('i'));
        spine.appendChild(tally);
      }
      // color exacto del borde → tinta del título con contraste + reflejo en la madera
      const under = document.createElement('div');
      under.className = 'vb-under';
      scene._onEdge = (c)=>{
        if(!c) c = book._color || fallbackColor(book.titulo||book.id);
        spine.style.color = spineInkOf(book, c);
        const lum = 0.299*c.r + 0.587*c.g + 0.114*c.b;
        spine.classList.toggle('spine-light', lum <= 150);
        slot.style.setProperty('--sc-glow', `rgba(${c.r},${c.g},${c.b},.42)`);
      };
      fitSpineTitle(st, stSpan, hasTally ? 20 : 0);

      slot.append(under, scene);
      slot.addEventListener('pointerenter', ()=>{ showDetail(book); Sound.fx.click(); });
      slot.addEventListener('click', ()=>{
        showDetail(book);
        if(opts.onPick) opts.onPick(book, slot);
      });
      if(opts.deletable) attachDelete(slot, ()=>opts.onDelete(book));
      shelf.appendChild(slot);
    });
    const board = document.createElement('div');
    board.className = 'shelf-board';
    closet.append(shelf, board);
  });

  closet.appendChild(detail);
  container.appendChild(closet);
}

/* ============================================================
   CARGA (3 archivos)
   ============================================================ */
function screenUpload(){
  Flow.set(0);
  App.ambient();
  // arranca la noche: una carta por cabeza, contadores limpios,
  // y una copia del mazo por si abandonan a mitad de camino
  State.cartaJugada = {};
  State.rescN = { a:0, b:0 };
  State.rescMax = { a:1, b:1 };
  State.bets = null;
  State.doble = { a:false, b:false };
  State._snapCartas = JSON.parse(JSON.stringify(Cartas));
  show(`
    <div class="eyebrow">Preparar la cosecha</div>
    <h1 class="title" style="font-size:clamp(32px,5vw,52px);">Cargá los libros</h1>
    <p class="lead mt-s">Cinco de cada uno, y la bóveda.
      <button class="tpl-link" id="tplBtn">Descargar plantilla</button>
    </p>

    <div class="upload-grid mt-l stagger">
      ${uploadCard('a', `Los 5 de ${escapeHtml(State.players.a)}`, 0)}
      ${uploadCard('b', `Los 5 de ${escapeHtml(State.players.b)}`, 1)}
      ${uploadCard('vault', 'The Vault (caídos)', 2)}
    </div>

    <div class="names mt-l" style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;">
      <label style="color:var(--bone-dim);font-size:13px;">Nombres:</label>
      <span style="display:inline-flex;align-items:center;gap:8px;">
        <i style="width:9px;height:9px;border-radius:50%;background:var(--pa);"></i>
        <input id="nameA" value="${escapeHtml(State.players.a)}" class="ninput" maxlength="14">
      </span>
      <span style="display:inline-flex;align-items:center;gap:8px;">
        <i style="width:9px;height:9px;border-radius:50%;background:var(--pb);"></i>
        <input id="nameB" value="${escapeHtml(State.players.b)}" class="ninput" maxlength="14">
      </span>
      <label style="color:var(--bone-dim);font-size:13px;margin-left:10px;">📍</label>
      <input id="lugarInput" class="ninput" style="width:190px;" maxlength="30"
        placeholder="¿dónde cosechan hoy?" value="${escapeHtml((()=>{try{return localStorage.getItem('cosecha:lugar')||''}catch(e){return ''}})())}">
      <input id="temaEmoji" class="ninput" style="width:52px;text-align:center;" maxlength="4"
        placeholder="🎃" title="el emoji de la temática (Win + .)">
      <input id="temaInput" class="ninput" style="width:170px;" maxlength="26"
        placeholder="¿temática? (opcional)">
      <span style="font-size:11px;color:var(--grey);">${fechaHoy()}</span>
      ${fotoPickerHTML()}
    </div>

    <div id="uploadErrors" class="mt-m" style="color:var(--danger);font-size:13px;"></div>

    <div class="row mt-l" style="justify-content:flex-start;">
      <button class="btn btn-ghost" id="backHome">← Volver</button>
      <button class="btn btn-amber" id="toSorteo" disabled>Empezar el sorteo →</button>
      <span id="readyHint" style="font-size:12px;color:var(--grey);">falta cargar los libros de los dos</span>
    </div>
  `);

  const loaded = { a:false, b:false };
  // si ya hay bóveda persistida, la dejamos precargada
  const vaultPreloaded = State.vault.length > 0;
  if(vaultPreloaded){
    const drop = $('#drop-vault');
    drop.classList.add('has');
    $('#up-vault').classList.add('loaded');
    drop.innerHTML = `<div class="up-count">${State.vault.length}</div><div>caídos en memoria</div>
      <div style="font-size:11px;color:var(--grey);margin-top:4px;">podés pisarla subiendo un archivo</div>`;
  }

  function wire(slot){
    const card = $(`#up-${slot}`);
    const drop = $(`#drop-${slot}`);
    const input = $(`#file-${slot}`);
    const handle = (text)=>{
      // en el slot de la bóveda también entra el archivo del club entero
      if(slot==='vault'){
        const club = parseClub(text);
        if(club){
          if(club.read.length) State.read = club.read;
          if(club.vault.length) State.vault = club.vault;
          if(club.mazo){ Cartas.mano = club.mazo.mano; Cartas.historial = club.mazo.historial; persistCartas(); }
          Sound.fx.reveal();
          drop.classList.add('has');
          card.classList.add('loaded');
          drop.innerHTML = `<div class="up-count">${club.vault.length}</div><div>caídos (y ${club.read.length} leídos)</div>`;
          return;
        }
      }
      const { books, errors } = parseBooks(text);
      if(!books.length){ toast('No encontré libros en ese archivo'); return; }
      if(slot==='vault') State.vault = books;
      else if(slot==='a') State.booksA = books;
      else State.booksB = books;
      Sound.fx.reveal();
      drop.classList.add('has');
      card.classList.add('loaded');
      drop.innerHTML = `<div class="up-count">${books.length}</div><div>libros cargados</div>`;
      // libritos sellados: se ve CUÁNTOS llegaron, nunca cuáles
      let seals = card.querySelector('.up-seals');
      if(seals) seals.remove();
      seals = document.createElement('div');
      seals.className = 'up-seals';
      const pcol = slot==='a' ? 'var(--pa)' : slot==='b' ? 'var(--pb)' : 'var(--grey)';
      const warns = [];
      books.forEach((b,i)=>{
        const ok = !!b.titulo;
        if(!ok) warns.push(i+1);
        seals.insertAdjacentHTML('beforeend',
          `<div class="seal-book ${b.portada?'':'nocover'} ${ok?'':'warn'}" style="--i:${i};--sc-p:${pcol}"
             title="${ok ? `sellado${b.portada?' · portada ✓':' · sin portada'}` : `el bloque ${i+1} no tiene título`}"><i></i></div>`);
      });
      if(warns.length || books.some(b=>!b.portada)){
        seals.insertAdjacentHTML('beforeend',
          `<div class="seals-note">${warns.length?`⚠ bloque ${warns.join(', ')} sin título · `:''}punto verde = con portada</div>`);
      }
      card.appendChild(seals);
      if(slot!=='vault') loaded[slot]=true;
      $('#uploadErrors').innerHTML = errors.length
        ? `${slot==='a'?escapeHtml(State.players.a):slot==='b'?escapeHtml(State.players.b):'Vault'}: ${errors.map(escapeHtml).join(' ')}` : '';
      checkReady();
    };
    drop.addEventListener('click', ()=>input.click());
    input.addEventListener('change', e=>{
      const f=e.target.files[0]; if(!f) return;
      const r=new FileReader(); r.onload=ev=>handle(ev.target.result); r.readAsText(f);
    });
    drop.addEventListener('dragover', e=>{e.preventDefault();drop.style.borderColor='var(--amber)';});
    drop.addEventListener('dragleave', ()=>{drop.style.borderColor='';});
    drop.addEventListener('drop', e=>{
      e.preventDefault(); drop.style.borderColor='';
      const f=e.dataTransfer.files[0]; if(!f) return;
      const r=new FileReader(); r.onload=ev=>handle(ev.target.result); r.readAsText(f);
    });
    $(`#paste-${slot}`).addEventListener('click', ()=>{
      const who = slot==='a'?State.players.a:slot==='b'?State.players.b:'la bóveda';
      openPasteModal(who, (txt)=>{ if(txt && txt.trim()) handle(txt); });
    });
  }

  function checkReady(){
    const ok = loaded.a && loaded.b && State.booksA.length>=2 && State.booksB.length>=2;
    $('#toSorteo').disabled = !ok;
    const hint = $('#readyHint');
    if(hint) hint.style.display = ok ? 'none' : '';
  }

  ['a','b','vault'].forEach(wire);
  wireFotoPicker();

  $('#tplBtn').addEventListener('click', ()=>{ downloadText('mis-5-libros.txt', BOOK_TEMPLATE); toast('Plantilla descargada'); });
  $('#backHome').addEventListener('click', ()=>{ Sound.fx.click(); screenHome(); });
  $('#toSorteo').addEventListener('click', async ()=>{
    Sound.fx.click();
    State.players.a = $('#nameA').value.trim()||'Jugador 1';
    State.players.b = $('#nameB').value.trim()||'Jugador 2';
    State.cosechaLugar = $('#lugarInput').value.trim();
    try{ localStorage.setItem('cosecha:lugar', State.cosechaLugar); }catch(e){}
    // temática opcional: si no la ponen, no existe y no toca la metadata
    const temaTxt = $('#temaInput').value.trim();
    const temaEmo = $('#temaEmoji').value.trim();
    State.cosechaTema = temaTxt ? ((temaEmo ? temaEmo + ' ' : '') + temaTxt) : '';
    // las fotos de hoy se sacaron antes de escribir el lugar: se lo ponemos ahora
    const hoy = fechaHoy();
    let tocadas = false;
    State.fotos.forEach(f=>{ if(f.fecha===hoy && !f.lugar && State.cosechaLugar){ f.lugar = State.cosechaLugar; tocadas = true; } });
    if(tocadas) await persistFotos();
    // seis libros entran sólo con El Sexto Tributo en la mesa
    for(const who of ['a','b']){
      const libros = who==='a' ? State.booksA : State.booksB;
      if(libros.length > 6){
        toast(`${State.players[who]} trajo ${libros.length} — el máximo es 6, y el sexto pide carta`);
        return;
      }
      if(libros.length === 6){
        if(!tieneCarta(who, 'sexto') || !puedeJugar(who)){
          toast(`${State.players[who]} trajo 6 — el sexto entra sólo con El Sexto Tributo`);
          return;
        }
        const jugado = await new Promise(res=>{
          const ov = overlay(`<div class="ov-pop center">
              <div class="eyebrow" style="color:#E8C34A;">${escapeHtml(State.players[who])} trajo seis</div>
              <div id="stCarta"></div>
              <div class="row mt-m">
                <button class="btn btn-ghost" id="stNo">Vuelvo a cinco</button>
                <button class="btn btn-amber" id="stSi" data-enter>Jugar la carta</button>
              </div>
            </div>`);
          $('#stCarta', ov).appendChild(cartaEl('sexto'));
          $('#stNo', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); res(false); });
          $('#stSi', ov).addEventListener('click', ()=>{ closeOverlay(ov); consumirCarta(who, 'sexto'); Sound.fx.reveal(); res(true); });
        });
        if(!jugado) return;
      }
    }
    // metadata automática: quién trajo cada libro
    State.booksA.forEach(b=>{ if(!b.traidoPor) b.traidoPor = State.players.a; });
    State.booksB.forEach(b=>{ if(!b.traidoPor) b.traidoPor = State.players.b; });
    await persist();
    // REGLA DE ORO: si los dos trajeron el mismo libro, se lee ese. Sin cosecha.
    const common = findCommonBook();
    if(common){ screenUnanime(common); return; }
    screenSorteo();
  });
}

/* ---------- la regla de oro: mismo libro = se lee, sin cosecha ---------- */
const COMBINING_RE = new RegExp('[\\u0300-\\u036f]', 'g');
function normTitle(t){
  return (t||'').toLowerCase().normalize('NFD').replace(COMBINING_RE,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function findCommonBook(){
  const map = new Map(State.booksA.map(b=>[normTitle(b.titulo), b]));
  for(const b of State.booksB){
    const m = map.get(normTitle(b.titulo));
    if(m) return (m.portada && !b.portada) ? m : (b.portada ? b : m);
  }
  return null;
}

async function screenUnanime(book){
  Flow.hide();
  App.ambient('rgba(232,195,74,.1)', 'rgba(201,248,57,.07)');
  Sound.ac();
  // trompetas
  const trumpet = (t0)=>{
    [[392,0],[392,.14],[392,.28],[523.25,.42]].forEach(([f,d])=>
      Sound.tone({freq:f, dur:.16, type:'sawtooth', vol:.12, delay:t0+d, wet:.5}));
    [523.25,659.25,783.99].forEach(f=>Sound.tone({freq:f, dur:1.1, type:'sawtooth', vol:.07, delay:t0+.62, wet:.6}));
  };
  trumpet(0); trumpet(1.1);
  const ov = overlay('', 'humiliation');
  ov.style.background = 'rgba(4,8,4,.97)';
  const slide = (html, heart)=>{
    ov.innerHTML = `<div class="hum-slide">${html}</div>
      <div style="position:absolute;bottom:16px;left:0;right:0;text-align:center;font-size:11px;color:var(--grey);">tocá para pasar</div>`;
    Sound.tone({freq:660, dur:.18, type:'triangle', vol:.1, wet:.5});
    if(heart) for(let i=0;i<16;i++){
      const e = document.createElement('div');
      e.className = 'emoji-fall';
      e.textContent = ['💚','💘','📖','✨'][Math.floor(Math.random()*4)];
      e.style.left = Math.random()*100+'%';
      e.style.animationDelay = (Math.random()*1.4)+'s';
      e.style.fontSize = (16+Math.random()*26)+'px';
      ov.appendChild(e);
    }
  };
  const S = [
    `<div class="hum-big">ESPEREN. 🎺</div>`,
    `<div class="hum-big">LOS DOS TRAJERON<br>EL MISMO LIBRO.</div>`,
    `<div class="hum-big serif" style="color:#E8C34A;">«${escapeHtml(book.titulo)}»</div>`,
    `<div class="hum-big">DOS PERSONAS.<br>UNA SOLA NEURONA. 🧠</div>`,
    `<div class="hum-big">ESTO, SEÑORES,<br>ES AMOR. 💘</div>`,
    `<div class="hum-big">NO HACE FALTA COSECHA.</div>`,
    `<div class="hum-big">NO HACE FALTA RULETA.</div>`,
    `<div class="hum-big">EL CLUB YA HABLÓ. 🎺🎺🎺</div>`,
  ];
  Sound.startMusic('tateti');
  const skip = ()=>new Promise(r=>ov.addEventListener('click', r, {once:true}));
  for(let i=0;i<S.length;i++){
    slide(S[i], i===4);
    if(i===7) trumpet(0);
    await Promise.race([sleep(2300), skip()]);
  }
  Sound.stopMusic();
  closeOverlay(ov);
  // fiesta directa: el libro unánime gana
  ensureColor(book).then(c=>{
    launchConfetti(c);
    setTimeout(()=>Sound.playCelebration(), 400);
  });
  show(`
    <div class="center win-screen" style="min-height:92vh;justify-content:center;">
      <div class="eyebrow" style="color:#E8C34A;animation:winPop .6s var(--ease-pop);">💚 Cosecha unánime</div>
      <div id="unBook" style="animation:winRise 1s var(--ease-pop);"></div>
      <h1 class="serif" style="font-weight:900;font-size:clamp(30px,6vw,64px);margin:26px 0 6px;animation:winPop .8s .2s both var(--ease-pop);">
        ${escapeHtml(book.titulo)}</h1>
      <p class="lead" style="margin:6px auto 0;animation:winPop .8s .35s both var(--ease-pop);">Lo eligieron los dos sin saberlo. No hay nada que discutir.</p>
      <div class="row mt-l" style="animation:winPop .8s .5s both var(--ease-pop);">
        <button class="btn btn-amber" id="unGo">Se lee este. Punto.</button>
      </div>
    </div>
  `, {silent:true});
  const el = bookEl(book, {size:bs(280)});
  $('#unBook').appendChild(el);
  setTimeout(()=>{
    const halo = el.querySelector('.book-halo');
    if(halo){ halo.style.opacity='1'; halo.style.animation='haloPulse 2s ease-in-out infinite'; }
  }, 250);
  $('#unGo').addEventListener('click', async ()=>{
    Sound.fx.click();
    book._metodo = 'Cosecha unánime';
    await saveUndo(`la cosecha unánime de «${book.titulo}»`);
    // los demás libros que trajeron también jugaron: van a la bóveda, no se pierden
    const losers = returnLosersToVault([book]);
    if(losers.length){
      Sound.stopCelebration();
      await drawerReturn(losers, { eyebrow:'Se leyó solo' });
    }
    finishHarvest(book, null);
  });
}

function uploadCard(slot, label, i){
  const dot = slot==='a'?'var(--pa)':slot==='b'?'var(--pb)':'var(--grey)';
  return `
    <div class="up-card" id="up-${slot}" style="--i:${i}">
      <h3><span class="up-dot" style="background:${dot};"></span>${label}</h3>
      <div class="up-sub">${slot==='vault'?'Opcional la primera vez':'archivo .txt'}</div>
      <div class="up-drop" id="drop-${slot}">
        <div style="font-size:22px;">↑</div>
        <div>Soltá o elegí el archivo</div>
      </div>
      <input type="file" id="file-${slot}" accept=".txt,text/plain" style="display:none;">
      <button class="up-paste" id="paste-${slot}">o pegar el texto</button>
    </div>`;
}

/* ---------- MODAL pegar texto ---------- */
function openPasteModal(who, onOk){
  const ov = overlay(`
    <div class="ov-pop" style="width:min(640px,92vw);">
      <div class="eyebrow">Pegá los libros de ${escapeHtml(who)}</div>
      <p class="lead" style="font-size:13px;margin:6px 0 14px;">Un libro por bloque, separados por <code style="color:var(--amber-soft)">---</code>. Cada bloque con <code style="color:var(--amber-soft)">titulo:</code>, <code style="color:var(--amber-soft)">portada:</code> y <code style="color:var(--amber-soft)">sinopsis:</code>.</p>
      <textarea id="pasteArea" class="paste-area" placeholder="titulo: ...
portada: https://...
sinopsis: ...
---
titulo: ..."></textarea>
      <div class="row mt-m" style="justify-content:flex-end;">
        <button class="btn btn-ghost" id="pasteCancel" data-esc>Cancelar</button>
        <button class="btn btn-amber" id="pasteOk">Cargar</button>
      </div>
    </div>`);
  const area = $('#pasteArea', ov);
  area.focus();
  $('#pasteCancel', ov).addEventListener('click', ()=>closeOverlay(ov));
  $('#pasteOk', ov).addEventListener('click', ()=>{ const v=area.value; closeOverlay(ov); onOk(v); });
}

/* ============================================================
   SORTEO — duelo de cartas
   ============================================================ */
function screenSorteo(){
  Flow.set(1);
  State._snapVault = State.vault.map(b=>({...b}));   // por si abandonan a mitad de camino
  saveUndo('la cosecha a medias');                   // la foto del deshacer, ANTES de tocar nada
  State.picks = { a:null, b:null };
  State.booksA.forEach(b=>{ delete b._pickedBy; });
  State.booksB.forEach(b=>{ delete b._pickedBy; });
  show(`
    <div class="center" style="min-height:82vh;justify-content:center;">
      <div class="eyebrow">El sorteo</div>
      <h2 class="serif" style="font-weight:900;font-size:clamp(28px,5vw,46px);margin:0;">¿Quién cosecha primero?</h2>
      <div class="sorteo-duel mt-l">
        <div class="s-card" id="sc-a" style="--pc:var(--pa);">
          <div class="s-name">${escapeHtml(State.players.a)}</div>
          <div class="s-tag">jugadora uno</div>
        </div>
        <div class="s-card" id="sc-b" style="--pc:var(--pb);">
          <div class="s-name">${escapeHtml(State.players.b)}</div>
          <div class="s-tag">jugador dos</div>
        </div>
      </div>
      <button class="btn btn-amber mt-l" id="sortBtn">Sortear</button>
    </div>
  `);
  const cards = { a:$('#sc-a'), b:$('#sc-b') };
  $('#sortBtn').addEventListener('click', ()=>{
    const btn = $('#sortBtn');
    btn.disabled = true;
    let tick=0; const total = 15 + Math.floor(Math.random()*4);
    function next(){
      const cur = tick%2 ? 'b' : 'a';
      cards.a.classList.toggle('lit', cur==='a');
      cards.b.classList.toggle('lit', cur==='b');
      Sound.fx.shuffle();
      tick++;
      if(tick<total){
        const p = tick/total;
        setTimeout(next, 60 + Math.pow(p,2.4)*300);
      } else {
        State.starter = Math.random()<0.5 ? 'a' : 'b';
        const w = State.starter, l = w==='a'?'b':'a';
        cards[w].classList.remove('lit');
        cards[w].classList.add('win');
        cards[l].classList.remove('lit');
        cards[l].classList.add('dim');
        cards[w].querySelector('.s-tag').textContent = 'arranca eligiendo';
        Sound.fx.chosen();
        const r = cards[w].getBoundingClientRect();
        sparkleAt(r.left + r.width/2, r.top + r.height/2, 8);
        setTimeout(()=>{
          screenPassTo(State.starter, ()=>screenChoose(State.starter));
        }, 1600);
      }
    }
    next();
  });
}

/* ============================================================
   PASÁ LA COMPU
   ============================================================ */
function screenPassTo(who, next){
  const name = State.players[who];
  App.ambient(`rgba(${PLAYER_RGB[who]},.09)`, 'rgba(10,25,14,.5)');
  show(`
    <div class="center" style="min-height:86vh;justify-content:center;">
      <div class="eyebrow" style="color:${PLAYER_COLOR[who]};">Le toca elegir a</div>
      <h1 class="title" style="font-size:clamp(56px,11vw,120px);color:${PLAYER_COLOR[who]};
        text-shadow:0 0 60px rgba(${PLAYER_RGB[who]},.3);">${escapeHtml(name)}</h1>
      <button class="btn btn-primary mt-l" id="readyBtn" data-screen-enter>Dale, elijo yo</button>
    </div>
  `);
  const go = ()=>{ Sound.fx.click(); next(); };
  $('#readyBtn').addEventListener('click', go);
  App.keys['Enter'] = go;
}
