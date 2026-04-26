import { type User, users } from './dummy-data';

const AUTH_KEY = 'namviek_auth_user';

export function login(email: string): User {
  // Accept any email — check if it matches a known user, otherwise use Alice
  const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  const user = found ?? users[0]; // default to Alice
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  return user;
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}
