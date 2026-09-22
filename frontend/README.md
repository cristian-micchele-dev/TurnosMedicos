# Pulso — Frontend

SPA en React 19 + Vite + TypeScript. La documentación completa del proyecto (decisiones de dominio, arquitectura, puesta en marcha) está en el [README raíz](../README.md).

```bash
npm ci
npm run dev        # http://localhost:5173 — proxy /api → http://localhost:3000
npm test
npm run lint && npx tsc --noEmit -p tsconfig.app.json
npm run build
```

Estructura: `src/features/<pantalla>` (componente + CSS Module), `src/api/<recurso>.ts`, `src/hooks/useFetch.ts` (TanStack Query), `src/utils/date.ts` (reloj local).
