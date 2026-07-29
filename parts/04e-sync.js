
/* ============================================================
   ☁️ SINCRONIZACIÓN AUTOMÁTICA — Firebase Firestore
   El club vive en la nube. Guardás y aparece solo en todos
   los dispositivos, en tiempo real. Sin archivos, sin tokens.
   ------------------------------------------------------------
   · Al abrir la app, se conecta y escucha cambios en vivo.
   · Cada cosecha / vasallaje / edición se sube sola.
   · Si otro dispositivo cambió algo, entra solo (last-write-wins).
   · Las fotos NO se sincronizan (pesan mucho): quedan por dispositivo.
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
  lastAt: 0,
  fs:null, db:null, ref:null,
  applying:false, pushTimer:null,
  pending:null,
};

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
  try{
    const appMod = await import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app.js`);
    const fsMod  = await import(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-firestore.js`);
    Sync.fs  = fsMod;
    const app = appMod.initializeApp(FB_CONFIG);
    Sync.db  = fsMod.getFirestore(app);
    Sync.ref = fsMod.doc(Sync.db, 'club', 'main');
    Sync.ready = true;

    fsMod.onSnapshot(Sync.ref, (snap)=>{
      if(!snap.exists()){ syncPush(true); return; }   // primera vez: sembrar desde este dispositivo
      const d = snap.data() || {};
      if(d.clientId === Sync.clientId) return;         // es el eco de mi propia escritura
      const at = +d.updatedAt || 0;
      if(at && at <= Sync.lastAt) return;              // no hay nada más nuevo
      if(syncEnJuego()){ Sync.pending = d; return; }   // guardá para cuando vuelva al home
      aplicarRemoto(d);
      Sync.lastAt = at || Date.now();
    }, (err)=>{ syncBadge('err', err && err.message); });

    syncBadge('on');
  }catch(e){
    Sync.ready = false;
    syncBadge('err', e && e.message);
  }
}
/* el init del app llama a este nombre */
async function syncAlArrancar(){ initSync(); }

/* ---------- aplicar un club remoto ---------- */
async function aplicarRemoto(d){
  let club;
  try{ club = JSON.parse(d.data || '{}'); }catch(e){ return; }
  Sync.applying = true;
  try{
    if(Array.isArray(club.read))  State.read  = club.read.map(migrateBook);
    if(Array.isArray(club.vault)) State.vault = club.vault.map(migrateBook);
    if(club.players && club.players.a && club.players.b) State.players = club.players;
    if(club.mazo){
      Cartas.mano = club.mazo.mano || { a:[], b:[] };
      Cartas.historial = club.mazo.historial || [];
    }
    await persist();
    if(typeof persistCartas === 'function') await persistCartas();
  }catch(e){}
  Sync.applying = false;
  if(document.querySelector('#syncBox')){ try{ screenHome(); }catch(e){} }
}

/* ---------- subir a la nube ---------- */
function syncPayload(){
  const club = {
    read: State.read,
    vault: State.vault,
    players: State.players,
    mazo: { mano: Cartas.mano, historial: Cartas.historial },
  };
  return { data: JSON.stringify(club), updatedAt: Date.now(), clientId: Sync.clientId };
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
  syncPush();
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
  // si quedó un cambio remoto pendiente (por estar jugando) y ya volviste, aplicalo
  if(Sync.pending && !syncEnJuego()){
    const d = Sync.pending; Sync.pending = null;
    aplicarRemoto(d); Sync.lastAt = +d.updatedAt || Date.now();
    return; // aplicarRemoto vuelve a renderizar el home
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
    toast('Sincronizado ✓');
  });
}
