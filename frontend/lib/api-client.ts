import { auth } from "./firebase";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Debug logging
if (typeof window !== 'undefined') {
  console.log('API Client initialized with URL:', API_URL);
}

// Server-side API client (for Next.js Server Components - no auth)
export async function serverApiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    cache: 'no-store', // or appropriate caching strategy
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  
  return response.json();
}

// Client-side API client (with auth support)
export async function clientApiRequest(
  method: string,
  endpoint: string,
  data?: any,
  requireAuth = false
): Promise<any> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (requireAuth) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Not authenticated');
    }
    const token = await user.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const url = `${API_URL}${endpoint}`;
  console.log(`[API] ${method} ${url}`);
  
  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  
  console.log(`[API] ${method} ${url} -> ${response.status} ${response.statusText}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `API error: ${response.statusText}`);
  }
  
  return response.json();
}

// Convenience methods
export const api = {
  get: (endpoint: string, requireAuth = false) => 
    clientApiRequest('GET', endpoint, undefined, requireAuth),
  
  post: (endpoint: string, data?: any, requireAuth = false) => 
    clientApiRequest('POST', endpoint, data, requireAuth),
  
  put: (endpoint: string, data?: any, requireAuth = false) => 
    clientApiRequest('PUT', endpoint, data, requireAuth),
  
  delete: (endpoint: string, requireAuth = false) => 
    clientApiRequest('DELETE', endpoint, undefined, requireAuth),
  
  patch: (endpoint: string, data?: any, requireAuth = false) => 
    clientApiRequest('PATCH', endpoint, data, requireAuth),
};

// Legacy function for backward compatibility (used by existing code)
export async function apiRequest(
  method: string,
  endpoint: string,
  data?: any
): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Check if auth is needed (endpoints that require auth)
  const authRequired = endpoint.includes('/users/') && 
    (method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH') ||
    endpoint.includes('/reviews') && method === 'POST' ||
    endpoint.includes('/saved-alleys') ||
    endpoint.includes('/suggestions/user/');
  
  if (authRequired) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Not authenticated');
    }
    const token = await user.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `API error: ${response.statusText}`);
  }
  
  return response;
}

