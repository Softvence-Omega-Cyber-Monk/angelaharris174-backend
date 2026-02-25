import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUUID,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

class AttachmentDto {
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['IMAGE', 'VIDEO', 'FILE']) // স্কিমা অনুযায়ী ভ্যালিডেশন
  fileType: string;
}

export class SendMessageDto {
  @IsUUID()
  @IsNotEmpty({ message: 'ConversationId is required' })
  conversationId: string;

  @IsUUID()
  @IsNotEmpty({ message: 'receiverId is required' })
  receiverId: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  files?: AttachmentDto[];
}
