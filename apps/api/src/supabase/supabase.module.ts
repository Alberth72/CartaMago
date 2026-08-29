import { Module } from '@nestjs/common'
import { SupabaseRpcService } from './supabase-rpc.service.js'

@Module({
  providers: [SupabaseRpcService],
  exports: [SupabaseRpcService],
})
export class SupabaseModule {}
