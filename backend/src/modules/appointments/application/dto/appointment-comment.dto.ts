import { IsString, MaxLength, MinLength } from 'class-validator';
import { MAX_COMMENT_LENGTH } from '../../domain/appointment-comment';

export class CreateAppointmentCommentDto {
  @IsString() @MinLength(1) @MaxLength(MAX_COMMENT_LENGTH) body!: string;
}
