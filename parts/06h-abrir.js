/* ============================================================
   📖 CÓMO SE ABRE UN LIBRO
   El libro SALE de donde lo tocaste —del lomo en la bóveda, de la tapa
   en el estante—, vuela hasta el centro y se queda ahí; los tres bloques
   de la ficha entran detrás.

   ── El movimiento, capa por capa ──
   Todo el vuelo está parenteado como en After Effects: en vez de meter
   posición, escala y giro en una sola tanda de keyframes (que en los
   empalmes produce cambios bruscos de velocidad), cada propiedad vive en
   su propia capa con su propia curva y su propia duración. Se componen
   solas y el resultado no tiene junturas:

       .pl-vuelo   posición    (recorrido A→B)
       .pl-arco    arco        (se comba en el aire, no viaja recto)
       .pl-esc     escala      (dura un poco más: aterriza y sigue asentando)
       .pl-def     deformación (estirar y comprimir en el pico de velocidad)
       .book3d     giro        (arranca tarde y termina último)

   ── Por qué antes pegaba un salto al final ──
   El libro de la ficha RESPIRA (animación `breathe`, ±7px). Medíamos su
   posición con la respiración a mitad de camino, el vuelo aterrizaba en
   ese punto medido, y al cambiar el clon por el libro real éste ya se
   había movido: se veía un tirón. Ahora la respiración se congela antes
   de medir y se suelta después del cambio — como `breathe` arranca en 0,
   al soltarla no hay salto. El clon además se arma con el mismo tamaño y
   las mismas opciones que el libro final, así el cambio es invisible.
   ============================================================ */

const ABRIR_VARIANTES = [
  { id:'vuelo',   n:'Vuelo directo' },
  { id:'despega', n:'Se despega' },
  { id:'abre',    n:'Se abre en el aire' },
  { id:'lomo',    n:'Del lomo a la tapa' },
  { id:'camara',  n:'La cámara se acerca' },
];
let ABRIR_VAR = 0;
try{ ABRIR_VAR = Math.min(4, Math.max(0, +(localStorage.getItem('cosecha:abrir')||0))); }catch(e){}

/* Curvas propias. Ninguna es lineal y ninguna frena de golpe: todas tienen
   entrada suave y una cola larga, que es lo que hace que el final "se
   asiente" en vez de cortarse. */
const E_POS  = 'cubic-bezier(.24,.72,.18,1)';    // el recorrido
const E_ESC  = 'cubic-bezier(.20,.66,.12,1)';    // la escala, más tendida
const E_GIRO = 'cubic-bezier(.22,.68,.20,1)';    // el giro, el último en parar
const E_SENO = 'cubic-bezier(.42,0,.58,1)';      // ida y vuelta (arco, deformación)
const E_PANEL= 'cubic-bezier(.18,.78,.22,1)';    // los bloques de la ficha

/* ---------- de dónde sale el libro ----------
   No hace falta que las 12 llamadas a showPlacard pasen el origen: alcanza
   con recordar qué se tocó y subir al contenedor que representa al libro. */
const ABRIR_ORIGENES = '.vg2-slot, .vault-slot, .book-scene, .hx-cell, .hx-tn, .cmp-libro,' +
                       '.col-reco-item, .st-htl-item, .hc-holder, .cmp-libro-cov, .rz-premio';
let _abrirDesde = null;
document.addEventListener('pointerdown', e=>{
  const t = e.target;
  if(!t || !t.closest) return;
  // en la bóveda grande la ficha se abre con «Inspeccionar volumen», que no es
  // un libro: el vuelo tiene que salir igual del que está presentado
  _abrirDesde = t.closest(ABRIR_ORIGENES)
             || document.querySelector('.vg2-slot.presente')
             || null;
}, true);

const abrirReduce = ()=> matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const _capa = (cls, hijo)=>{ const d = document.createElement('div'); d.className = cls;
  if(hijo) d.appendChild(hijo); return d; };

/* ---------- la animación ---------- */
function abrirFicha(ov, book, intento){
  if(abrirReduce()) return;
  const destino = ov.querySelector('.pl2-book .book-scene');
  const izq  = ov.querySelector('.pl2-left');
  const der  = ov.querySelector('.pl2-right');
  const pill = ov.querySelector('.pl2-pill');
  if(!destino) return;

  /* Los bloques se esconden YA: si esperáramos a poder medir, se verían un
     cuadro antes de arrancar y quedaría un parpadeo. */
  if(!intento) [izq, der, pill].forEach(e=>{ if(e) e.style.opacity = '0'; });
  const mostrar = ()=>[izq, der, pill].forEach(e=>{ if(e) e.style.removeProperty('opacity'); });

  /* La ficha recién montada todavía no tiene medidas: se reintenta hasta que
     el libro de destino ocupe algo. (setTimeout y no rAF: con la pestaña en
     segundo plano el rAF no corre y la apertura no se enganchaba nunca.) */
  const rD0 = destino.getBoundingClientRect();
  if(!rD0.width || !rD0.height){
    if((intento || 0) < 10) return setTimeout(()=>abrirFicha(ov, book, (intento||0)+1), 16);
    mostrar();
    return;
  }

  /* 🚩 EL MARCO NO PUEDE MOVERSE MIENTRAS EL LIBRO VUELA.
     `.ov-pop` es la entrada genérica de todos los overlays: medio segundo de
     translateY(26px) + scale(.92), con rebote. El vuelo, en cambio, mide el
     destino en el cuadro 0 y aterriza exactamente ahí. Si el destino sigue
     creciendo y subiendo por detrás, el libro cae 31px abajo y un 10% más
     chico de lo que corresponde, y al cambiar el clon por el libro real se ve
     el salto — ese era el glitch al agrandarse.
     Acá la ficha ya tiene entrada propia (el vuelo y los tres bloques), así que
     la genérica sobra: se cambia por un fundido que no mueve nada, y el destino
     queda quieto desde el primer cuadro. */
  const marco = ov.querySelector('.pl2-frame') || ov.querySelector('.ov-pop');
  if(marco) marco.classList.add('pl2-quieto');

  /* 🫁 se congela la respiración ANTES de medir: si el libro está a mitad de
     su vaivén, todo el vuelo aterriza corrido y al cambiarlo se ve el tirón */
  const flota = destino.querySelector('.book-float');
  const somb  = destino.querySelector('.book-shadow');
  if(flota) flota.classList.add('still');
  if(somb)  somb.classList.add('still');
  const rD = destino.getBoundingClientRect();          // ya quieto: medida exacta
  mostrar();

  const respirar = ()=>{
    if(flota) flota.classList.remove('still');
    if(somb)  somb.classList.remove('still');
  };

  const fuente = _abrirDesde && document.body.contains(_abrirDesde) ? _abrirDesde : null;
  const rF = fuente ? fuente.getBoundingClientRect() : null;
  const hayVuelo = !!(rF && rF.width && rF.height &&
    rF.bottom > 0 && rF.top < innerHeight && rF.right > 0 && rF.left < innerWidth);

  const V = ABRIR_VARIANTES[ABRIR_VAR].id;
  const anim = [];

  if(!hayVuelo){
    respirar();
  } else {
    /* El clon se arma con el MISMO tamaño y las mismas opciones que el libro
       final. Ojo con la escala: la ficha se achica sola para entrar en
       pantalla, así que el libro dibujado mide MENOS que su --w. El vuelo
       tiene que terminar en esa escala achicada (k) y no en 1, o aterriza
       más grande que el libro real y el cambio pega un tirón. */
    const wReal = parseFloat(destino.style.getPropertyValue('--w')) || rD.width;
    const hReal = wReal * 1.5;
    const k = rD.width / wReal;                         // cuánto está achicada la ficha
    const libro = bookEl(book, { size: wReal, baseY:-26, detail:true, still:true });

    const def   = _capa('pl-def', libro);
    const esc   = _capa('pl-esc', def);
    const arco  = _capa('pl-arco', esc);
    const clon  = _capa('pl-vuelo', arco);
    // la caja del clon es la del libro SIN achicar y centrada en el destino:
    // así escalar desde el centro cae exactamente donde tiene que caer
    const cx = rD.left + rD.width/2, cy = rD.top + rD.height/2;
    clon.style.cssText = `position:fixed;left:${cx - wReal/2}px;top:${cy - hReal/2}px;` +
      `width:${wReal}px;height:${hReal}px;z-index:5200;pointer-events:none;`;
    document.body.appendChild(clon);
    destino.style.visibility = 'hidden';

    const cuerpo = libro.querySelector('.book3d');
    const dx = (rF.left + rF.width/2) - cx;
    const dy = (rF.top  + rF.height/2) - cy;
    const dist = Math.hypot(dx, dy) || 1;
    // el lomo de la bóveda es angosto: la escala sale del ALTO, no del ancho
    const esLomo = rF.width < rF.height * 0.45;
    const s0 = Math.max(0.04, esLomo ? rF.height/hReal : rF.width/wReal);
    const gY = esLomo ? -84 : -6;                       // desde qué ángulo llega

    /* el arco: perpendicular al recorrido, siempre combando hacia arriba, para
       que el libro describa una curva y no una recta de punto a punto */
    let px = -dy/dist, py = dx/dist;
    if(py > 0){ px = -px; py = -py; }
    const arcoPx = Math.min(58, Math.max(12, dist * 0.12));

    /* tiempos escalonados: la posición llega primero, la escala se sigue
       asentando un poco después y el giro es el último en detenerse */
    let tPos = 700, tEsc = 820, tGiro = 880, tArco = 700, dGiro = 40;
    let aMul = 1, sMed = null;

    if(V === 'despega'){                 // sale hacia adelante y después vuela
      tPos = 900; tEsc = 1000; tGiro = 1040; tArco = 900;
      aMul = 1.5;
      sMed = { off:.30, s: s0 * 1.55 };  // se agranda de golpe al despegarse
    } else if(V === 'abre'){
      tPos = 840; tEsc = 940; tGiro = 980; tArco = 840;
    } else if(V === 'lomo'){
      tPos = 920; tEsc = 1020; tGiro = 1080; tArco = 920; dGiro = 120;
      aMul = .7;
    } else if(V === 'camara'){           // casi no viaja: se acerca
      tPos = 640; tEsc = 760; tGiro = 800; tArco = 640;
      aMul = .35;
    }

    // 1 · posición
    anim.push(clon.animate(
      [{ transform:`translate(${dx}px, ${dy}px)` }, { transform:'translate(0,0)' }],
      { duration:tPos, easing:E_POS, fill:'both' }));

    // 2 · arco (0 → afuera → 0, sin quiebre)
    anim.push(arco.animate([
      { transform:'translate(0,0)' },
      { transform:`translate(${px*arcoPx*aMul}px, ${py*arcoPx*aMul}px)`, offset:.45 },
      { transform:'translate(0,0)' },
    ], { duration:tArco, easing:E_SENO, fill:'both' }));

    // 3 · escala — monótona y sin rebote: nada de pop al final.
    //     Termina en k (la escala real de la ficha), no en 1.
    const kEsc = sMed
      ? [{ transform:`scale(${s0})` },
         { transform:`scale(${sMed.s * k})`, offset:sMed.off, easing:E_ESC },
         { transform:`scale(${k})` }]
      : [{ transform:`scale(${s0})` }, { transform:`scale(${k})` }];
    anim.push(esc.animate(kEsc, { duration:tEsc, easing:E_ESC, fill:'both' }));

    /* 4 · deformación: se estira en el eje del movimiento cuando más rápido va.
       Tiene que quedar RESUELTA bien antes que la escala: si las dos siguen
       vivas al final, sus curvas se cruzan y el ancho hace un bache de medio
       píxel justo antes de asentarse — se lee como un temblorcito. Termina
       al 55% del vuelo y el tramo final queda como una aproximación limpia. */
    const horizontal = Math.abs(dx) > Math.abs(dy);
    anim.push(def.animate([
      { transform:'scale(1,1)' },
      { transform: horizontal ? 'scale(1.035,.974)' : 'scale(.974,1.035)', offset:.32 },
      { transform:'scale(1,1)' },
    ], { duration: Math.round(tEsc * 0.55), easing:E_SENO, fill:'both' }));

    // 5 · giro
    if(cuerpo){
      cuerpo.style.transition = 'none';        // que no pelee con la transición CSS
      anim.push(cuerpo.animate(
        V === 'lomo'
          ? [{ transform:'rotateY(-90deg)' },
             { transform:'rotateY(-90deg)', offset:.16 },
             { transform:'rotateY(-40deg) rotateX(5deg)', offset:.62, easing:E_GIRO },
             { transform:'rotateY(-26deg) rotateX(0deg)' }]
        : V === 'camara'
          ? [{ transform:`rotateY(${gY}deg) translateZ(-240px)` },
             { transform:'rotateY(-26deg) translateZ(0)' }]
          : [{ transform:`rotateY(${gY}deg) rotateX(2deg)` },
             { transform:'rotateY(-26deg) rotateX(0deg)' }],
        { duration:tGiro, delay:dGiro, easing:E_GIRO, fill:'both' }));
    }

    // 6 · la tapa se abre (sólo esa variante)
    if(V === 'abre'){
      const tapa = libro.querySelector('.bf-hinge') || libro.querySelector('.bf-cover');
      if(tapa){
        tapa.style.transformOrigin = 'left center';
        anim.push(tapa.animate([
          { transform:'rotateY(0deg)' },
          { transform:'rotateY(0deg)', offset:.34 },
          { transform:'rotateY(-98deg)', offset:1, easing:E_GIRO },
        ], { duration:tGiro, easing:E_SENO, fill:'both' }));
      }
    }

    /* el cambio: se destapa el libro real y se saca el clon en el MISMO
       cuadro, con la respiración soltándose recién ahí */
    let cambiado = false;
    const cambiar = ()=>{
      if(cambiado) return; cambiado = true;
      destino.style.removeProperty('visibility');
      respirar();
      clon.remove();
    };
    Promise.all(anim.map(a=>a.finished.catch(()=>{}))).then(cambiar);
    // red de seguridad: con la pestaña en segundo plano las animaciones no resuelven
    setTimeout(cambiar, Math.max(tPos, tEsc, tGiro + dGiro) * 1.6 + 500);
  }

  /* ---------- los tres bloques de la ficha ----------
     Entran escalonados y no sólo se desplazan: también escalan un pelo, así
     el movimiento tiene cuerpo en vez de ser un deslizamiento plano. */
  const base = hayVuelo ? 190 : 0;
  const entra = (el, ms, kf, dur)=>{
    if(!el) return;
    anim.push(el.animate(kf, { duration:dur||420, delay:ms, easing:E_PANEL, fill:'both' }));
  };
  const sube = [{ opacity:0, transform:'translateY(20px) scale(.985)' },
                { opacity:1, transform:'translateY(0) scale(1)' }];
  const desdeIzq = [{ opacity:0, transform:'translateX(-36px) scale(.985)' },
                    { opacity:1, transform:'translateX(0) scale(1)' }];
  const desdeDer = [{ opacity:0, transform:'translateX(36px) scale(.985)' },
                    { opacity:1, transform:'translateX(0) scale(1)' }];
  const abanicoI = [{ opacity:0, transform:'perspective(1400px) rotateY(34deg) translateX(24px)' },
                    { opacity:1, transform:'perspective(1400px) rotateY(0deg) translateX(0)' }];
  const abanicoD = [{ opacity:0, transform:'perspective(1400px) rotateY(-34deg) translateX(-24px)' },
                    { opacity:1, transform:'perspective(1400px) rotateY(0deg) translateX(0)' }];
  const enFoco   = [{ opacity:0, filter:'blur(7px)', transform:'scale(1.03)' },
                    { opacity:1, filter:'blur(0px)', transform:'scale(1)' }];

  if(V === 'despega'){      entra(izq, base, desdeIzq);  entra(der, base+90, desdeDer); }
  else if(V === 'abre'){    entra(izq, base+70, abanicoI, 580); entra(der, base+140, abanicoD, 580); }
  else if(V === 'camara'){  entra(izq, base, enFoco);    entra(der, base+80, enFoco); }
  else {                    entra(izq, base, sube);      entra(der, base+90, sube); }
  entra(pill, base + 170, sube, 460);
}

/* ---------- el selector, sólo mientras elegimos ---------- */
function abrirCambiarVariante(){
  ABRIR_VAR = (ABRIR_VAR + 1) % ABRIR_VARIANTES.length;
  try{ localStorage.setItem('cosecha:abrir', String(ABRIR_VAR)); }catch(e){}
  try{ toast(`Apertura ${ABRIR_VAR+1}/5 · ${ABRIR_VARIANTES[ABRIR_VAR].n}`); }catch(e){}
}
addEventListener('keydown', e=>{
  if(e.shiftKey && (e.key === 'A' || e.key === 'a')
     && !/^(INPUT|TEXTAREA)$/.test((e.target||{}).tagName||'')){
    e.preventDefault(); abrirCambiarVariante();
  }
});
