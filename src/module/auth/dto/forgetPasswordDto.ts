import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestResetCodeDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Registered email address to receive the reset code',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;
}

export class VerifyResetCodeDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address used to receive the reset code',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({
    example: '1234',
    description: '4-digit reset code sent to the user\'s email',
  })
  @IsString()
  @Length(4, 4, { message: 'Code must be 4 characters' })
  code: string;
}