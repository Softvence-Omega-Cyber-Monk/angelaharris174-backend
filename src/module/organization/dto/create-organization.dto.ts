import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'ORG_001' })
  @IsString()
  @IsNotEmpty()
  organizationCode: string;

  @ApiProperty({ example: 'Softvence Academy' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'org@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
