import axios from 'axios';

// API base URL
const API_URL = '/api';

// Types
export interface Contest {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  goal: string;
  goalType: 'sales_amount' | 'sales_count' | 'new_customers' | 'product_specific' | 'custom';
  targetValue: number;
  progress: number;
  reward: string;
  status: 'active' | 'upcoming' | 'completed';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  clientId?: string;
  participants?: Array<{
    userId: string;
    progress: number;
    currentValue: number;
    rank?: number;
    isWinner: boolean;
  }>;
  rewardDetails?: {
    type: 'points' | 'badge' | 'physical' | 'discount' | 'custom';
    pointsAwarded?: number;
  };
  rules?: {
    winnerCount: number;
    minParticipants: number;
    eligibilityCriteria?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateContestData {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  goal: string;
  goalType: 'sales_amount' | 'sales_count' | 'new_customers' | 'product_specific' | 'custom';
  targetValue: number;
  reward: string;
  clientId?: string;
  rewardDetails?: {
    type: 'points' | 'badge' | 'physical' | 'discount' | 'custom';
    pointsAwarded?: number;
  };
  rules?: {
    winnerCount: number;
    minParticipants: number;
    eligibilityCriteria?: string;
  };
}

export interface ContestFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export interface ContestListResponse {
  contests: Contest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ContestResponse {
  contest: Contest;
  message?: string;
}

// Axios instance with auth header
const authAxios = axios.create({
  baseURL: API_URL,
});

// Add token to requests if available
authAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses
authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Contest service functions
const getContests = async (filters: ContestFilters = {}): Promise<ContestListResponse> => {
  const { status, page, limit } = filters;
  
  // Build query string
  const queryParams = new URLSearchParams();
  if (status) queryParams.append('status', status);
  if (page) queryParams.append('page', page.toString());
  if (limit) queryParams.append('limit', limit.toString());
  
  // Append query string to URL if there are parameters
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  const response = await authAxios.get(`/contests${queryString}`);
  
  // Map response data to match our TypeScript interface
  const contests = response.data.contests.map((contest: any) => ({
    ...contest,
    id: contest._id, // Map MongoDB _id to id
  }));
  
  return {
    contests,
    pagination: response.data.pagination,
  };
};

const getContest = async (id: string): Promise<ContestResponse> => {
  const response = await authAxios.get(`/contests/${id}`);
  
  // Map response data to match our TypeScript interface
  const contest = {
    ...response.data.contest,
    id: response.data.contest._id, // Map MongoDB _id to id
  };
  
  return { contest };
};

const createContest = async (data: CreateContestData): Promise<ContestResponse> => {
  const response = await authAxios.post('/contests', data);
  
  // Map response data to match our TypeScript interface
  const contest = {
    ...response.data.contest,
    id: response.data.contest._id, // Map MongoDB _id to id
  };
  
  return {
    contest,
    message: response.data.message,
  };
};

const updateContest = async (id: string, data: CreateContestData): Promise<ContestResponse> => {
  const response = await authAxios.put(`/contests/${id}`, data);
  
  // Map response data to match our TypeScript interface
  const contest = {
    ...response.data.contest,
    id: response.data.contest._id, // Map MongoDB _id to id
  };
  
  return {
    contest,
    message: response.data.message,
  };
};

const deleteContest = async (id: string): Promise<{ message: string }> => {
  const response = await authAxios.delete(`/contests/${id}`);
  
  return {
    message: response.data.message,
  };
};

const joinContest = async (id: string): Promise<ContestResponse> => {
  const response = await authAxios.post(`/contests/${id}/join`);
  
  // Map response data to match our TypeScript interface
  const contest = {
    ...response.data.contest,
    id: response.data.contest._id, // Map MongoDB _id to id
  };
  
  return {
    contest,
    message: response.data.message,
  };
};

const approveContest = async (id: string, notes?: string): Promise<ContestResponse> => {
  const response = await authAxios.post(`/contests/${id}/approve`, { notes });
  
  // Map response data to match our TypeScript interface
  const contest = {
    ...response.data.contest,
    id: response.data.contest._id, // Map MongoDB _id to id
  };
  
  return {
    contest,
    message: response.data.message,
  };
};

const rejectContest = async (id: string, notes?: string): Promise<ContestResponse> => {
  const response = await authAxios.post(`/contests/${id}/reject`, { notes });
  
  // Map response data to match our TypeScript interface
  const contest = {
    ...response.data.contest,
    id: response.data.contest._id, // Map MongoDB _id to id
  };
  
  return {
    contest,
    message: response.data.message,
  };
};

const contestService = {
  getContests,
  getContest,
  createContest,
  updateContest,
  deleteContest,
  joinContest,
  approveContest,
  rejectContest,
};

export default contestService; 