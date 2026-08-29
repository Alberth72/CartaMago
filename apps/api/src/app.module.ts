import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CashModule } from './cash/cash.module.js'
import { DatabaseModule } from './database/database.module.js'
import { HealthModule } from './health/health.module.js'
import { OrdersModule } from './orders/orders.module.js'
import { TenancyModule } from './tenancy/tenancy.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.api.local', '.env.local', '.env'],
    }),
    DatabaseModule,
    CashModule,
    HealthModule,
    OrdersModule,
    TenancyModule,
  ],
})
export class AppModule {}
