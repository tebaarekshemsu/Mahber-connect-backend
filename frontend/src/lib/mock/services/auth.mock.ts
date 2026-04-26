import { delay, randomError } from '../utils';
import { mockUsers } from '../data/users';

export const authMock = {
  login: async (phone: string, password: string) => {
    await delay(800);
    randomError(0.1); // 10% chance to fail
    
    // Accept the mock user or any validly formatted phone for testing
    if (password.length >= 8) {
      return {
        access_token: 'mock_jwt_token_here',
        user: mockUsers[0],
      };
    }
    
    throw new Error('Invalid credentials');
  },
  
  register: async (phone: string, password: string, name: string) => {
    await delay(1000);
    randomError(0.1);
    
    const newUser = {
      id: `usr_${Math.random().toString(36).substring(7)}`,
      phone,
      name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return newUser;
  },

  getProfile: async () => {
    await delay(500);
    return mockUsers[0];
  }
};
