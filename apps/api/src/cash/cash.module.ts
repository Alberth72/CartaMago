import { Module } from '@nestjs/common'
import { SupabaseModule } from '../supabase/supabase.module.js'
import { CashTransactionService } from './cash-transaction.service.js'
import { CashController } from './cash.controller.js'
import { CashService } from './cash.service.js'

@Module({
  imports: [SupabaseModule],
  controllers: [CashController],
  providers: [CashService, CashTransactionService],
})
export class CashModule {}
