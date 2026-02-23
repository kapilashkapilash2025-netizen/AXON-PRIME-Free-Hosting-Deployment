import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiClientError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function mapErrorMessage(status) {
  if (status === 401) return 'Invalid credentials.';
  if (status === 403) return 'Access denied for this action.';
  if (status === 404) return 'Requested resource was not found.';
  if (status === 409) return 'This record already exists.';
  if (status === 423) return 'Daily Risk Limit Reached. Trading Disabled for Today.';
  if (status === 429) return 'Too many requests. Please wait and retry.';
  if (status >= 500) return 'Service is temporarily unavailable. Please try again.';
  return 'Request could not be completed.';
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new ApiClientError(response.status, mapErrorMessage(response.status));
  }

  return response.json();
}
