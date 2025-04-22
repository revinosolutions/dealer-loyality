import React from 'react';
import { Trophy, Calendar } from 'lucide-react';

type ContestProps = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  goal: string;
  progress: number;
  reward: string;
  status: 'active' | 'upcoming' | 'completed';
};

const ContestCard = ({
  id,
  title,
  startDate,
  endDate,
  goal,
  progress,
  reward,
  status
}: ContestProps) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    upcoming: 'bg-blue-100 text-blue-800',
    completed: 'bg-gray-100 text-gray-800'
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-200 hover:shadow-md">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100">
            <Trophy size={20} className="text-amber-600" />
          </div>
          <h3 className="text-gray-900 font-medium">{title}</h3>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[status]}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
      
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Calendar size={16} />
        <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-500">Progress</span>
          <span className="text-sm font-medium text-gray-700">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      
      <div className="text-sm text-gray-600 mb-4">
        <p><span className="font-medium">Goal:</span> {goal}</p>
        <p className="mt-1"><span className="font-medium">Reward:</span> {reward}</p>
      </div>
      
      <div className="mt-2">
        <a 
          href={`/contests/${id}`}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          View details
        </a>
      </div>
    </div>
  );
};

export default ContestCard;