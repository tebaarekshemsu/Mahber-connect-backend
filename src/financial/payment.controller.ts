import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentStatus } from '@prisma/client';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mahbers/:id/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate a payment for a mahber member' })
  initiatePayment(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentService.initiatePayment(mahberId, user.sub, dto);
  }

  @Get('outstanding')
  @ApiOperation({ summary: 'Get outstanding obligations for the current member' })
  getOutstanding(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentService.getOutstandingObligations(mahberId, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List payments for a mahber member' })
  findAll(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: PaymentStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentService.findAll(
      mahberId,
      user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':paymentId')
  @ApiOperation({ summary: 'Get a single payment' })
  findOne(
    @Param('id') mahberId: string,
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentService.findOne(mahberId, paymentId, user.sub);
  }

  @Post(':paymentId/retry')
  @ApiOperation({ summary: 'Retry a failed payment' })
  retryPayment(
    @Param('id') mahberId: string,
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentService.retryPayment(mahberId, paymentId, user.sub);
  }
}
