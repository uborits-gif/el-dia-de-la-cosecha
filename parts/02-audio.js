/* ============================================================
   AUDIO v2 — cadena master (compresor + reverb) + efectos
   ============================================================ */
const Sound = (function(){
  let ctx = null;
  let enabled = true;
  let celebrationAudio = null;
  let master = null;      // gain -> compressor -> destination
  let verb = null;        // convolver
  let verbGain = null;

  function ac(){
    if(!ctx){
      try{ ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ ctx=null; }
      if(ctx) buildChain();
    }
    if(ctx && ctx.state==='suspended') ctx.resume();
    return ctx;
  }

  function buildChain(){
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 22;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.24;
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp);
    // reverb corta generada (impulso de ruido con decaimiento)
    verb = ctx.createConvolver();
    const dur = 1.8, rate = ctx.sampleRate;
    const impulse = ctx.createBuffer(2, rate*dur, rate);
    for(let ch=0; ch<2; ch++){
      const d = impulse.getChannelData(ch);
      for(let i=0;i<d.length;i++){
        d[i] = (Math.random()*2-1) * Math.pow(1-i/d.length, 2.6);
      }
    }
    verb.buffer = impulse;
    verbGain = ctx.createGain();
    verbGain.gain.value = 1;
    verb.connect(verbGain);
    verbGain.connect(master);
  }

  /* enruta un nodo: seco al master + cola al reverb */
  function route(node, wet=0){
    node.connect(master);
    if(wet>0){
      const w = ctx.createGain();
      w.gain.value = wet;
      node.connect(w); w.connect(verb);
    }
  }

  function setEnabled(v){
    enabled = v;
    if(!v){
      if(celebrationAudio){ celebrationAudio.pause(); celebrationAudio.currentTime=0; }
      stopDrone();
    }
  }
  function isEnabled(){ return enabled; }

  /* --- tono genérico (at = tiempo absoluto para el secuenciador) --- */
  function tone({freq=440, dur=0.12, type='sine', vol=0.2, glideTo=null, delay=0, wet=0, detune=0, at=null}={}){
    if(!enabled) return;
    const c = ac(); if(!c) return;
    const t0 = at !== null ? at : c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(freq, t0);
    if(glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0+dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    osc.connect(g); route(g, wet);
    osc.start(t0); osc.stop(t0+dur+0.05);
  }

  /* --- ruido filtrado --- */
  function noise({dur=0.2, vol=0.2, lp=800, hp=0, delay=0, wet=0, sweepTo=null, at=null}={}){
    if(!enabled) return;
    const c = ac(); if(!c) return;
    const t0 = at !== null ? at : c.currentTime + delay;
    const buf = c.createBuffer(1, Math.max(1, c.sampleRate*dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1)*(1-i/d.length);
    const src = c.createBufferSource(); src.buffer = buf;
    let node = src;
    const filt = c.createBiquadFilter(); filt.type='lowpass';
    filt.frequency.setValueAtTime(lp, t0);
    if(sweepTo) filt.frequency.exponentialRampToValueAtTime(sweepTo, t0+dur);
    node.connect(filt); node = filt;
    if(hp>0){
      const hf = c.createBiquadFilter(); hf.type='highpass'; hf.frequency.value=hp;
      node.connect(hf); node = hf;
    }
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    node.connect(g); route(g, wet);
    src.start(t0);
  }

  /* nota "arpa": dos osciladores desafinados + decaimiento largo */
  function pluck(freq, {vol=0.16, delay=0, dur=0.9}={}){
    tone({freq, dur, type:'triangle', vol, delay, wet:.5});
    tone({freq, dur:dur*0.8, type:'sine', vol:vol*0.6, delay, detune:6, wet:.5});
  }

  /* ====== EFECTOS NOMBRADOS ====== */
  const fx = {
    // click de interfaz: tick suave y corto
    click(){ tone({freq:820, dur:0.045, type:'sine', vol:0.07}); },

    // transición de pantalla: soplo de aire sutil
    whoosh(){ noise({dur:0.4, vol:0.05, lp:2600, hp:500, sweepTo:600, wet:.3}); },

    // tic de la ruleta (pitch sube con el progreso 0..1)
    tick(p=0){
      tone({freq:480 + p*520, dur:0.04, type:'square', vol:0.09});
    },

    // libro elegido: arpegio ascendente con reverb
    reveal(){
      [523.25, 659.25, 783.99, 1046.5].forEach((f,i)=> pluck(f, {vol:0.13, delay:i*0.07}));
      noise({dur:0.5, vol:0.04, lp:9000, hp:3000, delay:0.2, wet:.6});
    },

    // el forro cae: papel
    unwrap(){
      noise({dur:0.28, vol:0.09, lp:5200, hp:900});
      noise({dur:0.16, vol:0.06, lp:3200, hp:600, delay:0.1});
    },

    // libro cae a la bóveda: golpe seco + sub
    drop(){
      tone({freq:170, dur:0.16, type:'sine', vol:0.24, glideTo:52});
      tone({freq:55, dur:0.3, type:'sine', vol:0.22, glideTo:38, delay:0.02});
      noise({dur:0.2, vol:0.13, lp:420});
    },

    // sorteo: cambio de nombre
    shuffle(){ tone({freq:660, dur:0.045, type:'triangle', vol:0.1}); },

    // sorteo resuelto
    chosen(){
      tone({freq:392, dur:0.14, type:'triangle', vol:0.2, glideTo:587, wet:.4});
      tone({freq:587, dur:0.4, type:'triangle', vol:0.16, delay:0.12, wet:.5});
      tone({freq:1174, dur:0.3, type:'sine', vol:0.07, delay:0.18, wet:.6});
    },

    // gliss de arpa al rescatar de la bóveda
    rescue(){
      [392, 440, 523.25, 587.33, 659.25, 783.99].forEach((f,i)=> pluck(f, {vol:0.12, delay:i*0.06}));
    },

    // campana al entrar a la final
    finalBell(){
      tone({freq:220, dur:1.2, type:'sine', vol:0.18, wet:.6});
      tone({freq:330, dur:1.4, type:'sine', vol:0.12, delay:0.06, wet:.6});
      tone({freq:466, dur:0.9, type:'sine', vol:0.06, delay:0.1, wet:.7});
    },

    // tic de la final: grave, ominoso
    tickFinal(intensity=0){
      const base = 150 + intensity*45;
      tone({freq:base, dur:0.14, type:'triangle', vol:0.2, wet:.35});
      tone({freq:base*1.5, dur:0.08, type:'sine', vol:0.07, delay:0.02, wet:.4});
    },

    // subida de tensión (riser) antes del veredicto
    riser(dur=1.1){
      tone({freq:120, dur, type:'sawtooth', vol:0.06, glideTo:640, wet:.5});
      noise({dur, vol:0.05, lp:600, sweepTo:5200, wet:.4});
    },

    // fanfarria previa a la canción
    fanfare(){
      const chord = (fs, t, dur=0.32, vol=0.14)=> fs.forEach(f=>tone({freq:f, dur, type:'triangle', vol, delay:t, wet:.5}));
      chord([523.25, 659.25, 783.99], 0);
      chord([587.33, 739.99, 880], 0.16);
      chord([659.25, 830.61, 987.77], 0.32);
      chord([783.99, 987.77, 1174.66, 1567.98], 0.5, 0.9, 0.16);
      noise({dur:1.1, vol:0.05, lp:10000, hp:4000, delay:0.5, wet:.7});
    },
  };

  /* ====== DRONE DE TENSIÓN (la final) ====== */
  let droneNodes = null;
  function startDrone(){
    if(!enabled) return;
    const c = ac(); if(!c) return;
    stopDrone();
    const t0 = c.currentTime;
    const dmaster = c.createGain();
    dmaster.gain.setValueAtTime(0.0001, t0);
    dmaster.gain.exponentialRampToValueAtTime(0.13, t0+2.5);
    // filtro que se abre lentamente: la tensión "respira"
    const filt = c.createBiquadFilter();
    filt.type='lowpass';
    filt.frequency.setValueAtTime(240, t0);
    filt.frequency.exponentialRampToValueAtTime(900, t0+14);
    dmaster.connect(filt); route(filt, .3);
    // acorde grave: tónica + quinta + tritono
    const freqs = [55, 82.4, 77.8];
    const oscs = freqs.map((f,i)=>{
      const o=c.createOscillator(); o.type = i===2?'sawtooth':'sine';
      o.frequency.value=f;
      if(i===2) o.detune.value = 4;
      const g=c.createGain(); g.gain.value = i===2?0.22:0.5;
      o.connect(g); g.connect(dmaster); o.start(t0);
      return o;
    });
    // latido que se acelera
    let beatRate = 900, beating = true;
    (function beat(){
      if(!beating) return;
      tone({freq:62, dur:0.15, type:'sine', vol:0.3, glideTo:40});
      tone({freq:58, dur:0.1, type:'sine', vol:0.16, glideTo:42, delay:0.14});
      beatRate = Math.max(300, beatRate*0.94);
      setTimeout(()=>beat(), beatRate);
    })();
    droneNodes = { oscs, master:dmaster, stopBeat:()=>{ beating=false; } };
  }
  function swellDrone(){
    if(!droneNodes || !ctx) return;
    droneNodes.master.gain.exponentialRampToValueAtTime(0.24, ctx.currentTime+0.8);
  }
  function stopDrone(){
    if(!droneNodes) return;
    try{
      droneNodes.stopBeat();
      const t = ctx.currentTime;
      droneNodes.master.gain.cancelScheduledValues(t);
      droneNodes.master.gain.setValueAtTime(droneNodes.master.gain.value, t);
      droneNodes.master.gain.exponentialRampToValueAtTime(0.0001, t+0.4);
      droneNodes.oscs.forEach(o=>o.stop(t+0.5));
    }catch(e){}
    droneNodes = null;
  }

  /* ====== CLIPS MP3 (canciones + efectos embebidos) ====== */
  let activeClips = [];
  function playClip(id, {vol=0.9, loop=false}={}){
    if(!enabled || !MUSIC[id]) return null;
    try{
      const a = new Audio('data:audio/mpeg;base64,' + MUSIC[id]);
      a.volume = vol; a.loop = loop;
      a.play().catch(()=>{});
      activeClips.push(a);
      return a;
    }catch(e){ return null; }
  }
  function stopClips(){
    activeClips.forEach(a=>{ try{ a.pause(); }catch(e){} });
    activeClips = [];
  }

  /* ====== CANCIÓN DEL GANADOR — sorpresa ====== */
  const PARTY_POOL = ['celebration','tears','vivaldi','hampster','hannah','allstar','happy','depeche','gilda'];
  function playCelebration(){
    if(!enabled) return null;
    const id = PARTY_POOL[Math.floor(Math.random()*PARTY_POOL.length)];
    try{
      if(celebrationAudio){ celebrationAudio.pause(); }
      const b64 = id==='celebration' ? CELEBRATION_B64 : MUSIC[id];
      celebrationAudio = new Audio('data:audio/mpeg;base64,' + b64);
      celebrationAudio.volume = 0.85;
      celebrationAudio.play().catch(()=>{});
      return MUSIC_NAMES[id] || null;
    }catch(e){ return null; }
  }
  function stopCelebration(){
    if(celebrationAudio){ celebrationAudio.pause(); celebrationAudio.currentTime=0; }
  }

  /* ====== BANDA SONORA DE MINIJUEGO (secuenciador synth) ======
     Cada juego registra un patrón en Sound.PATTERNS: {bpm, play(step, t, spb)}.
     play() agenda notas con tone/noise usando `at` (tiempo absoluto). */
  const PATTERNS = {};
  let seq = null;
  function startMusic(name){
    stopMusic();
    if(!enabled) return;
    const c = ac(); if(!c) return;
    const pat = PATTERNS[name]; if(!pat) return;
    let step = 0;
    const spb = 60/pat.bpm/2;   // corcheas
    let next = c.currentTime + 0.06;
    const iv = setInterval(()=>{
      if(!enabled || !ctx) return;
      while(next < ctx.currentTime + 0.3){
        try{ pat.play(step, next, spb); }catch(e){}
        step++;
        next += spb;
      }
    }, 100);
    seq = { iv, name };
  }
  function stopMusic(){ if(seq){ clearInterval(seq.iv); seq = null; } }

  function setEnabledFull(v){
    setEnabled(v);
    if(!v){ stopMusic(); stopClips(); }
  }

  return { fx, tone, noise, pluck, playCelebration, stopCelebration, playClip, stopClips,
           startMusic, stopMusic, PATTERNS,
           startDrone, swellDrone, stopDrone, setEnabled:setEnabledFull, isEnabled, ac };
})();

/* desbloqueo del contexto + botón de mute */
document.addEventListener('pointerdown', ()=>Sound.ac(), { once:true });
/* el parlante va dibujado: el pack de iOS no trae el de "sin sonido" y
   quedaba el único emoji del sistema en toda la app */
const SPK = on => `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor"
  d="M11 4.5v15a1 1 0 0 1-1.7.7L5.6 16.5H3a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h2.6l3.7-3.7a1 1 0 0 1 1.7.7Z"/>${
  on ? `<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
        d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.7 7.7 0 0 1 0 11"/>`
     : `<path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"
        d="m15.5 9.5 5 5m0-5-5 5"/>`}</svg>`;
document.addEventListener('DOMContentLoaded', ()=>{
  const btn = document.getElementById('muteBtn');
  const pintar = on =>{ btn.innerHTML = SPK(on); btn.classList.toggle('off', !on); };
  let on = true;
  try{ if(localStorage.getItem('cosecha:mute')==='1'){ Sound.setEnabled(false); on = false; } }catch(e){}
  pintar(on);
  btn.addEventListener('click', ()=>{
    on = !Sound.isEnabled();
    Sound.setEnabled(on);
    pintar(on);
    try{ localStorage.setItem('cosecha:mute', on?'0':'1'); }catch(e){}
    if(on) Sound.ac();
  });
});
