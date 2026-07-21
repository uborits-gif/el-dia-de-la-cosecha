
/* ============================================================
   ☁️ SINCRONIZAR — el club vive en GitHub y se pone al día solo
   Pegás una vez la "raw URL" del el-club.txt. Desde ahí:
   · al abrir la app en cualquier dispositivo, trae lo último;
   · si cosechaste acá y no subiste, avisa y no pisa nada.
   El push directo es opcional (pide un token de GitHub).
   ============================================================ */

const SYNC = { url:'', token:'', ok:false };

function loadSync(){
  try{
    SYNC.url = localStorage.getItem('cosecha:sync-url') || '';
    SYNC.token = localStorage.getItem('cosecha:sync-token') || '';
  }catch(e){}
}
function saveSync(){
  try{
    localStorage.setItem('cosecha:sync-url', SYNC.url);
    localStorage.setItem('cosecha:sync-token', SYNC.token);
  }catch(e){}
}

/* raw URL → coordenadas para la API. Acepta la raw o la del repo. */
function parseRawUrl(u){
  u = (u||'').trim();
  let m = u.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i);
  if(m) return { owner:m[1], repo:m[2], branch:m[3], path:m[4] };
  // la de "ver el archivo" en github.com/owner/repo/blob/branch/path
  m = u.match(/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
  if(m) return { owner:m[1], repo:m[2], branch:m[3], path:m[4] };
  return null;
}
const rawFrom = c => `https://raw.githubusercontent.com/${c.owner}/${c.repo}/${c.branch}/${c.path}`;

/* adopta un club remoto: pisa estante, bóveda y mazo, y sella la fecha */
async function aplicarClub(club, stampISO){
  if(club.read.length) State.read = club.read.map(migrateBook);
  if(club.vault.length) State.vault = club.vault.map(migrateBook);
  if(club.mazo){ Cartas.mano = club.mazo.mano; Cartas.historial = club.mazo.historial; await persistCartas(); }
  await persist();
  try{ localStorage.setItem('cosecha:clubStamp', stampISO || new Date().toISOString()); }catch(e){}
}

/* traer de GitHub. silencioso=true no molesta si no hay nada nuevo. */
async function pullClub(silencioso=false){
  if(!SYNC.url) return { estado:'sin-config' };
  const c = parseRawUrl(SYNC.url);
  let url = c ? rawFrom(c) : SYNC.url;
  if(/^https?:/i.test(url)) url += (url.includes('?')?'&':'?') + 't=' + Date.now();   // evita el caché de GitHub
  let txt;
  try{
    const r = await fetch(url, { cache:'no-store' });
    if(!r.ok) throw new Error('HTTP ' + r.status);
    txt = await r.text();
  }catch(e){
    if(!silencioso) toast('No pude leer GitHub: ' + e.message);
    return { estado:'error', error:e.message };
  }
  const club = parseClub(txt);
  if(!club){ if(!silencioso) toast('Ese archivo no parece el club'); return { estado:'mal-archivo' }; }
  const local = clubStampLocal();
  if(club.stamp && club.stamp <= local){
    if(!silencioso) toast(club.stamp === local ? 'Ya estás al día' : 'Tu versión es más nueva — subila vos');
    return { estado: club.stamp === local ? 'al-dia' : 'local-nuevo' };
  }
  await aplicarClub(club, new Date(club.stamp || Date.now()).toISOString());
  return { estado:'actualizado', read:club.read.length, vault:club.vault.length };
}

/* subir a GitHub. Con token: commit directo. Sin token: descarga el archivo. */
async function pushClub(){
  const contenido = serializeClub();
  const c = parseRawUrl(SYNC.url);
  if(!SYNC.token || !c){
    downloadText('el-club.txt', contenido);
    toast('Bajé el club. Subilo a GitHub para que se actualice en todos lados.');
    return { estado:'descargado' };
  }
  const api = `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${c.path}`;
  const headers = { 'Authorization':'Bearer '+SYNC.token, 'Accept':'application/vnd.github+json' };
  let sha;
  try{
    const g = await fetch(`${api}?ref=${c.branch}`, { headers, cache:'no-store' });
    if(g.ok) sha = (await g.json()).sha;      // si no existe, se crea
  }catch(e){}
  const cuerpo = {
    message: `cosecha · ${fechaHoy()}`,
    content: btoa(unescape(encodeURIComponent(contenido))),
    branch: c.branch,
  };
  if(sha) cuerpo.sha = sha;
  try{
    const p = await fetch(api, { method:'PUT', headers, body: JSON.stringify(cuerpo) });
    if(!p.ok){ const e = await p.json().catch(()=>({})); throw new Error(e.message || ('HTTP '+p.status)); }
    toast('Club subido a GitHub ✓');
    return { estado:'subido' };
  }catch(e){
    toast('No pude subir: ' + e.message);
    downloadText('el-club.txt', contenido);
    return { estado:'error', error:e.message };
  }
}

/* al arrancar: si hay URL, traer en silencio */
async function syncAlArrancar(){
  loadSync();
  if(SYNC.url) await pullClub(true);
}

/* ---------- la sección del home ---------- */
function renderSync(box){
  if(!box) return;
  const c = parseRawUrl(SYNC.url);
  const conectado = !!SYNC.url;
  box.innerHTML = `
    <div class="sync-card${conectado?' on':''}">
      <div class="sync-state">
        <span class="sync-dot"></span>
        <div>
          <div class="sync-t">${conectado ? 'Conectado a GitHub' : 'Sin conectar'}</div>
          <div class="sync-s">${conectado
            ? (c ? `${escapeHtml(c.owner)}/${escapeHtml(c.repo)} · ${escapeHtml(c.path.split('/').pop())}` : 'archivo remoto')
            : 'Pegá la raw URL del el-club.txt y se actualiza solo en todos tus dispositivos.'}</div>
        </div>
      </div>
      <div class="sync-actions">
        ${conectado?`<button class="load-btn" id="syncPull">↓ Traer</button>
                     <button class="load-btn" id="syncPush">↑ Subir</button>`:''}
        <button class="load-btn" id="syncCfg">⚙︎ ${conectado?'Cambiar':'Conectar'}</button>
      </div>
    </div>`;
  if(conectado){
    $('#syncPull', box).addEventListener('click', async ()=>{
      Sound.fx.click();
      const r = await pullClub(false);
      if(r.estado==='actualizado'){ Sound.fx.reveal(); toast(`Club al día · ${r.read} leídos + ${r.vault} en la bóveda`); screenHome(); }
    });
    $('#syncPush', box).addEventListener('click', ()=>{ Sound.fx.click(); pushClub(); });
  }
  $('#syncCfg', box).addEventListener('click', ()=>{ Sound.fx.click(); syncConfig(); });
}

function syncConfig(){
  const ov = overlay(`
    <div class="ov-pop center" style="max-width:560px;text-align:left;">
      <div class="eyebrow" style="color:#E8C34A;">☁️ Sincronizar con GitHub</div>
      <h2 class="serif" style="font-size:24px;font-weight:700;margin:6px 0 12px;">Un club, todos los dispositivos</h2>
      <label class="sync-field"><b>Raw URL del el-club.txt</b>
        <input id="syncUrl" placeholder="https://raw.githubusercontent.com/usuario/repo/main/el-club.txt"
          value="${escapeHtml(SYNC.url)}"></label>
      <p class="sync-help">En GitHub, abrí el archivo → botón <b>Raw</b> → copiá esa URL. Con esto solo, la app se pone al día sola.</p>
      <label class="sync-field"><b>Token de GitHub <span style="color:var(--grey)">(opcional — para subir con un botón)</span></b>
        <input id="syncTok" type="password" placeholder="github_pat_… (dejalo vacío y subís el archivo a mano)"
          value="${escapeHtml(SYNC.token)}"></label>
      <p class="sync-help">Sin token igual funciona: “Subir” te baja el archivo y lo subís vos. El token se guarda solo en este dispositivo.</p>
      <div class="row mt-m" style="justify-content:flex-end;gap:8px;">
        ${SYNC.url?`<button class="btn btn-ghost btn-sm" id="syncOff">Desconectar</button>`:''}
        <button class="btn btn-ghost btn-sm" data-esc id="syncCancel">Cancelar</button>
        <button class="btn btn-amber btn-sm" id="syncSave">Guardar</button>
      </div>
    </div>`);
  $('#syncCancel', ov).addEventListener('click', ()=>{ Sound.fx.click(); closeOverlay(ov); });
  if($('#syncOff', ov)) $('#syncOff', ov).addEventListener('click', ()=>{
    SYNC.url=''; SYNC.token=''; saveSync(); closeOverlay(ov); Sound.fx.drop(); screenHome();
  });
  $('#syncSave', ov).addEventListener('click', async ()=>{
    SYNC.url = $('#syncUrl', ov).value.trim();
    SYNC.token = $('#syncTok', ov).value.trim();
    saveSync();
    closeOverlay(ov);
    Sound.fx.chosen();
    if(SYNC.url){ const r = await pullClub(false); if(r.estado==='actualizado'){ toast('Conectado y al día ✓'); } }
    screenHome();
  });
}
