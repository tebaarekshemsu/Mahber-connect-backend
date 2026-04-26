import { User } from '@/lib/types';

export const mockUsers: User[] = [
  {
    id: 'usr_1',
    phone: '+251911234567',
    name: 'Abebe Kebede',
    email: 'abebe@example.com',
    bio: 'Software Engineer from Addis',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
