import { ApiProperty } from "@nestjs/swagger";
import { subscribeStatus, userRole } from "@prisma";
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

  @IsEnum(subscribeStatus)
  @IsNotEmpty()
  @ApiProperty({ 
    description: 'Subscription plan', 
    enum:subscribeStatus,
    example: 'FREE' 
  })
  subscriptionPlan: string;

  @IsNotEmpty()
  @ApiProperty({ 
    description: 'Password', 
    example: '123456' 
  })
  password: string;
}
