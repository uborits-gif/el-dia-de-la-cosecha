/* ============================================================
   🎚 EL LOOK — saturación, contraste, brillo y temperatura de toda
   la web, en vivo. Sirve para probar un tono, sacarle una captura y
   dejarlo fijo: cada combinación tiene un CÓDIGO corto.

        LK-112-104-98-m6-4      (la m es un menos)
           │   │   │  │ └─ calidez (sepia %)
           │   │   │  └─── tono (hue-rotate, en grados)
           │   │   └────── brillo %
           │   └────────── contraste %
           └────────────── saturación %

   Para dejar un look fijo: poner sus valores en LOOK_FIJO y listo,
   arranca así para todos sin tocar nada más.

   Ojo con el filtro: un `filter` en un ancestro convierte a los hijos
   `position:fixed` en absolutos. Por eso NO se aplica a <html> ni a
   <body>, sino a una lista corta de contenedores (ver --look en el CSS).
   ============================================================ */

const LOOK_BASE  = { sat:100, con:100, bri:100, tono:0, cal:0 };
/* 👉 el look de la casa: LK-143-102-96-m1-0.
   Verde bien saturado, apenas más contraste, un toque más oscuro y
   un grado de tono para sacarle lo ácido al lima. Cambiar acá para
   dejar otro fijo. */
const LOOK_FIJO  = { sat:143, con:102, bri:96, tono:-1, cal:0 };

const LOOK_CAMPOS = [
  { k:'sat',  nombre:'Saturación', min:40,  max:180, paso:1, uni:'%' },
  { k:'con',  nombre:'Contraste',  min:70,  max:145, paso:1, uni:'%' },
  { k:'bri',  nombre:'Brillo',     min:70,  max:140, paso:1, uni:'%' },
  { k:'tono', nombre:'Tono',       min:-30, max:30,  paso:1, uni:'°' },
  { k:'cal',  nombre:'Calidez',    min:0,   max:40,  paso:1, uni:'%' },
];

const lookNormal = v => ({ ...LOOK_BASE, ...(v||{}) });
const lookEsBase = v => LOOK_CAMPOS.every(c => +lookNormal(v)[c.k] === LOOK_BASE[c.k]);

const _lookNum = n => (n < 0 ? 'm' + Math.abs(n) : String(n));   // m4 se lee mejor que -4
function lookCodigo(v){
  const x = lookNormal(v);
  return 'LK-' + LOOK_CAMPOS.map(c => _lookNum(Math.round(x[c.k]))).join('-');
}
function lookDesdeCodigo(txt){
  const m = String(txt||'').trim().toUpperCase()
    .match(/^LK-(M?-?\d+)-(M?-?\d+)-(M?-?\d+)-(M?-?\d+)-(M?-?\d+)$/);
  if(!m) return null;
  const v = {};
  LOOK_CAMPOS.forEach((c,i)=>{
    const t = m[i+1];
    const n = t.startsWith('M') ? -parseInt(t.slice(1), 10) : parseInt(t, 10);
    v[c.k] = Math.min(c.max, Math.max(c.min, n));
  });
  return v;
}

function lookFiltro(v){
  const x = lookNormal(v);
  if(lookEsBase(x)) return 'none';
  return [
    x.sat  !== 100 ? `saturate(${x.sat}%)`     : '',
    x.con  !== 100 ? `contrast(${x.con}%)`     : '',
    x.bri  !== 100 ? `brightness(${x.bri}%)`   : '',
    x.tono !== 0   ? `hue-rotate(${x.tono}deg)`: '',
    x.cal  !== 0   ? `sepia(${x.cal}%)`        : '',
  ].filter(Boolean).join(' ') || 'none';
}

/* ---------- dónde vive ---------- */
const LOOK_LLAVE = 'cosecha:look';
function lookLeer(){
  try{
    const raw = localStorage.getItem(LOOK_LLAVE);
    if(raw) return lookNormal(JSON.parse(raw));
  }catch(e){}
  return lookNormal(LOOK_FIJO);
}
function lookGuardar(v){
  try{
    const igualAlDeLaCasa = LOOK_CAMPOS.every(c => +lookNormal(v)[c.k] === LOOK_FIJO[c.k]);
    if(igualAlDeLaCasa) localStorage.removeItem(LOOK_LLAVE);
    else localStorage.setItem(LOOK_LLAVE, JSON.stringify(lookNormal(v)));
  }catch(e){}
}
function lookAplicar(v){
  document.documentElement.style.setProperty('--look', lookFiltro(v));
}

/* ---------- el panel ---------- */
let _lookPanel = null;
function lookAbrir(){
  if(_lookPanel){ lookCerrar(); return; }
  let v = lookLeer();

  const filas = LOOK_CAMPOS.map(c=>`
    <label class="look-fila">
      <span class="look-n">${c.nombre}</span>
      <input type="range" id="lk-${c.k}" min="${c.min}" max="${c.max}" step="${c.paso}" value="${v[c.k]}">
      <output id="lko-${c.k}">${v[c.k]}${c.uni}</output>
    </label>`).join('');

  _lookPanel = document.createElement('div');
  _lookPanel.className = 'look';
  _lookPanel.innerHTML = `
    <div class="look-h">
      <b>🎚 El look</b>
      <button class="look-x" id="lkX" title="cerrar">✕</button>
    </div>
    ${filas}
    <div class="look-cod">
      <code id="lkCod">${lookCodigo(v)}</code>
      <button class="look-b" id="lkCopiar">copiar</button>
    </div>
    <div class="look-pie">
      <button class="look-b" id="lkReset">volver al de la casa</button>
      <span class="look-ayuda">Mandame el código con una captura y lo dejo fijo.</span>
    </div>`;
  document.body.appendChild(_lookPanel);

  const refrescar = ()=>{
    lookAplicar(v);
    LOOK_CAMPOS.forEach(c=>{
      const o = _lookPanel.querySelector('#lko-' + c.k);
      if(o) o.textContent = v[c.k] + c.uni;
    });
    const cod = _lookPanel.querySelector('#lkCod');
    if(cod) cod.textContent = lookCodigo(v);
    lookGuardar(v);
  };

  LOOK_CAMPOS.forEach(c=>{
    const r = _lookPanel.querySelector('#lk-' + c.k);
    if(r) r.addEventListener('input', ()=>{ v[c.k] = +r.value; refrescar(); });
  });

  _lookPanel.querySelector('#lkX').addEventListener('click', lookCerrar);
  _lookPanel.querySelector('#lkReset').addEventListener('click', ()=>{
    v = lookNormal(LOOK_FIJO);
    LOOK_CAMPOS.forEach(c=>{ const r = _lookPanel.querySelector('#lk-'+c.k); if(r) r.value = v[c.k]; });
    refrescar();
  });
  _lookPanel.querySelector('#lkCopiar').addEventListener('click', async ()=>{
    const cod = lookCodigo(v);
    try{ await navigator.clipboard.writeText(cod); toast('Código copiado: ' + cod); }
    catch(e){
      // sin permiso de portapapeles: al menos que quede seleccionado para copiar a mano
      const n = _lookPanel.querySelector('#lkCod');
      const s = getSelection(), r = document.createRange();
      r.selectNodeContents(n); s.removeAllRanges(); s.addRange(r);
      toast('Copialo a mano: ' + cod);
    }
  });
  refrescar();
}
function lookCerrar(){
  if(!_lookPanel) return;
  _lookPanel.remove();
  _lookPanel = null;
}

/* ---------- arranque ---------- */
function lookArrancar(){
  lookAplicar(lookLeer());
  // sin botón a la vista: el panel se abre con Shift+L y nada más
  addEventListener('keydown', e=>{
    if(e.shiftKey && (e.key === 'L' || e.key === 'l') && !/^(INPUT|TEXTAREA)$/.test((e.target||{}).tagName||'')){
      e.preventDefault(); lookAbrir();
    }
  });
}
