import React, { useState, useEffect } from 'react';
import { Box, Badge, IconButton, Popover, List, ListItem, ListItemText, Typography, Divider, Button, CircularProgress } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../contexts/AuthContext';
import notificationService, { StoredNotification, NotificationEvent } from '../services/notificationService';

// Helper function to format notification date
const formatNotificationDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diff / 60000);
  const diffHours = Math.floor(diff / 3600000);
  const diffDays = Math.floor(diff / 86400000);

  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Helper function to get notification icon based on event type
const getNotificationIcon = (type: NotificationEvent): React.ReactNode => {
  switch (type) {
    case 'welcome':
      return <CheckCircleIcon color="success" />;
    case 'new_contest':
      return <CheckCircleIcon color="primary" />;
    case 'contest_reminder':
      return <CheckCircleIcon color="warning" />;
    case 'sales_milestone':
      return <CheckCircleIcon color="success" />;
    case 'reward_earned':
      return <CheckCircleIcon color="secondary" />;
    case 'leaderboard_update':
      return <CheckCircleIcon color="info" />;
    case 'system_announcement':
      return <CheckCircleIcon color="error" />;
    default:
      return <CheckCircleIcon />;
  }
};

const NotificationCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const fetchNotifications = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const userNotifications = await notificationService.getUserNotifications(currentUser.id);
      setNotifications(userNotifications);
      setUnreadCount(userNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    
    try {
      await notificationService.markAllNotificationsAsRead(currentUser.id);
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    // Fetch notifications on component mount
    if (currentUser) {
      fetchNotifications();
    }

    // Set up polling for new notifications (every 30 seconds)
    const intervalId = setInterval(() => {
      if (currentUser && !anchorEl) {
        // Only update unread count when popover is closed
        fetchNotifications();
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [currentUser, anchorEl]);
  
  // If no user is logged in, don't render the notification center
  if (!currentUser) {
    return null;
  }

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  return (
    <Box>
      <IconButton
        aria-describedby={id}
        onClick={handleClick}
        color="inherit"
        size="large"
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box className="bg-white text-gray-800 border border-gray-200 rounded-lg shadow-xl">
          <Box className="p-4 flex justify-between items-center border-b border-gray-200">
            <Typography variant="h6">Notifications</Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={handleMarkAllAsRead}>
                Mark all as read
              </Button>
            )}
          </Box>
          <Divider />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={30} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No notifications
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {notifications.map((notification) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    alignItems="flex-start"
                    sx={{
                      backgroundColor: notification.read ? 'inherit' : 'rgba(255, 255, 255, 0.05)',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.03)' },
                    }}
                    secondaryAction={
                      !notification.read && (
                        <IconButton
                          edge="end"
                          aria-label="mark as read"
                          onClick={() => handleMarkAsRead(notification.id)}
                          size="small"
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      )
                    }
                  >
                    <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                      {getNotificationIcon(notification.type)}
                    </Box>
                    <ListItemText
                      primary={notification.data.title}
                      secondary={
                        <React.Fragment>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {notification.data.message}
                          </Typography>
                          {notification.data.link && (
                            <Typography
                              component="div"
                              variant="body2"
                              sx={{ mt: 0.5 }}
                            >
                              <Button
                                size="small"
                                href={notification.data.link}
                                variant="outlined"
                              >
                                View Details
                              </Button>
                            </Typography>
                          )}
                          <Typography
                            component="div"
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 0.5 }}
                          >
                            {formatNotificationDate(notification.createdAt)}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Popover>
    </Box>
  );
};

export default NotificationCenter;