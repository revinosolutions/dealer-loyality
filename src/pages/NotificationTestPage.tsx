import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  TextField
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import notificationTestUtil from '../utils/notificationTestUtil';
import { NotificationEvent, NotificationType, NotificationResult } from '../services/notificationService';
import NotificationCenter from '../components/NotificationCenter';
import NotificationPreferences from '../components/NotificationPreferences';

const NotificationTestPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<NotificationEvent>('welcome');
  const [selectedChannels, setSelectedChannels] = useState<NotificationType[]>(['email', 'push', 'whatsapp']);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<Record<NotificationType, NotificationResult> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEventChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedEvent(event.target.value as NotificationEvent);
  };

  const handleChannelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const channel = event.target.name as NotificationType;
    if (event.target.checked) {
      setSelectedChannels(prev => [...prev, channel]);
    } else {
      setSelectedChannels(prev => prev.filter(c => c !== channel));
    }
  };

  const handleSendTestNotification = async () => {
    if (!currentUser) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const channels = selectedChannels.length > 0 ? selectedChannels : undefined;
      const notificationResult = await notificationTestUtil.sendTestNotification(
        currentUser,
        selectedEvent,
        channels
      );
      setResult(notificationResult);
    } catch (err) {
      console.error('Error sending test notification:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAllNotifications = async () => {
    if (!currentUser) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      await notificationTestUtil.generateTestNotifications(currentUser);
      setResult({ email: { success: true, channel: 'email', timestamp: new Date() } } as any);
    } catch (err) {
      console.error('Error generating test notifications:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>
            Notification System Test
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Use this page to test the notification system and see how different notification types appear.
          </Typography>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Send Test Notification
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="notification-event-label">Notification Event</InputLabel>
                    <Select
                      labelId="notification-event-label"
                      value={selectedEvent}
                      onChange={handleEventChange}
                      label="Notification Event"
                    >
                      <MenuItem value="welcome">Welcome</MenuItem>
                      <MenuItem value="new_contest">New Contest</MenuItem>
                      <MenuItem value="contest_reminder">Contest Reminder</MenuItem>
                      <MenuItem value="sales_milestone">Sales Milestone</MenuItem>
                      <MenuItem value="reward_earned">Reward Earned</MenuItem>
                      <MenuItem value="leaderboard_update">Leaderboard Update</MenuItem>
                      <MenuItem value="system_announcement">System Announcement</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    Notification Channels
                  </Typography>
                  <FormGroup row>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedChannels.includes('email')}
                          onChange={handleChannelChange}
                          name="email"
                        />
                      }
                      label="Email"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedChannels.includes('push')}
                          onChange={handleChannelChange}
                          name="push"
                        />
                      }
                      label="Push"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedChannels.includes('sms')}
                          onChange={handleChannelChange}
                          name="sms"
                        />
                      }
                      label="SMS"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedChannels.includes('whatsapp')}
                          onChange={handleChannelChange}
                          name="whatsapp"
                        />
                      }
                      label="WhatsApp"
                    />
                  </FormGroup>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSendTestNotification}
                  disabled={loading || !currentUser}
                >
                  {loading ? <CircularProgress size={24} /> : 'Send Test Notification'}
                </Button>
                
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleGenerateAllNotifications}
                  disabled={loading || !currentUser}
                >
                  Generate All Notification Types
                </Button>
              </Box>
              
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
              
              {result && (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Notification Sent Results:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <pre style={{ margin: 0, overflow: 'auto' }}>
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <Paper elevation={3} sx={{ p: 2, width: '100%', textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Notification Center
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Click the bell icon to view your notifications
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <NotificationCenter />
              </Box>
            </Paper>
          </Box>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              After sending test notifications, click the notification bell icon above to see them in the notification center.
            </Typography>
          </Alert>
          
          <Typography variant="subtitle1" gutterBottom>
            How It Works
          </Typography>
          <Typography variant="body2" paragraph>
            1. Select a notification event type
          </Typography>
          <Typography variant="body2" paragraph>
            2. Choose which notification channels to use
          </Typography>
          <Typography variant="body2" paragraph>
            3. Click "Send Test Notification" to send a single notification
          </Typography>
          <Typography variant="body2" paragraph>
            4. Or click "Generate All Notification Types" to create one of each type
          </Typography>
        </Grid>
        
        <Grid item xs={12}>
          <Divider sx={{ my: 3 }} />
          <Typography variant="h5" gutterBottom>
            Notification Preferences
          </Typography>
          <NotificationPreferences />
        </Grid>
      </Grid>
    </Box>
  );
};

export default NotificationTestPage;