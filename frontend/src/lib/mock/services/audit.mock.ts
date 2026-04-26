import { delay } from '../utils';
import { mockAuditTrail } from '../data/audit-trail';

let auditTrail = [...mockAuditTrail];

export const auditMock = {
  getAuditTrail: async (mahberId: string) => {
    await delay(600);
    const data = auditTrail
      .filter(a => a.mahber_id === mahberId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
    return {
      data,
      meta: { total: data.length, page: 1, limit: 50, totalPages: 1 },
    };
  },
  
  // Internal mock helper to allow other mock services to log actions
  _logAction: (mahberId: string, actorId: string, actionType: string, details: any, actor: any) => {
    auditTrail = [
      {
        id: `aud_${Date.now()}`,
        mahber_id: mahberId,
        actor_id: actorId,
        action_type: actionType,
        details,
        created_at: new Date().toISOString(),
        actor
      },
      ...auditTrail
    ];
  }
};
