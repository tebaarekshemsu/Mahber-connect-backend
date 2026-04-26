import { ChatMessage } from '@/lib/types';
import { mockUsers } from './users';

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'msg_1',
    mahber_id: 'mah_1',
    sender_id: 'usr_1',
    content: 'Hello everyone! Welcome to our group chat.',
    is_deleted: false,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    sender: mockUsers[0],
  },
  {
    id: 'msg_2',
    mahber_id: 'mah_1',
    sender_id: 'usr_2',
    content: 'Thank you! Excited to be here.',
    is_deleted: false,
    created_at: new Date(Date.now() - 86400000 * 5 + 300000).toISOString(),
    sender: mockUsers[1],
  },
  {
    id: 'msg_3',
    mahber_id: 'mah_1',
    sender_id: 'usr_1',
    content: 'Please remember to pay your monthly contributions before the 5th.',
    is_deleted: false,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    sender: mockUsers[0],
  },
];
