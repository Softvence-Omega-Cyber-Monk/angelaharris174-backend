import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
// import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { generateOtpCode, getTokens, hashOtpCode, verifyOtp } from './auth.utils';
// import { SystemRole } from '@prisma';
import { RegisterDto } from './dto/register.dto';
// import { userRole } from '@prisma';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-account.dto';
import { S3Service } from '../s3/s3.service';
import { RequestResetCodeDto } from './dto/forgetPasswordDto';
import { VerifyResetCodeDto } from './dto/forgetPasswordDto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private s3Service: S3Service,
  ) { }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.client.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already registered!');
    }

    const hashedPassword = await bcrypt.hash(
      dto.password,
      parseInt(process.env.SALT_ROUND!, 10),
    );

    const newUser = await this.prisma.client.user.create({
      data: {
        athleteFullName: dto.athleteFullName,
        dateOfBirth: new Date(dto.dateOfBirth), // Convert ISO string to Date
        email: dto.email,
        password: hashedPassword,
        parentName: dto.parentName ?? undefined,
        city: dto.city ?? undefined,
        state: dto.state ?? undefined,
        gradYear: dto.gradYear ?? undefined,
        position: dto.position ?? undefined,
        height: dto.height ?? undefined,
        weight: dto.weight ?? undefined,
        school: dto.school ?? undefined,
        gpa: dto.gpa ?? undefined,
        fcmToken: dto.fcmToken ?? undefined,
        agreedToTerms: dto.agreedToTerms,
        isActive: true,
        // role defaults to ATHLATE per your Prisma schema
        // isActive, isDeleted default to false
      },
    });



    const tokens = await getTokens(
      this.jwtService,
      newUser.id,
      newUser.email,
      newUser.role,
    );

    return { user: newUser, ...tokens };
  }

  // login
  async login(dto: LoginDto) {
    const user = await this.prisma.client.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !dto.password) {
      throw new ForbiddenException('Invalid credentials');
    }



    if (user.isDeleted) {
      throw new BadRequestException('User is deleted!');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new ForbiddenException('Invalid credentials');
    }


    const tokens = await getTokens(
      this.jwtService,
      user.id,
      user.email,
      user.role,
    );

    return { user, ...tokens };
  }


  // // change password
  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.client.user.findUnique({ where: { id } });
    if (!user || !user.password) {
      throw new NotFoundException('User not found');
    }
    if (user.isDeleted) {
      throw new BadRequestException('The account is deleted!');
    }
    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Old password is incorrect');
    }

    const hashed = await bcrypt.hash(
      dto.newPassword,
      parseInt(process.env.SALT_ROUND!),
    );
    await this.prisma.client.user.update({
      where: { id },
      data: { password: hashed },
    });

    return { message: 'Password changed successfully' };
  }
  // // refresh token
  async refreshTokens(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });

      const user = await this.prisma.client.user.findUnique({
        where: { email: payload.email },
      });
      if (!user) throw new UnauthorizedException('Invalid refresh token');
      // if(!user.isDeleted){
      //  throw new BadRequestException('User is blocked!');
      // }
      return getTokens(
        this.jwtService,
        user.id,
        user.email,
        user.role,
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  //update profile
  async updateProfile(
    userId: string,
    dto: UpdateUserDto,
    imageUrl?: string | null,
  ) {
    // Optional: Validate that user exists
    const existingUser = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const data: any = {};

    // Handle string fields
    if (dto.athleteFullName !== undefined) data.athleteFullName = dto.athleteFullName;

    // Handle email update — only if it's actually changing
    if (dto.email !== undefined && dto.email !== existingUser.email) {
      const emailTaken = await this.prisma.client.user.findUnique({
        where: { email: dto.email },
      });
      if (emailTaken) {
        throw new BadRequestException('Email is already in use by another account');
      }
      data.email = dto.email;
    }

    if (dto.parentName !== undefined) data.parentName = dto.parentName;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.state !== undefined) data.state = dto.state;
    if (dto.position !== undefined) data.position = dto.position;
    if (dto.school !== undefined) data.school = dto.school;
    if (dto.adminTilte !== undefined) data.adminTilte = dto.adminTilte;

    // Handle numeric fields
    if (dto.gradYear !== undefined) data.gradYear = dto.gradYear;
    if (dto.height !== undefined) data.height = dto.height;
    if (dto.weight !== undefined) data.weight = dto.weight;
    if (dto.gpa !== undefined) data.gpa = dto.gpa;

    // Handle stats
    if (dto.ppg !== undefined) data.ppg = dto.ppg;
    if (dto.rpg !== undefined) data.rpg = dto.rpg;
    if (dto.apg !== undefined) data.apg = dto.apg;
    if (dto.spg !== undefined) data.spg = dto.spg;
    if (dto.blk !== undefined) data.blk = dto.blk;

    // Handle boolean

    // Handle FCM token
    if (dto.fcmToken !== undefined) data.fcmToken = dto.fcmToken;

    // Handle date of birth (convert string to Date)
    if (dto.dateOfBirth !== undefined) {
      data.dateOfBirth = new Date(dto.dateOfBirth);
    }

    // Handle profile image (only update if provided)
    if (imageUrl) {
      // Delete old image from S3 if it exists
      if (existingUser.imgUrl) {
        try {
          await this.s3Service.deleteFile(existingUser.imgUrl);
        } catch {
          // Log but don't fail the update if old image deletion fails
        }
      }
      data.imgUrl = imageUrl;
    }

    const updatedUser = await this.prisma.client.user.update({
      where: { id: userId },
      data,
    });

    // Omit sensitive fields like password
    const { password, ...safeUser } = updatedUser;
    return safeUser;
  }

  // forget and reset password
  async requestResetCode(dto: RequestResetCodeDto) {
    const user = await this.prisma.client.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.isDeleted) {
      throw new BadRequestException('The account is deleted!');
    }

    const code = generateOtpCode();
    const hashedCode = await hashOtpCode(code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.prisma.client.otpCode.create({
      data: { email: dto.email, code: hashedCode, expiresAt },
    });

    // await this.mailerService.sendMail({
    //   to: dto.email,
    //   subject: 'Reset Password Code',
    //   text: `Your OTP code is ${code}. It will expire in 5 minutes.`,
    // });

    return { message: 'Reset code sent' };
  }

  async verifyResetCode(dto: VerifyResetCodeDto) {
    return verifyOtp(this.prisma.client, dto.email, dto.code);
  }

  // get current user
  async currentUser(id: string) {
    const existingUser = await this.prisma.client.user.findUnique({
      where: { id: id },
    });

    if (!existingUser) {
      throw new BadRequestException('User not Found');
    }

    return { user: existingUser };
  }

  async getUsers() {
    return this.prisma.client.user.findMany({
      where: {
        isDeleted: false, // exclude soft-deleted users
      },
      select: {
        id: true,
        athleteFullName: true,
        email: true,
        dateOfBirth: true,
        parentName: true,
        city: true,
        state: true,
        gradYear: true,
        position: true,
        height: true,
        weight: true,
        school: true,
        gpa: true,
        ppg: true,
        rpg: true,
        apg: true,
        spg: true,
        blk: true,
        fcmToken: true,
        agreedToTerms: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        imgUrl: true, // include if you have this field
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

}
