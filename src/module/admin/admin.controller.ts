// src/admin/admin.controller.ts
import {
    Controller,
    Get,
    Query,
    Req,
    Res,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { GetUsersQueryDto } from './dto/admin.dto';
import sendResponse from '../../utils/sendResponse';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('allUsers')
    @ApiOperation({
        summary: 'Get all users (Admin)',
        description:
            'Returns a list of users with filtering by role (USER, ATHLATE, ALL) and search by name, email, ID, or city.',
    })
    @ApiQuery({
        name: 'filter',
        required: false,
        enum: ['USER', 'ATHLATE', 'all'],
        description: 'Filter by role',
    })
    @ApiQuery({
        name: 'search',
        required: false,
        description: 'Search by name, email, ID, or city',
    })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getUsers(
        @Req() req: Request,
        @Res() res: Response,
        @Query() query: GetUsersQueryDto,
    ) {
        const result = await this.adminService.getUsers(query);

        return sendResponse(res, {
            statusCode: HttpStatus.OK,
            success: true,
            message: 'Users retrieved successfully',
            data: result,
        });
    }
}