import {
  Controller,
  Get,
  Post,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from './payment.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly config: ConfigService,
  ) {}

  @Get('chapa/verify/:tx_ref')
  @ApiOperation({ summary: 'Verify a Chapa payment by transaction reference' })
  async verifyPayment(@Param('tx_ref') txRef: string) {
    this.logger.log(`Verify payment requested for tx_ref=${txRef}`);
    return this.paymentService.findByTxRef(txRef);
  }

  @Post('chapa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chapa payment webhook (no auth required)' })
  async handleChapaWebhook(
    @Headers('x-chapa-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const secret = this.config.get<string>('chapa.secretKey') ?? '';

    // Use raw body for signature verification (Req 6.3, 28.8)
    const rawBody: Buffer | string = req.rawBody ?? Buffer.from(JSON.stringify(req.body));

    if (!signature) {
      this.logger.warn('[SECURITY] Webhook received without x-chapa-signature header');
      throw new BadRequestException('Missing webhook signature');
    }

    const isValid = this.paymentService.verifyWebhookSignature(rawBody, signature, secret);
    if (!isValid) {
      // Security alert already logged inside verifyWebhookSignature
      throw new BadRequestException('Invalid webhook signature');
    }

    const payload: Record<string, any> =
      typeof req.body === 'object' ? req.body : JSON.parse(rawBody.toString());

    this.logger.log(
      `Webhook received: signature=${signature ? 'present' : 'missing'} tx_ref=${payload.tx_ref ?? 'missing'} status=${payload.status ?? 'missing'}`,
    );

    await this.paymentService.processWebhook(payload);

    return { received: true };
  }
}
