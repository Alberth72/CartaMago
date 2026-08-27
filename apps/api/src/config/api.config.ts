export type ApiConfig = {
  environment: string
  host: string
  port: number
  corsOrigins: string[]
}

const DEFAULT_PORT = 3333

function parsePort(value: string | undefined) {
  if (!value) return DEFAULT_PORT

  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) return DEFAULT_PORT

  return parsed
}

function parseCorsOrigins(value: string | undefined) {
  if (!value) return ['http://localhost:5173', 'http://127.0.0.1:5173']

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export function getApiConfig(): ApiConfig {
  return {
    environment: process.env.NODE_ENV ?? 'development',
    host: process.env.API_HOST ?? '127.0.0.1',
    port: parsePort(process.env.API_PORT),
    corsOrigins: parseCorsOrigins(process.env.API_CORS_ORIGINS),
  }
}
