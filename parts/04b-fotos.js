
/* ============================================================
   RECUERDOS — las fotos del club
   Se sacan al empezar cada cosecha (los dos con el libro anterior)
   y se van apilando abajo de The Vault.
   ============================================================ */

const FOTO_MAX = 1280;          // lado mayor: entra en pantalla y no revienta la memoria
const FOTO_Q   = 0.82;
const FOTOS_KEY = 'cosecha:fotos';

const CAM_SVG = `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.4 3h5.2l1.2 2H20a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4.2l1.2-2Zm2.6 5.2A5.3 5.3 0 1 0 12 18.8a5.3 5.3 0 0 0 0-10.6Zm0 2a3.3 3.3 0 1 1 0 6.6 3.3 3.3 0 0 1 0-6.6Z"/></svg>`;

/* ---------- guardar / cargar ---------- */
async function loadFotos(){
  let raw = null;
  if(HAS_STORAGE){ try{ const r = await window.storage.get(FOTOS_KEY); if(r && r.value) raw = r.value; }catch(e){} }
  if(!raw){ try{ raw = localStorage.getItem(FOTOS_KEY); }catch(e){} }
  try{ State.fotos = raw ? JSON.parse(raw) : []; }catch(e){ State.fotos = []; }
  if(!Array.isArray(State.fotos)) State.fotos = [];
}
async function persistFotos(){
  const raw = JSON.stringify(State.fotos);
  if(HAS_STORAGE){ try{ await window.storage.set(FOTOS_KEY, raw); }catch(e){} }
  try{
    localStorage.setItem(FOTOS_KEY, raw);
    return true;
  }catch(e){
    // el álbum llenó el cajón del navegador: hay que avisar, no tragárselo
    toast('No entran más fotos en la memoria del navegador — bajá los recuerdos y borrá alguna');
    return false;
  }
}
const fotosPeso = () => State.fotos.reduce((s,f)=>s + (f.src?f.src.length:0), 0);

/* ---------- achicar antes de guardar ---------- */
function achicarFoto(file){
  return new Promise((resolve, reject)=>{
    if(!/^image\//.test(file.type)) return reject(new Error('no es una imagen'));
    const fr = new FileReader();
    fr.onerror = ()=>reject(new Error('no pude leer el archivo'));
    fr.onload = ()=>{
      const img = new Image();
      img.onerror = ()=>reject(new Error('no pude abrir la imagen'));
      img.onload = ()=>{
        const esc = Math.min(1, FOTO_MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width*esc), h = Math.round(img.height*esc);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        let out = cv.toDataURL('image/webp', FOTO_Q);
        if(!out.startsWith('data:image/webp')) out = cv.toDataURL('image/jpeg', FOTO_Q);
        resolve({ src:out, w, h });
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
/* el libro que estaban leyendo: el último que subió al estante */
function libroAnterior(){
  const r = State.read;
  return r.length ? r[r.length-1] : null;
}
async function agregarFotos(files, meta={}){
  const ok = [];
  for(const f of files){
    try{
      const { src, w, h } = await achicarFoto(f);
      ok.push({
        id: uid(), src, w, h,
        fecha: meta.fecha || fechaHoy(),
        lugar: meta.lugar !== undefined ? meta.lugar : (State.cosechaLugar||''),
        libro: meta.libro !== undefined ? meta.libro : ((libroAnterior()||{}).titulo || ''),
        pie: meta.pie || '',
      });
    }catch(e){ toast('Una foto no se pudo cargar: ' + e.message); }
  }
  State.fotos.push(...ok);
  await persistFotos();
  return ok;
}

/* ---------- el botón de subir foto (al lado del lugar, en la cosecha) ---------- */
function fotoPickerHTML(){
  const prev = libroAnterior();
  return `
    <span class="foto-pick">
      <button class="load-btn" id="fotoBtn">${CAM_SVG} Subir foto</button>
      <input type="file" id="fotoInput" accept="image/*" multiple hidden>
      <span class="foto-hint" id="fotoHint">${prev
        ? `con «${escapeHtml(short(prev.titulo, 26))}»`
        : 'con el libro anterior'}</span>
      <span class="foto-thumbs" id="fotoThumbs"></span>
    </span>`;
}
function wireFotoPicker(){
  const btn = $('#fotoBtn'), inp = $('#fotoInput'), thumbs = $('#fotoThumbs');
  if(!btn) return;
  btn.addEventListener('click', e=>{ e.preventDefault(); Sound.fx.click(); inp.click(); });
  inp.addEventListener('change', async ()=>{
    const files = [...inp.files];
    inp.value = '';
    if(!files.length) return;
    btn.disabled = true;
    const nuevas = await agregarFotos(files);
    btn.disabled = false;
    nuevas.forEach(f=>{
      const t = document.createElement('span');
      t.className = 'foto-thumb';
      t.style.backgroundImage = `url('${f.src}')`;
      t.title = 'tocá para sacarla';
      t.addEventListener('click', async ()=>{
        State.fotos = State.fotos.filter(x=>x.id!==f.id);
        await persistFotos();
        t.remove();
        Sound.fx.drop();
      });
      thumbs.appendChild(t);
    });
    if(nuevas.length){
      Sound.fx.reveal();
      const h = $('#fotoHint');
      if(h) h.textContent = `${State.fotos.length} recuerdo${State.fotos.length>1?'s':''} en el álbum`;
    }
  });
}

/* ---------- la sección del home: LA MESA ----------
   Un solo rectángulo donde las fotos caen y se van apilando, desparramadas
   y superpuestas como polaroids sobre una mesa. La última cosecha cae arriba
   de todo. Cada foto tiene SU lugar fijo (sale del hash del id): el montón
   no se rebaraja en cada visita — como una mesa de verdad. */
function renderRecuerdos(box){
  if(!box) return;
  const fotos = State.fotos.slice().sort((a,b)=>fechaOrd(a.fecha)-fechaOrd(b.fecha));
  box.innerHTML = '';
  const board = document.createElement('div');
  board.className = 'rec-board' + (fotos.length ? '' : ' empty');
  if(!fotos.length){
    board.innerHTML = `<div class="rec-void">
      <div class="rec-void-ico">${CAM_SVG}</div>
      <p>La mesa está vacía. La primera foto se saca en la próxima cosecha.</p>
    </div>`;
    box.appendChild(board);
    return;
  }

  // una sola foto puede estar en el aire; tocarla de nuevo (o tocar la mesa) la baja
  let arriba = null;
  const bajar = ()=>{
    if(!arriba) return;
    arriba.classList.remove('up');
    arriba.style.zIndex = arriba._z;
    const x = arriba.querySelector('.rec-x');
    if(x) x.remove();
    arriba = null;
  };

  // reparto orgánico pero parejo: secuencia R2 + un temblor propio de cada foto
  const F1 = 0.7548776662466927, F2 = 0.5698402909980532;
  fotos.forEach((f,i)=>{
    // hashStr da hasta 2^32: con >> firmado se vuelve negativo. Siempre >>>.
    const h = Math.abs(hashStr(f.id));
    const u = ((i+1)*F1 + (h%97)/970) % 1;
    const v = ((i+1)*F2 + ((h>>>5)%89)/890) % 1;
    const card = document.createElement('div');
    card.className = 'rec-card' + (f.h > f.w ? ' tall' : '');
    card.style.setProperty('--x', (7 + u*86).toFixed(1) + '%');
    card.style.setProperty('--y', (12 + v*76).toFixed(1) + '%');
    card.style.setProperty('--rot', (((h>>>3)%11) - 5) + 'deg');
    card.style.setProperty('--w', (200 + (h%84)) + 'px');
    card.style.setProperty('--i', Math.min(i, 14));
    // cada foto flota a su propio ritmo (duración y arranque salen del hash)
    card.style.setProperty('--fd', (6 + (h>>>7)%5) + 's');
    card.style.setProperty('--fdel', '-' + ((h>>>9)%70)/10 + 's');
    card._z = i + 2;
    card.style.zIndex = card._z;
    card.innerHTML = `<div class="rec-ph" style="background-image:url('${f.src}')"></div>`;

    card.addEventListener('click', async e=>{
      e.stopPropagation();
      if(card.classList.contains('up')){ bajar(); Sound.fx.drop(); return; }
      bajar();
      // la foto sube y se agranda EN la mesa, sin ventanas
      const w = card.getBoundingClientRect().width;
      card.style.setProperty('--up', (Math.min(560, innerWidth*0.6) / Math.max(w,1)).toFixed(3));
      card.style.zIndex = 950;
      card.classList.add('up');
      arriba = card;
      Sound.fx.whoosh();
      // el único control: una ✕ chiquita para sacarla de la mesa
      const x = document.createElement('button');
      x.className = 'rec-x';
      x.textContent = '✕';
      x.title = 'Sacar esta foto';
      x.addEventListener('click', async ev=>{
        ev.stopPropagation();
        if(!confirm('¿Sacar esta foto de la mesa?')) return;
        State.fotos = State.fotos.filter(p=>p.id!==f.id);
        await persistFotos();
        Sound.fx.drop();
        renderRecuerdos(box);
      });
      card.appendChild(x);
    });
    board.appendChild(card);
  });
  board.addEventListener('click', bajar);
  const chip = document.createElement('div');
  chip.className = 'rec-count';
  chip.textContent = fotos.length + ' recuerdo' + (fotos.length>1 ? 's' : '');
  board.appendChild(chip);
  box.appendChild(board);
}

/* ---------- bajar / subir el álbum entero (el reset borra la memoria) ---------- */
function downloadRecuerdos(){
  if(!State.fotos.length) return toast('No hay fotos todavía');
  downloadText('recuerdos-del-club.json', JSON.stringify(State.fotos));
  toast(`${State.fotos.length} recuerdos descargados`);
}
async function cargarRecuerdos(txt){
  let arr;
  try{ arr = JSON.parse(txt); }catch(e){ return toast('Ese archivo no es un álbum válido'); }
  if(!Array.isArray(arr)) return toast('Ese archivo no es un álbum válido');
  const vistos = new Set(State.fotos.map(f=>f.id));
  const nuevas = arr.filter(f=>f && f.src && !vistos.has(f.id));
  State.fotos.push(...nuevas);
  await persistFotos();
  toast(`${nuevas.length} recuerdo${nuevas.length===1?'':'s'} ${nuevas.length?'sumado'+(nuevas.length===1?'':'s'):'nuevos'}`);
  const box = $('#recBox');
  if(box) renderRecuerdos(box);
}
