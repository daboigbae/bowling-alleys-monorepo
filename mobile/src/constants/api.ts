const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';

export const API = {
  baseUrl: API_BASE_URL,
} as const;
