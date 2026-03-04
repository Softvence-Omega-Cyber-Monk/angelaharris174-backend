import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

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

    const accessUrl = process.env.BASE_URL + `/signup?code=${dto.organizationCode}`;
    const organization = await this.prisma.client.organization.create({
      data: {
        organizationCode: dto.organizationCode,
        organizationName: dto.name,
        email: dto.email,
        accessUrl,
        contactPhone: dto.contactPhone,
        website: dto.website,
        country: dto.country,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        bankAccountHolderName: dto.bankAccountHolderName,
        bankName: dto.bankName,
        bankAccountLast4: dto.bankAccountLast4,
        bankRoutingLast4: dto.bankRoutingLast4,
        bankCountry: dto.bankCountry,
        bankCurrency: dto.bankCurrency,
      },
    });

    const connectOnboarding =
      await this.stripeService.createOrganizationConnectOnboardingLink(
        organization.id,
      );

    const updatedOrganization = await this.prisma.client.organization.findUnique({
      where: { id: organization.id },
    });

    return {
      organization: updatedOrganization,
      connectOnboarding,
    };
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
