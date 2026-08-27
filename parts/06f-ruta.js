/* ============================================================
   🧭 LAS RUTAS — que cada pantalla tenga su dirección.
   Hasta acá la app era una sola URL: pasaban cosas y la barra del
   navegador no se enteraba, así que no se podía volver atrás, ni
   recargar donde estabas, ni mandarle un link a nadie.

   Va por hash (#/boveda) y no por path, porque el sitio es un HTML
   suelto en GitHub Pages: sin servidor que reescriba, /boveda daría
   404 al recargar. Con hash funciona en cualquier lado.

   La regla: la pantalla se pinta y avisa su dirección con
   Ruta.marcar(); el navegador cambia de dirección y nosotros
   pintamos con Ruta.abrir(). Nunca las dos cosas a la vez, así que
   no se pinta dos veces ni se ensucia el historial.
   ============================================================ */

const Ruta = {
  _ultima: null,      // la última dirección que escribimos nosotros
  _previa: '/',       // de dónde veníamos (para volver al cerrar una ficha)

  /* la pantalla ya se pintó: sólo actualiza la barra de direcciones */
  marcar(camino, opts={}){
    const c = String(camino || '/');
    if(this._ultima && this._ultima !== c) this._previa = this._ultima;
    this._ultima = c;
    const nuevo = '#' + c;
    if(location.hash === nuevo) return;
    try{
      if(opts.reemplazar) history.replaceState(null, '', nuevo);
      else location.hash = nuevo;
    }catch(e){}
  },

  /* navegar de verdad: cambia la dirección y pinta */
  ir(camino){
    const c = String(camino || '/');
    if(location.hash === '#' + c){ this.abrir(c); return; }
    this._ultima = null;              // que el hashchange sí pinte
    location.hash = '#' + c;
  },

  /* volver a donde estabas antes de abrir una ficha */
  volver(){ this.ir(this._previa || '/'); },

  /* pinta la pantalla que corresponde a una dirección */
  abrir(camino){
    const c = normalizarRuta(camino);
    this._ultima = c;
    for(const r of RUTAS){
      const m = c.match(r.re);
      if(m){ try{ r.ver(m); }catch(e){ console.error('ruta', c, e); screenHome(); } return; }
    }
    screenHome();
  },

  actual(){ return normalizarRuta(location.hash.slice(1)); },
};

/* las direcciones viejas siguen andando: #vault, #sorter, #wrapped… */
const RUTAS_VIEJAS = { vault:'/boveda', sorter:'/sorter', wrapped:'/wrapped',
                       historia:'/historia', boveda:'/boveda' };
function normalizarRuta(c){
  let x = String(c || '').trim();
  if(x.startsWith('#')) x = x.slice(1);
  if(RUTAS_VIEJAS[x]) return RUTAS_VIEJAS[x];
  if(!x.startsWith('/')) x = '/' + x;
  if(x.length > 1 && x.endsWith('/')) x = x.slice(0, -1);
  return x || '/';
}

/* ---------- direcciones de las cosas ---------- */
const rutaSlug = t => String(t||'').toLowerCase().normalize('NFD')
  .replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-')
  .replace(/^-+|-+$/g,'').slice(0,60) || 'sin-nombre';

/* el libro se identifica por su título, que sobrevive a recargar el club;
   el id interno cambia cada vez que se vuelve a subir el archivo */
const rutaDeLibro = b => '/libro/' + rutaSlug(b && b.titulo);
function libroDeRuta(slug){
  const todos = [...(State.read||[]), ...(State.vault||[])];
  return todos.find(b => rutaSlug(b.titulo) === slug) || null;
}
const rutaDeJornada = f => '/jornada/' + rutaSlug(f);

/* ---------- la tabla ---------- */
const RUTAS = [
  { re:/^\/$/,                      ver:()=>screenHome() },
  { re:/^\/boveda$/,                ver:()=>screenVault() },
  { re:/^\/historia$/,              ver:()=>screenHistoria() },
  { re:/^\/jornada\/(.+)$/,         ver:m=>screenHistoria(m[1]) },
  { re:/^\/wrapped(?:\/(\d{4}))?$/, ver:m=>screenWrapped(m[1]) },
  { re:/^\/sorter$/,                ver:()=>screenSorter() },
  { re:/^\/libro\/(.+)$/,           ver:m=>abrirLibroDeRuta(m[1]) },
  /* el ritual de la cosecha no se navega: se retoma o se abandona */
  { re:/^\/cosecha/,                ver:()=>{ if(!rutaEnRitual()) screenHome(); } },
  { re:/^\/seed$/,                  ver:()=>{ try{ window.__seed(); }catch(e){ screenHome(); } } },
];

/* un link a un libro: primero el fondo, después la ficha encima */
function abrirLibroDeRuta(slug){
  const b = libroDeRuta(slug);
  if(!b){ toast('Ese libro ya no está en el club'); screenHome(); return; }
  const enEstante = (State.read||[]).includes(b);
  const lista = enEstante ? State.read : State.vault;
  if(!document.querySelector('#app .screen')) screenHome();
  showPlacard(lista, lista.indexOf(b), { source: enEstante ? 'honor' : 'vault' });
}

/* ¿hay una cosecha a medio jugar? (la barra de pasos está a la vista) */
function rutaEnRitual(){
  const fb = document.getElementById('flowbar');
  return !!(fb && fb.classList.contains('on'));
}

/* ---------- el arranque y el botón de atrás ---------- */
function rutaArrancar(){
  addEventListener('hashchange', ()=>{
    const c = Ruta.actual();
    if(c === Ruta._ultima) return;          // lo escribimos nosotros: ya está pintado
    if(rutaEnRitual() && !/^\/cosecha/.test(c)){
      // salir a mitad de una cosecha se pregunta, no se hace de prepo
      Ruta.marcar('/cosecha', { reemplazar:true });
      history.pushState(null, '', '#/cosecha');
      try{ confirmAbort(); }catch(e){}
      return;
    }
    Ruta.abrir(c);
  });
  Ruta.abrir(Ruta.actual());
}
