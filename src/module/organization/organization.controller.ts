import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { Public } from 'src/common/decorators/public.decorators';
import sendResponse from 'src/utils/sendResponse';
import { S3Service } from '../s3/s3.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from 'src/common/decorators/roles.decorator';
import { userRole } from '@prisma';

@ApiTags('Organization')
@Controller('organization')
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly s3Service: S3Service,
  ) { }

  @Post()
  @Roles(userRole.ADMIN)
  @ApiOperation({ summary: 'Create organization' })
  @ApiBody({ type: CreateOrganizationDto })
  async create(@Body() dto: CreateOrganizationDto) {
    return this.organizationService.createOrganization(dto);
  }

  @Get('all')
  @Roles(userRole.ADMIN)
  @ApiOperation({ summary: 'Get all organizations' })
  async getAll(@Res() res: Response) {
    const organizations = await this.organizationService.getOrganizations();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Organizations retrieved successfully',
      data: organizations,
    });
  }

  @Get('details/:id')
  @Roles(userRole.ADMIN)
  @ApiOperation({ summary: 'Get organization by ID' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const organization = await this.organizationService.getOrganizationById(id);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Organization retrieved successfully',
      data: organization,
    });
  }

  @Public()
  @Patch('track/:code')
  @ApiOperation({
    summary: 'Track organization access (increment total clicks and update last accessed)',
  })
  async trackAccess(
    @Param('code') code: string,
    @Res() res: Response,
  ) {
    const organization = await this.organizationService.trackOrganizationAccess(code);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Organization access tracked successfully',
      data: organization,
    });
  }

  @Patch('update-image/:id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['image'],
    },
  })
  @ApiOperation({ summary: 'Update organization image' })
  async updateImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    if (!file) {
      return sendResponse(res, {
        statusCode: HttpStatus.BAD_REQUEST,
        success: false,
        message: 'Image file is required',
        data: null,
      });
    }

    const imageUrl = await this.s3Service.uploadFile(file, 'organization-images');
    const organization = await this.organizationService.updateOrganizationImage(
      id,
      imageUrl,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Organization image updated successfully',
      data: organization,
    });
  }
}
