import React, { useState, useEffect } from 'react';
import { Settings, Database, Server, Globe, Shield, Save, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const SuperAdminSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'platform' | 'database' | 'api'>('platform');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Platform settings
  const [platformSettings, setPlatformSettings] = useState({
    siteName: 'Revino Dealer Loyalty Platform',
    maintenanceMode: false,
    allowRegistration: true,
    defaultUserRole: 'dealer',
    systemNotifications: true,
    analyticsTracking: true
  });
  
  // Database settings
  const [dbSettings, setDbSettings] = useState({
    connectionStatus: 'Connected',
    dbSize: '1.2 GB',
    backupFrequency: 'daily',
    lastBackup: new Date().toISOString(),
    autoCleanup: true,
    cleanupOlderThan: '30'
  });
  
  // API settings
  const [apiSettings, setApiSettings] = useState({
    enablePublicApi: false,
    requireApiKey: true,
    rateLimitPerMinute: '60',
    webhookEndpoint: '',
    webhookSecret: '',
    logApiCalls: true
  });

  // Ensure only superadmin can access this page
  if (user?.role !== 'superadmin') {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p className="mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  // Fetch settings from MongoDB
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        // In a real implementation, this would be an API call to fetch settings
        // For now using a mock API call
        if (process.env.NODE_ENV === 'development') {
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 800));
          // Mock data response - in production this would be a real API call
          setIsLoading(false);
          return;
        }

        const response = await axios.get('/api/admin/settings');
        
        // Update state with fetched settings
        const { platform, database, api } = response.data;
        
        setPlatformSettings(platform);
        setDbSettings(database);
        setApiSettings(api);
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, []);

  // Handle platform settings change
  const handlePlatformChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setPlatformSettings(prev => ({ ...prev, [name]: newValue }));
  };
  
  // Handle database settings change
  const handleDbChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setDbSettings(prev => ({ ...prev, [name]: newValue }));
  };
  
  // Handle API settings change
  const handleApiChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setApiSettings(prev => ({ ...prev, [name]: newValue }));
  };

  // Save settings to MongoDB
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // In a real implementation, this would be an API call to update settings
      if (process.env.NODE_ENV === 'development') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSuccess(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
        
        setIsLoading(false);
        return;
      }
      
      await axios.post('/api/admin/settings', {
        platform: platformSettings,
        database: dbSettings,
        api: apiSettings
      });
      
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Backup database
  const handleBackupDatabase = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would be an API call to trigger backup
      if (process.env.NODE_ENV === 'development') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Update last backup time
        setDbSettings(prev => ({
          ...prev,
          lastBackup: new Date().toISOString()
        }));
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        setIsLoading(false);
        return;
      }
      
      await axios.post('/api/admin/database/backup');
      
      // Update last backup time
      setDbSettings(prev => ({
        ...prev,
        lastBackup: new Date().toISOString()
      }));
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error backing up database:', err);
      setError('Failed to backup database. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate new API key
  const handleGenerateApiKey = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would be an API call to generate new API key
      if (process.env.NODE_ENV === 'development') {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const newApiKey = 'api_' + Math.random().toString(36).substring(2, 15);
        alert(`New API Key generated: ${newApiKey}`);
        
        setIsLoading(false);
        return;
      }
      
      const response = await axios.post('/api/admin/api-keys/generate');
      alert(`New API Key generated: ${response.data.apiKey}`);
    } catch (err) {
      console.error('Error generating API key:', err);
      setError('Failed to generate API key. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Platform Administration</h1>
        <p className="text-gray-600">
          Configure global platform settings, database operations, and API access
        </p>
      </div>
      
      {/* Success message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-800">Operation completed successfully!</h3>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-800">Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200">
          <nav className="p-4 space-y-1">
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'platform' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('platform')}
            >
              <Globe size={18} />
              <span>Platform Settings</span>
            </button>
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'database' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('database')}
            >
              <Database size={18} />
              <span>Database Management</span>
            </button>
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'api' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}
              onClick={() => setActiveTab('api')}
            >
              <Server size={18} />
              <span>API Configuration</span>
            </button>
          </nav>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-6">
          <form onSubmit={handleSubmit}>
            {/* Platform Settings */}
            {activeTab === 'platform' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Globe size={20} />
                  Platform Settings
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="siteName" className="block text-sm font-medium text-gray-700 mb-1">
                      Site Name
                    </label>
                    <input
                      id="siteName"
                      name="siteName"
                      type="text"
                      value={platformSettings.siteName}
                      onChange={handlePlatformChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="defaultUserRole" className="block text-sm font-medium text-gray-700 mb-1">
                      Default User Role
                    </label>
                    <select
                      id="defaultUserRole"
                      name="defaultUserRole"
                      value={platformSettings.defaultUserRole}
                      onChange={handlePlatformChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="dealer">Dealer</option>
                      <option value="client">Client</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-4 mt-4">
                  <div className="flex items-center">
                    <input
                      id="maintenanceMode"
                      name="maintenanceMode"
                      type="checkbox"
                      checked={platformSettings.maintenanceMode}
                      onChange={handlePlatformChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-700">
                      Enable Maintenance Mode
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="allowRegistration"
                      name="allowRegistration"
                      type="checkbox"
                      checked={platformSettings.allowRegistration}
                      onChange={handlePlatformChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allowRegistration" className="ml-2 block text-sm text-gray-700">
                      Allow New User Registration
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="systemNotifications"
                      name="systemNotifications"
                      type="checkbox"
                      checked={platformSettings.systemNotifications}
                      onChange={handlePlatformChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="systemNotifications" className="ml-2 block text-sm text-gray-700">
                      Enable System Notifications
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="analyticsTracking"
                      name="analyticsTracking"
                      type="checkbox"
                      checked={platformSettings.analyticsTracking}
                      onChange={handlePlatformChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="analyticsTracking" className="ml-2 block text-sm text-gray-700">
                      Enable Analytics Tracking
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            {/* Database Management */}
            {activeTab === 'database' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Database size={20} />
                  Database Management
                </h2>
                
                <div className="bg-gray-50 p-4 rounded-md mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Connection Status:</span>
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${dbSettings.connectionStatus === 'Connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {dbSettings.connectionStatus}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Database Size:</span>
                      <span className="ml-2 text-sm text-gray-900">{dbSettings.dbSize}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Last Backup:</span>
                    <span className="ml-2 text-sm text-gray-900">{formatDate(dbSettings.lastBackup)}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="backupFrequency" className="block text-sm font-medium text-gray-700 mb-1">
                      Backup Frequency
                    </label>
                    <select
                      id="backupFrequency"
                      name="backupFrequency"
                      value={dbSettings.backupFrequency}
                      onChange={handleDbChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="cleanupOlderThan" className="block text-sm font-medium text-gray-700 mb-1">
                      Auto-cleanup Records Older Than (days)
                    </label>
                    <select
                      id="cleanupOlderThan"
                      name="cleanupOlderThan"
                      value={dbSettings.cleanupOlderThan}
                      onChange={handleDbChange}
                      disabled={!dbSettings.autoCleanup}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="30">30 days</option>
                      <option value="60">60 days</option>
                      <option value="90">90 days</option>
                      <option value="180">180 days</option>
                      <option value="365">365 days</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center mt-2">
                  <input
                    id="autoCleanup"
                    name="autoCleanup"
                    type="checkbox"
                    checked={dbSettings.autoCleanup}
                    onChange={handleDbChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoCleanup" className="ml-2 block text-sm text-gray-700">
                    Enable Automatic Database Cleanup
                  </label>
                </div>
                
                <div className="mt-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleBackupDatabase}
                    disabled={isLoading}
                    className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    Backup Database Now
                  </button>
                  
                  <button
                    type="button"
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Purge Temporary Data
                  </button>
                </div>
              </div>
            )}
            
            {/* API Configuration */}
            {activeTab === 'api' && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <Server size={20} />
                  API Configuration
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      id="enablePublicApi"
                      name="enablePublicApi"
                      type="checkbox"
                      checked={apiSettings.enablePublicApi}
                      onChange={handleApiChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enablePublicApi" className="ml-2 block text-sm text-gray-700">
                      Enable Public API
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="requireApiKey"
                      name="requireApiKey"
                      type="checkbox"
                      checked={apiSettings.requireApiKey}
                      onChange={handleApiChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="requireApiKey" className="ml-2 block text-sm text-gray-700">
                      Require API Key for Access
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="logApiCalls"
                      name="logApiCalls"
                      type="checkbox"
                      checked={apiSettings.logApiCalls}
                      onChange={handleApiChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="logApiCalls" className="ml-2 block text-sm text-gray-700">
                      Log All API Calls
                    </label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <label htmlFor="rateLimitPerMinute" className="block text-sm font-medium text-gray-700 mb-1">
                      Rate Limit (requests per minute)
                    </label>
                    <select
                      id="rateLimitPerMinute"
                      name="rateLimitPerMinute"
                      value={apiSettings.rateLimitPerMinute}
                      onChange={handleApiChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="30">30 requests</option>
                      <option value="60">60 requests</option>
                      <option value="100">100 requests</option>
                      <option value="200">200 requests</option>
                      <option value="unlimited">Unlimited</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="webhookEndpoint" className="block text-sm font-medium text-gray-700 mb-1">
                      Webhook Endpoint URL
                    </label>
                    <input
                      id="webhookEndpoint"
                      name="webhookEndpoint"
                      type="text"
                      placeholder="https://your-domain.com/webhooks"
                      value={apiSettings.webhookEndpoint}
                      onChange={handleApiChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleGenerateApiKey}
                    className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Generate New API Key
                  </button>
                  
                  <button
                    type="button"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    View API Documentation
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminSettingsPage; 