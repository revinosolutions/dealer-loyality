import React, { useState } from 'react';
import { Bell, Lock, User, Globe, Shield, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type SettingsTab = 'account' | 'notifications' | 'security' | 'system';

const SettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Account settings state
  const [accountSettings, setAccountSettings] = useState({
    language: 'english',
    timezone: 'UTC-5',
    dateFormat: 'MM/DD/YYYY',
  });
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    whatsappNotifications: true,
    newContestAlerts: true,
    salesUpdates: true,
    rewardAlerts: true,
    weeklyReports: true,
  });
  
  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: '30',
    passwordExpiry: '90',
  });
  
  // System settings state (admin only)
  const [systemSettings, setSystemSettings] = useState({
    dealerApproval: true,
    contestApproval: true,
    salesVerification: true,
    pointsExpiry: '365',
    minRedemptionPoints: '1000',
  });
  
  const handleAccountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAccountSettings(prev => ({ ...prev, [name]: value }));
  };
  
  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setNotificationSettings(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleSecurityChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setSecuritySettings(prev => ({ ...prev, [name]: newValue }));
  };
  
  const handleSystemChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setSystemSettings(prev => ({ ...prev, [name]: newValue }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    
    try {
      // In a real implementation, this would call the API to save settings
      // For now, we'll just simulate a successful save
      setTimeout(() => {
        setSuccess(true);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      }, 500);
    } catch (err) {
      setError('Failed to save settings. Please try again.');
    }
  };
  
  // Role-specific settings
  const roleSpecificSettings = () => {
    if (user?.role === 'admin') {
      return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Administrator Settings</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Enable Client Registration</h3>
                <p className="text-xs text-gray-500">Allow new clients to register without approval</p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input 
                  type="checkbox" 
                  checked={accountSettings.language === 'en'} 
                  onChange={() => {
                    setAccountSettings(prev => ({
                      ...prev,
                      language: accountSettings.language === 'en' ? 'fr' : 'en'
                    }));
                  }}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (user?.role === 'dealer') {
      return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dealer Settings</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Order Notifications</h3>
                <p className="text-xs text-gray-500">Receive notifications for new orders</p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input 
                  type="checkbox" 
                  checked={notificationSettings.pushNotifications} 
                  onChange={() => {
                    setNotificationSettings(prev => ({
                      ...prev, 
                      pushNotifications: !notificationSettings.pushNotifications
                    }));
                  }}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  if (!user) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <p className="text-gray-500">Please log in to view settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">
          Manage your account preferences and system settings
        </p>
      </div>
      
      {/* Success message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-800">Settings saved successfully!</h3>
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
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200">
            <nav className="p-4 space-y-1">
              <button
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'account' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setActiveTab('account')}
              >
                <User size={18} />
                <span>Account Preferences</span>
              </button>
              <button
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'notifications' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setActiveTab('notifications')}
              >
                <Bell size={18} />
                <span>Notifications</span>
              </button>
              <button
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'security' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setActiveTab('security')}
              >
                <Lock size={18} />
                <span>Security</span>
              </button>
              {(user?.role === 'admin' || user?.role === 'client') && (
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'system' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  onClick={() => setActiveTab('system')}
                >
                  <Shield size={18} />
                  <span>System Settings</span>
                </button>
              )}
            </nav>
          </div>
          
          {/* Content */}
          <div className="flex-1 p-6">
            <form onSubmit={handleSubmit}>
              {/* Account Preferences */}
              {activeTab === 'account' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <User size={20} />
                    Account Preferences
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                        Language
                      </label>
                      <select
                        id="language"
                        name="language"
                        value={accountSettings.language}
                        onChange={handleAccountChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="english">English</option>
                        <option value="spanish">Spanish</option>
                        <option value="french">French</option>
                        <option value="german">German</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                        Timezone
                      </label>
                      <select
                        id="timezone"
                        name="timezone"
                        value={accountSettings.timezone}
                        onChange={handleAccountChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="UTC-8">Pacific Time (UTC-8)</option>
                        <option value="UTC-7">Mountain Time (UTC-7)</option>
                        <option value="UTC-6">Central Time (UTC-6)</option>
                        <option value="UTC-5">Eastern Time (UTC-5)</option>
                        <option value="UTC+0">UTC</option>
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700 mb-1">
                        Date Format
                      </label>
                      <select
                        id="dateFormat"
                        name="dateFormat"
                        value={accountSettings.dateFormat}
                        onChange={handleAccountChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Notifications */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Bell size={20} />
                    Notification Settings
                  </h2>
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-700">Notification Channels</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <input
                          id="emailNotifications"
                          name="emailNotifications"
                          type="checkbox"
                          checked={notificationSettings.emailNotifications}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="emailNotifications" className="ml-2 block text-sm text-gray-700">
                          Email Notifications
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="pushNotifications"
                          name="pushNotifications"
                          type="checkbox"
                          checked={notificationSettings.pushNotifications}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="pushNotifications" className="ml-2 block text-sm text-gray-700">
                          Push Notifications
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="smsNotifications"
                          name="smsNotifications"
                          type="checkbox"
                          checked={notificationSettings.smsNotifications}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="smsNotifications" className="ml-2 block text-sm text-gray-700">
                          SMS Notifications
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="whatsappNotifications"
                          name="whatsappNotifications"
                          type="checkbox"
                          checked={notificationSettings.whatsappNotifications}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="whatsappNotifications" className="ml-2 block text-sm text-gray-700">
                          WhatsApp Notifications
                        </label>
                      </div>
                    </div>
                    
                    <h3 className="text-sm font-medium text-gray-700 mt-6">Notification Types</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <input
                          id="newContestAlerts"
                          name="newContestAlerts"
                          type="checkbox"
                          checked={notificationSettings.newContestAlerts}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="newContestAlerts" className="ml-2 block text-sm text-gray-700">
                          New Contest Alerts
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="salesUpdates"
                          name="salesUpdates"
                          type="checkbox"
                          checked={notificationSettings.salesUpdates}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="salesUpdates" className="ml-2 block text-sm text-gray-700">
                          Sales Updates
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="rewardAlerts"
                          name="rewardAlerts"
                          type="checkbox"
                          checked={notificationSettings.rewardAlerts}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="rewardAlerts" className="ml-2 block text-sm text-gray-700">
                          Reward Alerts
                        </label>
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          id="weeklyReports"
                          name="weeklyReports"
                          type="checkbox"
                          checked={notificationSettings.weeklyReports}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="weeklyReports" className="ml-2 block text-sm text-gray-700">
                          Weekly Reports
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Security */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Lock size={20} />
                    Security Settings
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        id="twoFactorAuth"
                        name="twoFactorAuth"
                        type="checkbox"
                        checked={securitySettings.twoFactorAuth}
                        onChange={handleSecurityChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="twoFactorAuth" className="ml-2 block text-sm text-gray-700">
                        Enable Two-Factor Authentication
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="sessionTimeout" className="block text-sm font-medium text-gray-700 mb-1">
                          Session Timeout (minutes)
                        </label>
                        <select
                          id="sessionTimeout"
                          name="sessionTimeout"
                          value={securitySettings.sessionTimeout}
                          onChange={handleSecurityChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="15">15 minutes</option>
                          <option value="30">30 minutes</option>
                          <option value="60">1 hour</option>
                          <option value="120">2 hours</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="passwordExpiry" className="block text-sm font-medium text-gray-700 mb-1">
                          Password Expiry (days)
                        </label>
                        <select
                          id="passwordExpiry"
                          name="passwordExpiry"
                          value={securitySettings.passwordExpiry}
                          onChange={handleSecurityChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="30">30 days</option>
                          <option value="60">60 days</option>
                          <option value="90">90 days</option>
                          <option value="180">180 days</option>
                          <option value="never">Never</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <button
                        type="button"
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Reset Password
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* System Settings (admin only) */}
              {activeTab === 'system' && (user?.role === 'admin' || user?.role === 'client') && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Shield size={20} />
                    System Settings
                  </h2>
                  
                  <div className="space-y-4">
                    {user?.role === 'admin' && (
                      <div className="flex items-center">
                        <input
                          id="dealerApproval"
                          name="dealerApproval"
                          type="checkbox"
                          checked={systemSettings.dealerApproval}
                          onChange={handleSystemChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="dealerApproval" className="ml-2 block text-sm text-gray-700">
                          Require approval for new dealers
                        </label>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <input
                        id="contestApproval"
                        name="contestApproval"
                        type="checkbox"
                        checked={systemSettings.contestApproval}
                        onChange={handleSystemChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="contestApproval" className="ml-2 block text-sm text-gray-700">
                        Require approval for new contests
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        id="salesVerification"
                        name="salesVerification"
                        type="checkbox"
                        checked={systemSettings.salesVerification}
                        onChange={handleSystemChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="salesVerification" className="ml-2 block text-sm text-gray-700">
                        Enable sales verification workflow
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="pointsExpiry" className="block text-sm font-medium text-gray-700 mb-1">
                          Points Expiry (days)
                        </label>
                        <select
                          id="pointsExpiry"
                          name="pointsExpiry"
                          value={systemSettings.pointsExpiry}
                          onChange={handleSystemChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="90">90 days</option>
                          <option value="180">180 days</option>
                          <option value="365">365 days</option>
                          <option value="never">Never</option>
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="minRedemptionPoints" className="block text-sm font-medium text-gray-700 mb-1">
                          Minimum Redemption Points
                        </label>
                        <select
                          id="minRedemptionPoints"
                          name="minRedemptionPoints"
                          value={systemSettings.minRedemptionPoints}
                          onChange={handleSystemChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="500">500 points</option>
                          <option value="1000">1,000 points</option>
                          <option value="2500">2,500 points</option>
                          <option value="5000">5,000 points</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Save size={18} />
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;