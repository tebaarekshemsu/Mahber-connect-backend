import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../membership/guards/role.guard';
import { RequirePermission } from '../membership/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PERMISSIONS } from '../membership/rbac/permissions';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mahbers/:id/expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Get()
  @ApiOperation({ summary: 'List expenses for a mahber' })
  findAll(@Param('id') mahberId: string) {
    return this.expenseService.findAll(mahberId);
  }

  @UseGuards(RoleGuard)
  @RequirePermission(PERMISSIONS.MANAGE_FINANCES)
  @Post()
  @ApiOperation({ summary: 'Create a new expense (treasurer/admin only)' })
  create(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenseService.create(mahberId, dto, user.sub);
  }
}
