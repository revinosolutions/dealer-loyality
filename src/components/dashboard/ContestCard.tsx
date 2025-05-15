import React from 'react';
import { Trophy, Calendar, Users, Award } from 'lucide-react';
import { Contest } from '../../contexts/DataContext';

interface ContestCardProps extends Contest {}

const ContestCard: React.FC<ContestCardProps> = ({
  title,
  description,
  startDate,
  endDate,
  status,
  progress,
  totalParticipants,
  prizePool,
  category
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Trophy className="h-6 w-6 text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-gray-500">{category}</span>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Progress</span>
          <span className="font-medium text-gray-900">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <div className="text-sm">
            <div className="text-gray-500">Start</div>
            <div className="font-medium text-gray-900">
              {new Date(startDate).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <div className="text-sm">
            <div className="text-gray-500">End</div>
            <div className="font-medium text-gray-900">
              {new Date(endDate).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {totalParticipants} participants
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-medium text-indigo-600">
            ${prizePool.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ContestCard;