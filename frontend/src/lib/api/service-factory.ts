import { authMock } from '../mock/services/auth.mock';
import { authApi } from './services/auth.api';
import { mahberMock } from '../mock/services/mahber.mock';
import { mahberApi } from './services/mahber.api';
import { financialMock } from '../mock/services/financial.mock';
import { financialApi } from './services/financial.api';
import { memberMock } from '../mock/services/member.mock';
import { memberApi } from './services/member.api';
import { eventMock } from '../mock/services/event.mock';
import { eventApi } from './services/event.api';
import { communicationMock } from '../mock/services/communication.mock';
import { communicationApi } from './services/communication.api';
import { auditMock } from '../mock/services/audit.mock';
import { auditApi } from './services/audit.api';

const useMock = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';

export const authService = useMock ? authMock : authApi;
export const mahberService = useMock ? mahberMock : mahberApi;
export const financialService = useMock ? financialMock : financialApi;
export const memberService = useMock ? memberMock : memberApi;
export const eventService = useMock ? eventMock : eventApi;
export const communicationService = useMock ? communicationMock : communicationApi;
export const auditService = useMock ? auditMock : auditApi;
