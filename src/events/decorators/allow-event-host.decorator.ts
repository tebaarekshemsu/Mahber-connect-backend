import { SetMetadata } from '@nestjs/common';

export const ALLOW_EVENT_HOST_KEY = 'allow_event_host';

export const AllowEventHost = () => SetMetadata(ALLOW_EVENT_HOST_KEY, true);
