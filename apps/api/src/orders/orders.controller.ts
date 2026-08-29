import { Body, Controller, Headers, Post } from '@nestjs/common'
import { OrdersService } from './orders.service.js'

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('status')
  updateStatus(@Body() body: unknown, @Headers('authorization') authorization?: string) {
    return this.ordersService.updateStatus(this.ordersService.parseUpdateStatusInput(body), authorization)
  }
}
