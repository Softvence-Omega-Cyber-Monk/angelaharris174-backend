import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class HighlightsDto {
    @ApiProperty({
        example: 'Best moments from the game!',
        description: 'Short caption for the highlight',
    })
    @IsString()
    caption: string;

    @ApiProperty({
        example: 'A compilation of top plays from the championship match.',
        description: 'Detailed description of the highlight',
    })
    @IsString()
    description: string;

    @ApiProperty({
        example: 'cmlc3mqvf0000rcwa6ajj9w24',
        description: 'ID of the user who owns this highlight',
    })
    @IsString()
    userId: string;

    @ApiProperty({
        type: 'array',
        items: {
            type: 'string',
            format: 'binary',
        },
        description: 'Array of video clips to be merged',
    })
    clips: any[];
}