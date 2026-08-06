
/* ============================================================
   🧪 MODO DEMO — un club de mentira para probar sin miedo.
   Guarda TODO el club real, lo saca de en medio, y te deja jugar.
   Al salir, vuelve todo exactamente como estaba (y la nube nunca
   se entera: mientras dura la demo no se sube ni se baja nada).
   ============================================================ */

const DEMO_KEY = 'cosecha-demo:backup';
const demoActivo = ()=>{ try{ return localStorage.getItem('cosecha:demo') === '1'; }catch(e){ return false; } };

/* los libros de prueba: una tanda por jugador */
const DEMO_URI = [
  ['Worry Doll','https://static.bookofthemonth.com/covers/list/WorryDoll_k8TweQ66.jpg','Una novela caleidoscópica que da dos versiones retorcidas de la misma relación: el lado siniestro del amor y el vértigo de la obsesión.','Psychological, Unreliable narrator, Twisty, Dark, Marriage issues'],
  ['The Burning Side','https://static.bookofthemonth.com/covers/list/TheBurningSide_z6Ryuqs6.jpg','Cuando se les incendia la casa, una pareja que ya venía haciendo agua tiene que reconstruir desde cero lo que entiende por hogar.','Marriage issues, Emotional, Family drama, Literary'],
  ['The God of the Woods','https://static.bookofthemonth.com/covers/list/TheGodOfTheWoods_400x600_BOTY.jpg','Impulsada por una desaparición misteriosa, esta saga épica explora las grietas de una comunidad de campamento de verano.','Whodunit, Suspenseful, Multiple viewpoints, Family drama, Buzzy'],
  ['Phantasma','https://static.bookofthemonth.com/covers/list/Phantasma_200x300.jpg','Una mansión embrujada construida sobre los nueve círculos del infierno, donde enamorarse puede costarte la vida.','Magical, Romance, Creepy, Haunted house, Romantasy'],
  ["My Husband's Wife",'https://static.bookofthemonth.com/covers/list/MyHusbandsWife_lJ8w9T4AB8q3.jpg','Dos mujeres reclaman la misma identidad en este thriller impredecible sobre obsesión, engaño, matrimonio y venganza.','Psychological, Twisty, Revenge, Marriage issues, Suspenseful'],
];
const DEMO_MARU = [
  ['This Kingdom Will Not Kill Me','https://static.bookofthemonth.com/covers/list/ThisKingdomWillNotKillMe_c55cCTF9.jpg','Se sabe cada giro de ese mundo de memoria. Ahora quedó atrapada adentro. ¿Le alcanzará conocer la saga al dedillo para salvar el día?','Magical, Quest, Strong female lead, Romantasy, Action-packed'],
  ['Into the Blue','https://static.bookofthemonth.com/covers/list/IntoTheBlue_177IzJwz.jpg','Improvisación, Shakespeare y ciencia ficción se mezclan en este romance monumental sobre dos actores que no pueden dejar de enamorarse.','Romance, Emotional, Quirky, LGBTQ+ themes, Slow build'],
  ['Return to Sender','https://static.bookofthemonth.com/covers/list/ReturnToSender_v4RwDrWP.jpg','Un romance de ruta sobre el duelo, los vínculos improbables y el amor entendido como viaje y no como destino.','Romance, Grief, Roadtrip, Emotional, Found family'],
  ['Meet Me in the Garden','https://static.bookofthemonth.com/covers/list/MeetMeInTheGarden_r0us2nWe.jpg','Una saga familiar envolvente sobre el amor, el legado y lo que cuesta animarse a ser uno mismo, sin importar el precio.','Family drama, Multi-generational, Emotional, Literary, Nature'],
  ["Seek the Traitor's Son",'https://static.bookofthemonth.com/covers/list/SeekTheTraitorsSon_1tyBkQr1.jpg','A ella la gloria no le interesa. Pero cuando una profecía la elige para salvar a la nación, no le queda otra que ponerse al frente.','Quest, Magical, Strong female lead, Underdog, Action-packed'],
];
const demoBook = (row, quien)=>({
  id: (typeof uid==='function' ? uid() : 'dm'+Math.random().toString(36).slice(2)),
  titulo: row[0], portada: row[1], sinopsis: row[2], tropes: row[3], traidoPor: quien,
});

/* ---------- entrar y salir ---------- */
async function demoEntrar(){
  if(demoActivo()) return;
  // 1. foto de TODO el club real (cualquier clave cosecha:*)
  const backup = {};
  try{
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.startsWith('cosecha:')) backup[k] = localStorage.getItem(k);
    }
    localStorage.setItem(DEMO_KEY, JSON.stringify(backup));
    Object.keys(backup).forEach(k=>localStorage.removeItem(k));
    localStorage.setItem('cosecha:demo','1');
    // la nube no se entera: fecha local en el futuro → nada remoto pisa la demo
    localStorage.setItem('cosecha:localAt', String(Date.now() + 3153600000000));
  }catch(e){}
  demoCortarNube();
  // 2. club de mentira vacío, listo para jugar
  State.read = []; State.vault = [];
  State.players = { a:'Uri', b:'Maru' };
  if(typeof Cartas !== 'undefined'){ Cartas.mano = { a:[], b:[] }; Cartas.historial = []; }
  State.duelos = [];
  document.body.classList.add('demo');
  demoBarra();
  await persist();
  screenHome();
  toast('🧪 Modo demo · tu club está guardado y a salvo');
}

async function demoSalir(){
  if(!demoActivo()) return;
  let backup = null;
  try{ backup = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); }catch(e){}
  try{
    // fuera todo lo que hizo la demo
    const borrar = [];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.startsWith('cosecha:')) borrar.push(k);
    }
    borrar.forEach(k=>localStorage.removeItem(k));
    if(backup) Object.entries(backup).forEach(([k,v])=>localStorage.setItem(k,v));
    localStorage.removeItem(DEMO_KEY);
  }catch(e){}
  document.body.classList.remove('demo');
  toast('Volviste a tu club de verdad');
  location.reload();                       // recarga limpia: el club real, intacto
}

/* mientras dure la demo, ni se sube ni se baja nada a la nube */
function demoCortarNube(){
  try{
    if(typeof Sync !== 'undefined'){ Sync.ready = false; Sync.on = false; }
    if(typeof onLocalChange === 'function') onLocalChange = function(){};
    if(typeof syncFotos === 'function') syncFotos = async function(){};
  }catch(e){}
}

/* ---------- comandos de administrador ---------- */
function demoCosecha(){
  State.booksA = DEMO_URI.map(r=>demoBook(r, State.players.a));
  State.booksB = DEMO_MARU.map(r=>demoBook(r, State.players.b));
  State.picks = { a:null, b:null }; State.finalists = [];
  toast('5 libros de cada uno · a sortear');
  if(typeof screenSorteo === 'function') screenSorteo();
}
async function demoLlenarBoveda(n){
  const todos = [...DEMO_URI.map(r=>demoBook(r, State.players.a)), ...DEMO_MARU.map(r=>demoBook(r, State.players.b))];
  const extra = [];
  for(let i=0; extra.length < n; i++){
    const base = todos[i % todos.length];
    extra.push({ ...base, id:(typeof uid==='function'?uid():'dx'+i+Math.random().toString(36).slice(2)),
      titulo: base.titulo + (i >= todos.length ? ' · vol. ' + (Math.floor(i/todos.length)+1) : '') });
  }
  State.vault = extra;
  await persist();
  toast(`Bóveda con ${State.vault.length} libros`);
  screenHome();
}
async function demoVaciar(){
  State.read = []; State.vault = []; State.duelos = [];
  if(typeof Cartas !== 'undefined'){ Cartas.mano = { a:[], b:[] }; Cartas.historial = []; if(typeof persistCartas==='function') persistCartas(); }
  try{ localStorage.removeItem('cosecha:snapshots'); localStorage.removeItem('cosecha:undo'); localStorage.removeItem('cosecha:enCurso'); }catch(e){}
  await persist();
  toast('Demo vacía');
  screenHome();
}
/* pone un club "con historia": leídos con puntaje + bóveda, para probar stats */
async function demoConHistoria(){
  const hoy = (typeof fechaHoy === 'function') ? fechaHoy() : '10 jul 2026';
  const leidos = DEMO_URI.slice(0,3).map(r=>demoBook(r, 'Uri')).concat(DEMO_MARU.slice(0,2).map(r=>demoBook(r, 'Maru')));
  leidos.forEach((b,i)=>{
    b.autor = 'Autor de prueba'; b.anio = 1998 + i*6; b.pais = i%2 ? 'Argentina' : 'Estados Unidos';
    b.paginas = 180 + i*70; b.genero = i%2 ? 'Ficción literaria' : 'Thriller';
    b.diasLectura = 12 + i*4; b.encuentros = 3;
    b.puntajes = `Uri ${3+(i%3)*0.5} | Maru ${3.5+((i+1)%3)*0.5}`;
    b.readDate = 'jul 2026';
    if(typeof evPush === 'function'){
      evPush(b, 'cosechas', { fecha:hoy, quien:'Casa de prueba' });
      evPush(b, 'elegidos', { fecha:hoy, quien:['portada','titulo','sinopsis'][i%3] });
      evPush(b, 'victorias', { fecha:hoy, quien:['Ruleta clásica','Papelitos','Vasallaje · azar puro'][i%3] });
    }
  });
  const boveda = DEMO_MARU.slice(2).map(r=>demoBook(r, 'Maru')).concat(DEMO_URI.slice(3).map(r=>demoBook(r, 'Uri')));
  boveda.forEach((b,i)=>{
    b.autor = 'Autora de prueba'; b.anio = 2015 + i; b.pais = 'Japón'; b.paginas = 210 + i*40;
    if(typeof evPush === 'function') evPush(b, 'cosechas', { fecha:hoy, quien:'Casa de prueba' });
  });
  State.read = leidos; State.vault = boveda;
  await persist();
  toast('Club de prueba con historial cargado');
  screenHome();
}

/* ---------- la barra de comandos ---------- */
function demoBarra(){
  const bar = document.getElementById('demoBar');
  if(!bar) return;
  bar.innerHTML = `
    <div class="dm-h">Comandos de la demo</div>
    <div class="dm-s">Nada de acá toca tu club real ni la nube.</div>
    <button data-a="cosecha">▶ Cosecha con los 10 libros</button>
    <button data-a="historia">📚 Club con historial (probar stats)</button>
    <button data-a="v8">⚔️ Bóveda de 8 (Vasallaje)</button>
    <button data-a="v32">🏟️ Bóveda de 32 (Gran Vasallaje)</button>
    <button data-a="vaciar">🗑 Vaciar la demo</button>
    <button data-a="salir" class="out">✕ Salir y volver a mi club</button>`;
  bar.querySelectorAll('button').forEach(b=>b.addEventListener('click', ()=>{
    try{ Sound.fx.click(); }catch(e){}
    const a = b.dataset.a;
    if(a==='cosecha') demoCosecha();
    else if(a==='historia') demoConHistoria();
    else if(a==='v8') demoLlenarBoveda(8);
    else if(a==='v32') demoLlenarBoveda(32);
    else if(a==='vaciar') demoVaciar();
    else if(a==='salir') demoSalir();
  }));
}

/* al arrancar: si quedó una demo abierta, seguimos en ella */
function demoAlArrancar(){
  const btn = document.getElementById('demoBtn');
  if(btn) btn.addEventListener('click', ()=>{
    try{ Sound.fx.click(); }catch(e){}
    demoActivo() ? demoSalir() : demoEntrar();
  });
  if(demoActivo()){
    document.body.classList.add('demo');
    demoCortarNube();
    demoBarra();
  }
}
