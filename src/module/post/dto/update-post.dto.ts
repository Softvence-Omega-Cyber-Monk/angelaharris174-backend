import { IsString, IsUrl, IsOptional } from 'class-validator';

export class UpdatePostDto {
  @IsUrl({}, { message: 'Please provide a valid URL for the post image/video' })
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  caption?: string;
}
