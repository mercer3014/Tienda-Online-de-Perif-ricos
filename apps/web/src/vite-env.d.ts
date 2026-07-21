/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_STORE_WHATSAPP_NUMBER: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
