import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrganization(dto: CreateOrganizationDto) {
    const existingByCode = await this.prisma.client.organization.findUnique({
      where: { organizationCode: dto.organizationCode },
    });

    if (existingByCode) {
      throw new BadRequestException('Organization code already exists');
    }

    const existingByEmail = await this.prisma.client.organization.findUnique({
      where: { email: dto.email },
    });

    if (existingByEmail) {
      throw new BadRequestException('Organization email already exists');
    }

    const accessUrl = process.env.BASE_URL+`/organization?code=${dto.organizationCode}`
    return this.prisma.client.organization.create({
      data: {
        organizationCode: dto.organizationCode,
        organizationName: dto.name,
        email: dto.email,
        accessUrl: accessUrl
      },
    });
  }

  async getOrganizations() {
    return this.prisma.client.organization.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrganizationById(id: string) {
    const organization = await this.prisma.client.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async trackOrganizationAccess(code: string) {
    const organization = await this.prisma.client.organization.findUnique({
      where: { organizationCode: code },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.client.organization.update({
      where: { id: organization.id },
      data: {
        totalClicks: { increment: 1 },
        lastAccessed: new Date(),
      },
    });
  }

  async updateOrganizationImage(id: string, imageUrl: string) {
    const organization = await this.prisma.client.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.client.organization.update({
      where: { id },
      data: {
        imaageUrl: imageUrl,
      },
    });
  }
}
