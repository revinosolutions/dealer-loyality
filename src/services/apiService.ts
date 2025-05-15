import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// API base URL from environment variable
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generic CRUD operations
export const createResource = async <T>(endpoint: string, data: Partial<T>): Promise<T> => {
  const response = await api.post<T>(endpoint, data);
  return response.data;
};

export const getResource = async <T>(endpoint: string, id?: string): Promise<T> => {
  const url = id ? `${endpoint}/${id}` : endpoint;
  const response = await api.get<T>(url);
  return response.data;
};

export const updateResource = async <T>(endpoint: string, id: string, data: Partial<T>): Promise<T> => {
  const response = await api.put<T>(`${endpoint}/${id}`, data);
  return response.data;
};

export const deleteResource = async <T>(endpoint: string, id: string): Promise<T> => {
  const response = await api.delete<T>(`${endpoint}/${id}`);
  return response.data;
};

// Specific API endpoints
export const apiService = {
  // Contests
  contests: {
    getAll: () => getResource('contests'),
    getById: (id: string) => getResource('contests', id),
    create: (data: any) => createResource('contests', data),
    update: (id: string, data: any) => updateResource('contests', id, data),
    delete: (id: string) => deleteResource('contests', id),
  },

  // Sales
  sales: {
    getAll: () => getResource('sales'),
    getById: (id: string) => getResource('sales', id),
    create: (data: any) => createResource('sales', data),
    update: (id: string, data: any) => updateResource('sales', id, data),
    delete: (id: string) => deleteResource('sales', id),
    verify: (id: string) => api.post(`sales/${id}/verify`),
    reject: (id: string) => api.post(`sales/${id}/reject`),
  },

  // Dealers
  dealers: {
    getAll: () => getResource('dealers'),
    getById: (id: string) => getResource('dealers', id),
    create: (data: any) => createResource('dealers', data),
    update: (id: string, data: any) => updateResource('dealers', id, data),
    delete: (id: string) => deleteResource('dealers', id),
    getStats: (id: string) => getResource(`dealers/${id}/stats`),
  },

  // Clients
  clients: {
    getAll: () => getResource('clients'),
    getById: (id: string) => getResource('clients', id),
    create: (data: any) => createResource('clients', data),
    update: (id: string, data: any) => updateResource('clients', id, data),
    delete: (id: string) => deleteResource('clients', id),
    getDealers: (id: string) => getResource(`clients/${id}/dealers`),
  },

  // Stats
  stats: {
    getAll: () => getResource('stats'),
    getLeaderboard: () => getResource('stats/leaderboard'),
    getSalesTrend: () => getResource('stats/sales-trend'),
    getUserGrowth: () => getResource('stats/user-growth'),
  },

  // Rewards
  rewards: {
    getAll: () => getResource('rewards'),
    getById: (id: string) => getResource('rewards', id),
    create: (data: any) => createResource('rewards', data),
    update: (id: string, data: any) => updateResource('rewards', id, data),
    delete: (id: string) => deleteResource('rewards', id),
    redeem: (id: string) => api.post(`rewards/${id}/redeem`),
  },

  // Achievements
  achievements: {
    getAll: () => getResource('achievements'),
    getById: (id: string) => getResource('achievements', id),
    create: (data: any) => createResource('achievements', data),
    update: (id: string, data: any) => updateResource('achievements', id, data),
    delete: (id: string) => deleteResource('achievements', id),
  },

  // System Configuration
  config: {
    get: () => getResource('config'),
    update: (data: any) => updateResource('config', 'system', data),
  },

  // Notifications
  notifications: {
    getAll: () => getResource('notifications'),
    markAsRead: (id: string) => api.post(`notifications/${id}/read`),
    markAllAsRead: () => api.post('notifications/read-all'),
  },
};

export default apiService; 