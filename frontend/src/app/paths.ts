export const PATHS = {
  home: '/',
  lostPets: '/lost-pets',
  foundPets: '/found-pets',
  petDetails: (id: string) => `/pets/${id}`,
  reportPet: '/report-pet',
  reportLost: '/report-pet?type=lost',
  reportFound: '/report-pet?type=found',
  profile: '/profile',
  analytics: '/analytics',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
} as const;