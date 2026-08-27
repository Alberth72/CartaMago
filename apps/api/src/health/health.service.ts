import { Inject, Injectable } from '@nestjs/common'
import type { Pool as PgPool } from 'pg'
import { getApiConfig } from '../config/api.config.js'
import { getDatabaseConfig } from '../database/database.config.js'
import { POSTGRES_POOL } from '../database/database.module.js'

@Injectable()
export class HealthService {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: PgPool | null) {}

  getHealth() {
    const api = getApiConfig()
    const database = getDatabaseConfig()

    return {
      status: 'ok',
      service: 'cartamago-api',
      environment: api.environment,
      database: {
        configured: Boolean(database.connectionString),
      },
      timestamp: new Date().toISOString(),
    }
  }

  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }

  async getReadiness() {
    if (!this.pool) {
      return {
        status: 'degraded',
        database: {
          configured: false,
          reachable: false,
        },
        timestamp: new Date().toISOString(),
      }
    }

    try {
      await this.pool.query('select 1')

      return {
        status: 'ok',
        database: {
          configured: true,
          reachable: true,
        },
        timestamp: new Date().toISOString(),
      }
    } catch {
      return {
        status: 'unavailable',
        database: {
          configured: true,
          reachable: false,
        },
        timestamp: new Date().toISOString(),
      }
    }
  }
}
