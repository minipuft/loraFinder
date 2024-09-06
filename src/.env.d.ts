/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_CACHE_TTL: string
  VITE_MAX_UPLOAD_SIZE: string
  VITE_API_BASE_URL: string
  VITE_PORT: string
  VITE_HOST: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}