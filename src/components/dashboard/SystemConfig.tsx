import React, { useState } from 'react';
import { Settings, Save, AlertCircle } from 'lucide-react';

interface SystemConfigProps {
  config: {
    pointsMultiplier: number;
    minContestDuration: number;
    maxContestDuration: number;
    maxRewardPoints: number;
    notificationSettings: {
      emailEnabled: boolean;
      whatsappEnabled: boolean;
      pushEnabled: boolean;
    };
    maintenanceMode: boolean;
  };
  onSave: (config: any) => void;
}

const SystemConfig: React.FC<SystemConfigProps> = ({ config, onSave }) => {
  const [formData, setFormData] = useState(config);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await onSave(formData);
    } catch (err) {
      setError('Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-800">System Configuration</h2>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Points Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Points Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pointsMultiplier" className="block text-sm font-medium text-gray-700">
                Points Multiplier
              </label>
              <input
                type="number"
                name="pointsMultiplier"
                id="pointsMultiplier"
                value={formData.pointsMultiplier}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label htmlFor="maxRewardPoints" className="block text-sm font-medium text-gray-700">
                Maximum Reward Points
              </label>
              <input
                type="number"
                name="maxRewardPoints"
                id="maxRewardPoints"
                value={formData.maxRewardPoints}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Contest Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Contest Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="minContestDuration" className="block text-sm font-medium text-gray-700">
                Minimum Contest Duration (days)
              </label>
              <input
                type="number"
                name="minContestDuration"
                id="minContestDuration"
                value={formData.minContestDuration}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                min="1"
              />
            </div>
            <div>
              <label htmlFor="maxContestDuration" className="block text-sm font-medium text-gray-700">
                Maximum Contest Duration (days)
              </label>
              <input
                type="number"
                name="maxContestDuration"
                id="maxContestDuration"
                value={formData.maxContestDuration}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Notification Settings</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="notificationSettings.emailEnabled"
                id="emailEnabled"
                checked={formData.notificationSettings.emailEnabled}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="emailEnabled" className="ml-2 block text-sm text-gray-700">
                Enable Email Notifications
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="notificationSettings.whatsappEnabled"
                id="whatsappEnabled"
                checked={formData.notificationSettings.whatsappEnabled}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="whatsappEnabled" className="ml-2 block text-sm text-gray-700">
                Enable WhatsApp Notifications
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="notificationSettings.pushEnabled"
                id="pushEnabled"
                checked={formData.notificationSettings.pushEnabled}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="pushEnabled" className="ml-2 block text-sm text-gray-700">
                Enable Push Notifications
              </label>
            </div>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">System Status</h3>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="maintenanceMode"
              id="maintenanceMode"
              checked={formData.maintenanceMode}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-700">
              Enable Maintenance Mode
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SystemConfig; 