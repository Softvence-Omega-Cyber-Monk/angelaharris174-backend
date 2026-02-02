// update-user.dto.ts
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

export class UpdateUserDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the athlete',
    required: false,
  })
  @IsOptional()
  @IsString()
  athleteFullName?: string;

  @ApiProperty({
    example: '2005-08-15',
    description: 'Date of birth (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address (must be unique)',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  // Optional personal/academic info
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

  @ApiProperty({ example: 180.5, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Height must be a number' })
  @Min(0)
  height?: number;

  @ApiProperty({ example: 75.2, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Weight must be a number' })
  @Min(0)
  weight?: number;

  @ApiProperty({ example: 'Lincoln High School', required: false })
  @IsOptional()
  @IsString()
  school?: string;

  @ApiProperty({ example: 3.75, required: false })
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

  // Optional: allow updating consent status (e.g., re-agreeing after policy change)
  @ApiProperty({
    example: true,
    description: 'Agreement to terms (optional update)',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  agreedToTerms?: boolean;


  // 🔹 NEW: Basketball Performance Stats
  @ApiProperty({
    example: 22.5,
    description: 'Points Per Game (PPG)',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'PPG must be a number' })
  @Min(0)
  ppg?: number;

  @ApiProperty({
    example: 8.3,
    description: 'Rebounds Per Game (RPG)',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'RPG must be a number' })
  @Min(0)
  rpg?: number;

  @ApiProperty({
    example: 5.7,
    description: 'Assists Per Game (APG)',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'APG must be a number' })
  @Min(0)
  apg?: number;

  @ApiProperty({
    example: 2.1,
    description: 'Steals Per Game (SPG)',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'SPG must be a number' })
  @Min(0)
  spg?: number;

  @ApiProperty({
    example: 1.8,
    description: 'Blocks Per Game (BLK)',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'BLK must be a number' })
  @Min(0)
  blk?: number;

}