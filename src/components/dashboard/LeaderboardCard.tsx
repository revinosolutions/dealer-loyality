import React from 'react';
import { Award, ChevronRight } from 'lucide-react';

type LeaderType = {
  id: string;
  name: string;
  avatar?: string;
  points: number;
  rank: number;
  change?: number;
};

type LeaderboardCardProps = {
  title: string;
  leaders: LeaderType[];
  isLoading?: boolean;
};

const LeaderboardCard = ({ title, leaders, isLoading = false }: LeaderboardCardProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Award className="text-indigo-600" size={20} />
          <h3 className="text-gray-800 font-medium">{title}</h3>
        </div>
        
        <a 
          href="/leaderboard"
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
        >
          See all
          <ChevronRight size={16} />
        </a>
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/4"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {leaders.map((leader) => (
            <div 
              key={leader.id}
              className="flex items-center px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="w-6 text-center font-medium text-gray-500">
                {leader.rank}
              </div>
              
              <div className="ml-3 h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-medium overflow-hidden">
                {leader.avatar ? (
                  <img 
                    src={leader.avatar} 
                    alt={leader.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  leader.name.charAt(0)
                )}
              </div>
              
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {leader.name}
                </p>
                {leader.change !== undefined && (
                  <p className="text-xs text-gray-500">
                    {leader.change > 0 ? (
                      <span className="text-green-600">↑ {leader.change}</span>
                    ) : leader.change < 0 ? (
                      <span className="text-red-600">↓ {Math.abs(leader.change)}</span>
                    ) : (
                      <span>→ No change</span>
                    )}
                  </p>
                )}
              </div>
              
              <div className="text-sm font-medium text-indigo-600">
                {leader.points.toLocaleString()} pts
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaderboardCard;