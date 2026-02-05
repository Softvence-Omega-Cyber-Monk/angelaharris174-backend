import {
  IsNotEmpty,
  IsString,
  IsUrl,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ description: 'The URL of the video or image' })
  @IsNotEmpty({ message: 'URL is required' })
  @IsUrl({}, { message: 'Invalid URL format' })
  url: string;

  @ApiPropertyOptional({ description: 'A short description or caption' })
  @IsOptional()
  @IsString({ message: 'Caption must be a string' })
  caption?: string;

  @ApiProperty({ description: 'The UUID of the user who owns this post' })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  userId: string;
}
