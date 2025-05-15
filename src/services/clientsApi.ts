// Clients API service for centralized client management API calls
import { apiRequest } from './api';

export interface ClientData {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  company?: {
    name?: string;
    position?: string;
  };
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
  status: 'active' | 'inactive' | 'suspended';
  createdAt?: string;
  createdByAdmin?: boolean;
  role?: 'client';
  stats?: {
    totalSales: number;
    rewardsRedeemed: number;
    totalDealers?: number;
    activeContests?: number;
    activeRewards?: number;
  };
}

// API endpoints for client management
export const clientsApi = {
  // Get all clients
  getAll: () => apiRequest<ClientData[]>('/clients'),
  
  // Get client by ID
  getById: (id: string) => apiRequest<ClientData>(`/clients/${id}`),
  
  // Create new client
  create: (clientData: ClientData) => apiRequest<ClientData>('/clients', 'POST', clientData),
  
  // Update client
  update: (id: string, clientData: ClientData) => apiRequest<ClientData>(`/clients/${id}`, 'PUT', clientData),
  
  // Delete client
  delete: (id: string) => apiRequest<{message: string}>(`/clients/${id}`, 'DELETE')
};