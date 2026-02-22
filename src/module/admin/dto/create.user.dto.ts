import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'Full name', example: 'Alice Johnson' })
  athleteFullName: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ description: 'Email address', example: 'alicejohnson@gmail.com' })
  email: string;

 

  @IsEnum(['ADMIN', 'USER', 'ATHLETE'])
  @IsNotEmpty()
  @ApiProperty({ 
    description: 'System role', 
    enum: ['ADMIN', 'USER', 'ATHLETE'],
    example: 'ADMIN' 
  })
  systemRole: string;

  @IsEnum(['BASIC', 'PRO', 'ELITE', 'COMPEDED'])
  @IsNotEmpty()
  @ApiProperty({ 
    description: 'Subscription plan', 
    enum: ['BASIC', 'PRO', 'ELITE', 'COMPEDED'],
    example: 'BASIC' 
  })
  subscriptionPlan: string;
}
