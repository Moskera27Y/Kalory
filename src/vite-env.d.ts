/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del API oficial. Si está definida al compilar, tiene prioridad sobre
   *  el valor por defecto (p. ej. VITE_SERVER_URL=https://mi-api.onrender.com npm run build). */
  readonly VITE_SERVER_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
