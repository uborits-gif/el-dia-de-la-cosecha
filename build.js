/* ensambla index.html desde parts/ e inyecta las fuentes embebidas en /*FONTS*/
const fs = require('fs');
const P = __dirname + '/parts/';
const read = f => fs.readFileSync(P + f, 'utf8');

const fonts = read('_fonts.css');
let head = read('01-head.html');
if(!head.includes('/*FONTS*/')) throw new Error('falta el marcador /*FONTS*/ en 01-head.html');
head = head.replace('/*FONTS*/', fonts);

const order = ['01b-b64.js','01c-music.js','01d-emo.js','01e-sesion.js','01f-bookmoji.js','02-audio.js','03-core.js','04-screens.js','04b-fotos.js','04c-cartas.js','04d-resumen.js','04e-sync.js','05-game.js','06-games.js','06b-games2.js','06c-vasallaje.js','06d-games3.js','06e-stats.js','06-roulette.js','07-tail.html'];
let out = head + order.map(read).join('');

fs.writeFileSync(__dirname + '/index.html', out);

// chequeo de sintaxis del JS embebido
const m = out.match(/<script>([\s\S]*)<\/script>/);
try { new Function(m[1]); console.log('JS OK'); } catch(e){ console.log('JS ERROR:', e.message); }
console.log('index.html', Math.round(fs.statSync(__dirname+'/index.html').size/1024), 'KB');
