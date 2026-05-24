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

  @Get('pending')
  @UseGuards(RoleGuard)
  @RequirePermission(PERMISSIONS.APPROVE_EXPENSE)
  @ApiOperation({ summary: 'List pending expenses awaiting approval' })
  findPending(@Param('id') mahberId: string) {
    return this.expenseService.findPending(mahberId);
  }

  @UseGuards(RoleGuard)
  @RequirePermission(PERMISSIONS.CREATE_EXPENSE)
  @Post()
  @ApiOperation({ summary: 'Create a new expense (treasurer only)' })
  create(
    @Param('id') mahberId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenseService.create(mahberId, dto, user.sub);
  }

  @UseGuards(RoleGuard)
  @RequirePermission(PERMISSIONS.APPROVE_EXPENSE)
  @Post(':expenseId/approve')
  @ApiOperation({ summary: 'Approve a pending expense (admin only)' })
  approve(
    @Param('id') mahberId: string,
    @Param('expenseId') expenseId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.expenseService.approve(expenseId, mahberId, user.sub);
  }

  @UseGuards(RoleGuard)
  @RequirePermission(PERMISSIONS.APPROVE_EXPENSE)
  @Post(':expenseId/reject')
  @ApiOperation({ summary: 'Reject a pending expense (admin only)' })
  reject(
    @Param('id') mahberId: string,
    @Param('expenseId') expenseId: string,
    @CurrentUser() user: JwtPayload,
    @Body('reason') reason: string,
  ) {
    return this.expenseService.reject(expenseId, mahberId, user.sub, reason);
  }
}
