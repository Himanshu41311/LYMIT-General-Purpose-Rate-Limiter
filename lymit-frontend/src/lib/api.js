export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://lymit-m1-production.up.railway.app';
const TOKEN_KEY = 'jrl_token';
const USER_KEY = 'jrl_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (e) {
    throw new Error(`Could not reach the auth service at ${API_BASE}. Is it running?`);
  }

  let body = null;
  try { body = await response.json(); } catch { /* empty body is fine */ }

  if (!response.ok) {
    throw new Error((body && body.message) || `Request failed (${response.status})`);
  }
  return body;
}

export async function signUp({ name, email, password }) {
  const data = await request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  setSession(data.token, data.user);
  return data.user;
}

export async function signIn({ email, password }) {
  const data = await request('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setSession(data.token, data.user);
  return data.user;
}

export function signOut() {
  clearSession();
}

export function cachedUser() {
  if (!getToken()) return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export async function me() {
  const user = await request('/api/auth/me', { method: 'GET' });
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function updateProfile({ name }) {
  const user = await request('/api/auth/me', { method: 'PUT', body: JSON.stringify({ name }) });
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function listRoutes() {
  return request('/api/routes', { method: 'GET' });
}

export function getRoute(routeId) {
  return request(`/api/routes/${routeId}`, { method: 'GET' });
}

export function getRouteStatus(routeId) {
  return request(`/api/routes/${routeId}/status`, { method: 'GET' });
}

export function createRoute({ name, targetUrl }) {
  return request('/api/routes', { method: 'POST', body: JSON.stringify({ name, targetUrl }) });
}

export function updateRoute(routeId, { name, targetUrl, active }) {
  return request(`/api/routes/${routeId}`, { method: 'PUT', body: JSON.stringify({ name, targetUrl, active }) });
}

export function deleteRoute(routeId) {
  return request(`/api/routes/${routeId}`, { method: 'DELETE' });
}

export function listPolicies(routeId) {
  return request(`/api/routes/${routeId}/policies`, { method: 'GET' });
}

export function createPolicy(routeId, data) {
  return request(`/api/routes/${routeId}/policies`, { method: 'POST', body: JSON.stringify(data) });
}

export function updatePolicy(routeId, policyId, data) {
  return request(`/api/routes/${routeId}/policies/${policyId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deletePolicy(routeId, policyId) {
  return request(`/api/routes/${routeId}/policies/${policyId}`, { method: 'DELETE' });
}
