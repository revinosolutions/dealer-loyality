import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationsApi';
// InventoryContext import removed
// OrderContext import removed

// Define notification types
export type NotificationType = 
  | 'order_status_change'
  | 'inventory_low_stock'
  | 'inventory_out_of_stock'
  | 'payment_received'
  | 'new_order'
  | 'order_cancelled'
  | 'price_change'
  | 'purchase_request_approved'
  | 'purchase_request_rejected'
  | 'system';

// Define notification priority
export type NotificationPriority = 'low' | 'medium' | 'high';

// Define notification status
export type NotificationStatus = 'unread' | 'read' | 'archived';

// Define notification object
export type Notification = {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  createdAt: string;
  readAt?: string;
  relatedEntityId?: string; // ID of related order, product, etc.
  relatedEntityType?: 'order' | 'product' | 'inventory' | 'payment';
  actionUrl?: string;
};

// Define notification preferences
export type NotificationPreferences = {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  notificationTypes: {
    [key in NotificationType]: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
};

// Define notification context type
type NotificationContextType = {
  notifications: Notification[];
  preferences: NotificationPreferences | null;
  unreadCount: number;
  loading: boolean;
  error: string | null;
  getNotifications: (filters?: { status?: NotificationStatus; type?: NotificationType }) => Notification[];
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  sendNotification: (notification: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority: NotificationPriority;
    status?: NotificationStatus;
    relatedEntityId?: string;
    relatedEntityType?: 'order' | 'product' | 'inventory' | 'payment';
    actionUrl?: string;
  }) => Promise<void>;
};

// Create the notification context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Initialize with empty arrays instead of mock data
const initialNotifications: Notification[] = [];

// Initialize with null preferences
const initialPreferences: NotificationPreferences | null = null;

// Create notification provider
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  // OrderContext dependency removed
  
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(initialPreferences);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate unread count
  const unreadCount = notifications.filter(
    n => n.status === 'unread' && n.userId === user?.id
  ).length;

  // Get notifications with optional filters
  const getNotifications = (filters?: { status?: NotificationStatus; type?: NotificationType }) => {
    if (!user) return [];

    // Filter notifications for current user
    let userNotifications = notifications.filter(n => n.userId === user.id);

    // Apply additional filters if provided
    if (filters) {
      if (filters.status) {
        userNotifications = userNotifications.filter(n => n.status === filters.status);
      }
      if (filters.type) {
        userNotifications = userNotifications.filter(n => n.type === filters.type);
      }
    }

    // Sort by creation date (newest first)
    return userNotifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  // Mark notification as read
  const markAsRead = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User must be logged in');
      }

      // Update notification in state
      const updatedNotifications = notifications.map(notification => {
        if (notification._id === id && notification.userId === user.id) {
          return {
            ...notification,
            status: 'read' as NotificationStatus,
            readAt: new Date().toISOString()
          };
        }
        return notification;
      });

      setNotifications(updatedNotifications);

      // In a real app, we would make an API call here
      // const response = await fetch(`/api/notifications/${id}/read`, {
      //   method: 'PUT',
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //   },
      // });
      // 
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to mark notification as read');
      // }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User must be logged in');
      }

      // Update all unread notifications for current user
      const updatedNotifications = notifications.map(notification => {
        if (notification.status === 'unread' && notification.userId === user.id) {
          return {
            ...notification,
            status: 'read' as NotificationStatus,
            readAt: new Date().toISOString()
          };
        }
        return notification;
      });

      setNotifications(updatedNotifications);

      // In a real app, we would make an API call here
      // const response = await fetch('/api/notifications/read-all', {
      //   method: 'PUT',
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //   },
      // });
      // 
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to mark all notifications as read');
      // }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User must be logged in');
      }

      // Remove notification from state
      setNotifications(notifications.filter(
        notification => !(notification._id === id && notification.userId === user.id)
      ));

      // In a real app, we would make an API call here
      // const response = await fetch(`/api/notifications/${id}`, {
      //   method: 'DELETE',
      //   headers: {
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //   },
      // });
      // 
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to delete notification');
      // }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update notification preferences
  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error('User must be logged in');
      }

      // Update preferences in state
      const updatedPreferences = preferences ? { ...preferences, ...newPreferences } : null;
      if (updatedPreferences) {
        setPreferences(updatedPreferences);
      }

      // In a real app, we would make an API call here
      // const response = await fetch('/api/notifications/preferences', {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`,
      //   },
      //   body: JSON.stringify(newPreferences),
      // });
      // 
      // if (!response.ok) {
      //   const errorData = await response.json();
      //   throw new Error(errorData.message || 'Failed to update notification preferences');
      // }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Send notification
  const sendNotification = async (notification: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority: NotificationPriority;
    status?: NotificationStatus;
    relatedEntityId?: string;
    relatedEntityType?: 'order' | 'product' | 'inventory' | 'payment';
    actionUrl?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      // Generate a new ID
      const newId = (notifications.length + 1).toString();
      
      // Create new notification
      const newNotification: Notification = {
        _id: newId,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        status: (notification.status || 'unread') as NotificationStatus,
        createdAt: new Date().toISOString(),
        relatedEntityId: notification.relatedEntityId,
        relatedEntityType: notification.relatedEntityType,
        actionUrl: notification.actionUrl
      };

      // Add to state
      setNotifications([...notifications, newNotification]);

      // In a real app, we would make an API call here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Inventory monitoring removed

  // Order status monitoring removed

  const value = {
    notifications: getNotifications(),
    preferences,
    unreadCount,
    loading,
    error,
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    sendNotification,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

// Create hook for using notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;