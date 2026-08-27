/* ============================================================
   🗄 LA BAULERA — el mueble de la Supercosecha.
   Tres cajones, uno por dificultad. Está armado en HTML/CSS con
   medidas fijas, igual que la referencia de runcabinet (cuerpo con
   borde, interior oscuro arriba, cajón de 96 con tirador y chapita,
   patitas abajo). Lo único que cambia es la paleta: madera oscura.

   Medidas fijas y después una sola escala para que entre en la
   pantalla: así el dibujo nunca se deforma y siempre entra en 16:9.

   El cajón no se ilumina ni suena: simplemente se abre.
   Una sola curva, la de la casa: cubic-bezier(.22,.75,.2,1).
   ============================================================ */

const CAB_CURVA = 'cubic-bezier(.22,.75,.2,1)';
const CAB_CAJONES = [
  { dif:1, nombre:'Fáciles',   punto:'#7CC85A' },
  { dif:2, nombre:'Medias',    punto:'#E8C34A' },
  { dif:3, nombre:'Difíciles', punto:'#E06A5E' },
];
/* el alto natural del mueble, para calcular la escala (ver cabineteAjustar) */
const CAB_ALTO = 26 + 96*3 + 14*2 + 26 + 18 + 26;   // aire + cajones + separaciones + borde + patas

const cabReducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const cabDur = ms => cabReducido() ? 1 : ms;

/* nunca esperar una animación para siempre: si el navegador la congela
   (pestaña en segundo plano), se sigue igual y la ficha queda en su lugar. */
function _cabEsperar(anim, ms){
  if(!anim) return Promise.resolve();
  return Promise.race([
    anim.finished.catch(()=>{}),
    new Promise(r=>setTimeout(()=>{ try{ anim.finish(); }catch(e){} r(); }, ms + 240)),
  ]);
}

function cabineteHTML(){
  const cajones = CAB_CAJONES.map(c=>`
    <div class="cab-ranura">
      <div class="cab-cavidad"></div>
      <div class="cab-cajon" data-dif="${c.dif}">
        <div class="cab-canto"></div>
        <div class="cab-cara">
          <span class="cab-tirador"></span>
          <span class="cab-rotulo"><i style="--p:${c.punto}"></i>${escapeHtml(c.nombre.toUpperCase())}</span>
        </div>
        <div class="cab-piso"></div>
      </div>
    </div>`).join('');

  return `<div class="cab" id="cab">
    <div class="cab-escena" id="cabEscena">
      <div class="cab-mesa" id="cabMesa"></div>
      <div class="cab-mueble" id="cabMueble">
        <div class="cab-vista">
          <div class="cab-caja">
            <div class="cab-cuerpo">
              <div class="cab-tapa"></div>
              <div class="cab-pila">${cajones}</div>
            </div>
            <div class="cab-patas"><i></i><i></i></div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

const cabCajon = dif => document.querySelector(`.cab-cajon[data-dif="${dif}"]`);
const cabMesa  = () => document.getElementById('cabMesa');
const cabEscena = () => document.getElementById('cabEscena');

/* una sola escala para todo el mueble: entra en el alto disponible sin deformarse */
let _cabOjo = null;
function cabineteAjustar(){
  const esc = cabEscena(), mue = document.getElementById('cabMueble');
  if(!esc || !mue) return;
  // se vigila la escena: si cambia de tamaño, todo se recalcula solo
  if(typeof ResizeObserver !== 'undefined' && esc.dataset.ojo !== '1'){
    esc.dataset.ojo = '1';
    if(_cabOjo) _cabOjo.disconnect();
    _cabOjo = new ResizeObserver(()=>{ cabineteAjustar(); _cabRepartir(); });
    _cabOjo.observe(esc);
  }
  const alto = esc.clientHeight, ancho = esc.clientWidth;
  // el mueble ocupa como mucho el 92% del alto y el 40% del ancho de la escena
  // en pantallas angostas el mueble puede ocupar más ancho: las fichas
  // se van arriba y abajo en vez de a los costados
  const factor = ancho < 700 ? 0.58 : 0.40;
  const k = Math.min(alto * 0.92 / CAB_ALTO, ancho * factor / 358, 1.15);
  mue.style.setProperty('--k', Math.max(0.4, k).toFixed(3));
}

/* la fichita cuadrada que sale del cajón */
function cabFichaHTML(c, num){
  return `<div class="cab-ficha-cara d${c.dificultad}">
    <div class="cab-ficha-top">
      <i></i><span>${escapeHtml(SUPER_CAT[c.categoria]||c.categoria||'')}</span>
      ${num!=null?`<b>${num}</b>`:''}
    </div>
    <p class="cab-ficha-txt">${escapeHtml(c.texto)}</p>
  </div>`;
}

/* ---------- abrir y cerrar: sin luces ni ruido ---------- */
async function cabineteAbrir(dif){
  const c = cabCajon(dif); if(!c) return;
  CAB_CAJONES.forEach(x=>{ if(x.dif!==dif) cabCajon(x.dif)?.classList.remove('abierto'); });
  c.classList.add('abierto');
  await sleep(cabDur(420));
}
async function cabineteCerrar(dif){
  (dif ? [cabCajon(dif)] : CAB_CAJONES.map(x=>cabCajon(x.dif)))
    .forEach(e=>e && e.classList.remove('abierto'));
  await sleep(cabDur(340));
}

/* ============================================================
   DÓNDE VAN LAS FICHAS
   Las columnas libres a los costados del mueble se reparten entre
   todas las fichas, de arriba a abajo. Se recalcula entero cada vez
   que entra o sale una, así nunca se pisan ni tapan el mueble.
   ============================================================ */
function _cabRepartir(){
  const esc = cabEscena(), mue = document.getElementById('cabMueble'), mesa = cabMesa();
  if(!esc || !mue || !mesa) return;
  const fichas = [...mesa.querySelectorAll('.cab-ficha')];
  if(!fichas.length) return;

  const E = esc.getBoundingClientRect(), M = mue.getBoundingClientRect();
  const m = 8, n = fichas.length;
  const izq = { a: m, b: (M.left - E.left) - m };
  const der = { a: (M.right - E.left) + m, b: E.width - m };
  const anchoCol = Math.min(izq.b - izq.a, der.b - der.a);

  // a los costados si hay lugar de verdad; si no, arriba y abajo del mueble
  const enColumnas = anchoCol >= 86;
  const porGrupo = Math.ceil(n / 2);
  const w = enColumnas
    ? Math.max(56, Math.min(132, anchoCol - 4))
    : Math.max(56, Math.min(112, E.width / (porGrupo + 1) - 10));
  // si el alto no alcanza, el texto se achica antes que salirse de la escena
  const altoQueEntra = E.height / porGrupo - 8;
  fichas.forEach(f=>{
    f.classList.toggle('compacta', altoQueEntra < 104);
    // si no entra la categoría, mejor no mostrar una letra suelta
    f.classList.toggle('angosta', w < 104);
  });

  fichas.forEach(f=>{ f.style.width = Math.round(w) + 'px'; });
  // el alto ya no es el ancho: las fichas crecen con su texto
  const altoDe = f => f.offsetHeight || w;
  const hMax = Math.max(...fichas.map(altoDe));

  const poner = (f, cx, cy, giro)=>{
    f.dataset.r = giro.toFixed(2);
    f.style.left = Math.round(cx) + 'px';
    f.style.top  = Math.round(cy) + 'px';
    const cara = f.firstElementChild;
    if(cara && !f.dataset.volando) cara.style.transform = 'rotate(' + giro + 'deg)';
  };
  // un ladeo estable por ficha: sale de su posición, no del azar de cada repintado
  const giroDe = i => [-4.5, 3.5, -2.5, 4.5, -3.5, 2.5][i % 6];
  const meterY = v => Math.min(Math.max(v, hMax/2 + m), Math.max(hMax/2 + m, E.height - hMax/2 - m));
  const meterX = v => Math.min(Math.max(v, w/2 + m), Math.max(w/2 + m, E.width  - w/2 - m));

  const encajar = ()=>fichas.forEach(f=>{
    const h = f.offsetHeight || w, wd = f.offsetWidth || w;
    const cy = parseFloat(f.style.top)  || 0, cx = parseFloat(f.style.left) || 0;
    f.style.top  = Math.round(Math.min(Math.max(cy, h/2 + 4), Math.max(h/2 + 4, E.height - h/2 - 4))) + 'px';
    f.style.left = Math.round(Math.min(Math.max(cx, wd/2 + 4), Math.max(wd/2 + 4, E.width - wd/2 - 4))) + 'px';
  });

  if(enColumnas){
    const grupos = [fichas.filter((_,i)=>i%2===0), fichas.filter((_,i)=>i%2===1)];
    [izq, der].forEach((col, k)=>{
      const arr = grupos[k];
      const paso = Math.max(hMax + 6, E.height / (arr.length + 1));
      const centro = (col.a + col.b) / 2;
      const juego = Math.max(0, (col.b - col.a - w) / 2);
      arr.forEach((f,i)=>{
        const corrida = (i % 2 ? 1 : -1) * Math.min(9, juego);
        const arranque = (E.height - paso * (arr.length - 1)) / 2;
        poner(f, meterX(centro + corrida), meterY(arranque + paso * i), giroDe(fichas.indexOf(f)));
      });
    });
    encajar();
  } else {
    const arriba = fichas.filter((_,i)=>i%2===0), abajo = fichas.filter((_,i)=>i%2===1);
    const fila = (arr, cy)=>{
      const paso = E.width / (arr.length + 1);
      arr.forEach((f,i)=>poner(f, meterX(paso*(i+1)), meterY(cy), giroDe(fichas.indexOf(f))));
    };
    fila(arriba, (M.top - E.top) / 2);
    fila(abajo,  (M.bottom - E.top) + (E.height - (M.bottom - E.top)) / 2);
    encajar();
  }
}

/* ---------- volar: del cajón al sitio, o de vuelta adentro ---------- */
function _cabVuelo(origen, ficha, invertido){
  const a = origen.getBoundingClientRect(), b = ficha.getBoundingClientRect();
  if(!b.width || !a.width) return Promise.resolve();
  const dx = (a.left + a.width/2) - (b.left + b.width/2);
  const dy = (a.top  + a.height*0.62) - (b.top + b.height/2);
  const giro = (ficha.parentElement && ficha.parentElement.dataset.r) || '0';
  const dentro = { transform:`translate(${dx}px,${dy}px) rotate(0deg) scale(.12)`, opacity:0 };
  const medio  = { transform:`translate(${dx*0.3}px,${dy*0.3 - 14}px) rotate(${giro/2}deg) scale(.7)`,
                   opacity:1, offset:0.55 };
  const puesto = { transform:`rotate(${giro}deg) scale(1)`, opacity:1 };
  const ms = cabDur(invertido ? 400 : 580);
  return _cabEsperar(ficha.animate(invertido ? [puesto, medio, dentro] : [dentro, medio, puesto],
    { duration: ms, easing: CAB_CURVA, fill:'both' }), ms);
}

async function cabineteSacar(dif, c, meta={}){
  const cajon = cabCajon(dif), mesa = cabMesa();
  if(!cajon || !mesa) return null;

  const ficha = document.createElement('div');
  ficha.className = 'cab-ficha' + (meta.comun ? ' comun' : '');
  ficha.dataset.dif = dif;
  if(meta.idx != null) ficha.dataset.idx = meta.idx;
  ficha.dataset.volando = '1';
  ficha.innerHTML = cabFichaHTML(c, meta.num);
  ficha.style.opacity = '0';
  mesa.appendChild(ficha);
  _cabRepartir();
  await sleep(20);
  ficha.style.opacity = '';
  await _cabVuelo(cajon, ficha.firstElementChild, false);
  delete ficha.dataset.volando;
  _cabRepartir();   // ya tiene su alto real: se reacomoda con la medida buena
  return ficha;
}

/* todas las fichas se vuelven a guardar */
async function cabineteGuardar(){
  const mesa = cabMesa(); if(!mesa) return;
  const fichas = [...mesa.querySelectorAll('.cab-ficha')];
  if(!fichas.length) return;
  // de a uno: se abre el cajón que le toca, entra la ficha y sigue
  for(const f of fichas.reverse()){
    const dif = +f.dataset.dif || 1;
    await cabineteAbrir(dif);
    await _cabVuelo(cabCajon(dif), f.firstElementChild, true);
    f.remove();
    _cabRepartir();
  }
  await cabineteCerrar();
}

/* ---------- el sembrado: las cláusulas entran al mueble ---------- */
async function cabineteSembrar(){
  const esc = cabEscena(); if(!esc) return;
  const capa = document.createElement('div');
  capa.className = 'cab-lluvia';
  esc.appendChild(capa);
  const E = esc.getBoundingClientRect();
  const muestra = shuffled(SUPER_CLAUSULAS).slice(0, 12);
  const vuelos = muestra.map((c,i)=>{
    const f = document.createElement('div');
    f.className = 'cab-gota d' + c.dificultad;
    f.textContent = c.texto.length > 24 ? c.texto.slice(0,23)+'…' : c.texto;
    capa.appendChild(f);
    const lado = i % 2 ? 1 : -1;
    const x0 = E.width/2 + lado * (E.width * (0.22 + (i%3)*0.09));
    const y0 = E.height * (0.12 + ((i*37)%70)/100);
    f.style.left = Math.round(x0) + 'px';
    f.style.top  = Math.round(y0) + 'px';
    const cajon = cabCajon(c.dificultad); if(!cajon) return Promise.resolve();
    const d = cajon.getBoundingClientRect(), b = f.getBoundingClientRect();
    const dx = (d.left + d.width/2) - (b.left + b.width/2);
    const dy = (d.top + d.height*0.6) - (b.top + b.height/2);
    const giro = (i%2?1:-1) * (5 + (i%4)*3);
    const ms = cabDur(980);
    return _cabEsperar(f.animate([
      { transform:`translate(-50%,-50%) scale(.72) rotate(${giro}deg)`, opacity:0 },
      { transform:`translate(-50%,-50%) scale(1) rotate(${giro}deg)`, opacity:1, offset:0.3 },
      { transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.1)`, opacity:0 },
    ], { duration: ms, delay: cabDur(i*58), easing: CAB_CURVA, fill:'both' }), ms + i*58);
  });
  CAB_CAJONES.forEach(x=>cabCajon(x.dif)?.classList.add('rendija'));
  await Promise.all(vuelos);
  capa.remove();
  CAB_CAJONES.forEach(x=>cabCajon(x.dif)?.classList.remove('rendija'));
  await sleep(cabDur(200));
}

/* la escena cambia de tamaño → el mueble se reescala y las fichas se reacomodan */
addEventListener('resize', ()=>{
  if(!cabEscena()) return;
  cabineteAjustar();
  _cabRepartir();
});
