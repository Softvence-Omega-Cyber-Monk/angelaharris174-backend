// src/admin/admin.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { userRole } from '@prisma/client';
import { GetUsersQueryDto } from './dto/admin.dto';

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
}