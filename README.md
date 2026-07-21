# El Día de la Cosecha 🌾

App HTML de una sola página. El `index.html` final se ensambla a partir de los fragmentos en `parts/` mediante `build.js`.

## Estructura

- `parts/` — fragmentos fuente (HTML, JS, CSS y fuentes embebidas).
- `build.js` — ensambla `parts/` en `index.html` e inyecta las fuentes.
- `index.html` — archivo final generado (listo para abrir en el navegador).

## Build

```bash
node build.js
```

Esto regenera `index.html` a partir de los fragmentos en `parts/` en el orden definido dentro del script.
