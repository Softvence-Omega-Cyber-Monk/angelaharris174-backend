// register.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the athlete',
  })
  @IsNotEmpty({ message: 'Athlete full name is required!' })
  @IsString()
  athleteFullName: string;

  @ApiProperty({
    example: '2005-08-15',
    description: 'Date of birth (YYYY-MM-DD format)',
  })
  @IsNotEmpty({ message: 'Date of birth is required!' })
  dateOfBirth: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Unique email address',
  })
  @IsNotEmpty({ message: 'Email is required!' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Unique email address',
  })
  @IsNotEmpty({ message: 'Email is required!' })
  @IsEmail({}, { message: 'Invalid email format' })
  parentEmail: string;

  @ApiProperty({
    example: 'REF_123456',
    description: 'Unique referral code',
  })
  @IsNotEmpty({ message: 'Referral code is required!' })
  referredBy: string;

  @ApiProperty({
    example: '123456',
    description: 'User password ',
  })
  @IsNotEmpty({ message: 'Password is required!' })
  @IsString()
  password: string;

  // Optional fields
  @ApiProperty({ example: 'Jane Doe', required: false })
  @IsOptional()
  @IsString()
  parentName?: string;

  @ApiProperty({ example: 'New York', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'NY', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ example: 2026, required: false })
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2035)
  gradYear?: number;

  @ApiProperty({ example: 'Quarterback', required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({
    example: 180.5,
    description: 'Height in cm or inches',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Height must be a number' })
  @Min(0)
  height?: number;

  @ApiProperty({
    example: 75.2,
    description: 'Weight in kg or lbs',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Weight must be a number' })
  @Min(0)
  weight?: number;

  @ApiProperty({ example: 'Lincoln High School', required: false })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiProperty({
    example: 3.75,
    description: 'GPA on a 4.0 scale',
    required: false,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'GPA must be a number with up to 2 decimal places' }
  )
  @Min(0.0)
  @Max(4.0)
  gpa?: number;

  @ApiProperty({ example: 'fcm_token_abc123', required: false })
  @IsOptional()
  @IsString()
  fcmToken?: string;


}