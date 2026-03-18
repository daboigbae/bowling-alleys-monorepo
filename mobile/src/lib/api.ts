import { firebaseAuth } from './firebase';
import { API } from '../constants/api';
import type {
  SendCodeRequest,
  SendCodeResponse,
  VerifyCodeRequest,
  VerifyCodeResponse,
} from '../types/auth';

const API_BASE_URL = API.baseUrl;

export async function request<TBody, TResponse>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: TBody,
  authenticated = false,
): Promise<TResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authenticated) {
    const currentUser = firebaseAuth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 No Content — body is empty, skip JSON parse
  if (response.status === 204) {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return null as TResponse;
  }

  const data: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as Record<string, unknown>).error)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as TResponse;
}

export async function sendCode(email: string): Promise<SendCodeResponse> {
  return request<SendCodeRequest, SendCodeResponse>('POST', '/api/auth/send-code', { email });
}

export async function verifyCode(email: string, code: string): Promise<VerifyCodeResponse> {
  return request<VerifyCodeRequest, VerifyCodeResponse>('POST', '/api/auth/verify-code', {
    email,
    code,
  });
}
