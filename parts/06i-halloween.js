/* ============================================================
   🎃 MODO HALLOWEEN — la cosecha temática

   Se enciende escribiendo «halloween» en cualquier lado (o entrando a
   #/halloween, que es la única forma cómoda desde el teléfono). Se apaga
   igual. Queda guardado en el dispositivo, no en el club: es una decoración,
   no un dato — y si fuera del club, encenderlo en un teléfono se lo cambiaría
   al otro en medio de una cosecha.

   No rehace la app: le cambia la piel. Toda la paleta vive en variables CSS,
   así que alcanza con pisarlas en `html[data-hw]` — el verde del club pasa a
   naranja de calabaza y morado, y absolutamente todo lo demás —botones,
   lomos, barras, estados— se tiñe solo. Lo único que se agrega encima es una
   capa de adornos: murciélagos cruzando, telarañas en las esquinas, una luna
   y una calabaza que respira.

   ⚠️ La capa de adornos cuelga del <body> y va `position:fixed`. No puede
   entrar a #app: el look le aplica un `filter` y un `filter` en un ancestro
   convierte los hijos fixed en absolutos (la trampa de siempre).

   El sonido es todo sintetizado con el motor que ya está en 02-audio.js: ni
   un kilobyte de audio nuevo. Una risa, un órgano y ruiditos sueltos cada
   tanto. Todo pasa por Sound, así que el botón de mute los apaga también.
   ============================================================ */

const HW_KEY = 'cosecha:halloween';
const HW_PALABRA = 'halloween';

/* los dos dibujos, tal cual los pasó Uri */
const HW_MURCIELAGO = `<svg viewBox="-0.0 -46.5 239.0 239.0" fill="currentColor" aria-hidden="true"><g transform="translate(0,146) scale(0.1,-0.1)"><path d="M2030 1265 c-98 -18 -139 -31 -230 -76 -128 -62 -217 -136 -342 -285 -58 -68 -133 -132 -126 -107 1 4 -1 25 -5 46 -6 27 -4 43 8 59 8 13 15 43 15 70 0 25 4 58 10 72 l9 25 -34 -20 c-19 -11 -46 -39 -61 -62 -23 -38 -30 -42 -65 -42 -31 0 -40 4 -45 20 -9 28 -51 83 -73 94 -17 9 -18 5 -16 -69 1 -45 7 -86 14 -94 9 -11 10 -20 2 -35 -6 -11 -11 -31 -11 -46 0 -22 -3 -24 -19 -15 -11 5 -54 51 -97 101 -111 131 -222 209 -374 262 -131 47 -270 59 -365 33 -27 -8 -42 -15 -32 -15 9 -1 17 -5 17 -11 0 -5 16 -12 35 -16 19 -3 35 -10 35 -15 0 -5 9 -9 19 -9 28 0 52 -11 45 -21 -3 -5 0 -9 6 -9 19 0 101 -83 121 -122 25 -49 34 -114 21 -161 l-10 -37 47 0 c141 0 261 -111 261 -242 0 -52 11 -60 42 -31 10 9 41 18 72 21 l54 4 54 -54 c69 -71 106 -116 124 -150 18 -34 24 -36 18 -5 -3 12 4 3 14 -21 10 -23 20 -41 23 -38 3 3 11 -15 18 -40 l13 -45 14 27 c8 14 14 34 14 44 0 31 12 53 20 40 5 -8 10 -2 15 18 3 17 12 33 19 35 7 3 27 30 45 61 65 116 136 169 196 146 15 -6 39 -19 53 -30 39 -31 47 -25 49 38 1 57 22 108 62 156 29 33 109 67 177 73 65 6 65 6 57 32 -27 86 7 218 73 282 32 31 47 58 24 44 -5 -3 -10 -2 -10 4 0 5 14 18 30 28 17 9 30 21 30 25 0 3 16 12 34 19 19 7 33 16 30 21 -3 4 9 8 26 8 28 0 30 2 16 15 -17 18 -63 18 -166 0z m-1693 -121 c-3 -3 -12 -4 -19 -1 -8 3 -5 6 6 6 11 1 17 -2 13 -5z"/></g></svg>`;
const HW_CALABAZA = `<svg viewBox="-0.0 -6.5 342.0 342.0" fill="currentColor" aria-hidden="true"><g transform="translate(0,329) scale(0.1,-0.1)"><path d="M1884 3055 c-110 -41 -233 -133 -289 -217 -17 -23 -33 -45 -36 -48 -15 -12 -68 -130 -89 -197 -13 -40 -27 -73 -32 -73 -6 0 -35 7 -65 16 -36 10 -70 14 -97 10 -55 -9 -155 -55 -167 -77 -8 -17 -12 -17 -50 -4 -86 31 -231 8 -342 -53 -164 -90 -299 -258 -396 -492 -49 -119 -88 -271 -102 -392 -14 -129 -7 -360 15 -458 93 -428 368 -719 679 -720 61 0 81 4 95 18 18 18 20 17 71 -29 67 -60 163 -106 252 -121 95 -16 245 0 322 36 l57 26 55 -26 c128 -58 330 -55 453 6 68 34 91 49 134 93 26 27 29 28 50 13 57 -40 254 -8 369 59 207 121 352 352 415 663 24 116 25 142 21 297 -4 136 -10 192 -31 280 -14 61 -30 119 -35 130 -5 11 -19 49 -31 85 -62 179 -197 378 -322 472 -141 107 -343 159 -432 113 -28 -15 -31 -14 -57 11 -30 29 -145 74 -189 74 -15 0 -55 -8 -88 -19 l-60 -18 -22 29 c-48 65 -48 182 -1 237 11 13 21 26 23 29 6 14 79 64 108 74 48 16 54 39 21 84 -39 54 -108 114 -129 113 -9 0 -45 -11 -78 -24z m-659 -1084 c65 -146 73 -166 95 -222 12 -30 25 -58 30 -64 14 -19 41 -114 35 -125 -9 -14 -120 -12 -318 6 -201 18 -232 25 -231 47 1 8 22 46 46 84 25 37 86 131 136 208 49 77 100 153 113 169 l22 28 17 -22 c9 -12 34 -61 55 -109z m1072 88 c16 -23 33 -48 38 -56 6 -8 51 -78 102 -156 50 -78 96 -147 101 -153 16 -18 42 -72 42 -87 0 -8 -13 -17 -29 -20 -64 -13 -390 -38 -456 -35 -66 3 -70 4 -68 26 2 13 11 42 22 65 10 23 38 87 61 142 24 55 46 105 50 110 4 6 11 21 15 35 15 49 76 170 85 170 5 0 22 -19 37 -41z m-525 -528 c24 -41 46 -83 51 -91 4 -8 21 -37 37 -65 52 -86 56 -95 39 -106 -8 -5 -96 -9 -197 -9 -152 0 -184 2 -188 15 -5 13 138 291 156 305 4 3 12 15 19 28 17 31 30 19 83 -77z m-965 -210 c82 -61 227 -145 298 -171 l40 -16 3 -101 3 -102 37 -11 c20 -6 61 -18 90 -28 63 -20 71 -14 97 68 29 94 34 97 102 89 85 -11 377 -10 453 1 72 10 85 5 93 -39 3 -16 16 -52 29 -81 20 -46 25 -51 48 -47 53 10 146 39 158 49 8 7 12 41 12 104 l0 94 93 45 c50 25 101 50 112 57 11 7 45 29 75 48 30 19 73 49 94 67 37 31 66 42 66 26 0 -15 -52 -196 -60 -212 -5 -9 -18 -36 -29 -61 -120 -270 -389 -479 -664 -515 -54 -7 -53 -8 -85 115 l-18 65 -140 3 c-105 2 -144 -1 -151 -10 -6 -7 -18 -48 -27 -90 -10 -43 -21 -80 -27 -83 -5 -4 -48 1 -97 10 -64 12 -117 31 -202 73 -103 51 -125 67 -211 152 -96 95 -143 159 -198 269 -58 114 -108 291 -83 291 5 0 45 -27 89 -59z"/></g></svg>`;

/* la araña y el fantasma los dibujo acá: son dos formas simples y no vale la
   pena otro archivo de assets para esto */
const HW_ARANA = `<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><g stroke="currentColor" stroke-width="2.6" fill="none" stroke-linecap="round"><path d="M26 30C18 26 14 20 12 14M38 30c8-4 12-10 14-16M25 35C16 34 10 31 6 26M39 35c9-1 15-4 19-9M26 40c-8 4-12 9-14 15M38 40c8 4 12 9 14 15"/></g><ellipse cx="32" cy="35" rx="11" ry="12"/><circle cx="32" cy="22" r="6.5"/><circle cx="29.4" cy="21" r="1.7" fill="#0B0611"/><circle cx="34.6" cy="21" r="1.7" fill="#0B0611"/></svg>`;
const HW_FANTASMA = `<svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><path d="M32 6c11 0 19 8.6 19 19.4V56c0 1.6-1.9 2.5-3.1 1.4l-4.6-4.1a2 2 0 0 0-2.7.05L36.9 57a2 2 0 0 1-2.8 0l-3.4-3.3a2 2 0 0 0-2.8 0L24.5 57a2 2 0 0 1-2.8-.05l-4.3-4a2 2 0 0 0-2.7 0l-4.6 4.1C8.9 58.2 7 57.3 7 55.7V25.4C7 14.6 15 6 26 6z"/><ellipse cx="24" cy="26" rx="3.4" ry="4.4" fill="#0B0611"/><ellipse cx="40" cy="26" rx="3.4" ry="4.4" fill="#0B0611"/><ellipse cx="32" cy="37" rx="3.4" ry="4.6" fill="#0B0611"/></svg>`;

/* ---------- encendido y apagado ---------- */
const hwEncendido = ()=>{ try{ return localStorage.getItem(HW_KEY) === '1'; }catch(e){ return false; } };

function hwAplicar(on){
  document.documentElement.toggleAttribute('data-hw', !!on);
  const vieja = document.querySelector('#hwCapa');
  if(vieja) vieja.remove();
  hwPararAmbiente();
  hwPararMusica();
  if(on){
    document.body.appendChild(hwCapa());
    hwArrancarAmbiente();
    hwArrancarMusica();
  }
}

async function hwToggle(forzar){
  const on = (forzar === undefined) ? !hwEncendido() : !!forzar;
  try{ localStorage.setItem(HW_KEY, on ? '1' : '0'); }catch(e){}
  hwAplicar(on);
  if(on){
    /* 🌩 LA ENTRADA. Un trueno que asusta de verdad: el relámpago primero —la
       luz llega antes que el sonido, como en la vida— y el estruendo encima.
       La pantalla tiembla. No es sutil a propósito: es el único momento del
       modo que pide ser un golpe. */
    hwRelampago(true);
    hwTrueno(true);
    hwSacudir();
    setTimeout(()=>{ hwRisa(); }, 1100);
    setTimeout(()=>{ hwOrgano(); }, 1500);
    try{ toast('🎃 Modo Halloween. Que alguien apague la luz.'); }catch(e){}
  } else {
    try{ toast('🕯 Se terminó. Volvió el verde.'); }catch(e){}
  }
  return on;
}

/* ---------- la capa de adornos ----------
   Cuelga del body y va detrás del contenido (ver el aviso de arriba sobre
   `filter` y `position:fixed`, y la luna que tapaba el botón de empezar). */
function hwCapa(){
  const d = document.createElement('div');
  d.id = 'hwCapa';
  d.setAttribute('aria-hidden', 'true');
  d.innerHTML = `
    <i class="hw-luna"></i>
    <i class="hw-niebla n1"></i><i class="hw-niebla n2"></i>
    <i class="hw-tela tl"></i><i class="hw-tela tr"></i>
    <span class="hw-bat b1">${HW_MURCIELAGO}</span>
    <span class="hw-bat b2">${HW_MURCIELAGO}</span>
    <span class="hw-bat b3">${HW_MURCIELAGO}</span>
    <span class="hw-fantasma">${HW_FANTASMA}</span>
    <span class="hw-hilo"><i></i><span class="hw-arana">${HW_ARANA}</span></span>
    <span class="hw-zapallo">${HW_CALABAZA}</span>`;
  return d;
}

/* el relámpago va aparte de la capa: tiene que taparlo TODO, hasta la ficha
   abierta, así que vive arriba de todo y se borra solo */
function hwRelampago(fuerte){
  const f = document.createElement('div');
  f.className = 'hw-rayo' + (fuerte ? ' fuerte' : '');
  document.body.appendChild(f);
  setTimeout(()=>f.remove(), fuerte ? 1200 : 700);
}
function hwSacudir(){
  const app = document.querySelector('#app');
  if(!app) return;
  app.classList.add('hw-tiembla');
  setTimeout(()=>app.classList.remove('hw-tiembla'), 700);
}

/* ---------- el sonido, todo sintetizado ----------
   Ni un kilobyte de audio nuevo: todo sale del motor de 02-audio.js. */

/* 🌩 el trueno. Son tres cosas: el chasquido (ruido agudo que cae de golpe),
   el cuerpo (ruido grave largo) y el retumbe (un seno muy bajo que se apaga
   despacio). Juntas suenan a tormenta; cualquiera sola suena a nada. */
function hwTrueno(fuerte){
  if(!Sound.isEnabled || !Sound.isEnabled()) return;
  const c = Sound.ac(); if(!c) return;
  const t0 = c.currentTime + 0.01;
  const v = fuerte ? 1 : 0.42;
  // el chasquido
  Sound.noise({ dur:0.22, vol:0.55*v, lp:7000, sweepTo:420, hp:300, wet:0.35, at:t0 });
  Sound.noise({ dur:0.1,  vol:0.42*v, lp:9000, sweepTo:2200, hp:1200, at:t0 });
  // el cuerpo, que entra apenas después y dura
  Sound.noise({ dur:2.6, vol:0.4*v, lp:420, sweepTo:90, wet:0.85, at:t0+0.05 });
  Sound.noise({ dur:1.7, vol:0.26*v, lp:900, sweepTo:160, wet:0.7, at:t0+0.26 });
  // el retumbe
  Sound.tone({ freq:52, glideTo:28, dur:2.9, type:'sine', vol:0.5*v, wet:0.6, at:t0+0.04 });
  Sound.tone({ freq:78, glideTo:38, dur:2.2, type:'triangle', vol:0.2*v, wet:0.7, at:t0+0.08 });
  // y el eco lejano, que es lo que lo vuelve tormenta y no portazo
  if(fuerte){
    Sound.noise({ dur:2.2, vol:0.16, lp:300, sweepTo:70, wet:0.9, at:t0+0.9 });
    Sound.tone({ freq:40, glideTo:24, dur:2.4, type:'sine', vol:0.17, wet:0.8, at:t0+1.0 });
  }
}

function hwRisa(at){
  if(!Sound.isEnabled || !Sound.isEnabled()) return;
  const c = Sound.ac(); if(!c) return;
  const t0 = at || c.currentTime + 0.02;
  /* una carcajada es eso: golpes cortos que bajan de tono y se apagan.
     Sierra para el cuerpo, un armónico arriba para que no suene a zumbido. */
  const base = 400 + Math.random()*110;
  const n = 5 + Math.floor(Math.random()*3);
  for(let i=0;i<n;i++){
    const t = t0 + i*0.132;
    const f = base * Math.pow(0.875, i);
    Sound.tone({ freq:f, glideTo:f*0.72, dur:0.115, type:'sawtooth', vol:0.12, wet:0.55, at:t });
    Sound.tone({ freq:f*2.01, dur:0.075, type:'triangle', vol:0.045, wet:0.45, at:t });
  }
}

function hwOrgano(at){
  if(!Sound.isEnabled || !Sound.isEnabled()) return;
  const c = Sound.ac(); if(!c) return;
  const t0 = at || c.currentTime + 0.02;
  // re menor, que es el acorde de todas las películas de terror
  [146.83, 174.61, 220.00, 293.66].forEach((f,i)=>{
    Sound.tone({ freq:f,   dur:1.7, type:'sawtooth', vol:0.065, wet:0.75, at:t0 + i*0.055 });
    Sound.tone({ freq:f/2, dur:1.9, type:'square',   vol:0.035, wet:0.6,  at:t0 + i*0.055 });
  });
}

function hwCrujido(){
  if(!Sound.isEnabled || !Sound.isEnabled()) return;
  Sound.noise({ dur:0.55, vol:0.055, lp:900, sweepTo:260, hp:120, wet:0.6 });
}
function hwChillido(){
  if(!Sound.isEnabled || !Sound.isEnabled()) return;
  const f = 1500 + Math.random()*700;
  Sound.tone({ freq:f, glideTo:f*0.45, dur:0.16, type:'sawtooth', vol:0.045, wet:0.7 });
}
function hwCampana(){
  if(!Sound.isEnabled || !Sound.isEnabled()) return;
  Sound.tone({ freq:110, dur:2.6, type:'sine', vol:0.07, wet:0.85 });
  Sound.tone({ freq:164.81, dur:2.2, type:'sine', vol:0.035, wet:0.85 });
}
/* viento: ruido muy filtrado y largo, con la frecuencia barriendo despacio */
function hwViento(){
  if(!Sound.isEnabled || !Sound.isEnabled()) return;
  Sound.noise({ dur:4.2, vol:0.05, lp:520, sweepTo:180, hp:90, wet:0.85 });
  Sound.noise({ dur:3.4, vol:0.03, lp:300, sweepTo:700, hp:60, wet:0.9 });
}
/* búho: dos notas, la segunda más baja. Es literalmente eso */
function hwBuho(){
  if(!Sound.isEnabled || !Sound.isEnabled()) return;
  const c = Sound.ac(); if(!c) return;
  const t = c.currentTime + 0.02;
  Sound.tone({ freq:420, glideTo:360, dur:0.3, type:'sine', vol:0.07, wet:0.8, at:t });
  Sound.tone({ freq:330, glideTo:300, dur:0.42, type:'sine', vol:0.06, wet:0.8, at:t+0.42 });
}
/* cadenas: golpecitos agudos y cortos, desordenados */
function hwCadenas(){
  if(!Sound.isEnabled || !Sound.isEnabled()) return;
  const c = Sound.ac(); if(!c) return;
  const t = c.currentTime + 0.02;
  for(let i=0;i<7;i++)
    Sound.noise({ dur:0.07, vol:0.035, lp:9000, hp:2600, wet:0.7, at:t + i*0.07 + Math.random()*0.04 });
}
/* latido: dos golpes graves, el segundo más flojo. El del corazón que se acelera */
function hwLatido(){
  if(!Sound.isEnabled || !Sound.isEnabled()) return;
  const c = Sound.ac(); if(!c) return;
  const t = c.currentTime + 0.02;
  for(let i=0;i<4;i++){
    const b = t + i*0.78;
    Sound.tone({ freq:62, glideTo:40, dur:0.2, type:'sine', vol:0.1, wet:0.4, at:b });
    Sound.tone({ freq:54, glideTo:34, dur:0.17, type:'sine', vol:0.06, wet:0.4, at:b+0.26 });
  }
}

/* ---------- la música ----------
   Una cajita de música en la menor, lenta, con un bajo que la sostiene. Va con
   su propio reloj y NO usa Sound.PATTERNS: ese secuenciador es de a uno, y si
   lo ocupara, cualquier minijuego le pisaría la banda sonora (o se la pisaría
   él). Así conviven: esto queda abajo, como atmósfera. */
const HW_MELODIA = [
  // la menor: la-do-mi-do · sol#-si-mi-si · (la octava arriba la hace la cajita)
  440.00, 523.25, 659.25, 523.25,  415.30, 493.88, 659.25, 493.88,
  440.00, 523.25, 698.46, 523.25,  415.30, 493.88, 587.33, 493.88,
];
const HW_BAJO = [110.00, 0, 0, 0, 103.83, 0, 0, 0, 110.00, 0, 0, 0, 98.00, 0, 0, 0];
let hwMusica = null;
function hwArrancarMusica(){
  hwPararMusica();
  const spb = 0.46;                       // lento: es atmósfera, no un tema
  let paso = 0, prox = 0;
  const tic = ()=>{
    if(!Sound.isEnabled || !Sound.isEnabled()) return;
    const c = Sound.ac(); if(!c) return;
    if(!prox) prox = c.currentTime + 0.1;
    while(prox < c.currentTime + 0.5){
      const i = paso % HW_MELODIA.length;
      const f = HW_MELODIA[i];
      if(f){
        // dos osciladores: el agudo es la púa de la cajita, el otro le da cuerpo
        Sound.tone({ freq:f*2, dur:0.5, type:'triangle', vol:0.035, wet:0.9, at:prox });
        Sound.tone({ freq:f,   dur:0.4, type:'sine',     vol:0.022, wet:0.8, at:prox });
      }
      const b = HW_BAJO[i];
      if(b) Sound.tone({ freq:b, dur:1.5, type:'sine', vol:0.045, wet:0.5, at:prox });
      paso++; prox += spb;
    }
  };
  hwMusica = setInterval(tic, 120);
}
function hwPararMusica(){ if(hwMusica){ clearInterval(hwMusica); hwMusica = null; } }

/* ---------- lo que pasa cada tanto ----------
   Muy de vez en cuando: si suena seguido deja de dar miedo y empieza a
   molestar. El relámpago viene con su trueno flojo, no con el de la entrada —
   ese asusta una vez y está bien así. */
let hwAmbiente = null;
function hwArrancarAmbiente(){
  hwPararAmbiente();
  const unaVez = ()=>{
    const r = Math.random();
    if(r < 0.17){ hwRelampago(); setTimeout(()=>hwTrueno(false), 260 + Math.random()*500); }
    else if(r < 0.32) hwViento();
    else if(r < 0.45) hwCrujido();
    else if(r < 0.57) hwBuho();
    else if(r < 0.68) hwChillido();
    else if(r < 0.78) hwCadenas();
    else if(r < 0.88) hwCampana();
    else if(r < 0.95) hwLatido();
    else hwRisa();
    hwAmbiente = setTimeout(unaVez, 16000 + Math.random()*26000);
  };
  hwAmbiente = setTimeout(unaVez, 9000 + Math.random()*12000);
}
function hwPararAmbiente(){ if(hwAmbiente){ clearTimeout(hwAmbiente); hwAmbiente = null; } }

/* ---------- escribir la palabra ----------
   Un buffer corto de teclas. No corre si estás tipeando en un campo: nadie
   quiere que escribir «halloween» en la sinopsis de un libro le dé vuelta la
   app. */
let hwBuffer = '';
addEventListener('keydown', e=>{
  const tag = ((e.target||{}).tagName || '').toUpperCase();
  if(tag === 'INPUT' || tag === 'TEXTAREA' || (e.target||{}).isContentEditable) return;
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  if(!/^[a-zA-Z]$/.test(e.key)) return;
  hwBuffer = (hwBuffer + e.key.toLowerCase()).slice(-HW_PALABRA.length);
  if(hwBuffer === HW_PALABRA){ hwBuffer = ''; hwToggle(); }
});

/* al abrir, si quedó encendido se vuelve a poner (sin el trueno: asustar al
   que entra a mirar la bóveda no era la idea) */
if(hwEncendido()) hwAplicar(true);
