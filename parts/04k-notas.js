/* ============================================================
   📌 EL MURO DEL LIBRO — las notas del club

   Mientras se lee, cada uno anota lo suyo: una cita, una reflexión, un
   personaje que no cierra, una frase que se quiere guardar. Y acá está la
   gracia: **hasta que no se termina el libro, cada uno sólo ve las suyas.**
   Sabés que el otro escribió tres notas, no sabés qué dicen. Al terminarlo se
   destapa todo de una vez. Leer al mismo tiempo y no contaminarse es la mitad
   del club; el muro no puede romper eso.

   ── Quién sos ──
   La app es de dos personas pero el teléfono es de una. Una nota sin autor no
   sirve para nada, así que antes de escribir la primera se pregunta quién sos y
   queda guardado en el dispositivo (`cosecha:yo`, NO en el club: es de este
   teléfono, no del club). Se puede cambiar cuando quieras desde el muro.

   ── Dónde viven ──
   En el libro, en el campo `notas`, como JSON en una sola línea. Podrían haber
   sido una bitácora, pero no: el texto de una nota es libre y `·` y `|` son
   delimitadores de la bitácora — la primera cita con un guion largo partía el
   registro. JSON.stringify además escapa los saltos de línea, así que la nota
   entra entera en la línea `notas:` del archivo de respaldo sin romper nada.
   Como es un campo más del libro, viaja solo a la nube y al respaldo.
   ============================================================ */

/* ---------- quién tiene el teléfono ---------- */
const Yo = { quien: null };
try{ Yo.quien = localStorage.getItem('cosecha:yo') || null; }catch(e){}
/* si el nombre guardado ya no es de nadie del club (cambiaron los jugadores),
   se olvida en vez de firmar notas de un fantasma */
function yoValido(){
  const nombres = [State.players.a, State.players.b].filter(Boolean);
  return nombres.includes(Yo.quien) ? Yo.quien : null;
}
function yoSoy(nombre){
  Yo.quien = nombre || null;
  try{ localStorage.setItem('cosecha:yo', nombre || ''); }catch(e){}
}
/* el otro, para contarle las notas tapadas */
const elOtro = quien => {
  const [a, b] = [State.players.a, State.players.b];
  return quien === a ? b : a;
};
const colorDeQuien = quien => quien === State.players.a ? 'var(--pa)' : 'var(--pb)';

/* pregunta quién sos. Devuelve el nombre, o null si cerraron sin elegir. */
function pedirQuienSos(motivo){
  return new Promise(resolve=>{
    const ov = overlay(`
      <div class="ov-pop center" style="max-width:460px;">
        <div class="eyebrow" style="color:var(--amber);">Antes de escribir</div>
        <h2 class="serif" style="font-weight:900;font-size:clamp(24px,4vw,34px);margin:6px 0 6px;">¿Quién sos?</h2>
        <p class="lead" style="font-size:14px;margin:0 0 22px;">${escapeHtml(motivo || 'Las notas van firmadas. Queda guardado en este teléfono.')}</p>
        <div class="nt-quien" id="ntQuien">
          ${['a','b'].map(w=>State.players[w] ? `<button class="nt-quien-b" data-n="${escapeHtml(State.players[w])}" style="--pc:${w==='a'?'var(--pa)':'var(--pb)'}">
            <i>${escapeHtml(String(State.players[w])[0].toUpperCase())}</i>
            <b>${escapeHtml(State.players[w])}</b></button>`:'').join('')}
        </div>
        <button class="btn btn-ghost btn-sm mt-m" data-esc id="ntNadie">Ahora no</button>
      </div>`);
    let listo = false;
    ov.querySelectorAll('.nt-quien-b').forEach(btn=>btn.addEventListener('click', ()=>{
      listo = true;
      yoSoy(btn.dataset.n);
      try{ Sound.fx.click(); }catch(e){}
      closeOverlay(ov);
      resolve(Yo.quien);
    }));
    ov.querySelector('#ntNadie').addEventListener('click', ()=>{
      if(listo) return;
      listo = true; closeOverlay(ov); resolve(null);
    });
  });
}

/* ---------- el modelo ---------- */
const NOTA_TIPOS = [
  { id:'cita',      n:'Cita',           ico:'❝' },
  { id:'reflexion', n:'Reflexión',      ico:'🜁' },
  { id:'personaje', n:'Personajes',     ico:'☺' },
  { id:'favorita',  n:'Frase favorita', ico:'♥' },
  { id:'spoiler',   n:'Spoiler',        ico:'⚠' },
];
const NOTA_COLORES = ['amarilla','rosa','verde','celeste','lila','durazno'];
const NOTA_REFS = [ {id:'pag', n:'Página'}, {id:'cap', n:'Capítulo'}, {id:'pct', n:'%'} ];
const tipoDe = id => NOTA_TIPOS.find(t=>t.id===id) || NOTA_TIPOS[0];

function notasDe(b){
  try{ const v = JSON.parse(b.notas || '[]'); return Array.isArray(v) ? v : []; }
  catch(e){ return []; }
}
async function notasGuardar(b, lista){
  b.notas = lista.length ? JSON.stringify(lista) : '';
  if(typeof persist === 'function') await persist();
}
/* ¿ya se puede destapar todo? Cuando el libro está terminado: o quedó escrita
   la fecha de fin, o ya lo puntuaron (que es lo que hace la ceremonia). */
const libroTerminado = b => !!(b && (b.fin || (typeof ratingAvg === 'function' && ratingAvg(b) != null)));

/* qué notas ve el que está mirando */
function notasVisibles(b, quien){
  const todas = notasDe(b);
  if(libroTerminado(b)) return { visibles: todas, tapadas: 0 };
  const mias = todas.filter(n => n.quien === quien);
  return { visibles: mias, tapadas: todas.length - mias.length };
}

/* ---------- el muro ---------- */
function notaHTML(n, quien){
  const t = tipoDe(n.tipo);
  const ref = n.ref ? `${(NOTAS_REF_N[n.refTipo] || 'pág.')} ${escapeHtml(String(n.ref))}` : '';
  const propia = n.quien === quien;
  return `<div class="nt-nota nt-${escapeHtml(n.color || 'amarilla')}${n.tipo==='spoiler'?' nt-spoiler':''}" data-id="${escapeHtml(String(n.id))}">
    <i class="nt-cinta"></i>
    <div class="nt-cab"><span class="nt-fecha">${escapeHtml(n.fecha || '')}</span></div>
    <div class="nt-texto">${escapeHtml(n.texto || '').replace(/\n/g, '<br>')}</div>
    <div class="nt-pie">
      <span class="nt-tipo">${t.ico} ${escapeHtml(t.n)}</span>
      ${ref ? `<span class="nt-ref">${ref}</span>` : ''}
      <span class="nt-firma" style="--pc:${colorDeQuien(n.quien)}">${escapeHtml(String(n.quien||'?')[0].toUpperCase())}</span>
      ${propia ? `<button class="nt-borrar" data-borrar="${escapeHtml(String(n.id))}" aria-label="Borrar la nota">✕</button>` : ''}
    </div>
  </div>`;
}
const NOTAS_REF_N = { pag:'pág.', cap:'cap.', pct:'%' };

function muroHTML(b){
  const quien = yoValido();
  const { visibles, tapadas } = notasVisibles(b, quien);
  const terminado = libroTerminado(b);
  return `<div class="pl2-sec nt-sec" data-libro="${escapeHtml(String(b.id||''))}">
    <h4 class="pl2-h" style="display:flex;align-items:center;justify-content:space-between;">El muro
      ${quien ? `<button class="nt-yo" id="ntYo" style="--pc:${colorDeQuien(quien)}" title="Cambiar de lector">${escapeHtml(quien)}</button>` : ''}
    </h4>
    <button class="nt-nueva" id="ntNueva">
      <i>+</i><span><b>Nueva nota</b><em>${terminado ? 'Lo que quedó para decir' : 'Nadie la ve hasta que terminen'}</em></span>
    </button>
    <div class="nt-corcho${visibles.length?'':' vacio'}" id="ntCorcho">
      ${visibles.length
        ? visibles.map(n=>notaHTML(n, quien)).join('')
        : `<div class="nt-vacio"><span class="nt-fantasma"><i></i><i></i><i></i></span>
             <b>El muro está vacío</b>
             <em>Anotá una cita, una bronca, una teoría. Total, no la ve nadie.</em></div>`}
    </div>
    ${tapadas ? `<div class="nt-tapadas">🔒 ${escapeHtml(elOtro(quien)||'El otro')} escribió ${tapadas} nota${tapadas>1?'s':''}. Se destapan cuando terminen el libro.</div>` : ''}
  </div>`;
}

/* engancha el muro ya dibujado. `redibujar` lo vuelve a pintar sin recargar la ficha. */
function muroMontar(sec, b, redibujar){
  if(!sec) return;
  const nueva = sec.querySelector('#ntNueva');
  if(nueva) nueva.addEventListener('click', async ()=>{
    let quien = yoValido();
    if(!quien) quien = await pedirQuienSos();
    if(!quien) return;
    const n = await notaNueva(b, quien);
    if(n){
      const lista = notasDe(b);
      lista.push(n);
      await notasGuardar(b, lista);
      redibujar();
    }
  });
  const yo = sec.querySelector('#ntYo');
  if(yo) yo.addEventListener('click', async ()=>{
    await pedirQuienSos('Cambiá de lector. Las notas del otro se vuelven a tapar.');
    redibujar();
  });
  sec.querySelectorAll('[data-borrar]').forEach(btn=>btn.addEventListener('click', async ()=>{
    const id = btn.dataset.borrar;
    const lista = notasDe(b).filter(n=>String(n.id) !== String(id));
    await notasGuardar(b, lista);
    try{ Sound.fx.click(); }catch(e){}
    redibujar();
  }));
  // un spoiler se destapa tocándolo, no antes
  sec.querySelectorAll('.nt-spoiler').forEach(el=>el.addEventListener('click', e=>{
    if(e.target.closest('[data-borrar]')) return;
    el.classList.toggle('abierto');
  }));
}

/* ---------- escribir una nota ---------- */
function notaNueva(b, quien){
  return new Promise(resolve=>{
    let tipo = 'cita', color = 'amarilla', refTipo = 'pag';
    const ov = overlay(`
      <div class="ov-pop nt-hoja" style="max-width:560px;text-align:left;">
        <div class="nt-hoja-cab">
          <button class="btn btn-ghost btn-sm" data-esc id="ntCancel">Cancelar</button>
          <div class="nt-hoja-t">Nueva nota</div>
          <button class="btn btn-amber btn-sm" id="ntGuardar" disabled>Guardar</button>
        </div>
        <div class="nt-campo">
          <label class="nt-lab">Tipo</label>
          <div class="nt-tipos" id="ntTipos">${NOTA_TIPOS.map(t=>
            `<button class="nt-chip${t.id==='cita'?' on':''}" data-t="${t.id}">${t.ico} ${escapeHtml(t.n)}</button>`).join('')}</div>
        </div>
        <div class="nt-campo">
          <label class="nt-lab">Nota</label>
          <textarea id="ntTexto" rows="5" placeholder="Escribila. Nadie la ve hasta que terminen el libro."></textarea>
        </div>
        <div class="nt-campo">
          <label class="nt-lab">Referencia <em>(opcional)</em></label>
          <div class="nt-ref-fila">
            <div class="nt-segm" id="ntRefTipo">${NOTA_REFS.map(r=>
              `<button class="${r.id==='pag'?'on':''}" data-r="${r.id}">${escapeHtml(r.n)}</button>`).join('')}</div>
            <input id="ntRef" inputmode="numeric" placeholder="Número">
          </div>
        </div>
        <div class="nt-campo">
          <label class="nt-lab">Color del papel</label>
          <div class="nt-colores" id="ntColores">${NOTA_COLORES.map(c=>
            `<button class="nt-col nt-${c}${c==='amarilla'?' on':''}" data-c="${c}" aria-label="${c}"></button>`).join('')}</div>
        </div>
        <div class="nt-firma-av" style="--pc:${colorDeQuien(quien)}">
          <i>${escapeHtml(String(quien)[0].toUpperCase())}</i> La firma <b>${escapeHtml(quien)}</b>
        </div>
      </div>`);

    const txt = ov.querySelector('#ntTexto');
    const guardar = ov.querySelector('#ntGuardar');
    const marcar = (cont, sel, val, set)=>{
      cont.querySelectorAll('button').forEach(x=>x.addEventListener('click', ()=>{
        cont.querySelectorAll('button').forEach(y=>y.classList.remove('on'));
        x.classList.add('on');
        set(x.dataset[sel]);
        try{ Sound.fx.hover && Sound.fx.hover(); }catch(e){}
      }));
    };
    marcar(ov.querySelector('#ntTipos'),    't', tipo,    v=>tipo = v);
    marcar(ov.querySelector('#ntRefTipo'),  'r', refTipo, v=>refTipo = v);
    marcar(ov.querySelector('#ntColores'),  'c', color,   v=>color = v);

    txt.addEventListener('input', ()=>{ guardar.disabled = !txt.value.trim(); });
    setTimeout(()=>txt.focus(), 60);

    let listo = false;
    guardar.addEventListener('click', ()=>{
      if(!txt.value.trim()) return;
      listo = true;
      const ref = (ov.querySelector('#ntRef').value || '').trim().slice(0, 12);
      closeOverlay(ov);
      resolve({
        id: 'n' + Math.random().toString(36).slice(2, 9),
        quien, fecha: fechaHoy(), tipo, color,
        texto: txt.value.trim().slice(0, 2000),
        ref, refTipo: ref ? refTipo : '',
      });
    });
    ov.querySelector('#ntCancel').addEventListener('click', ()=>{
      if(listo) return;
      listo = true; closeOverlay(ov); resolve(null);
    });
  });
}
