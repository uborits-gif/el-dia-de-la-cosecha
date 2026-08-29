/* Empaqueta los efectos de sonido (mp3) en parts/01g-sfx.js como base64.
   Igual que gen-bookmoji: la app es un solo HTML, así que todo va embebido.

       node scripts/gen-sfx.js [carpeta]

   La carpeta por defecto es Descargas. El nombre del archivo define el id:
   "page-turn.mp3" → pageTurn. Si algún sonido no está, se avisa y se sigue,
   así el build no se rompe por un archivo que todavía no bajaron. */
const fs = require('fs');
const path = require('path');

const dir = process.argv[2] || 'C:/Users/urika/Downloads';
const salida = path.join(__dirname, '..', 'parts', '01g-sfx.js');

/* los que el club usa hoy. Agregar acá el archivo y listo. */
const QUIERO = [
  'open-book', 'close-book', 'page-turn', 'page-flipping',
  'pick-up-paper', 'drop-down-paper', 'paper-sliding', 'paper-sliding-back',
  'button-click',
];

const camello = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

const partes = [];
const faltan = [];
let bytes = 0;

QUIERO.forEach(nombre => {
  const f = path.join(dir, nombre + '.mp3');
  if (!fs.existsSync(f)) { faltan.push(nombre + '.mp3'); return; }
  const b64 = fs.readFileSync(f).toString('base64');
  bytes += fs.statSync(f).size;
  partes.push('  ' + camello(nombre) + ': "' + b64 + '"');
});

const cabecera = `/* 🔊 EFECTOS DE PAPEL Y LIBRO — generado por scripts/gen-sfx.js, no editar a mano.
   Sonidos cortos que se decodifican una sola vez y se disparan desde el
   contexto de audio que ya usa el resto de la app (ver Sound.sfx). */
const SFX_B64 = {
`;

fs.writeFileSync(salida, cabecera + partes.join(',\n') + '\n};\n');

console.log('escrito · ' + partes.length + ' sonidos · ' +
  Math.round(fs.statSync(salida).size / 1024) + ' KB (mp3 originales: ' +
  Math.round(bytes / 1024) + ' KB)');
if (faltan.length) console.log('FALTAN (se saltearon): ' + faltan.join(', '));
