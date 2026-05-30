import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, MahberType } from '@prisma/client';

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalUsers,
      suspendedUsers,
      superAdmins,
      totalMahbers,
      suspendedMahbers,
      mahbersByType,
      totalPayments,
      completedPayments,
      failedPayments,
      totalVolumeAggregate,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { is_suspended: true } }),
      this.prisma.user.count({ where: { is_super_admin: true } }),
      this.prisma.mahber.count(),
      this.prisma.mahber.count({ where: { is_suspended: true } }),
      this.prisma.mahber.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),
      this.prisma.payment.count(),
      this.prisma.payment.count({ where: { status: PaymentStatus.Completed } }),
      this.prisma.payment.count({ where: { status: PaymentStatus.Failed } }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.Completed },
      }),
    ]);

    const activeUsers = totalUsers - suspendedUsers;
    const activeMahbers = totalMahbers - suspendedMahbers;
    const totalVolume = Number(totalVolumeAggregate._sum?.amount ?? 0);

    const typeBreakdown = mahbersByType.reduce((acc, curr) => {
      acc[curr.type] = curr._count._all;
      return acc;
    }, {} as Record<MahberType, number>);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        super_admins: superAdmins,
      },
      mahbers: {
        total: totalMahbers,
        active: activeMahbers,
        suspended: suspendedMahbers,
        breakdown: {
          MAHBER: typeBreakdown.MAHBER ?? 0,
          EQUB: typeBreakdown.EQUB ?? 0,
          IDDIR: typeBreakdown.IDDIR ?? 0,
        },
      },
      payments: {
        total: totalPayments,
        completed: completedPayments,
        failed: failedPayments,
        total_volume_etb: totalVolume,
      },
      system_health: 'Healthy',
    };
  }

  async findAllUsers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          is_super_admin: true,
          is_suspended: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        bio: true,
        is_super_admin: true,
        is_suspended: true,
        created_at: true,
        notification_prefs: true,
        memberships: {
          select: {
            id: true,
            status: true,
            role: true,
            balance: true,
            created_at: true,
            mahber: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserStatus(id: string, is_suspended: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.is_super_admin && is_suspended) {
      throw new BadRequestException('Cannot suspend a Super Admin. Demote them first.');
    }

    return this.prisma.user.update({
      where: { id },
      data: { is_suspended },
      select: {
        id: true,
        name: true,
        is_suspended: true,
      },
    });
  }

  async promoteUser(id: string, is_super_admin: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.is_suspended && is_super_admin) {
      throw new BadRequestException('Cannot promote a suspended user.');
    }

    return this.prisma.user.update({
      where: { id },
      data: { is_super_admin },
      select: {
        id: true,
        name: true,
        is_super_admin: true,
      },
    });
  }

  async findAllMahbers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [mahbers, total] = await Promise.all([
      this.prisma.mahber.findMany({
        where,
        select: {
          id: true,
          name: true,
          type: true,
          is_public: true,
          is_suspended: true,
          created_at: true,
          _count: {
            select: { memberships: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.mahber.count({ where }),
    ]);

    return {
      data: mahbers.map(m => ({
        id: m.id,
        name: m.name,
        type: m.type,
        is_public: m.is_public,
        is_suspended: m.is_suspended,
        created_at: m.created_at,
        member_count: m._count.memberships,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneMahber(id: string) {
    const mahber = await this.prisma.mahber.findUnique({
      where: { id },
      include: {
        memberships: {
          select: {
            id: true,
            status: true,
            role: true,
            balance: true,
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!mahber) {
      throw new NotFoundException('Mahber not found');
    }

    // Get simple aggregated details
    const recentPayments = await this.prisma.payment.findMany({
      where: { mahber_id: id },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return {
      id: mahber.id,
      name: mahber.name,
      type: mahber.type,
      is_public: mahber.is_public,
      is_suspended: mahber.is_suspended,
      configuration: mahber.configuration,
      created_at: mahber.created_at,
      updated_at: mahber.updated_at,
      members: mahber.memberships.map(m => ({
        membership_id: m.id,
        status: m.status,
        role: m.role,
        balance: m.balance,
        user_id: m.user.id,
        name: m.user.name,
        phone: m.user.phone,
      })),
      recent_payments: recentPayments,
    };
  }

  async updateMahberStatus(id: string, is_suspended: boolean) {
    const mahber = await this.prisma.mahber.findUnique({ where: { id } });
    if (!mahber) {
      throw new NotFoundException('Mahber not found');
    }

    return this.prisma.mahber.update({
      where: { id },
      data: { is_suspended },
      select: {
        id: true,
        name: true,
        is_suspended: true,
      },
    });
  }

  async findAllPayments(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.tx_ref = { contains: search, mode: 'insensitive' };
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllAuditLogs(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditTrail.findMany({
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.auditTrail.count(),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
