# El Día de la Cosecha — Pendientes y contexto (para retomar)

> Pegá este archivo (o su contenido) al arrancar una sesión nueva para continuar sin perder nada.

## Contexto técnico
- App de una sola página (club de lectura de **Maru** = jugador `a` y **Uri** = jugador `b`).
- **Fuente:** `parts/` (fragmentos HTML/JS/CSS). Se ensambla con `node build.js` → genera `index.html`. El CSS principal vive en `parts/01-head.html`.
- **Deploy:** repo GitHub `uborits-gif/el-dia-de-la-cosecha`, hosteado en **GitHub Pages** → https://uborits-gif.github.io/el-dia-de-la-cosecha/
- **Sync:** Firebase **Firestore** (proyecto `el-dia-de-la-cosecha`). Doc `club/main` guarda `{read, vault, players, mazo, duelos}` como JSON string; colección `fotos/{id}`. Reglas abiertas (club privado de 2).
- Flujo para cambiar código: editar `parts/` → `node build.js` (chequea sintaxis) → `git push` → esperar deploy de Pages (a veces la cola está lenta) → Ctrl+F5.
- El historial de cada libro son **strings** en campos `cosechas / elegidos / rescates / descartes / victorias / puestos / anulaciones / premios`, con eventos separados por ` | ` y campos por ` · ` (ej: `29 jul 2026 · Vasallaje (azar puro) · final`).

## PENDIENTE — lo importante que falta hacer

1. **Gran Vasallaje = el MISMO cuadro/llaves que el vasallaje de 8, escalado a 16 y 32.**
   - Hoy el bracket está hardcodeado a 8 (`startBracket`, `screenBracket`, `vsCoords`, `wireClicks`, `resolveR1/resolveFin/checkPhase` en `parts/06c-vasallaje.js` = 2 alas de 4). Hay que **generalizarlo** a cualquier potencia de 2 (8/16/32): mismas llaves, alegatos y dado, con más rondas (16avos → octavos → cuartos → semi → final).
   - Quitar el diseño de tarjetas ronda-por-ronda que quedó (`granRound` / `screenGranRound`) y que el Gran Vasallaje use el bracket generalizado.
   - **64 bloqueado** hasta tener 64 libros. La **ruleta horizontal** que sortea a los que quedan afuera ya está (`granRuleta`), revisar.

2. **Alegatos / cruces: info AL LADO de la portada, no debajo.** Un libro con portada izquierda + info (sinopsis, año, país, páginas, tropes) a la derecha; el otro **espejado**. *(Ya edité `vsDuelSide` para armar el layout horizontal `.vs-duel-body / .vs-duel-cover / .vs-duel-info` con clases `.left/.right` — FALTA el CSS en `parts/01-head.html` para `.vs-duel-side/.left/.right/.vs-duel-body/.vs-duel-info/.vs-duel-meta` y compilar/subir.)*

3. **Azar puro (MODO 04) se veía duplicado / con 16 libros.** Revisar tras recargar; si persiste, arreglar el doble render (`vsModeRandom` crea 8, así que es render/DOM). Puede haber sido artefacto de escrituras en vivo a Firestore.

4. **Reescribir las ~40 blind quotes** (campo `blindQuote` de cada libro, en los DATOS). Están muy obvias; hacerlas menos evidentes y más interesantes. Se aplican vía Firestore o la ficha.

5. **Estadísticas — más lindas, con amor, animaciones sutiles (no recargado), parte por parte.**
   - Pensar NUEVAS stats con lo nuevo: duelos de final (`State.duelos`), gran vasallaje, etc.
   - Que se puedan abrir/ver/entender. (Ya hecho: ADN interactivo por trope, marcador con conteo animado, timeline horizontal, relabel de "Último campeón" — revisar y seguir puliendo.)

6. **Salón de la Fama — logros ocultos** que se agregan cuando pasan. Ej: **"Ave Fénix"** = Confesión (entró al vasallaje sin que nadie lo eligiera, llegó a la final, Maru ya no lo quería pero Uri sí, y ganó). Pensar más logros así.

7. **Lugar del vasallaje** — capturar dónde se juega (UI nueva, tipo la cosecha). *(El del 29-jul ya quedó como "Casa de Maru".)*

8. **RESPALDO AUTOMÁTICO (importante).** Tras el susto de la bóveda: que la app guarde copias con fecha en cada cambio, para poder volver a cualquier punto.

## Final narrativa (hecho para el Gran Vasallaje — revisar y portar al bracket normal)
Al llegar a la final: preguntarle a cada uno "¿cuál querés que gane?" (pasando el dispositivo). Si coinciden → se lee ese. Si no hay acuerdo → ruleta + "carta" al que acertó. El duelo se guarda en `State.duelos` (sincronizado) y aparece en stats (incluye lo "cruzado": cada uno quería el libro del otro).

## Ya hecho (a revisar en el celu / desktop)
- Sync automático Firebase (club + fotos) + anti-pérdida.
- Animación de retorno a la bóveda: una sola vez.
- Bóveda mobile más chica / más por fila. Modo **lista** (botón).
- Borrar libro: X no visible en mobile; borrar desde la ficha (sutil en desktop).
- Ficha del libro mobile estilo Criterion (colapsada + flechita para desplegar).
- Pantalla post-libro muestra el **marcador** (con conteo animado).

## Bug crítico ya arreglado (desplegado)
El **Gran Vasallaje vaciaba la bóveda** si se abandonaba. Arreglado: (a) fuera del botón "Sorpresa"; (b) guarda foto de la bóveda al arrancar → abortar (✕) devuelve los libros; (c) el "Deshacer" ahora persiste y sincroniza.

## Recuperación de datos hecha (29-jul)
- Bóveda recuperada a **35 libros** (estante 7, con Confesión).
- **Vasallaje del 29-jul reconstruido** (azar puro, en Casa de Maru): Confesión (ganador) · Carl el mazmorrero (final) · Yesteryear + 10 días en un manicomio (semifinal) · Diez negritos + Frankenstein + Y entonces desperté + Notes on an Execution (cuartos).
- Eliminadas todas las entradas basura del "30 jul" (no pasó nada ese día).
