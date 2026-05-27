import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChapaService } from './chapa.service';

@ApiTags('Chapa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chapa')
export class ChapaController {
  constructor(private readonly chapa: ChapaService) {}

  @Get('banks')
  @ApiOperation({ summary: 'Get list of supported banks from Chapa' })
  async getBanks() {
    const banks = await this.chapa.getBanks();
    return banks.map((b) => ({
      id: b.id,
      code: b.swift,
      name: b.name,
      swift: b.swift,
      acc_no_length: b.acct_length,
      is_mobile_money: b.is_mobilemoney ?? false,
    }));
  }
}
