const SERVER_URL = 'https://wintozo-messenger.onrender.com';

let authToken: string | null = null;

export function setToken(token: string) { authToken = token; }
export function getToken() { return authToken; }
export function clearToken() { authToken = null; }

async function request(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${SERVER_URL}${path}`, { ...options, headers, credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data;
}

export const api = {
  register: (username: string, password: string) =>
    request('/api/register', { method: 'POST', body: JSON.stringify({ username, password }) }),

  login: (username: string, password: string) =>
    request('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  logout: () => request('/api/logout', { method: 'POST' }),

  me: () => request('/api/me'),

  setEmoji: (emoji: string) =>
    request('/api/set-emoji', { method: 'POST', body: JSON.stringify({ emoji }) }),

  getUsers: () => request('/api/users'),

  getMessages: (chatId: string) => request(`/api/messages/${chatId}`),

  sendMessage: (chat_id: string, content: string, type = 'text', file_url?: string) =>
    request('/api/messages', { method: 'POST', body: JSON.stringify({ chat_id, content, type, file_url }) }),

  uploadFile: async (file: Blob, filename: string) => {
    const formData = new FormData();
    formData.append('file', file, filename);
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${SERVER_URL}/api/upload`, { method: 'POST', headers, credentials: 'include', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
    return data;
  },

  getEmojiBattle: () => request('/api/emoji-battle'),

  getChannelMessages: (name: string) => request(`/api/channel/${name}`),

  sendChannelMessage: (name: string, content: string) =>
    request(`/api/channel/${name}`, { method: 'POST', body: JSON.stringify({ content }) }),

  adminCmd: (command: string) =>
    request('/api/admin/cmd', { method: 'POST', body: JSON.stringify({ command }) }),

  getFileUrl: (path: string) => `${SERVER_URL}${path}`,
};
