/* ============================================================
   🎨 EL COLOR DE CADA LIBRO — sistema de Read Your Color
   (readyourcolor.com, de Stephen Rees). Un COMPÁS de seis colores:
     · ROJO  = puro corazón   · AZUL = pura mente
     · los otros cuatro son combinaciones de corazón/mente con
       raíces (lo real) o alas (lo imaginado).
   Cada color se parte en dos subtipos, y cada subtipo es la tendencia
   hacia uno de sus dos vecinos: «Rojo Épico» es rojo que tira a naranja.
   Son 6 × 2 = 12 casillas y entre las dos cubren toda la casa: un LIBRO
   siempre cae en una. Una PERSONA sí puede quedarse en su color a secas,
   porque lo elige a mano y no todos saben para dónde tiran.
   El color NO se deduce por tropes: se piensa libro por libro.
   ============================================================ */

const COLOR_ORIGEN = {
  autor:'Stephen Rees',
  quien:'Un lector que odiaba los libros hasta que unas pocas recomendaciones bien elegidas lo cambiaron todo.',
  para:'Ayudar a otros a enamorarse de la lectura sin culpa ni obligación — y a escapar del algoritmo, que siempre te devuelve lo mismo.',
  ejes:'Dos preguntas: ¿qué parte tuya estimula un libro (corazón o mente)? y ¿cómo querés que te llegue (raíces o alas)?',
};

/* El COMPÁS. Rojo es PURO corazón y Azul es PURA mente (van al centro de su eje);
   los otros cuatro son las combinaciones. Cada color tiene dos vecinos, y la
   tendencia hacia uno de ellos es el subtipo: tu color es la casa, el subtipo
   es la habitación donde pasás más tiempo. */
const COLORES = {
  rojo: {
    id:'rojo', emoji:'🔴', nombre:'Rojo', apodo:'La Intensa', clave:'Intensidad',
    eje:'puro corazón', motor:'corazón', mundo:'centro', hex:'#E5484D', hex2:'#FF8A8D',
    desc:'Lee por adrenalina. Apuestas altas, personajes que atrapan desde la primera página.',
    busca:'Thrillers, supervivencia, terror, aventura que no afloja.',
    vecinos:['naranja','amarillo'],
    subs:[ {id:'rojo-epico', nombre:'Épico', hacia:'naranja', desc:'Intensidad a lo grande: la adrenalina pasa en mundos enormes.'},
           {id:'rojo-arraigado', nombre:'Arraigado', hacia:'amarillo', desc:'Intensidad con los pies en la tierra: el peligro le pasa a gente real.'} ],
  },
  naranja: {
    id:'naranja', emoji:'🟠', nombre:'Naranja', apodo:'El Asombrado', clave:'Asombro',
    eje:'corazón · alas', motor:'corazón', mundo:'alas', hex:'#F76B15', hex2:'#FFB067',
    desc:'Lee para transportarse. Quiere perderse completamente en otro mundo.',
    busca:'Fantasía, ciencia ficción, realismo mágico, mundos con reglas propias.',
    vecinos:['rojo','morado'],
    subs:[ {id:'naranja-apasionado', nombre:'Apasionado', hacia:'rojo', desc:'Asombro con intensidad: épica, riesgo, mundos que arden.'},
           {id:'naranja-experimental', nombre:'Experimental', hacia:'morado', desc:'Asombro con rareza: mundos que además son ideas extrañas.'} ],
  },
  amarillo: {
    id:'amarillo', emoji:'🟡', nombre:'Amarillo', apodo:'La Conectada', clave:'Conexión',
    eje:'corazón · raíces', motor:'corazón', mundo:'raíces', hex:'#F5C518', hex2:'#FFE28A',
    desc:'Lee para sentirse parte de algo. Quiere que los personajes se sientan reales y cercanos.',
    busca:'Personajes entrañables, familia, duelo, amistades, coming of age.',
    vecinos:['rojo','verde'],
    subs:[ {id:'amarillo-inmersivo', nombre:'Inmersivo', hacia:'rojo', desc:'Conexión que absorbe: vivir la historia con el cuerpo.'},
           {id:'amarillo-analitico', nombre:'Analítico', hacia:'verde', desc:'Conexión con la cabeza puesta: entender a la gente, no sólo quererla.'} ],
  },
  verde: {
    id:'verde', emoji:'🟢', nombre:'Verde', apodo:'La Clara', clave:'Claridad',
    eje:'mente · raíces', motor:'mente', mundo:'raíces', hex:'#30A46C', hex2:'#7CE0AB',
    desc:'Lee para entender cómo funciona el mundo.',
    busca:'No ficción, crónica, historia, ideas aplicables.',
    vecinos:['amarillo','azul'],
    subs:[ {id:'verde-aplicado', nombre:'Aplicado', hacia:'amarillo', desc:'Claridad con calidez humana: entender a través de la gente.'},
           {id:'verde-reflexivo', nombre:'Reflexivo', hacia:'azul', desc:'Claridad con profundidad filosófica: entender para pensar más hondo.'} ],
  },
  azul: {
    id:'azul', emoji:'🔵', nombre:'Azul', apodo:'El Profundo', clave:'Significado',
    eje:'pura mente', motor:'mente', mundo:'centro', hex:'#3E63DD', hex2:'#8DA4EF',
    desc:'Lee para que un libro lo deje pensando días después de cerrarlo. Quiere que lo desafíen.',
    busca:'Literario, filosófico, psicológico, prosa que se subraya.',
    vecinos:['morado','verde'],
    subs:[ {id:'azul-ferviente', nombre:'Ferviente', hacia:'morado', desc:'Significado por caminos raros: la idea llega en forma inusual.'},
           {id:'azul-contemplativo', nombre:'Contemplativo', hacia:'verde', desc:'Significado con los pies en el suelo: lo hondo dentro de lo real.'} ],
  },
  morado: {
    id:'morado', emoji:'🟣', nombre:'Morado', apodo:'La Sorprendida', clave:'Sorpresa',
    eje:'mente · alas', motor:'mente', mundo:'alas', hex:'#8E4EC6', hex2:'#C9A3E8',
    desc:'Lee para salirse de lo predecible, o para descubrir algo que nadie más está leyendo.',
    busca:'Experimental, narrador poco fiable, estructuras rotas, sátira, giros.',
    vecinos:['naranja','azul'],
    subs:[ {id:'morado-alquimista', nombre:'Alquimista', hacia:'naranja', desc:'Sorpresa que mezcla y transforma: lo raro con imaginación.'},
           {id:'morado-arquitecto', nombre:'Arquitecto', hacia:'azul', desc:'Sorpresa que construye: la rareza es una estructura pensada.'} ],
  },
};
const COLOR_LISTA = Object.values(COLORES);
const colorDe = id => COLORES[String(id||'').split('-')[0]] || null;
const subDe = id => { const c = colorDe(id); return c ? (c.subs.find(s=>s.id===id)||null) : null; };
/* los subs se describen como «Clave por tal cosa: lo que significa» — el matiz
   es la segunda mitad, para no repetir la clave del color al lado. */
const subMatiz = sb => { if(!sb) return ''; const i = sb.desc.indexOf(':');
  return (i < 0 ? sb.desc : sb.desc.slice(i+1)).trim(); };

/* ============================================================
   EL CLUB, LIBRO POR LIBRO — pensado uno a uno, no deducido.
   Cada entrada dice el color y POR QUÉ es ese y no otro.
   Para agregar un libro nuevo: sumarlo acá con su razón.
   ============================================================ */
const COLOR_CLUB = {
  "las gratitudes": { c:"amarillo-inmersivo", por:"Una mujer se está quedando sin palabras y quiere alcanzar a decir gracias. De Vigan te hace vivir el deterioro desde adentro: es corto, es tierno y te parte." },
  "han cantado bingo": { c:"naranja-experimental", por:"Dos hermanas, un volcán de noche y una familia que hereda ver muertos. La magia está metida en lo cotidiano canario como si fuera lo más normal." },
  "un cuarto propio": { c:"verde-reflexivo", por:"Woolf explica con una claridad brutal por qué no hubo mujeres escritoras: plata, tiempo y una puerta con llave. Se lee para entender, y te deja pensando un siglo después." },
  "good material": { c:"amarillo-analitico", por:"Un comediante tratando de entender por qué lo dejaron. Alderton es ensayista antes que novelista: el libro no sufre la ruptura, la analiza — y al final le da la palabra a ella." },
  "actos humanos": { c:"azul-contemplativo", por:"Gwangju, un gimnasio lleno de cuerpos, y cada capítulo en otra voz. La fuerza está en que pasó de verdad: Han Kang no experimenta, testimonia." },
  "vamos a morir todos": { c:"amarillo-analitico", por:"Adentro de la cabeza de una chica con pánico a la muerte que termina trabajando en una iglesia. Es graciosa y cálida, pero lo que hace todo el rato es tratar de entenderse." },
  "nada": { c:"azul-ferviente", por:"Un chico dice que la vida no tiene sentido y sus compañeros arman una pila de significado para refutarlo. La idea llega por un camino rarísimo y termina siendo insoportable." },
  "la llamada": { c:"verde-aplicado", por:"Guerriero reconstruye a una sobreviviente de la ESMA a fuerza de testimonio. Periodismo puro: entender algo enorme a través de una sola persona." },
  "el gesto final": { c:"morado-arquitecto", por:"Un hombre empuja a una desconocida a las vías y ella sonríe. Todo el libro es el mecanismo de esa sonrisa, armado por un juez que narra." },
  "el retrato de casada": { c:"amarillo-inmersivo", por:"Lucrezia de Medici, quince años, casada y convencida de que su marido la va a matar. O'Farrell escribe ornamentado y opresivo: lo vivís en el cuerpo de ella." },
  "1984": { c:"verde-reflexivo", por:"Se lee por las ideas: vigilancia, lenguaje, verdad. Claridad que además te deja filosofando." },
  "yo que nunca supe de los hombres": { c:"azul-ferviente", por:"Casi no pasa nada afuera: todo ocurre adentro. Y la premisa nunca se explica — esa negativa a resolver es la forma rara que lo empuja al morado." },
  "proyecto hail mary": { c:"rojo-epico", por:"El propio test lo pone de ejemplo rojo: reloj corriendo, apuestas altísimas y un tipo resolviendo con la vida en juego." },
  "la vegetariana": { c:"azul-ferviente", por:"Han Kang no cuenta una trama, cuenta un cuerpo que se apaga. Incomoda de a poco y se queda pegada." },
  "the wedding people": { c:"amarillo-analitico", por:"Empieza en el peor día de una mujer y la salva la gente. Pero Espach observa más de lo que abraza: es una comedia social que entiende por qué alguien quiere irse." },
  "we were liars": { c:"morado-alquimista", por:"El libro ES el giro. Todo lo anterior existe para que el final te obligue a empezar de nuevo." },
  "dark matter": { c:"rojo-epico", por:"Capítulos cortos como golpes. El multiverso está al servicio de que no puedas soltarlo." },
  "confesión": { c:"azul-contemplativo", por:"Kohan trabaja el pudor y lo no dicho, sobre la Argentina real. Hay que leer entre líneas y queda dando vueltas." },
  "10 días en un manicomio": { c:"verde-aplicado", por:"Periodismo de 1887: se hace internar para contar lo que pasa adentro. Se lee para saber, con la gente en el centro." },
  "bajo este sol tremendo": { c:"azul-contemplativo", por:"Busqued no arma trama, arma clima. Lo hondo pasa dentro de una Argentina sucia y del todo real, no en un experimento formal." },
  "distancia de rescate": { c:"morado-alquimista", por:"Un diálogo febril entre una moribunda y un chico que no es su hijo. La forma rara ES el terror." },
  "private rites": { c:"azul-ferviente", por:"Tres hermanas y un duelo bajo lluvia eterna. El apocalipsis es apenas el clima del drama." },
  "atmosphere": { c:"amarillo-inmersivo", por:"TJR escribe para que te enamores de la gente. La NASA de los 80 es decorado de un amor prohibido." },
  "las indignas": { c:"rojo-epico", por:"Bazterrica golpea: culto, castigo, cuerpos. Visceral y hacia adelante, sin dejarte respirar." },
  "el perfume": { c:"morado-alquimista", por:"Un asesino que mata por el olor, en prosa del siglo XVIII. No se parece a nada." },
  "las cosas que dejamos sin terminar": { c:"amarillo-inmersivo", por:"Yarros escribe para hacerte llorar y lo logra. Dos tiempos, un incendio, una guerra: la conexión te llega por el cuerpo, no por la cabeza." },
  "martyr": { c:"azul-contemplativo", por:"Un poeta buscando para qué sirve una muerte. Hondo, pero anclado en inmigración y adicción reales." },
  "el final se escribe solo": { c:"morado-arquitecto", por:"Escritores compitiendo por el mejor final mientras la ficción se filtra. Metaficción armada como mecanismo." },
  "trenza del mar esmeralda": { c:"naranja-apasionado", por:"Sanderson: mares que matan con reglas claras. Asombro con aventura y riesgo." },
  "amanecer en la cosecha": { c:"rojo-epico", por:"Los Juegos del Hambre en su versión más brutal. Supervivencia con reloj, pero adentro de una arena construida como espectáculo: la intensidad pasa a lo grande." },
  "condenada": { c:"morado-alquimista", por:"Una adolescente muerta narrando el infierno con humor ácido. Palahniuk es puro exceso de voz." },
  "dorayaki": { c:"amarillo-analitico", por:"Una anciana, un pastelero y una receta. Cálido, pero también sobre la lepra y el estigma en Japón." },
  "yesteryear": { c:"morado-arquitecto", por:"Una influencer trad-wife atrapada en su propia puesta en escena. Sátira social con trampa pensada." },
  "y entonces desperté": { c:"morado-arquitecto", por:"Todo se apoya en que la realidad no es la que te contaron. El piso se mueve, con lógica." },
  "notes on an execution": { c:"azul-contemplativo", por:"Le saca el protagonismo al asesino y se lo da a las mujeres que dejó. Una decisión moral hecha estructura." },
  "te daría el sol": { c:"amarillo-inmersivo", por:"Gemelos partidos por una muerte, a dos voces y dos tiempos. La prosa de Nelson es sensorial y te arrastra: se vive con el cuerpo." },
  "soy un gato": { c:"morado-arquitecto", por:"Un gato sin nombre juzgando al Japón de 1905. Digresión pura, sin trama: la rareza es el plan." },
  "los ojos son la mejor parte": { c:"rojo-arraigado", por:"Una obsesión que crece hasta la violencia. Incómodo y físico, en un mundo del todo real." },
  "antes vivíamos aquí": { c:"rojo-arraigado", por:"Terror de casa: los dueños anteriores volvieron. Para leerlo de una sentada, con miedo cotidiano." },
  "pedro páramo": { c:"morado-alquimista", por:"Un pueblo donde todos están muertos y las voces se mezclan sin avisar. Rompió la novela latinoamericana." },
  "diez negritos": { c:"morado-arquitecto", por:"Diez muertes, una isla, una solución imposible. Christie te desafía a resolver el mecanismo." },
  "número dos": { c:"amarillo-analitico", por:"El chico que casi fue Harry Potter: el dolor de quedar segundo, mirado casi como un estudio." },
  "carrie": { c:"rojo-arraigado", por:"Humillación acumulada que estalla en la fiesta. King la escribió como una vendetta de secundaria real." },
  "frankenstein": { c:"naranja-experimental", por:"El propio test lo pone de ejemplo naranja: gótico y transportador, con una idea rara en el centro." },
  "criaturas luminosas": { c:"amarillo-analitico", por:"Una viuda, un pibe perdido y un pulpo que narra. Abraza, y de paso te enseña algo del bicho." },
  "la ladrona de libros": { c:"verde-aplicado", por:"El test lo pone de ejemplo verde: entender la Alemania nazi desde adentro, con la gente en el centro." },
  "la vida invisible de addie larue": { c:"naranja-experimental", por:"Un pacto y siglos de ser olvidada. Magia en lo cotidiano con un concepto raro sosteniéndola." },
  "carl el mazmorrero": { c:"naranja-apasionado", por:"Una mazmorra con niveles, reglas y stats. Aprender a jugar un juego a los tiros y riéndote." },
  "la segunda venida de hilda bustamante": { c:"naranja-experimental", por:"Una abuela vuelve de la muerte y el pueblo sigue como si nada. Realismo mágico argentino, tibio y raro." },
  "la casa del mar más azul": { c:"amarillo-inmersivo", por:"Klune escribe refugios. La magia es el decorado; lo que importa es meterse en esa casa, sentirla, y no querer salir." },
  "revival": { c:"rojo-epico", por:"King construyendo dread por décadas hasta un final que deja frío. Terror con motor y más allá." },
  "best offer wins": { c:"morado-arquitecto", por:"Buscar casa como enfermedad. Comedia negra filosa sobre el deseo, armada con precisión." },
};
const colorKey = t => String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')
  .replace(/[^a-z0-9áéíóúñ ]/gi,'').replace(/\s+/g,' ').trim();
const COLOR_CLUB_NORM = (()=>{ const m={};
  Object.entries(COLOR_CLUB).forEach(([k,v])=>{ m[colorKey(k)] = v; }); return m; })();

/* qué color le corresponde a un libro (por lo pensado, o lo ya guardado) */
function colorDeLibro(b){
  if(!b) return null;
  if(b.color) return b.color;
  const e = COLOR_CLUB_NORM[colorKey(b.titulo)];
  return e ? e.c : null;
}
function razonDeColor(b){
  const e = b && COLOR_CLUB_NORM[colorKey(b.titulo)];
  return e ? e.por : '';
}
/* escribe el color pensado en la metadata de los libros que todavía no lo tienen */
async function colorAplicarAlClub(){
  let n = 0;
  [...(State.read||[]), ...(State.vault||[])].forEach(b=>{
    const e = COLOR_CLUB_NORM[colorKey(b.titulo)];
    if(e && b.color !== e.c){ b.color = e.c; n++; }
  });
  if(n && typeof persist === 'function') await persist();
  return n;
}


/* ---------- migración: el compás cambió de nombres ----------
   Antes había subtipos inventados (azul-hondo, violeta-truco…) y el morado
   se llamaba violeta. Lo guardado que ya no existe se vuelve a pensar
   desde la tabla de arriba; si el libro no está en la tabla, se le deja
   al menos la casa (el color) sin la habitación (el subtipo). */
const COLOR_RENOMBRADOS = { violeta:'morado', purpura:'morado' };
const colorSano = id => !!subDe(id) || (!!COLORES[id] && String(id).indexOf('-') < 0);

async function colorMigrar(){
  let n = 0;
  [...(State.read||[]), ...(State.vault||[])].forEach(b=>{
    if(!b.color || colorSano(b.color)) return;
    const e = COLOR_CLUB_NORM[colorKey(b.titulo)];
    if(e){ b.color = e.c; n++; return; }
    const base = String(b.color).split('-')[0];
    const casa = COLORES[base] ? base : COLOR_RENOMBRADOS[base];
    b.color = casa || '';
    n++;
  });
  if(n && typeof persist === 'function') await persist();
  return n;
}

/* ---------- quién es de qué color ----------
   Lo que ya sabemos, por nombre (no por casilla A/B, que se puede dar vuelta).
   Se siembra una sola vez: después manda lo que elijan en estadísticas. */
const COLOR_PERSONAS = {
  uri:  'naranja-apasionado',     // naranja con tendencia al rojo
  maru: 'morado-arquitecto',      // morado (violeta) con tendencia al azul
};
const COLOR_SIEMBRA_V = 4;        // subir esto vuelve a sembrar lo que nos dijeron
function colorSembrarPersonas(){
  let v = 0;
  try{ v = +(localStorage.getItem('cosecha:color-siembra') || 0); }catch(e){ return; }
  ['a','b'].forEach(w=>{
    let ya = null;
    try{ ya = localStorage.getItem('cosecha:color-'+w); }catch(e){}
    const n = String((State.players||{})[w]||'').toLowerCase().trim();
    const sabido = COLOR_PERSONAS[n];
    if(sabido && v < COLOR_SIEMBRA_V){ setColorJugador(w, sabido); return; }   // lo que nos dijeron manda
    if(ya && !colorSano(ya)){                     // guardado con el compás viejo (violeta, azul-hondo…)
      const base = String(ya).split('-')[0];
      const casa = COLORES[base] ? base : COLOR_RENOMBRADOS[base];
      setColorJugador(w, casa || '');             // se rescata la casa, la tendencia se vuelve a elegir
    }
  });
  try{ localStorage.setItem('cosecha:color-siembra', String(COLOR_SIEMBRA_V)); }catch(e){}
}

/* El color se guarda por NOMBRE, no por casilla.
   Antes vivía en 'cosecha:color-a' / '-b', y con eso alcanzaba para que se
   diera vuelta todo: en el club real la casilla 'a' terminó siendo Uri y no
   Maru, así que cada uno aparecía en estadísticas con el color del otro. La
   casilla se puede dar vuelta; el nombre no. */
const _colorClave = who => {
  const n = String((State.players||{})[who]||'').toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g,'');
  return n ? 'cosecha:color:' + n : '';
};
function colorJugador(who){
  try{
    const k = _colorClave(who);
    const elegido = k ? localStorage.getItem(k) : null;
    if(elegido) return elegido;                       // lo que eligió esa persona
    const n = String((State.players||{})[who]||'').toLowerCase().trim();
    if(COLOR_PERSONAS[n]) return COLOR_PERSONAS[n];   // lo que ya sabemos de ella
    return localStorage.getItem('cosecha:color-'+who) || '';   // lo viejo, por casilla
  }catch(e){ return ''; }
}
function setColorJugador(who, id){
  try{
    const k = _colorClave(who);
    localStorage.setItem(k || ('cosecha:color-'+who), id||'');
  }catch(e){}
}

/* afinidad segun el COMPAS: misma casa > vecino (comparte un eje) > lejano */
function colorAfinidad(colorLibro, colorLector){
  const A = String(colorLibro||'').split('-')[0], B = String(colorLector||'').split('-')[0];
  const ca = COLORES[A], cb = COLORES[B];
  if(!ca || !cb) return 0;
  if(A === B) return colorLibro === colorLector ? 100 : 94;
  if(ca.vecinos.includes(B)) return 74;
  const dosPasos = ca.vecinos.some(v => COLORES[v] && COLORES[v].vecinos.includes(B));
  return dosPasos ? 46 : 26;
}
/* la frase del subtipo: «Rojo Épico — con tendencia a naranja» */
function colorFrase(id){
  const c = colorDe(id), sb = subDe(id);
  if(!c) return '';
  if(!sb) return c.nombre;
  const h = COLORES[sb.hacia];
  return c.nombre + ' ' + sb.nombre + (h ? ' — con tendencia a ' + h.nombre.toLowerCase() : '');
}
/* ---------- piezas visuales ---------- */
/* ---------- piezas visuales ---------- */
function colorPunto(id, size=14){
  const c = colorDe(id); if(!c) return '';
  return `<i class="col-dot" style="--cc:${c.hex};--cc2:${c.hex2};width:${size}px;height:${size}px"></i>`;
}
function colorPill(id, opts={}){
  const c = colorDe(id); if(!c) return '';
  const s = subDe(id);
  return `<span class="col-pill" style="--cc:${c.hex};--cc2:${c.hex2}">
    ${colorPunto(id, 11)}<b>${escapeHtml(c.nombre)}</b>${s&&!opts.corto?`<i>${escapeHtml(s.nombre)}</i>`:''}</span>`;
}

/* ---------- el bloque COLOR de la ficha (va debajo de los tropes) ---------- */
function colorFichaHTML(b){
  const id = colorDeLibro(b); const c = colorDe(id); if(!c) return '';
  const s = subDe(id), h = s ? COLORES[s.hacia] : null, por = razonDeColor(b);
  return `<div class="pl2-sec col-ficha" style="--cc:${c.hex};--cc2:${c.hex2}">
    <h4 class="pl2-h">Color</h4>
    <div class="colf-card" data-coltip="${id}">
      <div class="colf-orb"><i></i></div>
      <div class="colf-txt">
        <div class="colf-n"><b>${escapeHtml(c.nombre)}</b>${s?`<em>${escapeHtml(s.nombre)}</em>`:''}</div>
        <div class="colf-ap">${escapeHtml(c.apodo)} · ${escapeHtml(c.clave)}</div>
      </div>
    </div>
    ${h?`<div class="colf-tend">
      <span class="colf-tend-l">tendencia a</span>
      <span class="colf-tend-c" style="--tc:${h.hex};--tc2:${h.hex2}">${colorPunto(h.id,9)}${escapeHtml(h.nombre)}</span>
      <span class="colf-tend-d">${escapeHtml(subMatiz(s))}</span>
    </div>`:''}
    ${por?`<p class="colf-por">${escapeHtml(por)}</p>`:''}
  </div>`;
}

/* ---------- el tooltip diseñado que explica cada color ----------
   cualquier elemento con data-coltip="rojo" o "rojo-epico" lo muestra al pasar. */
function colorTipHTML(id){
  const c = colorDe(id); if(!c) return '';
  const s = subDe(id);
  return `<div class="coltip-card" style="--cc:${c.hex};--cc2:${c.hex2}">
    <div class="coltip-glow"></div>
    <div class="coltip-top">
      <div class="coltip-orb"><i></i></div>
      <div>
        <div class="coltip-n">${escapeHtml(c.nombre)}${s?` <em>${escapeHtml(s.nombre)}</em>`:''}</div>
        <div class="coltip-ap">${escapeHtml(c.apodo)}</div>
      </div>
      <div class="coltip-eje">${escapeHtml(c.eje)}</div>
    </div>
    <div class="coltip-clave">${escapeHtml(c.clave)}</div>
    <p class="coltip-d">${escapeHtml(c.desc)}</p>
    ${s?`<div class="coltip-sub">
      <b>${escapeHtml(s.nombre)}</b><span>${escapeHtml(subMatiz(s))}</span>
      ${COLORES[s.hacia]?`<i style="--vc:${COLORES[s.hacia].hex}">tira a ${escapeHtml(COLORES[s.hacia].nombre.toLowerCase())}</i>`:''}
    </div>`:''}
    <div class="coltip-busca"><span>busca</span>${escapeHtml(c.busca)}</div>
    <div class="coltip-vec">${c.vecinos.map(v=>{ const n=COLORES[v]; return n?`<i style="--vc:${n.hex}"></i>`:''; }).join('')}
      <span>vecinos: ${c.vecinos.map(v=>COLORES[v]?COLORES[v].nombre.toLowerCase():'').filter(Boolean).join(' · ')}</span></div>
  </div>`;
}

let _colTipEl = null, _colTipRaf = 0;
function colorTipMontar(){
  if(_colTipEl) return;
  _colTipEl = document.createElement('div');
  _colTipEl.className = 'coltip';
  document.body.appendChild(_colTipEl);

  const colocar = (host)=>{
    const r = host.getBoundingClientRect(), t = _colTipEl.getBoundingClientRect();
    const m = 12, vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    let x = r.left + r.width/2 - t.width/2;
    x = Math.max(m, Math.min(x, vw - t.width - m));
    let y = r.top - t.height - 10, abajo = false;
    if(y < m){ y = r.bottom + 10; abajo = true; }
    if(y + t.height > vh - m) y = Math.max(m, vh - t.height - m);
    _colTipEl.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
    _colTipEl.classList.toggle('abajo', abajo);
  };

  const mostrar = (host)=>{
    const id = host.getAttribute('data-coltip'); if(!id) return;
    const html = colorTipHTML(id); if(!html) return;
    _colTipEl.innerHTML = html;
    _colTipEl.classList.add('on');
    cancelAnimationFrame(_colTipRaf);
    _colTipRaf = requestAnimationFrame(()=>colocar(host));
  };
  const ocultar = ()=>{ _colTipEl.classList.remove('on'); };

  const buscar = e => e.target && e.target.closest ? e.target.closest('[data-coltip]') : null;
  document.addEventListener('pointerover', e=>{ const h = buscar(e); if(h) mostrar(h); });
  document.addEventListener('pointerout', e=>{ const h = buscar(e); if(h && !h.contains(e.relatedTarget)) ocultar(); });
  document.addEventListener('focusin',  e=>{ const h = buscar(e); if(h) mostrar(h); });
  document.addEventListener('focusout', ocultar);
  addEventListener('scroll', ocultar, true);
}
document.addEventListener('DOMContentLoaded', colorTipMontar);
