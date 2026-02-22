// src/admin/admin.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { subscribeStatus, userRole } from '@prisma';
import { GetUsersQueryDto } from './dto/admin.dto';
import { DashboardStatsDto, MonthlyUserStatsDto } from './dto/overView.dto';
import { UserAction } from './dto/action.dto';
import { CreateUserDto } from './dto/create.user.dto';

@Injectable()
export class AdminService {
    constructor(private readonly prisma: PrismaService) { }

    async getUsers(query: GetUsersQueryDto) {
        const { filter, search, page = 1, limit = 10 } = query;

        // Build the search filter (OR condition for multiple fields)
        const searchFilter = search
            ? {
                OR: [
                    { athleteFullName: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { id: { contains: search, mode: 'insensitive' as const } },
                    { city: { contains: search, mode: 'insensitive' as const } },
                    { state: { contains: search, mode: 'insensitive' as const } },
                ],
            }
            : {};

        // Build the role filter
        const roleFilter =
            filter && filter !== 'all' ? { role: filter as userRole } : {};

        const where = {
            ...searchFilter,
            ...roleFilter,
            isDeleted: false,
        };

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            this.prisma.client.user.findMany({
                where,
                select: {
                    id: true,
                    createdAt: true,
                    athleteFullName: true,
                    email: true,
                    role: true,
                    subscribeStatus: true,
                    isActive: true,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                skip,
                take: limit,
            }),
            this.prisma.client.user.count({ where }),
        ]);

        return {
            users,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // admin.service.ts
    async manageUser(userId: string, action: UserAction = UserAction.DEACTIVATE): Promise<void> {
        const user = await this.prisma.client.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.role === 'ADMIN') {
            throw new BadRequestException('Cannot modify admin users');
        }

        const updateData: any = {};

        if (action === UserAction.DELETE) {
            updateData.isDeleted = true;
        } else if (action === UserAction.DEACTIVATE) {
            updateData.isActive = false;
        }

        updateData.updatedAt = new Date();

        await this.prisma.client.user.update({
            where: { id: userId },
            data: updateData,
        });
    }
    // In admin.service.ts
    async getUserDetails(userId: string) {
        const user = await this.prisma.client.user.findUnique({
            where: {
                id: userId,
                isDeleted: false, // Only return non-deleted users
            }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    // async createUser(createUserDto: CreateUserDto) {
    //     // Map system role to userRole enum
    //     const roleMapping: Record<string, userRole> = {
    //         'ADMIN': userRole.ADMIN,
    //         'USER': userRole.USER,
    //         'ATHLETE': userRole.ATHLATE,
    //     };

    //     // Map subscription plan to subscribeStatus enum
    //     const subscriptionMapping: Record<string, subscribeStatus> = {
    //         'BASIC': subscribeStatus.FREE,
    //         'PRO': subscribeStatus.PRO,
    //         'ELITE': subscribeStatus.ELITE,
    //         'COMPEDED': subscribeStatus.COMPED,
    //     };

    //     const role = roleMapping[createUserDto.systemRole] || userRole.USER;
    //     const subscribeStatuS = subscriptionMapping[createUserDto.subscriptionPlan] || subscribeStatus.FREE;

    //     // Generate temporary password
    //     const tempPassword = this.generateTempPassword();
    //     const hashedPassword = await bcrypt.hash(tempPassword, 10);

    //     // Create user
    //     const user = await this.prisma.client.user.create({
    //         data: {
    //             athleteFullName: createUserDto.athleteFullName,
    //             email: createUserDto.email.toLowerCase(),
    //             password: hashedPassword,
    //             role: role,
    //             subscribeStatus: subscribeStatuS,
    //             agreedToTerms: true,
    //             isActive: true,
    //             isDeleted: false,
    //         },
    //     });

    //     return {
    //         user,
    //         tempPassword,
    //     };
    // }

    private generateTempPassword(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
    //overView

    async getDashboardStats(): Promise<DashboardStatsDto> {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonthStart = new Date(currentYear, now.getMonth(), 1);
        const lastMonthStart = new Date(currentYear, now.getMonth() - 1, 1);
        const lastMonthEnd = currentMonthStart;

        // Get current month counts
        const currentMonthUsers = await this.prisma.client.user.count({
            where: {
                createdAt: {
                    gte: currentMonthStart,
                },
                isDeleted: false,
            },
        });

        const currentMonthAthletes = await this.prisma.client.user.count({
            where: {
                role: 'ATHLATE',
                createdAt: {
                    gte: currentMonthStart,
                },
                isDeleted: false,
            },
        });

        const currentMonthVideos = await this.prisma.client.highlights.count({
            where: {
                createdAt: {
                    gte: currentMonthStart,
                },
            },
        });

        // Get last month counts
        const lastMonthUsers = await this.prisma.client.user.count({
            where: {
                createdAt: {
                    gte: lastMonthStart,
                    lt: lastMonthEnd,
                },
                isDeleted: false,
            },
        });

        const lastMonthAthletes = await this.prisma.client.user.count({

            where: {
                role: 'ATHLATE',
                createdAt: {
                    gte: lastMonthStart,
                    lt: lastMonthEnd,
                },
                isDeleted: false,
            },
        });

        const lastMonthVideos = await this.prisma.client.highlights.count({
            where: {
                createdAt: {
                    gte: lastMonthStart,
                    lt: lastMonthEnd,
                },
            },
        });

        // Calculate percentage changes
        const calculatePercentageChange = (current: number, previous: number): number => {
            if (previous === 0) {
                return current > 0 ? 100 : 0;
            }
            return Number((((current - previous) / previous) * 100).toFixed(1));
        };

        // Get total counts (all time)
        const totalUsers = await this.prisma.client.user.count({
            where: {
                isDeleted: false,
            },
        });

        const totalAthletes = await this.prisma.client.user.count({
            where: {
                role: 'ATHLATE',
                isDeleted: false,
            },
        });

        const totalVideos = await this.prisma.client.highlights.count();

        // Get current year monthly user stats
        const monthlyData = new Map<number, number>();
        for (let i = 0; i < 12; i++) {
            monthlyData.set(i, 0);
        }

        const usersThisYear = await this.prisma.client.user.findMany({
            where: {
                createdAt: {
                    gte: new Date(currentYear, 0, 1),
                    lt: new Date(currentYear + 1, 0, 1),
                },
                isDeleted: false,
            },
            select: {
                createdAt: true,
            },
        });

        usersThisYear.forEach((user) => {
            const month = user.createdAt.getMonth();
            const currentCount = monthlyData.get(month) || 0;
            monthlyData.set(month, currentCount + 1);
        });

        const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        const monthlyStats: MonthlyUserStatsDto[] = Array.from(monthlyData.entries())
            .map(([monthNumber, newUsers]) => ({
                month: monthNames[monthNumber],
                monthNumber: monthNumber + 1,
                newUsers,
            }))
            .sort((a, b) => a.monthNumber - b.monthNumber);

        return {
            totalUsers: {
                count: totalUsers,
                percentageChange: calculatePercentageChange(currentMonthUsers, lastMonthUsers),
            },
            activeAthletes: {
                count: totalAthletes,
                percentageChange: calculatePercentageChange(currentMonthAthletes, lastMonthAthletes),
            },
            videoUploads: {
                count: totalVideos,
                percentageChange: calculatePercentageChange(currentMonthVideos, lastMonthVideos),
            },
            currentYearStats: {
                year: currentYear,
                totalNewUsers: usersThisYear.length,
                monthlyStats,
            },
        };
    }


}
