/* ============================================================
   🎁 EL WRAPPED — el año del club, en una sola pantalla.
   Todo sale de la bitácora, así que cualquier año se puede mirar
   cuando quieras. CERRAR el año es la ceremonia de los premios que
   ya existe (screenResumenEvento): un año está cerrado cuando dejó
   premios en la metadata. Recién con DOS años cerrados aparece la
   comparación de uno contra otro.
   ============================================================ */

const ANIO_ACTUAL = () => new Date().getFullYear();
/* aniosCerrados() vive en 04d-resumen.js: los años que dejaron premios */
const anioEstaCerrado = y => (typeof aniosCerrados === 'function') && aniosCerrados().includes(String(y));

/* ---------- la foto de un año, sacada de la bitácora ---------- */
function anioResumen(y){
  const Y = String(y);
  const A = State.players.a, B = State.players.b;
  const enAnio = f => { const p = parseFecha(f); return p && String(p.y) === Y; };
  const all = [...(State.read||[]), ...(State.vault||[])];

  const jornadas = (typeof construirHistoria === 'function' ? construirHistoria() : [])
    .filter(j => enAnio(j.fecha));
  const leidos = (State.read||[]).filter(b => enAnio(winDate(b)) || String(b.readDate||'').includes(Y));

  // cada libro que pisó la mesa ese año, aunque haya perdido
  const jugaronIds = new Set();
  jornadas.forEach(j => j.libros.forEach(x => jugaronIds.add(x.b.id)));
  const jugaron = all.filter(b => jugaronIds.has(b.id));

  const porQuien = { a:0, b:0 };
  leidos.forEach(b=>{
    const c = (credito(b)||'').toLowerCase();
    if(c === A.toLowerCase()) porQuien.a++;
    else if(c === B.toLowerCase()) porQuien.b++;
  });

  const conNota = leidos.filter(b => ratingAvg(b) != null);
  const orden = conNota.slice().sort((x,z)=>ratingAvg(z)-ratingAvg(x));
  const paginas = leidos.reduce((s,b)=>s + (numOf(b.paginas)||0), 0);

  const cosechas   = jornadas.filter(j => j.tipo !== 'vasallaje').length;
  const vasallajes = jornadas.filter(j => j.tipo === 'vasallaje').length;
  const supers = new Set();
  all.forEach(b => (typeof evList==='function' ? evList(b,'clausulas') : [])
    .forEach(e => { if(enAnio(e.fecha)) supers.add(e.fecha); }));

  // los premios de ese año, si ya se cerró
  const premios = [];
  (State.read||[]).forEach(b => (typeof evList==='function' ? evList(b,'premios') : []).forEach(e=>{
    if(String(e.quien||'').includes(Y))
      premios.push({ premio: String(e.quien).replace(' '+Y,''), titulo:b.titulo, portada:b.portada||'', id:b.id });
  }));

  const colores = tally(jugaron.map(b => colorDeLibro(b)).filter(Boolean));
  const casas   = tally(jugaron.map(b => (colorDeLibro(b)||'').split('-')[0]).filter(Boolean));
  const tropes  = tally(jugaron.flatMap(b => tropesOf(b)));
  const lugares = tally(jornadas.map(j => j.lugar).filter(Boolean));

  return {
    anio: Y, A, B,
    leidos: leidos.length, jugaron: jugaron.length, cosechas, vasallajes,
    supers: supers.size, paginas, porQuien, premios,
    nota: conNota.length ? conNota.reduce((s,b)=>s+ratingAvg(b),0)/conNota.length : null,
    mejor: orden[0] ? { titulo:orden[0].titulo, portada:orden[0].portada||'', nota:ratingAvg(orden[0]) } : null,
    peor:  orden.length>1 ? { titulo:orden[orden.length-1].titulo, portada:orden[orden.length-1].portada||'',
                              nota:ratingAvg(orden[orden.length-1]) } : null,
    colores, casas,
    puntos: jugaron.map(b=>({ id:b.id, titulo:b.titulo, color:colorDeLibro(b) })).filter(x=>x.color),
    gente: ['a','b'].map(w=>({ quien:w, nombre:State.players[w], color:colorJugador(w) })).filter(g=>g.color),
    casaTop: casas[0] ? casas[0][0] : '',
    tropes: tropes.slice(0,6),
    lugarTop: lugares[0] ? lugares[0][0] : '',
    portadas: leidos.slice(0,8).map(b=>({ titulo:b.titulo, portada:b.portada||'' })),
  };
}

/* qué años tiene sentido ofrecer */
function aniosConVida(){
  const s = new Set(typeof aniosCerrados === 'function' ? aniosCerrados() : []);
  [...(State.read||[]), ...(State.vault||[])].forEach(b=>{
    const p = parseFecha(winDate(b)); if(p) s.add(String(p.y));
    const m = String(b.readDate||'').match(/(20\d\d)/); if(m) s.add(m[1]);
  });
  Object.keys(State.sorter||{}).forEach(y=>s.add(String(y)));
  s.add(String(ANIO_ACTUAL()));
  return [...s].sort().reverse();
}

/* ============================================================
   LA PANTALLA
   ============================================================ */
function screenWrapped(y){
  const Y = String(y || ANIO_ACTUAL());
  if(typeof Ruta === 'object') Ruta.marcar('/wrapped/' + Y);
  const D = anioResumen(Y);
  const cerrado = anioEstaCerrado(Y);
  const cerrados = (typeof aniosCerrados === 'function') ? aniosCerrados() : [];
  const anios = aniosConVida();
  App.keys = {};
  Flow.hide();
  App.ambient('rgba(232,195,74,.07)', 'rgba(28,20,10,.55)');

  const num = v => `<span class="st-count" data-to="${v}">0</span>`;
  const fig = (k, v, u, cls='') => `<div class="st-fig"><div class="k">${k}</div>
    <div class="v ${cls}">${/^\d+$/.test(String(v)) ? num(v) : escapeHtml(String(v))}</div>
    ${u?`<div class="u">${escapeHtml(u)}</div>`:''}</div>`;
  const est = n => n==null ? '—' : (Math.round(n*10)/10).toString().replace('.',',');
  const bg = url => url ? `background-image:url('${String(url).replace(/'/g,'%27')}')` : '';

  /* --- el sorter del año --- */
  const rA = sorterResultado('a', Y), rB = sorterResultado('b', Y);
  const cruce = (typeof sorterCruceDatos === 'function') ? sorterCruceDatos(Y) : null;
  const top1 = r => r && r.ranking[0] ? r.ranking[0].ids.map(id=>(r.libros[id]||{}).titulo||'—').join(' · ') : null;

  /* --- año contra año: sólo cuando hay dos cerrados --- */
  const comparativa = (()=>{
    if(cerrados.length < 2) return '';
    const i = cerrados.indexOf(Y);
    const otro = i > 0 ? cerrados[i-1] : (cerrados[cerrados.length-1] === Y ? cerrados[cerrados.length-2] : cerrados[cerrados.length-1]);
    if(!otro || otro === Y) return '';
    const P = anioResumen(otro);
    const fila = (lab, a, b, u='')=>{
      const d = Math.round((a - b) * 10) / 10;
      return `<div class="wr-cmp-fila">
        <span class="wr-cmp-l">${escapeHtml(lab)}</span>
        <span class="wr-cmp-v vieja">${escapeHtml(String(b))}${u}</span>
        <span class="wr-cmp-fl ${d>0?'sube':d<0?'baja':''}">${d>0?'▲':d<0?'▼':'='}</span>
        <span class="wr-cmp-v nueva">${escapeHtml(String(a))}${u}</span>
        <span class="wr-cmp-d ${d>0?'sube':d<0?'baja':''}">${d>0?'+':''}${String(d).replace('.',',')}</span>
      </div>`;
    };
    return `<section class="st-sec wr-sec">
      <h3 class="st-h"><em>📊</em> ${escapeHtml(Y)} contra ${escapeHtml(otro)}</h3>
      <div class="st-note" style="margin:-8px 0 16px;">Lo que cambió de un año al otro.</div>
      <div class="wr-cmp">
        <div class="wr-cmp-cab"><span></span><span class="vieja">${escapeHtml(otro)}</span><span></span>
          <span class="nueva">${escapeHtml(Y)}</span><span></span></div>
        ${fila('Libros leídos', D.leidos, P.leidos)}
        ${fila('Pasaron por la mesa', D.jugaron, P.jugaron)}
        ${fila('Cosechas', D.cosechas, P.cosechas)}
        ${fila('Vasallajes', D.vasallajes, P.vasallajes)}
        ${D.paginas||P.paginas ? fila('Páginas', D.paginas, P.paginas) : ''}
        ${D.nota!=null && P.nota!=null ? fila('Nota promedio', Math.round(D.nota*10)/10, Math.round(P.nota*10)/10, '★') : ''}
      </div>
      ${D.casaTop && P.casaTop ? (D.casaTop===P.casaTop
        ? `<div class="st-band" style="margin-top:12px;">${colorPunto(D.casaTop,11)} Dos años seguidos leyendo <b>${escapeHtml((COLORES[D.casaTop]||{}).nombre||'')}</b>. Eso ya no es casualidad.</div>`
        : `<div class="st-band gold" style="margin-top:12px;">El club se mudó de casa: de ${colorPunto(P.casaTop,11)} <b>${escapeHtml((COLORES[P.casaTop]||{}).nombre||'')}</b> a ${colorPunto(D.casaTop,11)} <b>${escapeHtml((COLORES[D.casaTop]||{}).nombre||'')}</b>.</div>`) : ''}
    </section>`;
  })();

  show(`
    <div class="wr-top">
      <div class="eyebrow" style="color:var(--amber);">El año del club</div>
      <h1 class="wr-anio">${escapeHtml(Y)}</h1>
      ${cerrado ? '<div class="wr-sello">✦ año cerrado</div>' : '<div class="wr-vivo">en curso</div>'}
      ${anios.length>1?`<div class="wr-anios">${anios.map(a=>`
        <button class="wr-anio-b${a===Y?' on':''}" data-y="${a}">${a}${anioEstaCerrado(a)?' ✦':''}</button>`).join('')}</div>`:''}
    </div>

    ${D.jugaron || D.leidos ? `
    <section class="st-sec wr-sec">
      <h3 class="st-h"><em>📚</em> Lo que pasó</h3>
      <div class="st-figs">
        ${fig('Libros leídos', D.leidos, 'de punta a punta', 'am')}
        ${fig('Pasaron por la mesa', D.jugaron, 'contando los que perdieron')}
        ${fig('Cosechas', D.cosechas, D.cosechas===1?'noche':'noches')}
        ${D.vasallajes?fig('Vasallajes', D.vasallajes, D.vasallajes===1?'torneo de bóveda':'torneos de bóveda'):''}
        ${D.supers?fig('Supercosechas', D.supers, 'con cláusulas'):''}
        ${D.paginas?fig('Páginas', D.paginas, 'leídas entre los dos', 'sm'):''}
        ${D.nota!=null?fig('Nota del año', est(D.nota), 'promedio entre los dos', 'sm'):''}
        ${D.lugarTop?fig('Dónde', D.lugarTop, 'el lugar que más se repitió', 'sm'):''}
      </div>
      <div class="wr-vs">
        <div class="wr-vs-lado a"><b>${num(D.porQuien.a)}</b><span>${escapeHtml(D.A)}</span></div>
        <div class="wr-vs-mid">libros que ganaron</div>
        <div class="wr-vs-lado b"><b>${num(D.porQuien.b)}</b><span>${escapeHtml(D.B)}</span></div>
      </div>
      ${D.portadas.length?`<div class="wr-tira">${D.portadas.map((g,i)=>`
        <div class="wr-tira-l" style="--i:${i}" title="${escapeHtml(g.titulo)}">
          <div class="wr-tira-cov" style="${bg(g.portada)}"></div>
        </div>`).join('')}</div>`:''}
    </section>

    ${D.premios.length?`<section class="st-sec wr-sec">
      <h3 class="st-h"><em>🏆</em> Los premios de ${escapeHtml(Y)}</h3>
      <div class="wr-prem">${D.premios.map((p,i)=>`
        <div class="wr-prem-x ${/Año/i.test(p.premio)?'oro':''}" style="--i:${i}" data-id="${escapeHtml(String(p.id))}">
          <div class="wr-prem-cov" style="${bg(p.portada)}"></div>
          <div class="wr-prem-n">${escapeHtml(p.premio)}</div>
          <div class="wr-prem-t">${escapeHtml(short(p.titulo,26))}</div>
        </div>`).join('')}</div>
    </section>`:''}

    ${D.mejor?`<section class="st-sec wr-sec">
      <h3 class="st-h"><em>★</em> El veredicto</h3>
      <div class="wr-pod">
        <div class="wr-pod-x mejor">
          <div class="wr-pod-cov" style="${bg(D.mejor.portada)}"></div>
          <div class="wr-pod-l">El mejor del año</div>
          <div class="wr-pod-t">${escapeHtml(D.mejor.titulo)}</div>
          <div class="wr-pod-n">★ ${est(D.mejor.nota)}</div>
        </div>
        ${D.peor?`<div class="wr-pod-x peor">
          <div class="wr-pod-cov" style="${bg(D.peor.portada)}"></div>
          <div class="wr-pod-l">El que no fue</div>
          <div class="wr-pod-t">${escapeHtml(D.peor.titulo)}</div>
          <div class="wr-pod-n">★ ${est(D.peor.nota)}</div>
        </div>`:''}
      </div>
    </section>`:''}

    ${D.casaTop?`<section class="st-sec wr-sec">
      <h3 class="st-h"><em>🎨</em> El color del año</h3>
      <div class="wr-color" style="--cc:${(COLORES[D.casaTop]||{}).hex};--cc2:${(COLORES[D.casaTop]||{}).hex2}">
        <div class="wr-color-orb"><i></i></div>
        <div>
          <div class="wr-color-n">${escapeHtml((COLORES[D.casaTop]||{}).nombre||'')}</div>
          <div class="wr-color-d">${escapeHtml((COLORES[D.casaTop]||{}).desc||'')}</div>
        </div>
      </div>

    </section>`:''}

    ${D.tropes.length?`<section class="st-sec wr-sec">
      <h3 class="st-h"><em>🧬</em> El ADN de ${escapeHtml(Y)}</h3>
      <div class="adn-grid">${D.tropes.map(([t,n],i)=>`
        <div class="adn-tile ${i<2?'hot':''}">${typeof bookmojiHTML==='function'?bookmojiHTML(t):''}
          <span class="adn-tile-t">${escapeHtml(t)}</span><span class="adn-tile-n">${n}</span></div>`).join('')}</div>
    </section>`:''}
    ` : `<div class="st-hint" style="margin-top:24px;">Todavía no pasó nada en ${escapeHtml(Y)}. Cuando jueguen la primera cosecha del año, esto se llena solo.</div>`}

    <section class="st-sec wr-sec">
      <h3 class="st-h"><em>🎯</em> El ranking del año</h3>
      ${rA || rB ? `
        <div class="wr-rank">
          ${['a','b'].map(w=>{ const r = w==='a'?rA:rB;
            return `<div class="wr-rank-c ${w}">
              <div class="wr-rank-h">${escapeHtml(State.players[w])}</div>
              ${r?`<div class="wr-rank-1">🥇 ${escapeHtml(top1(r)||'—')}</div>
                   <div class="wr-rank-s">${r.n} libros · ${r.duelos} duelos · ${r.empates} empates</div>`
                 :`<div class="wr-rank-v">Todavía no lo hizo.</div>`}
            </div>`; }).join('')}
        </div>
        ${cruce?`<div class="st-band gold" style="margin-top:12px;">
          📏 La distancia promedio entre los dos rankings es de <b>${est(cruce.medio)}</b> puestos${
            cruce.pelea[0]?` · lo que más los separa: «${escapeHtml(short(cruce.pelea[0].b.titulo,28))}»`:''}.</div>`:''}
        <div style="text-align:center;margin-top:16px;">
          <button class="load-btn" id="wrSorter">🎯 ${rA&&rB?'Ver los rankings completos':'Seguir con el Sorter'} →</button>
        </div>`
      : `<div class="st-note" style="margin:-8px 0 14px;">Dos libros por vez, hasta que quede el orden real. Cada uno lo hace por su cuenta.</div>
        <div style="text-align:center;"><button class="load-btn" id="wrSorter">🎯 Hacer el Sorter →</button></div>`}
    </section>

    ${comparativa || (cerrados.length===1 && cerrado ? `
      <div class="st-note" style="text-align:center;margin-top:22px;">
        Cuando cierren un segundo año, acá aparece la comparación de uno contra otro.</div>` : '')}

    <div class="row mt-l" style="justify-content:flex-start;">
      <button class="btn btn-ghost" id="backBtn">← Volver</button>
      ${!cerrado && D.leidos >= 2 && String(Y) === String(ANIO_ACTUAL())
        ? '<button class="btn btn-amber" id="wrCerrar">✦ Cerrar el año y dar los premios</button>' : ''}
    </div>
  `);

  $('#backBtn').addEventListener('click', ()=>{ try{ Sound.fx.click(); }catch(e){} screenHome(); });
  const ws = $('#wrSorter'); if(ws) ws.addEventListener('click', ()=>{ try{ Sound.fx.click(); }catch(e){} screenSorter(); });
  const wc = $('#wrCerrar'); if(wc) wc.addEventListener('click', ()=>{ try{ Sound.fx.click(); }catch(e){} screenResumenEvento(); });
  $$('.wr-anio-b').forEach(el=>el.addEventListener('click', ()=>{
    if(el.dataset.y === Y) return;
    try{ Sound.fx.click(); }catch(e){} screenWrapped(el.dataset.y);
  }));
  $$('.ryc-pt').forEach(el=>el.addEventListener('click', ()=>{
    const list = [...State.read, ...State.vault];
    const i = list.findIndex(x=>String(x.id)===el.dataset.id);
    if(i>=0){ try{ Sound.fx.click(); }catch(e){}
      showPlacard(list, i, { source: State.read.some(x=>String(x.id)===el.dataset.id) ? 'honor' : 'vault' }); }
  }));
  $$('.wr-prem-x').forEach(el=>el.addEventListener('click', ()=>{
    const i = (State.read||[]).findIndex(x=>String(x.id)===el.dataset.id);
    if(i>=0){ try{ Sound.fx.click(); }catch(e){} showPlacard(State.read, i, { source:'honor' }); }
  }));
  if(typeof setupStatsReveal === 'function'){
    try{ setupStatsReveal(document.querySelector('#app .screen:last-child')); }catch(e){}
  }
}
