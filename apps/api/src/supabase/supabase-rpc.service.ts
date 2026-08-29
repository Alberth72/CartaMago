import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseApiConfig } from './supabase.config.js'

type RpcArgs = Record<string, unknown>

@Injectable()
export class SupabaseRpcService {
  async call<T>(functionName: string, args: RpcArgs, authorization?: string): Promise<T> {
    const config = getSupabaseApiConfig()
    if (!config.url || !config.anonKey) {
      throw new ServiceUnavailableException('Supabase API is not configured for the NestJS API.')
    }

    const client = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: authorization ? { Authorization: authorization } : undefined,
      },
    })

    const { data, error } = await client.rpc(functionName, args)
    if (error) throw new BadRequestException(error.message)

    return data as T
  }
}
