
/* ============================================================
   EL DÍA DE LA COSECHA v2 — núcleo
   ============================================================ */

/* ============================================================
   EMOJIS iOS — el sistema los dibuja con la fuente del SO (en Windows
   salen chatos). Acá cada emoji que usamos se cambia por su PNG de iOS.
   Un MutationObserver los pinta también en todo lo que se crea después.
   ============================================================ */
const EMO_MAP = (()=>{
  const m = new Map();
  Object.entries(typeof EMO_IMG !== 'undefined' ? EMO_IMG : {}).forEach(([cp, b64])=>{
    m.set(String.fromCodePoint(...cp.split('-').map(h=>parseInt(h,16))), b64);
  });
  return m;
})();
const VS16 = '️';
const emoKey = s => [...s].filter(c=>c!==VS16).join('');
const EMO_RE = (()=>{
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const chars = [...EMO_MAP.keys()].sort((a,b)=>b.length - a.length);   // los largos primero
  if(!chars.length) return null;
  return new RegExp('(?:' + chars.map(c=>esc(c) + VS16 + '?').join('|') + ')', 'gu');
})();
const EMO_SKIP = { SCRIPT:1, STYLE:1, TEXTAREA:1, TITLE:1, CANVAS:1, INPUT:1, OPTION:1 };

function emoImg(ch){
  const img = document.createElement('img');
  img.className = 'emo';
  img.src = 'data:image/webp;base64,' + EMO_MAP.get(emoKey(ch));
  img.alt = ch;                 // el emoji sigue existiendo para copiar/pegar y accesibilidad
  img.draggable = false;
  return img;
}
function emojifyText(node){
  const txt = node.nodeValue;
  if(!txt || txt.length > 4000) return;
  EMO_RE.lastIndex = 0;
  if(!EMO_RE.test(txt)) return;
  EMO_RE.lastIndex = 0;
  const frag = document.createDocumentFragment();
  let last = 0, m;
  while((m = EMO_RE.exec(txt))){
    if(m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
    frag.appendChild(emoImg(m[0]));
    last = m.index + m[0].length;
  }
  if(last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
  if(node.parentNode) node.parentNode.replaceChild(frag, node);
}
function emojify(root){
  if(!EMO_RE || !root) return;
  if(root.nodeType === 3) return emojifyText(root);
  if(root.nodeType !== 1) return;
  if(EMO_SKIP[root.nodeName]) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (n.parentNode && EMO_SKIP[n.parentNode.nodeName])
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  const nodes = [];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(emojifyText);
}
/* todo lo que aparezca de acá en más también se emojifica */
function startEmoji(){
  if(!EMO_RE) return;
  // los emojis que viven en un ::after de CSS no los ve el observer: van por variable
  const spark = EMO_MAP.get('✨');
  if(spark) document.documentElement.style.setProperty('--emo-spark', `url(data:image/webp;base64,${spark})`);
  emojify(document.body);
  new MutationObserver(muts=>{
    for(const mu of muts) for(const n of mu.addedNodes) emojify(n);
  }).observe(document.body, { childList:true, subtree:true });
}

/* ---------- estado global ---------- */
const State = {
  players: { a: 'Maru', b: 'Uri' },
  booksA: [],
  booksB: [],
  vault: [],     // caídos de cosechas anteriores  {id,titulo,portada,sinopsis,rescates}
  read: [],      // estante de honor
  fotos: [],     // recuerdos del club  {id,src,fecha,lugar,libro,pie}
  starter: null,
  picks: { a: null, b: null },
  finalists: [],
  duelos: [],    // duelos de final del Vasallaje (para las estadísticas)
};

const PLAYER_COLOR = { a:'var(--pa)', b:'var(--pb)' };
const PLAYER_RGB   = { a:'201,248,57', b:'124,212,255' };

/* ---------- leídos por defecto (cosechas pasadas) ---------- */
const DEFAULT_READ = [
  { id:'r-mar', titulo:'Yo que nunca supe de los hombres', readDate:'mar 2026',
    portada:'https://www.alianzaeditorial.es/imagenes/libros/grande/9791370090982-yo-que-nunca-supe-de-los-hombres.jpg',
    sinopsis:'Una niña crece encerrada con otras mujeres sin saber qué pasó afuera.' },
  { id:'r-abr', titulo:'Proyecto Hail Mary', readDate:'abr 2026',
    portada:'https://www.penguinlibros.com/ar/7605283/proyecto-hail-mary.jpg',
    sinopsis:'Un hombre despierta solo en una nave sin recordar quién es.' },
  { id:'r-may', titulo:'La vegetariana', readDate:'may 2026',
    portada:'https://www.penguinlibros.com/ar/4591201-large_default/la-vegetariana.webp',
    sinopsis:'Una mujer decide dejar de comer carne y todo se vuelve perturbador.' },
  { id:'r-jun', titulo:'The Wedding People', readDate:'jun 2026',
    portada:'https://mpd-biblio-covers.imgix.net/9781250899576.jpg',
    sinopsis:'Una mujer llega sola a un hotel lleno de gente de una boda, en un momento límite de su vida.' },
];

/* ---------- persistencia ---------- */
const HAS_STORAGE = (typeof window !== 'undefined' && window.storage);

async function loadPersisted(){
  let gotRead = false;
  if(HAS_STORAGE){
    try{
      const r = await window.storage.get('cosecha:read');
      if(r && r.value){ State.read = JSON.parse(r.value); gotRead = true; }
    }catch(e){}
    try{
      const v = await window.storage.get('cosecha:vault');
      if(v && v.value) State.vault = JSON.parse(v.value);
    }catch(e){}
    try{
      const n = await window.storage.get('cosecha:names');
      if(n && n.value) State.players = JSON.parse(n.value);
    }catch(e){}
  }
  if(!gotRead){
    try{
      const r = localStorage.getItem('cosecha:read');
      if(r){ State.read = JSON.parse(r); gotRead = true; }
      const v = localStorage.getItem('cosecha:vault');
      if(v) State.vault = JSON.parse(v);
      const n = localStorage.getItem('cosecha:names');
      if(n) State.players = JSON.parse(n);
    }catch(e){}
  }
  if(!gotRead && State.read.length===0){
    State.read = DEFAULT_READ.slice();
  }
  // duelos de final (memoria para las estadísticas)
  if(HAS_STORAGE){ try{ const d = await window.storage.get('cosecha:duelos'); if(d && d.value) State.duelos = JSON.parse(d.value)||[]; }catch(e){} }
  if(!State.duelos || !State.duelos.length){ try{ const d = localStorage.getItem('cosecha:duelos'); if(d) State.duelos = JSON.parse(d)||[]; }catch(e){} }
  if(!Array.isArray(State.duelos)) State.duelos = [];
  // higiene: sin duplicados (pruebas viejas dejaban repetidos en la memoria)
  const dedupe = (arr)=>{
    const seen = new Set();
    return arr.filter(b=>{
      const k = ((b.titulo||'')+'|'+(b.portada||'')).toLowerCase().trim();
      if(seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  State.read = dedupe(State.read).map(migrateBook);    // memoria vieja → bitácora
  State.vault = dedupe(State.vault).map(migrateBook);
}
async function persist(){
  if(HAS_STORAGE){
    try{ await window.storage.set('cosecha:read', JSON.stringify(State.read)); }catch(e){}
    try{ await window.storage.set('cosecha:vault', JSON.stringify(State.vault)); }catch(e){}
    try{ await window.storage.set('cosecha:names', JSON.stringify(State.players)); }catch(e){}
  }
  try{
    localStorage.setItem('cosecha:read', JSON.stringify(State.read));
    localStorage.setItem('cosecha:vault', JSON.stringify(State.vault));
    localStorage.setItem('cosecha:names', JSON.stringify(State.players));
  }catch(e){}
  if(typeof onLocalChange === 'function') onLocalChange();   // ☁️ sube a la nube (Firestore)
}

/* ---------- utilidades ---------- */
function uid(){ return 'b'+Math.random().toString(36).slice(2,9); }
const $ = (sel,root=document)=>root.querySelector(sel);
const $$ = (sel,root=document)=>[...root.querySelectorAll(sel)];
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(()=>t.classList.remove('show'), 2600);
}
function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function shuffled(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function hashStr(s){
  let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  return h;
}
/* escala responsive para tamaños de libro */
function bs(n){ return innerWidth<640 ? Math.round(n*0.78) : n; }

/* separa la sinopsis en gancho (primera frase) + resto */
function splitHook(text){
  const t = (text||'').trim();
  if(!t) return { hook:'(sin sinopsis)', rest:'' };
  const m = t.match(/^([\s\S]{25,170}?[.!?…])\s+([\s\S]+)$/);
  if(m) return { hook:m[1], rest:m[2] };
  if(t.length<=190) return { hook:t, rest:'' };
  const cut = t.lastIndexOf(' ', 165);
  return { hook:t.slice(0, cut>60?cut:165)+'…', rest:t };
}

/* ============================================================
   METADATA DEL CLUB — registro único y extensible.
   Para agregar un campo nuevo: una línea acá y listo (parser,
   archivo, ficha y estadísticas futuras lo levantan solos).
   auto:true = lo completa la app al jugar; el resto es manual.
   ============================================================ */
const META_FIELDS = [
  /* — historial del club —
     Los hechos que pueden REPETIRSE son bitácoras (log:true), no casillas:
     un libro puede rescatarse 29 veces y las 29 tienen que quedar escritas.
     Formato: "fecha · quién · extra | fecha · quién · extra"                */
  { key:'traidoPor',     file:'traido por',      aliases:['traído por','trajo','libro de'],   label:'Lo trajo',         sec:'club', auto:true },
  { key:'cosechas',      file:'cosechas',        aliases:['participaciones'],                 label:'Cosechas jugadas', sec:'club', auto:true, log:true, ev:'lugar' },
  { key:'elegidos',      file:'elegidos',        aliases:['elegido'],                         label:'Lo eligieron',     sec:'club', auto:true, log:true, ev:'criterio' },
  { key:'rescates',      file:'rescates',        aliases:['rescate'],                         label:'Rescates',         sec:'club', auto:true, log:true, ev:'quién' },
  { key:'descartes',     file:'descartes',       aliases:['descarte'],                        label:'Descartes',        sec:'club', auto:true, log:true, ev:'quién' },
  { key:'victorias',     file:'victorias',       aliases:['victoria','ganadas'],              label:'Victorias',        sec:'club', auto:true, log:true, ev:'método' },
  { key:'anulaciones',   file:'anulaciones',     aliases:['anulacion','anulación'],           label:'Anulaciones',      sec:'club', auto:true, log:true, ev:'motivo' },
  { key:'puestos',       file:'puestos',         aliases:['puesto','cuadro'],                 label:'Puestos',          sec:'club', auto:true, log:true, ev:'torneo' },
  { key:'premios',       file:'premios',         aliases:['premio','mencion','mención'],      label:'Premios',          sec:'club', auto:true, log:true, ev:'premio' },
  { key:'puntajes',      file:'puntajes',        aliases:['puntaje','estrellas'],             label:'Puntajes',         sec:'club' },
  { key:'diasLectura',   file:'dias de lectura', aliases:['días de lectura'],                 label:'Leído en',         sec:'club', num:true, suffix:' días' },
  { key:'encuentros',    file:'encuentros',      aliases:[],                                  label:'Encuentros',       sec:'club', num:true },
  { key:'nota',          file:'nota',            aliases:['notas'],                           label:'Nota del club',    sec:'club' },
  /* — casillas viejas: se leen para migrar y NO se vuelven a escribir — */
  { key:'cosechadoEn',   file:'cosechado',       aliases:['primera cosecha','fecha'],         label:'Primera cosecha',  sec:'club', legacy:true },
  { key:'lugar',         file:'lugar',           aliases:['ubicacion','ubicación','donde'],   label:'Lugar',            sec:'club', legacy:true },
  { key:'rescatadoPor',  file:'rescatado por',   aliases:[],                                  label:'Rescatado por',    sec:'club', legacy:true },
  { key:'rescatadoEl',   file:'rescatado el',    aliases:['fecha rescate'],                   label:'Rescatado el',     sec:'club', legacy:true },
  { key:'descartadoPor', file:'descartado por',  aliases:[],                                  label:'Descartado por',   sec:'club', legacy:true },
  { key:'descartadoEl',  file:'descartado el',   aliases:['fecha descarte'],                  label:'Descartado el',    sec:'club', legacy:true },
  { key:'elegidoPor',    file:'elegido por',     aliases:['criterio'],                        label:'Elegido por',      sec:'club', legacy:true },
  { key:'ganadoEl',      file:'ganado el',       aliases:['fecha ganado'],                    label:'Ganó el',          sec:'club', legacy:true },
  { key:'metodo',        file:'metodo',          aliases:['método','ruleta','juego'],         label:'Método',           sec:'club', legacy:true },
  { key:'empate',        file:'empate',          aliases:['empate de honor'],                 label:'Empate',           sec:'club', legacy:true },
  { key:'anulado',       file:'anulado',         aliases:['ganó y se anuló','resorteado'],    label:'Ganó y se anuló',  sec:'club', legacy:true },
  { key:'vasallajes',    file:'vasallajes',      aliases:[],                                  label:'Vasallajes',       sec:'club', legacy:true },
  /* — ficha técnica (manual, se completa cuando quieran) — */
  { key:'autor',   file:'autor',   aliases:['autora','autores'], label:'Autor',   sec:'tec' },
  { key:'anio',    file:'año',     aliases:['ano','anio'],       label:'Año',     sec:'tec' },
  { key:'genero',  file:'género',  aliases:['genero'],           label:'Género',  sec:'tec' },
  { key:'paginas', file:'páginas', aliases:['paginas'],          label:'Páginas', sec:'tec' },
  { key:'pais',    file:'país',    aliases:['pais'],             label:'País',    sec:'tec' },
  { key:'idioma',  file:'idioma',  aliases:[],                   label:'Idioma',  sec:'tec' },
  { key:'tropes',  file:'tropes',  aliases:['tropos','cliches','clichés','tags'], label:'Tropes', sec:'tec', hidden:true },
  { key:'autorGenero', file:'autor genero', aliases:['genero autor','género autor'], label:'Autoría', sec:'tec', hidden:true },
  { key:'blindQuote',  file:'blind quote',  aliases:['quote','frase ciega'],        label:'Blind quote', sec:'tec', hidden:true },
  { key:'link',    file:'link',    aliases:['url'],              label:'Link',    sec:'tec', hidden:true },
  /* — lomo a mano: pisan el color detectado y la fuente sorteada — */
  { key:'spineColor', file:'lomo color', aliases:['color lomo'],  label:'Color del lomo', sec:'tec', hidden:true },
  { key:'spineInk',   file:'lomo tinta', aliases:['tinta lomo'],  label:'Tinta del lomo', sec:'tec', hidden:true },
  { key:'spineFont',  file:'lomo fuente',aliases:['fuente lomo'], label:'Fuente del lomo',sec:'tec', hidden:true },
];
const metaNorm = s => s.toLowerCase().normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]','g'),'').trim();
const META_LOOKUP = (()=>{
  const m = new Map();
  META_FIELDS.forEach(f=>{ m.set(metaNorm(f.file), f); (f.aliases||[]).forEach(a=>m.set(metaNorm(a), f)); });
  return m;
})();

function fechaHoy(){
  const d = new Date();
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}
/* ============================================================
   BITÁCORA — los hechos que se repiten no se pisan, se apilan
   Un libro puede rescatarse 29 veces y las 29 quedan escritas, con
   fecha y con nombre. Cada evento: "fecha · quién · extra",
   separados por " | ". El contador es .length: nunca puede mentir.
   ============================================================ */
const EV_SEP = '|', EV_DOT = '·';
const EV_NOFECHA = 'fecha ?', EV_NOQUIEN = '?';

function evList(b, key){
  return String((b && b[key]) || '').split(EV_SEP).map(s=>s.trim()).filter(Boolean).map(s=>{
    const p = s.split(EV_DOT).map(x=>x.trim());
    return { fecha:p[0]||'', quien:p[1]||'', extra:p.slice(2).join(' '+EV_DOT+' ') };
  });
}
/* "?" solo cuando hace falta para no correr las columnas: si no hay quién ni
   extra, la línea es la fecha sola y punto. */
function evLine(ev){
  const parts = [ev.fecha || EV_NOFECHA];
  if(ev.quien || ev.extra) parts.push(ev.quien || EV_NOQUIEN);
  if(ev.extra) parts.push(ev.extra);
  return parts.join(' '+EV_DOT+' ');
}
/* valor mostrable: los placeholders de lo que nunca se anotó no se muestran */
const evVal = s => (s && s!==EV_NOQUIEN && s!==EV_NOFECHA) ? s : '';
function evWrite(b, key, list){
  if(!list.length) delete b[key];
  else b[key] = list.map(evLine).join(' '+EV_SEP+' ');
  return b[key];
}
/* apila un hecho nuevo. Sin fecha = hoy. */
function evPush(b, key, ev={}){
  const list = evList(b, key);
  list.push({ fecha: ev.fecha || fechaHoy(), quien: ev.quien || '', extra: ev.extra || '' });
  return evWrite(b, key, list);
}
const evCount  = (b,key)=>evList(b,key).length;
const evLast   = (b,key)=>evList(b,key).slice(-1)[0] || null;
const evFirst  = (b,key)=>evList(b,key)[0] || null;
const evQuien  = (b,key)=>(evLast(b,key)||{}).quien || '';
/* cuántos de estos hechos hizo tal persona (no "si alguna vez lo hizo": cuántas) */
const evPorQuien = (b,key,quien)=>evList(b,key)
  .filter(e=>e.quien && e.quien.toLowerCase() === String(quien||'').toLowerCase()).length;
/* ¿ya está anotado ese hecho para esa fecha? (evita duplicar si se reintenta) */
const evTiene = (b,key,fecha)=>evList(b,key).some(e=>e.fecha===fecha);

/* ---- migración: casillas viejas → bitácora. Corre al parsear y al cargar.
   TIENE que ser idempotente: se ejecuta en cada carga, también sobre datos ya
   migrados. Ojo con parseInt: parseInt('27 feb 2026') devuelve 27, así que un
   contador viejo sólo puede ser un entero PELADO, nada más.               ---- */
const evEsContador = v => /^\d+$/.test(String(v ?? '').trim());
const evVacio = v => v===undefined || v===null || String(v).trim()==='';
function migrateBook(b){
  const num = v => evEsContador(v) ? parseInt(v,10) : 0;
  /* ¿hay que migrar este campo? Sólo si está vacío o es un contador pelado.
     Si ya tiene una bitácora, se deja en paz. */
  const toca = (key, hayViejo) => evEsContador(b[key]) || (evVacio(b[key]) && hayViejo);

  // rescates: era un contador + UNA casilla con el último que lo rescató.
  // Los anteriores no se guardaron nunca: quedan como desconocidos, pero contados.
  if(toca('rescates', b.rescatadoPor || b.rescatadoEl)){
    const n = Math.max(num(b.rescates), (b.rescatadoPor||b.rescatadoEl) ? 1 : 0);
    const list = [];
    for(let i=0;i<n;i++){
      const ultimo = i === n-1;
      list.push({ fecha: ultimo ? (b.rescatadoEl||'') : '', quien: ultimo ? (b.rescatadoPor||'') : '' });
    }
    evWrite(b, 'rescates', list);
  }
  // descartes
  if(toca('descartes', b.descartadoPor || b.descartadoEl) && (b.descartadoPor || b.descartadoEl))
    evWrite(b, 'descartes', [{ fecha:b.descartadoEl||'', quien:b.descartadoPor||'' }]);
  // elegidos: el criterio con el que entró (sin fecha propia → la de su 1ª cosecha)
  if(toca('elegidos', b.elegidoPor) && b.elegidoPor)
    evWrite(b, 'elegidos', [{ fecha:b.cosechadoEn||'', quien:b.elegidoPor }]);
  // victorias
  if(toca('victorias', b.ganadoEl || b.metodo) && (b.ganadoEl || b.metodo))
    evWrite(b, 'victorias', [{ fecha:b.ganadoEl||'', quien:b.metodo||'', extra:b.empate?'empate de honor':'' }]);
  // anulaciones
  if(toca('anulaciones', b.anulado) && b.anulado)
    evWrite(b, 'anulaciones', [{ fecha:b.anulado, quien:'volvieron a sortear' }]);
  // cosechas: era un contador + la fecha/lugar de la PRIMERA
  if(toca('cosechas', b.cosechadoEn)){
    const n = Math.max(num(b.cosechas), b.cosechadoEn ? 1 : 0);
    const list = [];
    for(let i=0;i<n;i++)
      list.push(i===0 ? { fecha:b.cosechadoEn||'', quien:b.lugar||'' } : { fecha:'', quien:'' });
    evWrite(b, 'cosechas', list);
  }
  // vasallajes: contador viejo sin detalle → puestos desconocidos, pero contados
  if(evEsContador(b.vasallajes) && num(b.vasallajes) > evCount(b,'puestos')){
    const list = evList(b,'puestos');
    while(list.length < num(b.vasallajes)) list.unshift({ fecha:'', quien:'Vasallaje', extra:'puesto ?' });
    evWrite(b, 'puestos', list);
  }
  META_FIELDS.filter(f=>f.legacy).forEach(f=>delete b[f.key]);
  return b;
}

/* ---- accesos derivados: una sola fuente de verdad, la bitácora ---- */
const primeraCosecha = b => (evFirst(b,'cosechas')||{}).fecha || '';
const lugarPrimera   = b => (evFirst(b,'cosechas')||{}).quien || '';
const ultimoRescate  = b => evQuien(b,'rescates');
const metodoGanador  = b => evQuien(b,'victorias');
const fechaVictoria  = b => (evLast(b,'victorias')||{}).fecha || '';
const esEmpate       = b => evList(b,'victorias').some(e=>/empate/i.test(e.extra||''));
const nVasallajes    = b => evCount(b,'puestos');
/* quién se lleva el crédito: el que lo rescató manda sobre el que lo trajo */
const creditoDe      = b => ultimoRescate(b) || b.traidoPor || '';

/* estampa de participación: se llama al cerrar cada cosecha.
   Idempotente: si ya se anotó hoy, no vuelve a contarla. */
function stampCosecha(book){
  const hoy = fechaHoy();
  if(evTiene(book, 'cosechas', hoy)) return;
  evPush(book, 'cosechas', { fecha:hoy, quien:State.cosechaLugar || '',
    extra: State.cosechaTema || '' });   // la temática, si esa noche hubo
}
/* copia limpia (sin props de runtime) para bóveda/estante */
function cleanBook(b){
  const out = { id:b.id, titulo:b.titulo, portada:b.portada||'', sinopsis:b.sinopsis||'' };
  if(b.readDate) out.readDate = b.readDate;
  META_FIELDS.filter(f=>!f.legacy).forEach(f=>{
    if(b[f.key]!==undefined && b[f.key]!=='' && b[f.key]!==null) out[f.key] = b[f.key];
  });
  return out;
}

/* ---------- PARSER de archivos de texto ---------- */
/* titulo: / portada: / sinopsis: / rescates: (opcional), bloques separados por --- */
function parseBooks(text){
  const books = [];
  const errors = [];
  text = (text||'')
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '')
    .replace(/\r\n?/g, '\n')
    .normalize('NFC');
  const blocks = text.split(/^[ \t]*-{3,}[ \t]*$/m).map(b=>b.trim()).filter(Boolean);
  blocks.forEach((block, i)=>{
    const book = { id: uid(), titulo:'', portada:'', sinopsis:'' };
    const lines = block.split('\n');
    let currentKey = null;
    lines.forEach(line=>{
      const m = line.match(/^[ \t]*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ ]{0,24}?)[ \t]*:[ \t]*(.*)$/);
      if(m){
        const raw = metaNorm(m[1]);
        const val = m[2].trim();
        if(raw==='titulo'){ currentKey='titulo'; book.titulo=val; return; }
        if(raw==='portada'){ currentKey='portada'; book.portada=val; return; }
        if(raw==='sinopsis'){ currentKey='sinopsis'; book.sinopsis=val; return; }
        if(raw==='leido'){ book.readDate=val; currentKey=null; return; }
        const f = META_LOOKUP.get(raw);
        if(f){
          if(val !== '') book[f.key] = f.num ? (parseInt(val,10)||val) : val;
          currentKey = null;
          return;
        }
      }
      // línea sin clave conocida: continúa el campo anterior (sinopsis largas)
      if(currentKey && line.trim()) book[currentKey] += ' ' + line.trim();
    });
    // bloques totalmente vacíos o de comentario no cuentan como libro
    if(book.titulo || book.portada || book.sinopsis){
      if(!book.titulo) errors.push(`Bloque ${books.length+1}: no encontré el título.`);
      books.push(migrateBook(book));   // casillas viejas → bitácora, al entrar
    }
  });
  return { books, errors };
}

/* ============================================================
   EL CLUB EN UN SOLO ARCHIVO — estante de honor + bóveda juntos,
   con secciones "===== ESTANTE DE HONOR =====" / "===== THE VAULT =====".
   Los archivos viejos (una lista sola) siguen andando igual.
   ============================================================ */
function parseClub(text){
  const t = (text||'').replace(/\r\n?/g,'\n');
  const RE = /^[ \t]*={3,}[ \t]*([^=\n]+?)[ \t]*={3,}[ \t]*$/gm;
  if(!RE.test(t)) return null;              // no tiene secciones: no es archivo de club
  // sello de última actualización, para saber qué versión es más nueva entre equipos
  const st = t.match(/^#\s*actualizado:\s*(.+)$/mi);
  const stamp = st ? Date.parse(st[1].trim()) : 0;
  RE.lastIndex = 0;
  const secs = []; let m, prev = null;
  while((m = RE.exec(t))){
    if(prev) prev.end = m.index;
    prev = { name: metaNorm(m[1]), start: RE.lastIndex };
    secs.push(prev);
  }
  prev.end = t.length;
  const out = { read:[], vault:[], mazo:null, stamp: isNaN(stamp)?0:stamp };
  secs.forEach(s=>{
    const cuerpo = t.slice(s.start, s.end);
    if(/mazo|carta/.test(s.name)){ out.mazo = parseMazo(cuerpo); return; }
    const books = parseBooks(cuerpo).books;
    if(/honor|estante|leido/.test(s.name)) out.read.push(...books);
    else out.vault.push(...books);
  });
  return out;
}

/* ============================================================
   DESHACER LA ÚLTIMA COSECHA — una sola foto del estado, sacada
   justo antes del único momento irreversible: cerrar el torneo.
   ============================================================ */
async function saveUndo(etiqueta){
  try{
    const raw = JSON.stringify({ etiqueta, fecha: fechaHoy(),
      read: State.read.map(cleanBook), vault: State.vault.map(cleanBook),
      cartas: (typeof Cartas !== 'undefined') ? JSON.parse(JSON.stringify(Cartas)) : null });
    localStorage.setItem('cosecha:undo', raw);
    if(HAS_STORAGE){ try{ await window.storage.set('cosecha:undo', raw); }catch(e){} }
  }catch(e){}
}
function getUndo(){
  try{ const r = localStorage.getItem('cosecha:undo'); return r ? JSON.parse(r) : null; }
  catch(e){ return null; }
}
/* la foto se saca ANTES de que la partida toque nada; al cerrar, solo se
   le cambia la etiqueta (re-fotografiar tarde fue el bug del vasallaje) */
async function renameUndo(etiqueta){
  try{
    const s = getUndo(); if(!s) return;
    s.etiqueta = etiqueta;
    const raw = JSON.stringify(s);
    localStorage.setItem('cosecha:undo', raw);
    if(HAS_STORAGE){ try{ await window.storage.set('cosecha:undo', raw); }catch(e){} }
  }catch(e){}
}
async function clearUndo(){
  try{ localStorage.removeItem('cosecha:undo'); }catch(e){}
  if(HAS_STORAGE){ try{ await window.storage.delete('cosecha:undo'); }catch(e){} }
}
async function restoreUndo(){
  const s = getUndo();
  if(!s) return null;
  State.read = s.read.map(migrateBook);
  State.vault = s.vault.map(migrateBook);
  await persist();                                  // guarda Y sincroniza el estado restaurado
  if(s.cartas && typeof Cartas !== 'undefined'){    // el mazo también vuelve atrás
    Cartas.mano = s.cartas.mano;
    Cartas.historial = s.cartas.historial;
    persistCartas();
  }
  try{ localStorage.removeItem('cosecha:undo'); }catch(e){}
  if(HAS_STORAGE){ try{ await window.storage.delete('cosecha:undo'); }catch(e){} }
  await persist();
  return s;
}

/* ============================================================
   PUNTAJES ⭐ tipo Letterboxd — "Maru 4.5 | Uri 3", medio punto vale.
   El promedio de los dos es el que se ve en el estante.
   ============================================================ */
function ratingOf(b, quien){
  const q = String(quien||'').toLowerCase();
  const parte = String((b&&b.puntajes)||'').split('|').map(s=>s.trim())
    .find(s=>s.toLowerCase().startsWith(q+' '));
  if(!parte) return null;
  const v = parseFloat(parte.slice(q.length).trim().replace(',','.'));
  return (isNaN(v) || v<0 || v>5) ? null : v;
}
function setRating(b, quien, val){
  const q = String(quien||'').toLowerCase();
  const resto = String(b.puntajes||'').split('|').map(s=>s.trim()).filter(Boolean)
    .filter(s=>!s.toLowerCase().startsWith(q+' '));
  if(val != null) resto.push(`${quien} ${val}`);
  if(resto.length) b.puntajes = resto.join(' | ');
  else delete b.puntajes;
}
function ratingAvg(b){
  const vs = [ratingOf(b, State.players.a), ratingOf(b, State.players.b)].filter(v=>v!=null);
  return vs.length ? vs.reduce((s,x)=>s+x,0)/vs.length : null;
}

const BOOK_TEMPLATE = `titulo: El nombre del libro
portada: https://direccion-de-la-portada.jpg
sinopsis: De qué va el libro, en unas líneas.
---
titulo: Otro libro
portada: https://otra-portada.jpg
sinopsis: Otra sinopsis.
---
titulo: Tercer libro
portada:
sinopsis: La portada es opcional; si falta, se genera una tapa linda.
---
titulo: Cuarto libro
portada:
sinopsis: ...
---
titulo: Quinto libro
portada:
sinopsis: ...`;

function downloadText(filename, txt){
  const blob = new Blob([txt], {type:'text/plain;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
}

/* ---------- EXTRACCIÓN DE COLOR de la portada ---------- */
const colorCache = {};
function extractColor(url){
  return new Promise((resolve)=>{
    if(!url){ resolve(null); return; }
    if(colorCache[url]){ resolve(colorCache[url]); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let done = false;
    const finish = (c)=>{ if(done) return; done=true; if(c) colorCache[url]=c; resolve(c); };
    img.onload = ()=>{
      try{
        const canvas = $('#colorCanvas');
        const ctx = canvas.getContext('2d', { willReadFrequently:true });
        ctx.clearRect(0,0,48,48);
        ctx.drawImage(img,0,0,48,48);
        const data = ctx.getImageData(0,0,48,48).data;
        // promedio ponderado hacia lo saturado + mejor color vívido
        let r=0,g=0,b=0, wsum=0;
        let br=0,bg=0,bb=0, bestScore=-1;
        for(let i=0;i<data.length;i+=4){
          const R=data[i],G=data[i+1],B=data[i+2],A=data[i+3];
          if(A<200) continue;
          const max=Math.max(R,G,B), min=Math.min(R,G,B);
          const sat=max===0?0:(max-min)/max;
          const lum=(R+G+B)/3;
          const w = sat*sat*(lum>30&&lum<235?1:0.25)+0.05;
          r+=R*w; g+=G*w; b+=B*w; wsum+=w;
          const score = sat * (1 - Math.abs(lum-130)/200);
          if(score>bestScore && lum>36 && lum<225){ bestScore=score; br=R;bg=G;bb=B; }
        }
        if(wsum>0){ r=Math.round(r/wsum); g=Math.round(g/wsum); b=Math.round(b/wsum); }
        if(bestScore>0.2){
          r=Math.round(r*0.35+br*0.65);
          g=Math.round(g*0.35+bg*0.65);
          b=Math.round(b*0.35+bb*0.65);
        }
        finish({ r,g,b, css:`rgb(${r},${g},${b})` });
      }catch(e){ finish(null); }
    };
    img.onerror = ()=> finish(null);
    img.src = url;
    setTimeout(()=>finish(null), 4500);
  });
}

/* ---------- COLOR DE LOMO ----------
   El lomo lleva el color DOMINANTE de la tapa entera (cuantizado, sin
   sesgo anti-blanco/negro): una tapa bordó da lomo bordó, una casi negra
   da casi negro, una blanca da blanco. Si el servidor no da CORS,
   reintentamos vía proxy de imágenes para que no haya margen de error. */
const edgeCache = {};
function dominantColor(data){
  const buckets = new Map();
  for(let i=0;i<data.length;i+=4){
    if(data[i+3]<200) continue;
    const r=data[i], g=data[i+1], b=data[i+2];
    const key=((r>>5)<<6)|((g>>5)<<3)|(b>>5);
    const e=buckets.get(key)||{n:0,r:0,g:0,b:0};
    e.n++; e.r+=r; e.g+=g; e.b+=b;
    buckets.set(key,e);
  }
  let best=null;
  buckets.forEach(e=>{ if(!best||e.n>best.n) best=e; });
  if(!best) return null;
  return { r:Math.round(best.r/best.n), g:Math.round(best.g/best.n), b:Math.round(best.b/best.n) };
}
function extractEdgeColor(url){
  if(!url) return Promise.resolve(null);
  if(edgeCache[url]) return edgeCache[url];
  const read = (src)=> new Promise((resolve, reject)=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let done = false;
    img.onload = ()=>{
      if(done) return; done = true;
      try{
        const cv = $('#colorCanvas');
        const ctx = cv.getContext('2d', { willReadFrequently:true });
        ctx.clearRect(0,0,48,48);
        ctx.drawImage(img,0,0,48,48);
        const c = dominantColor(ctx.getImageData(0,0,48,48).data); // dominante de toda la tapa
        c ? resolve(c) : reject(new Error('sin color'));
      }catch(e){ reject(e); }
    };
    img.onerror = ()=>{ if(!done){ done=true; reject(new Error('load')); } };
    img.src = src;
    setTimeout(()=>{ if(!done){ done=true; reject(new Error('timeout')); } }, 6000);
  });
  const finish = (c)=>{ c.css = `rgb(${c.r},${c.g},${c.b})`; return c; };
  edgeCache[url] = read(url).then(finish)
    .catch(()=> read('https://images.weserv.nl/?url='+encodeURIComponent(url)+'&w=48&h=48').then(finish))
    .catch(()=> null);
  return edgeCache[url];
}
/* "#a1b2c3" → {r,g,b,css}. La mano del club pisa cualquier detección. */
function parseHex(hex){
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex||'').trim());
  if(!m) return null;
  const n = parseInt(m[1],16);
  const c = { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
  c.css = `rgb(${c.r},${c.g},${c.b})`;
  return c;
}
const rgbToHex = c => '#' + [c.r,c.g,c.b].map(x=>Math.max(0,Math.min(255,x|0)).toString(16).padStart(2,'0')).join('');

async function ensureEdgeColor(book){
  const mano = parseHex(book.spineColor);   // si lo eligieron a dedo, manda
  if(mano) return mano;
  if(book._edge) return book._edge;
  let c = await extractEdgeColor(book.portada);
  if(!c) c = book._color || await ensureColor(book);
  book._edge = c;
  return c;
}
/* tinta del título del lomo: la elegida a mano, o blanco/negro por contraste */
const spineInkOf = (b,c) => (b && b.spineInk) ? b.spineInk : contrastText(c);

const FALLBACK_COLORS = [
  {r:122,g:90,b:200}, {r:60,g:130,b:120}, {r:190,g:80,b:70},
  {r:200,g:150,b:60}, {r:70,g:110,b:170}, {r:150,g:70,b:120},
  {r:96,g:130,b:74}, {r:172,g:104,b:64},
];
function fallbackColor(seed){
  const c = FALLBACK_COLORS[hashStr(seed) % FALLBACK_COLORS.length];
  return { ...c, css:`rgb(${c.r},${c.g},${c.b})` };
}
async function ensureColor(book){
  if(book._color) return book._color;
  let c = await extractColor(book.portada);
  if(!c) c = fallbackColor(book.titulo || book.id);
  book._color = c;
  book._haloColor = `rgba(${c.r},${c.g},${c.b},0.55)`;
  return c;
}
/* blanco o negro según luminancia del color */
function contrastText(c){
  const lum = 0.299*c.r + 0.587*c.g + 0.114*c.b;
  return lum > 150 ? 'rgba(10,15,10,.88)' : 'rgba(255,255,255,.92)';
}

/* ============================================================
   LIBRO 3D — renderer
   opts: { size, mode:'cover'|'wrapped', still, tilt, baseY, onClick }
   ============================================================ */
function bookEl(book, opts={}){
  const size = opts.size || 170;
  const depth = Math.round(size*0.16);

  const scene = document.createElement('div');
  scene.className = 'book-scene';
  scene.style.setProperty('--w', size+'px');
  scene.style.setProperty('--d', depth+'px');

  const float = document.createElement('div');
  float.className = 'book-float' + (opts.still ? ' still' : '');

  const b = document.createElement('div');
  b.className = 'book3d';
  if(opts.baseY !== undefined) b.style.setProperty('--baseY', opts.baseY+'deg');

  const halo = document.createElement('div'); halo.className='book-halo';

  const cover = document.createElement('div'); cover.className='bf bf-cover';
  if(book.portada){
    const img = document.createElement('img');
    img.src = book.portada;
    img.alt = book.titulo;
    img.loading = 'lazy';
    img.onerror = ()=>{ img.remove(); cover.appendChild(noImgCover(book)); };
    cover.appendChild(img);
  } else {
    cover.appendChild(noImgCover(book));
  }

  const hinge = document.createElement('div'); hinge.className='bf-hinge';
  const glare = document.createElement('div'); glare.className='bf bf-glare';
  const back  = document.createElement('div'); back.className='bf bf-back';
  const spine = document.createElement('div'); spine.className='bf bf-spine';
  const pages = document.createElement('div'); pages.className='bf bf-pages';
  const top   = document.createElement('div'); top.className='bf bf-top';
  const bottom= document.createElement('div'); bottom.className='bf bf-bottom';

  b.append(halo, back, spine, pages, top, bottom, cover, hinge, glare);

  if(opts.mode === 'wrapped'){
    const wrap = document.createElement('div');
    wrap.className = 'book-wrap-cover';
    wrap.innerHTML = `<div class="wc-label">por leer</div>
      <div class="wc-title">${escapeHtml(book.titulo)}</div>
      <div class="wc-seal">✕</div>`;
    if(typeof applySpineFont === 'function') applySpineFont(wrap.querySelector('.wc-title'), book, 1.4);
    b.appendChild(wrap);
  }

  const shadow = document.createElement('div');
  shadow.className = 'book-shadow' + (opts.still ? ' still' : '');

  float.appendChild(b);
  scene.append(float, shadow);
  scene._book = b;
  scene._float = float;

  ensureColor(book).then(c=>{
    b.style.setProperty('--c', c.css);
    halo.style.setProperty('--halo', book._haloColor);
  });
  // el lomo continúa el color exacto del borde de la tapa
  ensureEdgeColor(book).then(c=>{
    if(c) b.style.setProperty('--sc', c.css);
    if(scene._onEdge) scene._onEdge(c);
  });

  if(opts.tilt !== false) attachTilt(scene, b, glare);

  if(opts.onClick){
    scene.style.cursor='pointer';
    scene.addEventListener('click', ()=>opts.onClick(book, scene));
  }
  return scene;
}

function noImgCover(book){
  const d = document.createElement('div');
  d.className='book-noimg';
  d.innerHTML = `<div class="ni-title">${escapeHtml(book.titulo)}</div><div class="ni-rule"></div>`;
  if(typeof applySpineFont === 'function') applySpineFont(d.querySelector('.ni-title'), book, 1.25);
  return d;
}

/* tilt que sigue el puntero + brillo especular */
function attachTilt(scene, b, glare){
  scene.addEventListener('pointermove', (e)=>{
    if(e.pointerType==='touch') return;
    const r = scene.getBoundingClientRect();
    const px = (e.clientX - r.left)/r.width - .5;
    const py = (e.clientY - r.top)/r.height - .5;
    b.classList.add('snappy');
    b.style.setProperty('--tiltY', (px*30)+'deg');
    b.style.setProperty('--tiltX', (-py*15)+'deg');
    if(glare){
      glare.style.setProperty('--gx', ((px+.5)*100)+'%');
      glare.style.setProperty('--gy', ((py+.5)*100)+'%');
      glare.style.setProperty('--glare', '0.22');
    }
  });
  scene.addEventListener('pointerleave', ()=>{
    b.classList.remove('snappy');
    b.style.setProperty('--tiltY', '0deg');
    b.style.setProperty('--tiltX', '0deg');
    if(glare) glare.style.setProperty('--glare', '0');
  });
}

function unwrap(scene){
  Sound.fx.unwrap();
  scene._book.classList.add('unwrapped');
}

/* ============================================================
   APP — pantallas, overlays, ambiente, teclado, flowbar
   ============================================================ */
const App = {
  keys: {},

  show(html, opts={}){
    this.keys = {};
    const appEl = $('#app');
    const old = appEl.querySelector('.screen.in');
    if(old){
      old.classList.remove('in');
      old.classList.add('out');
      // sin ids: que los selectores no encuentren la pantalla saliente
      old.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
      setTimeout(()=>old.remove(), 420);
    }
    const scr = document.createElement('div');
    scr.className = 'screen';
    scr.innerHTML = `<div class="wrap">${html}</div>`;
    appEl.appendChild(scr);
    requestAnimationFrame(()=>requestAnimationFrame(()=>scr.classList.add('in')));
    if(!opts.silent) Sound.fx.whoosh();
    window.scrollTo(0,0);
    return scr;
  },

  /* tiñe el fondo ambiente; sin args vuelve al default */
  ambient(a, b){
    const el = $('#ambient');
    el.style.setProperty('--am1', a || 'rgba(201,248,57,.055)');
    el.style.setProperty('--am2', b || 'rgba(22,64,32,.4)');
  },
};
function show(html, opts){ return App.show(html, opts); }

/* teclado global: overlays primero, después la pantalla */
document.addEventListener('keydown', (e)=>{
  const tag = document.activeElement && document.activeElement.tagName;
  if(tag==='TEXTAREA' || tag==='INPUT') return;
  const ovs = $$('.overlay.on');
  const ov = ovs[ovs.length-1];
  if(ov){
    if(e.key==='Enter' && tag!=='BUTTON'){
      const b = ov.querySelector('[data-enter]');
      if(b){ e.preventDefault(); b.click(); }
    }
    if(e.key==='Escape'){
      const b = ov.querySelector('[data-esc]');
      if(b) b.click();
    }
    return;
  }
  const fn = App.keys[e.key];
  if(fn) fn(e);
});

function overlay(html, cls=''){
  const ov = document.createElement('div');
  ov.className = 'overlay ' + cls;
  ov.innerHTML = html;
  document.body.appendChild(ov);
  requestAnimationFrame(()=>ov.classList.add('on'));
  return ov;
}
function closeOverlay(ov){
  ov.classList.remove('on');
  ov.classList.add('off');
  setTimeout(()=>ov.remove(), 380);
}

/* ---------- barra de progreso del ritual ---------- */
const Flow = {
  STEPS: ['Carga','Sorteo','Selección','Rescate','Descarte','El juego'],
  set(idx, note=''){
    const bar = $('#flowbar');
    bar.innerHTML = this.STEPS.map((s,i)=>`
      <div class="fb-step ${i<idx?'done':''} ${i===idx?'act':''}">
        <div class="fb-dot"></div><div class="fb-lab">${s}</div>
      </div>${i<this.STEPS.length-1?'<div class="fb-sep"></div>':''}`).join('')
      + `<div class="fb-note">${escapeHtml(note)}</div>`;
    bar.classList.add('on');
    const ab = $('#abortBtn'); if(ab) ab.classList.add('on');
  },
  hide(){
    $('#flowbar').classList.remove('on');
    const ab = $('#abortBtn'); if(ab) ab.classList.remove('on');
  },
};

/* ---------- brillitos ✦ ---------- */
function sparkleAt(x, y, n=6){
  for(let i=0;i<n;i++){
    const s = document.createElement('div');
    s.className='sparkle';
    s.textContent='✦';
    s.style.cssText = `left:${x + (Math.random()-.5)*140}px;top:${y + (Math.random()-.5)*120}px;
      color:${Math.random()<.5?'var(--amber)':'var(--bone)'};position:fixed;
      font-size:${10+Math.random()*16}px;animation-delay:${Math.random()*0.4}s;`;
    document.body.appendChild(s);
    setTimeout(()=>s.remove(), 1600);
  }
}
