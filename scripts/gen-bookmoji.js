const fs=require('fs');
const dir = process.argv[2] || 'C:/Users/urika/Downloads/bookmoji';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');

// cada color del icono → un TONO DE VERDE según su luminancia (multi-shade, cohesivo con la app)
function hslToHex(h,s,l){
  const a=s*Math.min(l,1-l);
  const f=n=>{const k=(n+h/30)%12;const c=l-a*Math.max(-1,Math.min(k-3,9-k,1));return Math.round(255*c).toString(16).padStart(2,'0');};
  return '#'+f(0)+f(8)+f(4);
}
function toGreen(hex){
  let h=hex.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join('');
  if(!/^[0-9a-f]{6}$/i.test(h)) return hex;
  const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
  const lum=(0.299*r+0.587*g+0.114*b)/255;              // 0..1
  const L=0.36 + lum*0.42;                               // claridad
  return hslToHex(73, 0.92, L);                          // el verde-lima de la web (--amber #C9F839)
}
function clean(svg){
  svg = svg.replace(/<\?xml[^>]*\?>/g,'').replace(/<!--[\s\S]*?-->/g,'');
  const styleMap={};
  const sm = svg.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if(sm){ let m; const re=/\.([\w-]+)\s*\{([^}]*)\}/g; while(m=re.exec(sm[1])){
    const f=(m[2].match(/fill:\s*([^;}\s]+)/i)||[])[1]; if(f) styleMap[m[1]]=f.trim(); } }
  svg = svg.replace(/<defs>[\s\S]*?<\/defs>/gi,'').replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'');
  svg = svg.replace(/\sclass="([^"]*)"/g, (m,cls)=>{ const c=styleMap[cls.trim().split(/\s+/)[0]]; return c!=null ? ` fill="${c}"` : ''; });
  svg = svg.replace(/style="[^"]*"/g, m=>{ const inner=m.slice(7,-1).split(';').filter(d=>d && !/^\s*fill/i.test(d)).join(';'); return inner?`style="${inner}"`:''; });
  // TODO color → verde (none se queda none)
  svg = svg.replace(/fill="(#[0-9a-fA-F]{3,8})"/g, (m,c)=>`fill="${toGreen(c)}"`);
  svg = svg.replace(/<svg([^>]*)>/, (m,a)=>{ a=a.replace(/\s(width|height|id|version)="[^"]*"/g,''); return `<svg${a}>`; });
  svg = svg.replace(/-?\d+\.\d+/g, x=>String(Math.round(parseFloat(x)*10)/10));
  return svg.replace(/>\s+</g,'><').replace(/\s{2,}/g,' ').trim();
}

const files=fs.readdirSync(dir).filter(f=>f.endsWith('.svg'));
const map={};
files.forEach(f=>{ const k=norm(f.replace('botm-bookmoji-','').replace('.svg','')); map[k]=clean(fs.readFileSync(dir+'/'+f,'utf8')); });

// verdes de la paleta (para los iconos propios)
const G_LIGHT='#dcfb72', G_MID='#a9dd2e', G_DARK='#4d7314';
// found family: tres figuras juntas (una familia elegida)
map.familychosen = `<svg viewBox="0 0 64 64"><circle cx="32" cy="18" r="8" fill="${G_LIGHT}"/><path d="M20 44a12 12 0 0 1 24 0z" fill="${G_LIGHT}"/><circle cx="13" cy="27" r="6.5" fill="${G_MID}"/><path d="M4 48a9 9 0 0 1 18 0z" fill="${G_MID}"/><circle cx="51" cy="27" r="6.5" fill="${G_MID}"/><path d="M42 48a9 9 0 0 1 18 0z" fill="${G_MID}"/><path d="M8 52h48v4H8z" fill="${G_DARK}"/></svg>`;
// suspenseful: reloj a punto de estallar (tensión)
map.suspense = `<svg viewBox="0 0 64 64"><circle cx="32" cy="35" r="21" fill="${G_LIGHT}"/><circle cx="32" cy="35" r="16" fill="${G_DARK}"/><path d="M31 22h2v14h-2z" fill="${G_LIGHT}"/><path d="M32 34l9 7-1.6 2.2L31 36z" fill="${G_LIGHT}"/><rect x="27" y="8" width="10" height="5" rx="2" fill="${G_MID}"/><path d="M30 13h4v4h-4z" fill="${G_MID}"/><path d="M49 17l5-5 3 3-5 5z" fill="${G_MID}"/></svg>`;
// velita de cumpleaños = coming of age
map.comingofage = `<svg viewBox="0 0 64 64"><path d="M32 6c3.4 3.6 5 6.4 5 9a5 5 0 0 1-10 0c0-2.6 1.6-5.4 5-9z" fill="${G_LIGHT}"/><rect x="26" y="22" width="12" height="30" rx="2" fill="${G_MID}"/><rect x="31" y="16" width="2" height="6" fill="${G_DARK}"/><rect x="26" y="30" width="12" height="3" fill="${G_DARK}"/><rect x="26" y="38" width="12" height="3" fill="${G_DARK}"/><rect x="20" y="52" width="24" height="5" rx="2.5" fill="${G_DARK}"/></svg>`;
// +400 manuscrito = 400+ pages
map['400'] = `<svg viewBox="0 0 64 64"><rect x="12" y="10" width="40" height="44" rx="3" fill="${G_MID}"/><rect x="16" y="14" width="32" height="36" rx="2" fill="${G_LIGHT}"/><text x="32" y="38" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="800" font-size="19" fill="${G_DARK}">400+</text><rect x="20" y="43" width="24" height="2.4" rx="1.2" fill="${G_MID}"/></svg>`;

const ALIAS={
  '400pages':'400', addictionthemes:'drugsandalcohol', amnesia:'cerebral', atmospheric:'creepy',
  characterdriven:'literary', dark:'creepy', darkhumor:'snarky', drugalcoholuse:'drugsandalcohol',
  dualtimelines:'nonlineartimeline', famousauthor:'wellknown', femalefriendships:'femalefriendship',
  firstperson:'literary', foundfamily:'familychosen', graphicviolence:'graphiccontent', grief:'sad',
  gritty:'rugged', identity:'cerebral', magicalrealism:'magical', multigenerational:'familydrama',
  murdermystery:'whodunit', periodismo:'academic', rebelion:'war', revenge:'murder',
  romancesubplot:'romance', satirical:'snarky', secta:'creepy', serialkiller:'murder',
  sisterdynamic:'siblings', strongfemalelead:'feminist', suburbandrama:'suburban',
  suspenseful:'suspense', tearjerker:'sad', techworld:'techie', teens:'teen', twisty:'puzzle',
  under200pages:'under200', unhinged:'scary', wittybanter:'snarky'
};
const helper = `
/* ilustraciones de tropes (BOTM bookmoji) recoloreadas a shades de verde. */
function bookmojiKey(t){ return String(t||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,''); }
function bookmojiSVG(trope){
  const k=bookmojiKey(trope);
  if(BOOKMOJI[k]) return BOOKMOJI[k];
  if(BOOKMOJI_ALIAS[k] && BOOKMOJI[BOOKMOJI_ALIAS[k]]) return BOOKMOJI[BOOKMOJI_ALIAS[k]];
  const words=k.match(/[a-z]{4,}/g)||[];
  for(const w of words){ const hit=Object.keys(BOOKMOJI).find(kk=>kk.includes(w)); if(hit) return BOOKMOJI[hit]; }
  return BOOKMOJI.literary || Object.values(BOOKMOJI)[0] || '';
}
function bookmojiHTML(trope, cls){ return '<span class="bmj '+(cls||'')+'">'+bookmojiSVG(trope)+'</span>'; }
`;
let out = '\n/* ===== BOOKMOJI (shades de verde) ===== */\n';
out += 'const BOOKMOJI = '+JSON.stringify(map)+';\n';
out += 'const BOOKMOJI_ALIAS = '+JSON.stringify(ALIAS)+';\n';
out += helper+'\n';
const dest = fs.existsSync('parts') ? 'parts/01f-bookmoji.js' : 'C:/Users/urika/OneDrive/Escritorio/Proyectos/Remotion/cosecha/parts/01f-bookmoji.js';
fs.writeFileSync(dest, out);
console.log('escrito ·', Object.keys(map).length, 'iconos ·', Math.round(Buffer.byteLength(out)/1024), 'KB');
console.log('murder greens:', (map.murder.match(/#[0-9a-f]{6}/gi)||[]).slice(0,4));
