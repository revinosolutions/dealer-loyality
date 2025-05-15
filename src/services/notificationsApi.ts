import { apiRequest } from './api';

export interface Notification {
  _id: string;
  recipient: string;
  sender?: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  deliveryStatus: {
    app: string;
    email: string;
    whatsapp: string;
  };
  relatedId?: string;
  relatedModel?: string;
  metadata?: any;
  priority?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch all notifications for the current user
 * @returns {Promise<Notification[]>} Array of notifications
 */
export const getNotifications = async () => {
  try {
    console.log('Fetching notifications');
    const response = await apiRequest<Notification[]>('/api/notifications', 'GET');
    console.log(`Fetched ${response.length} notifications`);
    return response;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

/**
 * Mark a notification as read
 * @param {string} notificationId ID of the notification to mark as read
 * @returns {Promise<Notification>} Updated notification
 */
export const markNotificationAsRead = async (notificationId: string) => {
  return apiRequest<Notification>(`/api/notifications/${notificationId}/read`, 'PUT');
};

/**
 * Mark all notifications as read
 * @returns {Promise<{ count: number }>} Number of notifications marked as read
 */
export const markAllNotificationsAsRead = async () => {
  return apiRequest<{ count: number }>('/api/notifications/read-all', 'PUT');
};

/**
 * Delete a notification
 * @param {string} notificationId ID of the notification to delete
 * @returns {Promise<{ message: string }>} Response message
 */
export const deleteNotification = async (notificationId: string) => {
  return apiRequest<{ message: string }>(`/api/notifications/${notificationId}`, 'DELETE');
};

/**
 * Get purchase request notifications
 * @returns {Promise<Notification[]>} Purchase request notifications
 */
export const getPurchaseRequestNotifications = async () => {
  try {
    console.log('Fetching purchase request notifications');
    const response = await apiRequest<Notification[]>('/api/notifications', 'GET', undefined, {
      types: 'purchase_request_approved,purchase_request_rejected'
    });
    
    console.log(`Fetched ${response.length} purchase request notifications`);
    return response;
  } catch (error) {
    console.error('Error fetching purchase request notifications:', error);
    return [];
  }
}; 