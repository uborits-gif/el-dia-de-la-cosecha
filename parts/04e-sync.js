
/* ============================================================
   ☁️ SINCRONIZACIÓN AUTOMÁTICA — Firebase Firestore
   El club vive en la nube y se pone al día solo en todos los
   dispositivos, en tiempo real. Sin archivos, sin tokens.
   ------------------------------------------------------------
   · club/main  → estante, bóveda, jugadores y mazo (un doc).
   · fotos/{id} → cada recuerdo, un doc (se sincronizan también).
   · Nunca pisa un cambio local que todavía no subió (sello de fecha).
   ============================================================ */

const FB_CONFIG = {
  apiKey: "AIzaSyD70A7gQPzANsAK9QdO4eaFxnZsHJNGcI4",
  authDomain: "el-dia-de-la-cosecha.firebaseapp.com",
  projectId: "el-dia-de-la-cosecha",
  storageBucket: "el-dia-de-la-cosecha.firebasestorage.app",
  messagingSenderId: "263365718247",
  appId: "1:263365718247:web:a4365b45df006daf727242"
};
const FB_VER = '10.12.2';

const Sync = {
  ready:false, on:false, error:'',
  clientId: Math.random().toString(36).slice(2),
  localAt: 0,          // fecha del último cambio local (persiste entre recargas)
  lastAt: 0,           // último 'updatedAt' que aplicamos/subimos del club
  fs:null, db:null, ref:null, fotosRef:null,
  applying:false, applyingFotos:false, pushTimer:null,
  pending:null, fotoIds:new Set(),
};

function loadLocalAt(){
  try{ let v = +localStorage.getItem('cosecha:localAt') || 0;
       if(v > Date.now()) v = 0;   // 🛡 un timestamp del futuro es corrupto: lo ignoramos (causaba que un club chico "gane" y pise todo)
       Sync.localAt = v; }catch(e){ Sync.localAt = 0; }
}
function bumpLocalAt(){
  Sync.localAt = Date.now();
  try{ localStorage.setItem('cosecha:localAt', String(Sync.localAt)); }catch(e){}
}

/* ¿hay una cosecha/vasallaje en curso? (para no pisar el juego) */
function syncEnJuego(){
  try{
    return !!(State._snapVault
      || (State.booksA && State.booksA.length)
      || (State.booksB && State.booksB.length)
      || (State.finalists && State.finalists.length)
      || (State.picks && (State.picks.a || State.picks.b)));
  }catch(e){ return false; }
}

/* ---------- arranque ---------- */
async function initSync(){
  loadLocalAt();
  try{
    const appMod = await import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app.js`);
    const fsMod  = await import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-firestore.js`);
    Sync.fs  = fsMod;
    const app = appMod.initializeApp(FB_CONFIG);
    Sync.db  = fsMod.getFirestore(app);
    Sync.ref = fsMod.doc(Sync.db, 'club', 'main');
    Sync.fotosRef = fsMod.collection(Sync.db, 'fotos');
    Sync.ready = true;

    // -------- club en vivo --------
    fsMod.onSnapshot(Sync.ref, (snap)=>{
      if(!snap.exists()){ syncPush(true); return; }     // primera vez: sembrar desde acá
      const d = snap.data() || {};
      if(d.clientId === Sync.clientId) return;           // eco de mi propia escritura
      const at = Math.min(+d.updatedAt || 0, Date.now());   // 🛡 nunca aceptar timestamps del futuro
      if(at > Sync.localAt){                              // la nube es más nueva → entra
        if(syncEnJuego()){ Sync.pending = d; return; }
        aplicarRemoto(d);
        Sync.localAt = at; try{ localStorage.setItem('cosecha:localAt', String(at)); }catch(e){}
        Sync.lastAt = at;
      } else if(at < Sync.localAt){                       // lo mío es más nuevo y no subió → subilo
        syncPush(true);
      }
    }, (err)=>{ syncBadge('err', err && err.message); });

    // -------- fotos en vivo --------
    fsMod.onSnapshot(Sync.fotosRef, (qs)=>{
      const arr = []; const ids = new Set();
      qs.forEach(doc=>{
        ids.add(doc.id);
        const x = doc.data() || {};
        if(x.deleted) return;
        arr.push({ id:doc.id, src:x.src, w:x.w, h:x.h, fecha:x.fecha, lugar:x.lugar, libro:x.libro, pie:x.pie });
      });
      Sync.fotoIds = ids;
      Sync.applyingFotos = true;
      State.fotos = arr;
      try{ persistFotos(); }catch(e){}
      Sync.applyingFotos = false;
      const rb = document.querySelector('#recBox');
      if(rb){ try{ renderRecuerdos(rb); }catch(e){} }
    }, ()=>{});

    syncBadge('on');
  }catch(e){
    Sync.ready = false;
    syncBadge('err', e && e.message);
  }
}
/* el init del app llama a este nombre */
async function syncAlArrancar(){ initSync(); }

/* una huella barata de lo que se ve en el home: si no cambia, no se repinta */
function firmaDelClub(){
  const trozo = b => (b.id||'') + ':' + (b.titulo||'') + ':' + (b.puntajes||'') + ':' + (b.bitacora||'');
  return [
    (State.read||[]).map(trozo).join('|'),
    (State.vault||[]).map(trozo).join('|'),
    JSON.stringify(State.players||{}),
    (State.duelos||[]).length,
  ].join('§');
}

/* ---------- aplicar un club remoto ---------- */
async function aplicarRemoto(d){
  let club;
  try{ club = JSON.parse(d.data || '{}'); }catch(e){ return; }
  // 🛡 RED DE SEGURIDAD: la nube NUNCA puede vaciar un club que acá tiene libros.
  // (Así es como un club vacío —de una demo o de un dispositivo recién instalado—
  //  se propagaba y borraba todo. Si viene mucho más chico, se frena y avisa.)
  const remoto = (club.read||[]).length + (club.vault||[]).length;
  const local  = (State.read||[]).length + (State.vault||[]).length;
  if(local > 0 && remoto < local * 0.5){
    Sync.pending = null;
    try{ toast('⚠️ La nube traía un club casi vacío. No lo apliqué: tus ' + local + ' libros siguen acá.'); }catch(e){}
    syncPush(true);                       // lo de acá manda: se vuelve a subir lo bueno
    return;
  }
  const firmaAntes = firmaDelClub();
  Sync.applying = true;
  try{
    if(Array.isArray(club.read))  State.read  = club.read.map(migrateBook);
    if(Array.isArray(club.vault)) State.vault = club.vault.map(migrateBook);
    if(club.players && club.players.a && club.players.b) State.players = club.players;
    if(club.mazo){
      Cartas.mano = club.mazo.mano || { a:[], b:[] };
      Cartas.historial = club.mazo.historial || [];
    }
    if(Array.isArray(club.duelos)) State.duelos = club.duelos;
    if(club.sorter && typeof club.sorter === 'object') State.sorter = club.sorter;
    await persist();
    if(typeof persistCartas === 'function') await persistCartas();
  }catch(e){}
  Sync.applying = false;
  // sólo repintamos el home si estamos en él y NO se está tipeando/tocando algo
  // (que la nube no te borre lo que estás escribiendo ni te corte a mitad de un gesto)
  // Sólo se repinta si de verdad cambió algo. Antes se repintaba con cada
  // aviso de la nube —incluido el primero, al entrar—, y por eso la pantalla
  // parpadeaba apenas abrías la web.
  if(document.querySelector('#syncBox')){
    const ae = document.activeElement;
    const ocupado = ae && (ae.tagName==='INPUT' || ae.tagName==='TEXTAREA' || ae.isContentEditable
                    || (typeof ae.closest==='function' && ae.closest('.ov-back,.overlay')));
    if(!ocupado && firmaDelClub() !== firmaAntes){ try{ screenHome(); }catch(e){} }
  }
}

/* ---------- subir el club ---------- */
function syncPayload(){
  const club = {
    read: State.read,
    vault: State.vault,
    players: State.players,
    mazo: { mano: Cartas.mano, historial: Cartas.historial },
    duelos: State.duelos || [],
    sorter: State.sorter || {},
  };
  const at = Math.min(Sync.localAt || Date.now(), Date.now());   // 🛡 nunca escribir timestamps del futuro
  Sync.localAt = at; try{ localStorage.setItem('cosecha:localAt', String(at)); }catch(e){}
  return { data: JSON.stringify(club), updatedAt: at, clientId: Sync.clientId };
}
async function syncPush(inmediato=false){
  if(!Sync.ready) return;
  const doIt = async ()=>{
    try{
      const p = syncPayload();
      Sync.lastAt = p.updatedAt;
      await Sync.fs.setDoc(Sync.ref, p);
      syncBadge('on');
    }catch(e){ syncBadge('err', e && e.message); }
  };
  if(inmediato) return doIt();
  clearTimeout(Sync.pushTimer);
  Sync.pushTimer = setTimeout(doIt, 700);
}

/* lo llaman persist() y persistCartas() cuando algo cambia localmente */
function onLocalChange(){
  if(!Sync.ready || Sync.applying) return;
  bumpLocalAt();
  syncPush();
}

/* ---------- fotos ---------- */
function fotoLimpia(f){
  return { src:f.src, w:f.w||0, h:f.h||0, fecha:f.fecha||'', lugar:f.lugar||'',
           libro:f.libro||'', pie:f.pie||'', updatedAt: Date.now() };
}
async function syncFotos(){
  if(!Sync.ready || Sync.applyingFotos || !Sync.fotosRef) return;
  try{
    const local = new Map((State.fotos||[]).map(f=>[f.id, f]));
    // nuevas → subir (cada una su doc)
    for(const [id, f] of local){
      if(!Sync.fotoIds.has(id) && f && f.src){
        try{ await Sync.fs.setDoc(Sync.fs.doc(Sync.db, 'fotos', id), fotoLimpia(f)); }
        catch(e){ toast('Una foto es muy pesada para la nube y quedó solo en este dispositivo'); }
      }
    }
    // borradas localmente → borrar en la nube
    for(const id of Sync.fotoIds){
      if(!local.has(id)){
        try{ await Sync.fs.deleteDoc(Sync.fs.doc(Sync.db, 'fotos', id)); }catch(e){}
      }
    }
  }catch(e){}
}

/* ---------- estado visual ---------- */
function syncBadge(state, msg){
  Sync.on = (state === 'on');
  Sync.error = (state === 'err') ? (msg || 'error') : '';
  const box = document.querySelector('#syncBox');
  if(box) renderSync(box);
}

/* ---------- la tarjeta del home ---------- */
function renderSync(box){
  if(!box) return;
  if(Sync.pending && !syncEnJuego()){
    const d = Sync.pending; Sync.pending = null;
    const at = Math.min(+d.updatedAt || Date.now(), Date.now());   // 🛡 sin timestamps del futuro
    aplicarRemoto(d);
    Sync.localAt = at; try{ localStorage.setItem('cosecha:localAt', String(at)); }catch(e){}
    Sync.lastAt = at;
    return;
  }
  const on = Sync.on;
  const titulo = on ? 'Sincronización activada'
                    : (Sync.error ? 'Sin conexión con la nube' : 'Conectando…');
  const sub = on
    ? 'Todo se guarda y aparece solo en todos tus dispositivos, en vivo.'
    : (Sync.error ? 'No pude conectar. Se reintenta solo cuando vuelva internet.'
                  : 'Conectando con la nube…');
  box.innerHTML = `
    <div class="sync-card${on?' on':''}">
      <div class="sync-state">
        <span class="sync-dot"></span>
        <div>
          <div class="sync-t">${titulo}</div>
          <div class="sync-s">${escapeHtml(sub)}</div>
        </div>
      </div>
      <div class="sync-actions">
        <button class="load-btn" id="syncNow">↻ Sincronizar ahora</button>
      </div>
    </div>`;
  const b = $('#syncNow', box);
  if(b) b.addEventListener('click', async ()=>{
    try{ Sound.fx.click(); }catch(e){}
    if(!Sync.ready){ toast('Reconectando…'); initSync(); return; }
    await syncPush(true);
    await syncFotos();
    toast('Sincronizado ✓');
  });
}
