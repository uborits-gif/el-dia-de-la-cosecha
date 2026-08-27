
/* ============================================================
   ⚡ LA SUPERCOSECHA — la cosecha con condiciones.
   Una cláusula COMÚN que cumplen los 10 libros (la ven los dos),
   y cinco cláusulas PROPIAS por jugador, en secreto, una por libro.
   Nadie sabe bajo qué reglas jugó el otro hasta que se abre el telón.
   ============================================================ */

/* ---------- el banco de cláusulas (editable / ampliable) ---------- */
/* {id, categoria, texto, dificultad: 1 fácil · 2 media · 3 difícil,
    verificable: 'ojo' | 'hojeando' | 'busqueda', aptaComun} */
const SUPER_CLAUSULAS = [
  // — TÍTULO —
  { id:'ti1',  categoria:'titulo', texto:'El título es una sola palabra',                 dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'ti2',  categoria:'titulo', texto:'El título tiene exactamente dos palabras',      dificultad:2, verificable:'ojo', aptaComun:true },
  { id:'ti3',  categoria:'titulo', texto:'El título tiene tres palabras o más',           dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'ti4',  categoria:'titulo', texto:'El título empieza con vocal',                   dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'ti5',  categoria:'titulo', texto:'El título termina en «a»',                      dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'ti6',  categoria:'titulo', texto:'El título contiene un número',                  dificultad:2, verificable:'ojo', aptaComun:false },
  { id:'ti7',  categoria:'titulo', texto:'El título tiene un signo de puntuación',        dificultad:2, verificable:'ojo', aptaComun:false },
  { id:'ti8',  categoria:'titulo', texto:'El título incluye un nombre propio',            dificultad:2, verificable:'ojo', aptaComun:true },
  { id:'ti9',  categoria:'titulo', texto:'El título no contiene ningún nombre propio',    dificultad:2, verificable:'ojo', aptaComun:true },
  { id:'ti10', categoria:'titulo', texto:'El título tiene más de 15 letras (sin contar espacios)', dificultad:2, verificable:'ojo', aptaComun:true },
  { id:'ti11', categoria:'titulo', texto:'El título es una pregunta',                     dificultad:3, verificable:'ojo', aptaComun:false },
  // — PORTADA —
  { id:'po1',  categoria:'portada', texto:'En la portada predomina el azul',              dificultad:2, verificable:'ojo', aptaComun:true },
  { id:'po2',  categoria:'portada', texto:'En la portada predomina el rojo',              dificultad:2, verificable:'ojo', aptaComun:true },
  { id:'po3',  categoria:'portada', texto:'En la portada predomina el amarillo',          dificultad:2, verificable:'ojo', aptaComun:true },
  { id:'po4',  categoria:'portada', texto:'En la portada predomina el negro',             dificultad:2, verificable:'ojo', aptaComun:true },
  { id:'po5',  categoria:'portada', texto:'La portada es mayormente blanca',              dificultad:2, verificable:'ojo', aptaComun:true },
  { id:'po6',  categoria:'portada', texto:'En la portada aparece una persona o un rostro',dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'po7',  categoria:'portada', texto:'En la portada aparece un animal',              dificultad:2, verificable:'ojo', aptaComun:false },
  { id:'po8',  categoria:'portada', texto:'En la portada aparece una casa o un edificio', dificultad:2, verificable:'ojo', aptaComun:false },
  { id:'po9',  categoria:'portada', texto:'En la portada aparece comida o una planta',    dificultad:2, verificable:'ojo', aptaComun:false },
  { id:'po10', categoria:'portada', texto:'La portada no muestra personas',               dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'po11', categoria:'portada', texto:'La portada es ilustración, no foto',           dificultad:2, verificable:'ojo', aptaComun:true },
  { id:'po12', categoria:'portada', texto:'La portada es puramente tipográfica, sin imagen', dificultad:3, verificable:'ojo', aptaComun:false },
  { id:'po13', categoria:'portada', texto:'El título ocupa menos de un tercio de la portada', dificultad:3, verificable:'ojo', aptaComun:false },
  { id:'po14', categoria:'portada', texto:'Tiene faja, sticker o relieve',                dificultad:2, verificable:'ojo', aptaComun:false },
  // — AUTOR/A —
  { id:'au1',  categoria:'autor', texto:'El apellido del autor empieza con consonante',   dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'au2',  categoria:'autor', texto:'El apellido del autor empieza con vocal',        dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'au3',  categoria:'autor', texto:'El autor tiene dos nombres de pila',             dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'au4',  categoria:'autor', texto:'Escrito por una mujer',                          dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'au5',  categoria:'autor', texto:'Escrito por un varón',                           dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'au6',  categoria:'autor', texto:'Firmado por más de un autor',                    dificultad:2, verificable:'ojo', aptaComun:false },
  { id:'au7',  categoria:'autor', texto:'El autor usa seudónimo',                         dificultad:3, verificable:'busqueda', aptaComun:false },
  { id:'au8',  categoria:'autor', texto:'El autor nació antes de 1950',                   dificultad:3, verificable:'busqueda', aptaComun:false },
  { id:'au9',  categoria:'autor', texto:'El autor nació después de 1985',                 dificultad:3, verificable:'busqueda', aptaComun:false },
  { id:'au10', categoria:'autor', texto:'El autor es de un país distinto al de quien lo recibe', dificultad:2, verificable:'busqueda', aptaComun:false },
  { id:'au11', categoria:'autor', texto:'Es su primer libro / ópera prima',               dificultad:3, verificable:'busqueda', aptaComun:false },
  { id:'au12', categoria:'autor', texto:'Además de escritor es otra cosa (músico, actor…)',dificultad:3, verificable:'busqueda', aptaComun:false },
  // — FORMATO —
  { id:'fo1',  categoria:'formato', texto:'Tiene menos de 250 páginas',                   dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'fo2',  categoria:'formato', texto:'Tiene más de 500 páginas',                     dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'fo3',  categoria:'formato', texto:'La cantidad de páginas es par',                dificultad:2, verificable:'hojeando', aptaComun:false },
  { id:'fo4',  categoria:'formato', texto:'La cantidad de páginas es impar',              dificultad:2, verificable:'hojeando', aptaComun:false },
  { id:'fo5',  categoria:'formato', texto:'Es de tapa blanda',                            dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'fo6',  categoria:'formato', texto:'Es de tapa dura',                              dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'fo7',  categoria:'formato', texto:'Es edición de bolsillo',                       dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'fo8',  categoria:'formato', texto:'Tiene ilustraciones o fotos en el interior',   dificultad:2, verificable:'hojeando', aptaComun:false },
  { id:'fo9',  categoria:'formato', texto:'Tiene un mapa o un árbol genealógico adentro', dificultad:2, verificable:'hojeando', aptaComun:false },
  { id:'fo10', categoria:'formato', texto:'Es una edición especial o de aniversario',     dificultad:2, verificable:'ojo', aptaComun:false },
  { id:'fo11', categoria:'formato', texto:'Esta edición se publicó en la última década',  dificultad:2, verificable:'hojeando', aptaComun:true },
  { id:'fo12', categoria:'formato', texto:'La primera edición del texto es de un año impar', dificultad:3, verificable:'busqueda', aptaComun:false },
  // — CONTENIDO —
  { id:'co1',  categoria:'contenido', texto:'Está narrado en primera persona',            dificultad:2, verificable:'hojeando', aptaComun:true },
  { id:'co2',  categoria:'contenido', texto:'Tiene capítulos muy cortos',                 dificultad:2, verificable:'hojeando', aptaComun:false },
  { id:'co3',  categoria:'contenido', texto:'No tiene capítulos',                         dificultad:2, verificable:'hojeando', aptaComun:false },
  { id:'co4',  categoria:'contenido', texto:'Está ambientado en una ciudad real',         dificultad:2, verificable:'busqueda', aptaComun:true },
  { id:'co5',  categoria:'contenido', texto:'Está ambientado en el futuro',               dificultad:2, verificable:'busqueda', aptaComun:false },
  { id:'co6',  categoria:'contenido', texto:'Está ambientado en el pasado',               dificultad:2, verificable:'busqueda', aptaComun:true },
  { id:'co7',  categoria:'contenido', texto:'Es no ficción',                              dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'co8',  categoria:'contenido', texto:'Es ficción',                                 dificultad:1, verificable:'ojo', aptaComun:true },
  { id:'co9',  categoria:'contenido', texto:'No pertenece a ninguna saga',                dificultad:2, verificable:'busqueda', aptaComun:true },
  { id:'co10', categoria:'contenido', texto:'Es el primero de una saga',                  dificultad:2, verificable:'busqueda', aptaComun:false },
  // — ORIGEN —
  { id:'or1',  categoria:'origen', texto:'Es una traducción',                             dificultad:2, verificable:'ojo', aptaComun:true },
  { id:'or2',  categoria:'origen', texto:'Fue escrito originalmente en español',          dificultad:2, verificable:'ojo', aptaComun:true },
  { id:'or3',  categoria:'origen', texto:'Traducido de un idioma que no sea el inglés',   dificultad:3, verificable:'ojo', aptaComun:false },
  { id:'or4',  categoria:'origen', texto:'Es de una editorial independiente',             dificultad:3, verificable:'busqueda', aptaComun:false },
  { id:'or5',  categoria:'origen', texto:'Es de una editorial local',                     dificultad:2, verificable:'ojo', aptaComun:false },
  { id:'or6',  categoria:'origen', texto:'Es de una editorial de otro país',              dificultad:2, verificable:'ojo', aptaComun:true },
  // — RECONOCIMIENTO —
  { id:'re1',  categoria:'reconocimiento', texto:'Ganó un premio literario',              dificultad:3, verificable:'busqueda', aptaComun:false },
  { id:'re2',  categoria:'reconocimiento', texto:'Fue adaptado a cine o TV',              dificultad:3, verificable:'busqueda', aptaComun:false },
  { id:'re3',  categoria:'reconocimiento', texto:'Fue best-seller o estuvo en listas',    dificultad:2, verificable:'busqueda', aptaComun:true },
  { id:'re4',  categoria:'reconocimiento', texto:'Es un clásico: el texto tiene más de 50 años', dificultad:2, verificable:'busqueda', aptaComun:true },
  { id:'re5',  categoria:'reconocimiento', texto:'Es de un autor que ganó el Nobel',      dificultad:3, verificable:'busqueda', aptaComun:false },
];

const SUPER_DIF = { 1:{e:'🟢', n:'fácil'}, 2:{e:'🟡', n:'media'}, 3:{e:'🔴', n:'difícil'} };
const SUPER_CAT = { titulo:'Título', portada:'Portada', autor:'Autor/a', formato:'Formato',
                    contenido:'Contenido', origen:'Origen', reconocimiento:'Reconocimiento' };
const SUPER_VER = { ojo:'a ojo', hojeando:'hojeando', busqueda:'buscando' };

/* ---------- config (todo ajustable) ---------- */
const SUPER_CONFIG_DEF = {
  propiasPorJugador: 5,
  mezcla: [1,1,2,2,3],          // dificultades del pool propio: 2 fáciles, 2 medias, 1 difícil
  rerollsPorJugador: 1,
  privacidad: 'pasa_el_telefono',
};

/* ---------- el estado del modo ---------- */
const Super = {
  activa: false,
  estado: 'off',                 // setup·sorteo_comun·sorteo_propias·carga·sellado·revelado
  comun: null,
  propias: { a:[], b:[] },
  rerolls: { a:0, b:0 },
  sellado: { a:false, b:false },
  config: { ...SUPER_CONFIG_DEF },
};

function superReset(){
  Super.activa = false; Super.estado = 'off'; Super.comun = null;
  Super.propias = { a:[], b:[] };
  Super.rerolls = { a:0, b:0 };
  Super.sellado = { a:false, b:false };
  Super.config = { ...SUPER_CONFIG_DEF };
}

/* ---------- sorteo ---------- */
const superPool = (dif, excluir=[], soloComun=false) =>
  SUPER_CLAUSULAS.filter(c => c.dificultad===dif && !excluir.includes(c.id) && (!soloComun || c.aptaComun));

function superSortearComun(excluir=[]){
  // la común la cumplen los 10 libros: siempre de las fáciles o medias
  const pool = SUPER_CLAUSULAS.filter(c => c.aptaComun && c.dificultad<=2 && !excluir.includes(c.id));
  return pool[Math.floor(Math.random()*pool.length)];
}
function superSortearPropias(){
  const usadas = Super.comun ? [Super.comun.id] : [];
  const out = [];
  Super.config.mezcla.forEach(dif=>{
    let pool = superPool(dif, [...usadas, ...out.map(c=>c.id)]);
    if(!pool.length) pool = superPool(dif, out.map(c=>c.id));      // por si se agotó
    const c = pool[Math.floor(Math.random()*pool.length)];
    if(c) out.push(c);
  });
  return out;
}
function superRerollUna(who, idx){
  const otras = Super.propias[who].filter((_,i)=>i!==idx).map(c=>c.id);
  const dif = Super.propias[who][idx].dificultad;
  const usadas = [...otras, Super.propias[who][idx].id, Super.comun ? Super.comun.id : ''];
  let pool = superPool(dif, usadas);
  if(!pool.length) pool = superPool(dif, otras);
  if(!pool.length) return false;
  Super.propias[who][idx] = pool[Math.floor(Math.random()*pool.length)];
  Super.rerolls[who]--;
  return true;
}

/* ---------- piezas visuales ---------- */
const superChip = (c, cls='') => `<span class="sc-chip d${c.dificultad} ${cls}">
  <i>${SUPER_DIF[c.dificultad].e}</i>${escapeHtml(SUPER_CAT[c.categoria]||c.categoria)}</span>`;

const superClausulaHTML = (c, extra='') => `
  <div class="sc-cl d${c.dificultad} ${extra}">
    <div class="sc-cl-top">${superChip(c)}<span class="sc-ver">${SUPER_VER[c.verificable]||''}</span></div>
    <div class="sc-cl-txt">${escapeHtml(c.texto)}</div>
  </div>`;

/* el reel: la cláusula pasa girando y frena en la que salió */
async function superReel(box, elegida, vueltas=18){
  const pool = SUPER_CLAUSULAS;
  for(let i=0;i<vueltas;i++){
    const c = pool[Math.floor(Math.random()*pool.length)];
    box.innerHTML = superClausulaHTML(c, 'girando');
    try{ Sound.fx.tick(i/vueltas); }catch(e){}
    await sleep(46 + Math.pow(i/vueltas, 2.7)*300);
  }
  box.innerHTML = superClausulaHTML(elegida, 'salio');
  try{ Sound.fx.chosen(); }catch(e){}
  const r = box.getBoundingClientRect();
  try{ sparkleAt(r.left + r.width/2, r.top + r.height/2, 10); }catch(e){}
}

/* ============================================================
   FLUJO
   ============================================================ */
function superEmpezar(){
  const ov = overlay(`
    <div class="ov-pop center sc-ov" style="max-width:520px;">
      <div class="eyebrow" style="color:#E8C34A;">⚡ Supercosecha</div>
      <h2 class="serif" style="font-size:clamp(24px,4vw,34px);font-weight:900;margin:6px 0 0;">La cosecha, con condiciones</h2>
      <p class="lead" style="font-size:13.5px;margin-top:12px;">
        Se sortea <b>una cláusula común</b> que van a cumplir los 10 libros — esa la ven los dos.
        Y después cada uno sortea <b>${Super.config.propiasPorJugador} cláusulas propias</b>, en secreto:
        una por libro. Nadie sabe las del otro hasta que se abre el telón.</p>
      <div class="sc-mix">${Super.config.mezcla.map(d=>`<i class="d${d}">${SUPER_DIF[d].e}</i>`).join('')}
        <span>la mezcla de cada uno</span></div>
      <div class="row mt-m">
        <button class="btn btn-ghost" data-esc id="scNo">Mejor no</button>
        <button class="btn btn-amber" data-enter id="scSi">⚡ Empezar la Supercosecha</button>
      </div>
    </div>`);
  $('#scNo', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
  $('#scSi', ov).addEventListener('click', ()=>{
    closeOverlay(ov);
    superReset();
    Super.activa = true;
    Super.rerolls = { a:Super.config.rerollsPorJugador, b:Super.config.rerollsPorJugador };
    try{ Sound.startMusic('lobby'); }catch(e){}
    superPantallaComun();
  });
}

/* ---- 1. la cláusula común ---- */
function superPantallaComun(){
  Super.estado = 'sorteo_comun';
  App.ambient('rgba(232,195,74,.09)', 'rgba(12,30,14,.6)');
  show(`
    <div class="center sc-screen cab-pantalla">
      <div class="cab-cabeza">
        <div class="eyebrow" style="color:#E8C34A;">⚡ Supercosecha · la común</div>
        <h1 class="title">La regla de la casa</h1>
        <p class="lead">Una sola cláusula que van a cumplir <b>los 10 libros</b>. La ven los dos.</p>
      </div>
      ${cabineteHTML()}
      <div class="cab-pie">
        <div class="row" id="scComunBtns">
          <button class="btn btn-amber" id="scGirar" data-enter>Abrir el cajón</button>
        </div>
      </div>
    </div>`);
  cabineteAjustar();

  const usadas = [];
  let sembrado = false;

  const sacarComun = async ()=>{
    const c = superSortearComun(usadas);
    if(!c){ toast('Se agotaron las cláusulas comunes'); return null; }
    cabMesa().innerHTML = '';
    if(!sembrado){ sembrado = true; await cabineteSembrar(); }
    await cabineteAbrir(c.dificultad);
    await cabineteSacar(c.dificultad, c, { comun:true });
    await sleep(200);
    await cabineteCerrar(c.dificultad);
    Super.comun = c; usadas.push(c.id);
    return c;
  };

  const pintarBotones = ()=>{
    $('#scComunBtns').innerHTML = `
      <button class="btn btn-ghost" id="scOtra">🔁 Otra (los dos de acuerdo)</button>
      <button class="btn btn-amber" id="scOk" data-enter>Va esta →</button>`;
    $('#scOtra').addEventListener('click', async ()=>{
      $('#scComunBtns').innerHTML = '<button class="btn btn-amber" disabled>Abriendo…</button>';
      await sacarComun();
      pintarBotones();
    });
    $('#scOk').addEventListener('click', ()=>superPantallaPropias('a'));
  };

  $('#scGirar').addEventListener('click', async ()=>{
    $('#scComunBtns').innerHTML = '<button class="btn btn-amber" disabled>Abriendo…</button>';
    const c = await sacarComun();
    if(!c){ $('#scComunBtns').innerHTML = '<button class="btn btn-amber" id="scGirar">Abrir el cajón</button>'; return; }
    pintarBotones();
  });
}

/* ---- 2. las propias, en secreto (pasa el teléfono) ---- */
function superPantallaPropias(who){
  Super.estado = 'sorteo_propias';
  const quien = State.players[who];
  const col = who==='a' ? 'var(--pa)' : 'var(--pb)';
  App.ambient();
  show(`
    <div class="center sc-screen" style="min-height:72vh;justify-content:center;">
      <div class="eyebrow" style="color:var(--grey);">Que no mire el otro</div>
      <h1 class="title" style="font-size:clamp(28px,5.5vw,46px);color:${col};">Le toca a ${escapeHtml(quien)}</h1>
      <p class="lead mt-s" style="margin:auto;max-width:420px;">Tus ${Super.config.propiasPorJugador} cláusulas
        salen de los mismos cajones y son secretas:
        ${escapeHtml(State.players[who==='a'?'b':'a'])} no las va a ver hasta el final.</p>
      <div class="row mt-l"><button class="btn btn-amber" id="scGo" data-enter>Soy ${escapeHtml(quien)} · abrir los cajones</button></div>
    </div>`);
  $('#scGo').addEventListener('click', async ()=>{
    Super.propias[who] = superSortearPropias();
    await superSacarPropias(who);
  });
}

/* el sorteo con el mueble: sólo la primera vez */
async function superSacarPropias(who){
  const quien = State.players[who];
  const col = who==='a' ? 'var(--pa)' : 'var(--pb)';
  const otro = who==='a' ? 'b' : 'a';
  App.ambient('rgba(232,195,74,.07)', 'rgba(12,30,14,.55)');

  show(`
    <div class="center sc-screen cab-pantalla">
      <div class="cab-cabeza">
        <div class="eyebrow" style="color:#E8C34A;">⚡ Tus cláusulas · ${escapeHtml(quien)}</div>
        <h1 class="title" style="color:${col};">Una por libro</h1>
        ${Super.comun?`<p class="sc-comun-linea">La común: <b>${escapeHtml(Super.comun.texto)}</b></p>`:''}
      </div>
      ${cabineteHTML()}
      <div class="cab-pie">
        <div class="row" id="scPropBtns"></div>
        <p class="lead" id="scRRnota" style="font-size:11.5px;opacity:.7;margin-top:8px;"></p>
      </div>
    </div>`);
  cabineteAjustar();

  const montarReroll = (ficha, i)=>{
    const b = document.createElement('button');
    b.className = 'sc-rr'; b.title = 'cambiar esta cláusula'; b.textContent = '🔁';
    b.addEventListener('click', async ()=>{
      if(Super.rerolls[who] <= 0) return;
      const antes = Super.propias[who][i];
      if(!superRerollUna(who, i)){ toast('No quedan cláusulas de esa dificultad'); return; }
      const c = Super.propias[who][i];
      await cabineteAbrir(antes.dificultad);
      await _cabVuelo(cabCajon(antes.dificultad), ficha.firstElementChild, true);
      ficha.remove();
      const nueva = await cabineteSacar(c.dificultad, c, { num:i+1, idx:i });
      if(nueva && Super.rerolls[who] > 0) montarReroll(nueva, i);
      await cabineteCerrar();
      pintarNota();
      if(Super.rerolls[who] <= 0) document.querySelectorAll('.cab-ficha .sc-rr').forEach(x=>x.remove());
    });
    const cab = ficha.querySelector('.cab-ficha-top');
    if(cab) cab.insertBefore(b, cab.querySelector('b'));
    else (ficha.firstElementChild || ficha).appendChild(b);
  };

  const pintarNota = ()=>{
    const n = $('#scRRnota');
    if(n) n.innerHTML = Super.rerolls[who] > 0
      ? 'Te queda' + (Super.rerolls[who]===1?'':'n') + ' <b>' + Super.rerolls[who] + '</b> cambio'
        + (Super.rerolls[who]===1?'':'s') + ' · tocá 🔁 en una cláusula'
      : 'Sin cambios disponibles.';
  };

  const pintarBotones = ()=>{
    $('#scPropBtns').innerHTML = `
      <button class="btn btn-ghost" id="scPrint">📄 Bajar mi plantilla</button>
      <button class="btn btn-amber" id="scListo" data-enter>${
        who==='a' && !Super.propias.b.length
          ? 'Guardar y pasarle a ' + escapeHtml(State.players[otro]) + ' →'
          : 'Listo, las memoricé →'}</button>`;
    pintarNota();
    $('#scPrint').addEventListener('click', ()=>{
      downloadText('supercosecha-' + quien.toLowerCase() + '.txt', superPlantilla(who));
      toast('Plantilla con tus cláusulas descargada');
    });
    $('#scListo').addEventListener('click', async ()=>{
      $('#scPropBtns').innerHTML = '<button class="btn btn-amber" disabled>Guardando…</button>';
      await cabineteGuardar();
      if(who==='a' && !Super.propias.b.length) superPasaTelefono(otro);
      else superPantallaCarga();
    });
  };

  await sleep(280);
  for(let i=0;i<Super.propias[who].length;i++){
    const c = Super.propias[who][i];
    await cabineteAbrir(c.dificultad);
    const ficha = await cabineteSacar(c.dificultad, c, { num:i+1, idx:i });
    if(ficha && Super.rerolls[who] > 0) montarReroll(ficha, i);
    await sleep(70);
  }
  await cabineteCerrar();
  pintarBotones();
}

/* volver a mirarlas después: lista pelada, sin mueble ni animación */
function superVerPropias(who, primeraVez){
  if(primeraVez) return superSacarPropias(who);
  const quien = State.players[who];
  const col = who==='a' ? 'var(--pa)' : 'var(--pb)';
  App.ambient('rgba(232,195,74,.06)', 'rgba(12,30,14,.5)');
  const lista = (Super.propias[who]||[]);
  show(`
    <div class="center sc-screen sc-lista-pant">
      <div class="cab-cabeza">
        <div class="eyebrow" style="color:#E8C34A;">⚡ Tus cláusulas · ${escapeHtml(quien)}</div>
        <h1 class="title" style="color:${col};">Una por libro</h1>
        ${Super.comun?`<p class="sc-comun-linea">La común: <b>${escapeHtml(Super.comun.texto)}</b></p>`:''}
      </div>
      <div class="sc-lista-fija">
        ${lista.map((c,i)=>`<div class="sc-fila"><span class="sc-fila-n">${i+1}</span>${superClausulaHTML(c)}</div>`).join('')
          || '<div class="st-hint">Todavía no sorteaste tus cláusulas.</div>'}
      </div>
      <div class="cab-pie">
        <div class="row">
          <button class="btn btn-ghost" id="scPrint">📄 Bajar mi plantilla</button>
          <button class="btn btn-amber" id="scVolver" data-enter>Listo →</button>
        </div>
      </div>
    </div>`);
  $('#scPrint').addEventListener('click', ()=>{
    downloadText('supercosecha-' + quien.toLowerCase() + '.txt', superPlantilla(who));
    toast('Plantilla con tus cláusulas descargada');
  });
  $('#scVolver').addEventListener('click', ()=>superPantallaCarga());
}

/* el gate de «pasá el teléfono» */
function superPasaTelefono(who){
  App.ambient();
  show(`
    <div class="center sc-screen" style="min-height:72vh;justify-content:center;">
      <div class="eyebrow" style="color:var(--grey);">Pasá el teléfono</div>
      <h1 class="title" style="font-size:clamp(28px,6vw,48px);">Ahora ${escapeHtml(State.players[who])}</h1>
      <p class="lead mt-s">Las cláusulas del otro ya volvieron al cajón. Nadie las ve hasta el final.</p>
      <div class="row mt-l"><button class="btn btn-amber" id="scPg" data-enter>Listo, soy ${escapeHtml(State.players[who])}</button></div>
    </div>`);
  $('#scPg').addEventListener('click', ()=>superPantallaPropias(who));
}

/* ---------- la plantilla con las restricciones ---------- */
function superPlantilla(who){
  const quien = State.players[who];
  const L = [];
  L.push('# ⚡ SUPERCOSECHA — las cláusulas de ' + quien);
  L.push('# La COMÚN la cumplen TODOS tus libros:');
  if(Super.comun) L.push('#   ' + SUPER_DIF[Super.comun.dificultad].e + ' ' + Super.comun.texto);
  L.push('#');
  L.push('# Y cada libro cumple ADEMÁS su propia cláusula:');
  Super.propias[who].forEach((c,i)=>{
    L.push('#   Libro ' + (i+1) + ': ' + SUPER_DIF[c.dificultad].e + ' ' + c.texto);
  });
  L.push('#');
  L.push('# Completá abajo. No borres las líneas de ---');
  L.push('');
  Super.propias[who].forEach((c,i)=>{
    L.push('titulo: ');
    L.push('portada: ');
    L.push('sinopsis: ');
    L.push('restricciones: ' + (Super.comun ? Super.comun.texto + ' | ' : '') + c.texto);
    if(i < Super.propias[who].length-1) L.push('---');
  });
  return L.join('\n');
}

/* ---- 3. la carga: vuelve a la pantalla de siempre, en modo super ---- */
function superPantallaCarga(){
  Super.estado = 'carga';
  toast('⚡ Ahora carguen los libros que cumplen sus cláusulas');
  screenUpload();
}

/* el bloque que se inyecta arriba de la pantalla de carga cuando el modo está activo */
function superBannerHTML(){
  if(!Super.activa) return '';
  return `
    <div class="sc-banner" id="scBanner">
      <div class="sc-banner-l">
        <div class="sc-badge">⚡ SUPERCOSECHA</div>
        ${Super.comun ? `<div class="sc-banner-comun">
          <span>LA COMÚN — la cumplen los 10 libros</span>
          <b>${SUPER_DIF[Super.comun.dificultad].e} ${escapeHtml(Super.comun.texto)}</b>
        </div>` : ''}
      </div>
      <div class="sc-banner-r">
        <button class="load-btn" id="scMisA">🔒 Cláusulas de ${escapeHtml(State.players.a)}</button>
        <button class="load-btn" id="scMisB">🔒 Cláusulas de ${escapeHtml(State.players.b)}</button>
        <button class="load-btn" id="scSalir">✕ Volver a cosecha normal</button>
      </div>
    </div>`;
}

/* engancha los botones del banner (lo llama screenUpload) */
function superWireBanner(){
  if(!Super.activa) return;
  const ver = (who)=>{
    const ov = overlay(`
      <div class="ov-pop center sc-ov" style="max-width:420px;">
        <div class="eyebrow" style="color:var(--grey);">Privado</div>
        <h2 class="serif" style="font-size:22px;font-weight:800;margin:6px 0 0;">
          ¿Sos ${escapeHtml(State.players[who])}?</h2>
        <p class="lead" style="font-size:13px;margin-top:10px;">Que no mire el otro.</p>
        <div class="row mt-m">
          <button class="btn btn-ghost" data-esc id="svNo">Cancelar</button>
          <button class="btn btn-amber" data-enter id="svSi">Sí, mostrame</button>
        </div>
      </div>`);
    $('#svNo', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
    $('#svSi', ov).addEventListener('click', ()=>{
      closeOverlay(ov); Sound.fx.click();
      Super._volverACarga = true;
      superVerPropias(who, false);
    });
  };
  const a = $('#scMisA'), b = $('#scMisB'), s = $('#scSalir');
  if(a) a.addEventListener('click', ()=>ver('a'));
  if(b) b.addEventListener('click', ()=>ver('b'));
  if(s) s.addEventListener('click', ()=>{
    const ov = overlay(`
      <div class="ov-pop center" style="max-width:440px;">
        <div class="eyebrow" style="color:var(--danger);">Salir de la Supercosecha</div>
        <h2 class="serif" style="font-size:23px;font-weight:700;margin:6px 0 0;">¿Volvemos a la cosecha normal?</h2>
        <p class="lead" style="font-size:13.5px;margin-top:10px;">Se pierde el sorteo: la común y las cláusulas de los dos.</p>
        <div class="row mt-m">
          <button class="btn btn-ghost" data-esc id="ssNo">No, seguimos</button>
          <button class="btn btn-danger" data-enter id="ssSi">Sí, volver a normal</button>
        </div>
      </div>`);
    $('#ssNo', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
    $('#ssSi', ov).addEventListener('click', ()=>{
      closeOverlay(ov); superReset(); toast('Cosecha normal'); screenUpload();
    });
  });
}

/* ---- 4. el telón: se revelan las cláusulas de los dos ---- */
function superRevelar(done){
  Super.estado = 'revelado';
  try{ Sound.stopMusic(); }catch(e){}
  App.ambient('rgba(232,195,74,.12)', 'rgba(12,30,14,.65)');
  show(`
    <div class="sc-telon" id="scTelon">
      <div class="sc-tela izq"></div><div class="sc-tela der"></div>
      <div class="sc-telon-txt"><div class="eyebrow" style="color:#E8C34A;">⚡ Supercosecha</div>
        <h1 class="title" style="font-size:clamp(28px,6vw,52px);">Se abre el telón</h1></div>
    </div>
    <div class="center sc-screen sc-reveal" id="scRev" style="min-height:80vh;justify-content:center;opacity:0;">
      <div class="eyebrow" style="color:#E8C34A;">Bajo qué reglas jugó cada uno</div>
      <h1 class="title" style="font-size:clamp(26px,4.5vw,42px);">Las cláusulas</h1>
      ${Super.comun?`<div class="sc-comun-big mt-m">
        <span>LA COMÚN · los 10 libros</span>${superClausulaHTML(Super.comun)}</div>`:''}
      <div class="sc-dos mt-l">
        ${['a','b'].map(w=>`
          <div class="sc-col ${w}">
            <div class="sc-col-h">${escapeHtml(State.players[w])}</div>
            ${Super.propias[w].map((c,i)=>`<div class="sc-row mini" style="--i:${i}">
              <div class="sc-num">${i+1}</div>${superClausulaHTML(c)}</div>`).join('')}
          </div>`).join('')}
      </div>
      <div class="row mt-l"><button class="btn btn-amber" id="scSeguir" data-enter>Seguir con la cosecha →</button></div>
    </div>`);
  setTimeout(()=>{
    const t = $('#scTelon'); if(t) t.classList.add('abierto');
    try{ Sound.fx.riser(1.1); }catch(e){}
  }, 500);
  setTimeout(()=>{
    const r = $('#scRev'); if(r) r.style.opacity = '1';
    try{ Sound.fx.fanfare(); }catch(e){}
    const t = $('#scTelon'); if(t) t.style.pointerEvents = 'none';
  }, 1500);
  setTimeout(()=>{
    const btn = $('#scSeguir');
    if(btn) btn.addEventListener('click', ()=>{ Sound.fx.click(); done(); });
  }, 1600);
}

/* ============================================================
   LA METADATA — bitácora propia 'clausulas', con su formato:
   "fecha · cláusula común · cláusula del libro"
   Se guarda igual que cosechas/puestos, así se serializa, se parsea,
   se edita a mano y viaja en el archivo del club sin inventar nada nuevo.
   ============================================================ */
const superLimpia = t => String(t||'').replace(/[·|]/g,'-').trim();   // no romper los separadores

/* qué cláusula le tocó a este libro (se resuelve por posición en la tanda) */
function superClausulaDe(book){
  if(!Super.activa) return null;
  for(const w of ['a','b']){
    const libros = w==='a' ? State.booksA : State.booksB;
    const i = (libros||[]).indexOf(book);
    if(i >= 0) return { propia: Super.propias[w][i] || null, comun: Super.comun, quien: State.players[w] };
  }
  return null;
}
/* lo que quedó escrito en el libro (sirve después, cuando ya no hay partida) */
function superClausulasGuardadas(book){
  const ev = (typeof evList === 'function') ? evList(book, 'clausulas') : [];
  return ev.length ? ev[ev.length-1] : null;
}

/* cada libro se lleva puestas las cláusulas que cumplió esa noche */
function superSellarLibros(){
  if(!Super.activa) return;
  const hoy = fechaHoy();
  const comun = Super.comun ? superLimpia(Super.comun.texto) : '';
  ['a','b'].forEach(w=>{
    const libros = w==='a' ? State.booksA : State.booksB;
    (libros||[]).forEach((b,i)=>{
      const propia = Super.propias[w][i];
      if(typeof evTiene === 'function' && evTiene(b, 'clausulas', hoy)) return;
      evPush(b, 'clausulas', { fecha:hoy, quien:comun, extra: propia ? superLimpia(propia.texto) : '' });
    });
  });
}

/* ============================================================
   EL REVELADO — recién cuando alguien ELIGE un libro se sabe
   qué cláusula tenía que cumplir. Antes, nada.
   ============================================================ */
function superClausulaDelElegidoHTML(book){
  const d = superClausulaDe(book);
  if(!d || !d.propia) return '';
  return `
    <div class="sc-revelado">
      <div class="sc-revelado-h">⚡ la cláusula de este libro</div>
      <div class="sc-cl d${d.propia.dificultad} salio">
        <div class="sc-cl-top">${superChip(d.propia)}<span class="sc-ver">${SUPER_VER[d.propia.verificable]||''}</span></div>
        <div class="sc-cl-txt">${escapeHtml(d.propia.texto)}</div>
      </div>
      ${d.comun?`<div class="sc-revelado-c">+ la común · ${escapeHtml(d.comun.texto)}</div>`:''}
    </div>`;
}

/* ============================================================
   EL RESUMEN — todo junto (cláusulas + portadas), antes del rescate
   ============================================================ */
function superResumen(done){
  if(!Super.activa){ done(); return; }
  Super.estado = 'revelado';
  App.ambient('rgba(232,195,74,.1)', 'rgba(12,30,14,.6)');
  const fila = (w)=>{
    const libros = (w==='a' ? State.booksA : State.booksB) || [];
    const elegidos = new Set((State.picks[w]||[]).map(b=>b.id));
    return `
      <div class="sc-res-col ${w}">
        <div class="sc-res-h">${escapeHtml(State.players[w])}</div>
        <div class="sc-res-libros">
          ${libros.map((b,i)=>{
            const c = Super.propias[w][i];
            const ok = elegidos.has(b.id);
            return `<div class="sc-res-item${ok?' elegido':''}" style="--i:${i}">
              <div class="sc-res-cov" ${cov(b)}>${ok?'<span class="sc-res-tick">★</span>':''}</div>
              <div class="sc-res-info">
                <div class="sc-res-t">${escapeHtml(short(b.titulo,30))}</div>
                ${c?`<div class="sc-res-cl d${c.dificultad}">
                  <i>${SUPER_DIF[c.dificultad].e}</i>${escapeHtml(c.texto)}</div>`:''}
              </div></div>`;
          }).join('')}
        </div>
      </div>`;
  };
  show(`
    <div class="sc-telon" id="scTelon">
      <div class="sc-tela izq"></div><div class="sc-tela der"></div>
      <div class="sc-telon-txt">
        <div class="eyebrow" style="color:#E8C34A;">⚡ Supercosecha</div>
        <h1 class="title" style="font-size:clamp(28px,6vw,52px);">Se abre el telón</h1>
      </div>
    </div>
    <div class="center sc-screen sc-reveal" id="scRev" style="min-height:86vh;justify-content:flex-start;padding-top:20px;opacity:0;">
      <div class="eyebrow" style="color:#E8C34A;">⚡ Supercosecha · el resumen</div>
      <h1 class="title" style="font-size:clamp(26px,4.5vw,42px);">Bajo qué reglas jugó cada uno</h1>
      ${Super.comun?`<div class="sc-comun-big mt-m">
        <span>LA COMÚN · la cumplían los 10 libros</span>${superClausulaHTML(Super.comun)}</div>`:''}
      <div class="sc-res mt-l">${fila('a')}${fila('b')}</div>
      <div class="row mt-l"><button class="btn btn-amber" id="scSeguir" data-enter>Seguir al rescate →</button></div>
    </div>`);
  setTimeout(()=>{ const t=$('#scTelon'); if(t) t.classList.add('abierto');
    try{ Sound.fx.riser(1.1); }catch(e){} }, 420);
  setTimeout(()=>{ const r=$('#scRev'); if(r) r.style.opacity='1';
    try{ Sound.fx.fanfare(); }catch(e){}
    const t=$('#scTelon'); if(t) t.style.pointerEvents='none'; }, 1400);
  setTimeout(()=>{ const b=$('#scSeguir');
    if(b) b.addEventListener('click', ()=>{ try{ Sound.fx.click(); }catch(e){} done(); }); }, 1500);
}
