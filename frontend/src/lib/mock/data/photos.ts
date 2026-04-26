import { EventPhoto } from '@/lib/types';
import { mockUsers } from './users';

export const mockPhotos: EventPhoto[] = [
  {
    id: 'pht_1',
    event_id: 'evt_3',
    mahber_id: 'mah_1',
    uploader_id: 'usr_1',
    file_path: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=800&auto=format&fit=crop',
    caption: 'Great atmosphere at the celebration!',
    created_at: new Date(Date.now() - 86400000 * 44).toISOString(),
    user: mockUsers[0],
  },
  {
    id: 'pht_2',
    event_id: 'evt_3',
    mahber_id: 'mah_1',
    uploader_id: 'usr_2',
    file_path: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?q=80&w=800&auto=format&fit=crop',
    caption: 'Setting up the venue.',
    created_at: new Date(Date.now() - 86400000 * 44 - 3600000).toISOString(),
    user: mockUsers[1],
  },
  {
    id: 'pht_3',
    event_id: 'evt_3',
    mahber_id: 'mah_1',
    uploader_id: 'usr_1',
    file_path: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=800&auto=format&fit=crop',
    caption: 'The group together.',
    created_at: new Date(Date.now() - 86400000 * 43).toISOString(),
    user: mockUsers[0],
  },
];
