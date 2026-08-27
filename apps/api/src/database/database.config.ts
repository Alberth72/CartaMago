export type DatabaseConfig = {
  connectionString: string | null
  ssl: boolean
}

export function getDatabaseConfig(): DatabaseConfig {
  const connectionString = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? null
  const ssl = process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production'

  return {
    connectionString,
    ssl,
  }
}
