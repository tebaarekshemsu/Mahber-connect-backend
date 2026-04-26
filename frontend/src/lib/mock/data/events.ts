import { Event } from '@/lib/types';

export const mockEvents: Event[] = [
  {
    id: 'evt_1',
    mahber_id: 'mah_1',
    title: 'Monthly General Meeting',
    description: 'Our regular monthly gathering to discuss financials and upcoming initiatives.',
    event_type: 'Meeting',
    start_time: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
    end_time: new Date(Date.now() + 86400000 * 5 + 7200000).toISOString(), // + 2 hours
    location: 'Jupiter International Hotel, Cazanchis',
    is_mandatory: true,
    is_cancelled: false,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'evt_2',
    mahber_id: 'mah_1',
    title: 'Annual Fundraiser Dinner',
    description: 'Gala dinner to raise funds for the local school project.',
    event_type: 'Fundraiser',
    start_time: new Date(Date.now() + 86400000 * 20).toISOString(), // 20 days from now
    end_time: new Date(Date.now() + 86400000 * 20 + 14400000).toISOString(), // + 4 hours
    location: 'Skylight Hotel',
    is_mandatory: false,
    is_cancelled: false,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'evt_3',
    mahber_id: 'mah_1',
    title: 'New Year Celebration',
    description: 'Enkutatash celebration with traditional food and music.',
    event_type: 'Ceremony',
    start_time: new Date(Date.now() - 86400000 * 45).toISOString(), // 45 days ago
    end_time: new Date(Date.now() - 86400000 * 45 + 21600000).toISOString(), // + 6 hours
    location: 'Bole Fana Park',
    is_mandatory: false,
    is_cancelled: false,
    created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
  },
];
