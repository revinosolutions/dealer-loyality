import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormGroup,
  FormControlLabel,
  Switch,
  Button,
  Snackbar,
  Alert,
  Divider,
  Grid,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import notificationService, { NotificationPreferences as INotificationPreferences } from '../services/notificationService';

const NotificationPreferences: React.FC = () => {
  const { currentUser } = useAuth();
  const [preferences, setPreferences] = useState<INotificationPreferences>({
    email: true,
    push: true,
    sms: false,
    whatsapp: true
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        const userPreferences = await notificationService.getUserNotificationPreferences(currentUser.id);
        setPreferences(userPreferences);
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load notification preferences',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [currentUser]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setPreferences(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSave = async () => {
    if (!currentUser) return;
    
    setSaving(true);
    try {
      await notificationService.saveUserNotificationPreferences(currentUser.id, preferences);
      setSnackbar({
        open: true,
        message: 'Notification preferences saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save notification preferences',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card className="bg-white text-gray-800 border border-gray-200">
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Notification Preferences
        </Typography>
        <Typography variant="body2" className="text-gray-400" paragraph>
          Choose how you want to receive notifications from the Dealer Loyalty Platform.
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Notification Channels
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.email}
                    onChange={handleChange}
                    name="email"
                  />
                }
                label="Email Notifications"
              />
              <Typography variant="caption" className="text-gray-400" sx={{ ml: 4, mt: -1, display: 'block' }}>
                Receive notifications via email
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.push}
                    onChange={handleChange}
                    name="push"
                  />
                }
                label="Push Notifications"
              />
              <Typography variant="caption" className="text-gray-400" sx={{ ml: 4, mt: -1, display: 'block' }}>
                Receive in-app notifications
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.sms}
                    onChange={handleChange}
                    name="sms"
                  />
                }
                label="SMS Notifications"
              />
              <Typography variant="caption" className="text-gray-400" sx={{ ml: 4, mt: -1, display: 'block' }}>
                Receive notifications via SMS (requires phone number)
              </Typography>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.whatsapp}
                    onChange={handleChange}
                    name="whatsapp"
                  />
                }
                label="WhatsApp Notifications"
              />
              <Typography variant="caption" className="text-gray-400" sx={{ ml: 4, mt: -1, display: 'block' }}>
                Receive notifications via WhatsApp (requires phone number)
              </Typography>
            </FormGroup>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Notification Types
            </Typography>
            <Box className="pl-4 text-gray-300">
              <Typography variant="body2" gutterBottom>
                • <strong>Contest Updates</strong> - New contests, reminders, and results
              </Typography>
              <Typography variant="body2" gutterBottom>
                • <strong>Sales Milestones</strong> - Achievements and progress updates
              </Typography>
              <Typography variant="body2" gutterBottom>
                • <strong>Rewards</strong> - Earned rewards and redemption confirmations
              </Typography>
              <Typography variant="body2" gutterBottom>
                • <strong>Leaderboard Updates</strong> - Changes in your ranking
              </Typography>
              <Typography variant="body2" gutterBottom>
                • <strong>System Announcements</strong> - Important platform updates
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : 'Save Preferences'}
          </Button>
        </Box>
      </CardContent>
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default NotificationPreferences;