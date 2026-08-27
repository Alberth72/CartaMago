import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './database/database.module.js'
import { HealthModule } from './health/health.module.js'
import { TenancyModule } from './tenancy/tenancy.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.api.local', '.env.local', '.env'],
    }),
    DatabaseModule,
    HealthModule,
    TenancyModule,
  ],
})
export class AppModule {}
