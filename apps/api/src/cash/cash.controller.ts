import { Body, Controller, Headers, Post } from '@nestjs/common'
import { CashService } from './cash.service.js'

@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Post('sales')
  createAdminSale(@Body() body: unknown, @Headers('authorization') authorization?: string) {
    return this.cashService.createAdminSale(this.cashService.parseAdminSaleInput(body), authorization)
  }

  @Post('session-sales')
  createCashSessionSale(@Body() body: unknown) {
    return this.cashService.createCashSessionSale(this.cashService.parseCashSessionSaleInput(body))
  }
}
