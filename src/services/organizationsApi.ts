// Organization API service
import { apiRequest } from './api';

export interface AdminUser {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: string;
  status: string;
}

export interface OrganizationData {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt?: string;
  updatedAt?: string;
  admins?: AdminUser[];
  settings?: {
    theme?: {
      primaryColor?: string;
      secondaryColor?: string;
      logoUrl?: string;
    };
    features?: {
      rewards?: boolean;
      sales?: boolean;
      orders?: boolean;
      contests?: boolean;
    };
    customization?: {
      dealerLabel?: string;
      clientLabel?: string;
    };
  };
}

export interface AdminUserData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'admin';
  organizationId: string;
  status: 'active' | 'inactive' | 'suspended';
  createdBySuperAdmin: boolean;
}

// API endpoints for organization management
export const organizationsApi = {
  // Get all organizations
  getAll: () => apiRequest<OrganizationData[]>('/api/organizations'),
  
  // Get organization by ID
  getById: (id: string) => apiRequest<OrganizationData>(`/api/organizations/${id}`),
  
  // Create new organization
  create: (orgData: OrganizationData) => {
    console.log('Creating organization with data:', orgData);
    return apiRequest<OrganizationData>('/api/organizations', 'POST', orgData);
  },
  
  // Update organization
  update: (id: string, orgData: Partial<OrganizationData>) => 
    apiRequest<OrganizationData>(`/api/organizations/${id}`, 'PUT', orgData),
  
  // Delete organization
  delete: (id: string) => apiRequest<{message: string}>(`/api/organizations/${id}`, 'DELETE'),
  
  // Create admin user for organization
  createAdmin: (adminData: AdminUserData) => {
    console.log('Creating admin user with data:', adminData);
    return apiRequest<any>('/api/users/admin', 'POST', adminData);
  },
  
  // Get organization statistics
  getStats: () => apiRequest<any>('/api/admin/stats'),
  
  // Create organization with admin in one request
  createWithAdmin: (data: {organization: OrganizationData, admin: Omit<AdminUserData, 'organizationId' | 'role'>}) => {
    console.log('Creating organization with admin using combined endpoint:', data);
    return apiRequest<{organization: OrganizationData, admin: any}>('/api/organizations/with-admin', 'POST', data);
  },
  
  // Get organization by ID with admin users
  getWithAdmins: (id: string) => apiRequest<OrganizationData & { admins: AdminUser[] }>(`/api/organizations/${id}/with-admins`),
};

export default organizationsApi; 