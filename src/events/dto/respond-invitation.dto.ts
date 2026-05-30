import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum InvitationResponseAction {
  ACCEPT = 'accept',
  DECLINE = 'decline',
}

export class RespondInvitationDto {
  @ApiProperty({
    description: 'Response to the invitation',
    enum: InvitationResponseAction,
    example: InvitationResponseAction.ACCEPT,
  })
  @IsEnum(InvitationResponseAction)
  action: InvitationResponseAction;
}
