import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { WebhookController } from './webhook.controller';
import { RoleGuard } from '../membership/guards/role.guard';
import { ChapaService } from './chapa.service';
import { FineService } from './fine.service';
import { FineController } from './fine.controller';
import { LotteryService } from './lottery.service';
import { LotteryController } from './lottery.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [LedgerController, PaymentController, WebhookController, FineController, LotteryController],
  providers: [LedgerService, PaymentService, RoleGuard, ChapaService, FineService, LotteryService],
  exports: [LedgerService, ChapaService, PaymentService, FineService, LotteryService],
})
export class FinancialModule {}
