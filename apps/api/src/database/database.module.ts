import { Inject, Module, type OnApplicationShutdown, type Provider } from '@nestjs/common'
import pg from 'pg'
import type { Pool as PgPool, PoolConfig } from 'pg'
import { getDatabaseConfig } from './database.config.js'

export const POSTGRES_POOL = 'POSTGRES_POOL'

const { Pool } = pg

const postgresPoolProvider: Provider<PgPool | null> = {
  provide: POSTGRES_POOL,
  useFactory: () => {
    const config = getDatabaseConfig()
    if (!config.connectionString) return null

    const poolConfig: PoolConfig = {
      connectionString: config.connectionString,
      max: 5,
    }

    if (config.ssl) {
      poolConfig.ssl = {
        rejectUnauthorized: false,
      }
    }

    return new Pool(poolConfig)
  },
}

class DatabaseShutdown implements OnApplicationShutdown {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: PgPool | null) {}

  async onApplicationShutdown() {
    await this.pool?.end()
  }
}

@Module({
  providers: [postgresPoolProvider, DatabaseShutdown],
  exports: [POSTGRES_POOL],
})
export class DatabaseModule {}
