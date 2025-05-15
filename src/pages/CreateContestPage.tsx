import React, { useState } from 'react';
import { Trophy, Calendar, DollarSign, Users, CheckCircle, AlertCircle } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { contestsApi } from '../services/api';

type FormData = {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  goal: string;
  reward: string;
  targetDealers: string[];
};

const CreateContestPage = () => {
  const { user } = useAuth();
  const { fetchContests } = useData();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    goal: '',
    reward: '',
    targetDealers: [],
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Mock dealers for selection
  const mockDealers = [
    { id: '1', name: 'Eastside Motors' },
    { id: '2', name: 'Westlake Automotive' },
    { id: '3', name: 'Sunshine Dealership' },
    { id: '4', name: 'Mountain View Sales' },
    { id: '5', name: 'Coastal Automotive Group' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleDealerSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, targetDealers: selectedOptions }));
  };

  const validateForm = () => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    if (!formData.goal.trim()) newErrors.goal = 'Goal is required';
    if (!formData.reward.trim()) newErrors.reward = 'Reward is required';
    if (formData.targetDealers.length === 0) newErrors.targetDealers = ['Select at least one dealer'];
    
    // Check if end date is after start date
    if (formData.startDate && formData.endDate) {
      // Create date objects with time set to midnight for consistent comparison
      const start = new Date(formData.startDate + 'T00:00:00');
      const end = new Date(formData.endDate + 'T00:00:00');
      if (end <= start) {
        newErrors.endDate = 'End date must be after start date';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create a new contest via API function
  const handleCreateContest = async (contestData: FormData) => {
    try {
      return await contestsApi.create(contestData);
    } catch (error) {
      console.error('Error creating contest:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Call API to create contest
      await handleCreateContest(formData);
      setSuccess(true);
      
      // Update contests list in DataContext
      await fetchContests();
      
      // Redirect after success
      setTimeout(() => {
        navigate('/contests');
      }, 2000);
    } catch (error) {
      // Handle error
      setErrors(prev => ({
        ...prev,
        title: (error as Error).message
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Contest</h1>
          <p className="text-gray-600">
            Design a new sales contest to motivate your dealers and drive performance.
          </p>
        </div>
        
        {/* Success message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-800">Contest created successfully!</h3>
              <p className="text-green-700 text-sm">Redirecting you to the contests page...</p>
            </div>
          </div>
        )}
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Trophy className="mr-2 h-5 w-5 text-indigo-500" />
                Contest Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Title */}
                <div className="col-span-2">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Contest Title*
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.title ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="Summer Sales Challenge"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>
                
                {/* Description */}
                <div className="col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description*
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.description ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="Describe the contest objectives and rules"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>
                
                {/* Date Range */}
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date*
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleInputChange}
                      className={`pl-10 w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.startDate ? 'border-red-300' : 'border-gray-300'}`}
                    />
                  </div>
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date*
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      className={`pl-10 w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.endDate ? 'border-red-300' : 'border-gray-300'}`}
                    />
                  </div>
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Goals and Rewards */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <DollarSign className="mr-2 h-5 w-5 text-indigo-500" />
                Goals and Rewards
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Goal */}
                <div>
                  <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-1">
                    Performance Goal*
                  </label>
                  <input
                    type="text"
                    id="goal"
                    name="goal"
                    value={formData.goal}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.goal ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="Sell 100 premium units"
                  />
                  {errors.goal && (
                    <p className="mt-1 text-sm text-red-600">{errors.goal}</p>
                  )}
                </div>
                
                {/* Reward */}
                <div>
                  <label htmlFor="reward" className="block text-sm font-medium text-gray-700 mb-1">
                    Reward*
                  </label>
                  <input
                    type="text"
                    id="reward"
                    name="reward"
                    value={formData.reward}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.reward ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="$1,000 bonus + Premium Package"
                  />
                  {errors.reward && (
                    <p className="mt-1 text-sm text-red-600">{errors.reward}</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Target Dealers */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Users className="mr-2 h-5 w-5 text-indigo-500" />
                Target Dealers
              </h2>
              
              <div>
                <label htmlFor="targetDealers" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Dealers*
                </label>
                <select
                  id="targetDealers"
                  name="targetDealers"
                  multiple
                  size={5}
                  value={formData.targetDealers}
                  onChange={handleDealerSelection}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.targetDealers ? 'border-red-300' : 'border-gray-300'}`}
                >
                  {Array.isArray(mockDealers) && mockDealers.map(dealer => (
                    <option key={dealer.id} value={dealer.id}>{dealer.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">Hold Ctrl/Cmd to select multiple dealers</p>
                {errors.targetDealers && (
                  <p className="mt-1 text-sm text-red-600">{errors.targetDealers}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/contests')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
            >
              {loading ? 'Creating...' : 'Create Contest'}
            </button>
          </div>
        </form>
      </div>
  );
};

export default CreateContestPage;