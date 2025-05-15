import React, { useState } from 'react';
import { Trophy, Plus, Users, Calendar, Target, Award, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Contest {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  goal: string;
  goalType: string;
  targetValue: number;
  progress: number;
  participants: number;
  status: 'upcoming' | 'active' | 'completed';
  reward: string;
}

interface ContestManagementProps {
  contests: Contest[];
  onCreateContest: () => void;
}

const ContestManagement: React.FC<ContestManagementProps> = ({ contests, onCreateContest }) => {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'active' | 'completed'>('all');

  const filteredContests = contests.filter(contest => {
    if (filter === 'all') return true;
    return contest.status === filter;
  });

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

  const getGoalTypeIcon = (type: string) => {
    switch (type) {
      case 'sales_amount':
        return <Target className="h-4 w-4" />;
      case 'sales_count':
        return <Users className="h-4 w-4" />;
      case 'new_customers':
        return <UserPlus className="h-4 w-4" />;
      default:
        return <Trophy className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-800">Contest Management</h2>
        </div>
        <button
          onClick={onCreateContest}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Contest
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['all', 'upcoming', 'active', 'completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${filter === tab
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Contest List */}
      <div className="space-y-4">
        {filteredContests.map((contest) => (
          <div
            key={contest.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-lg font-medium text-gray-900">{contest.title}</h3>
                <p className="text-sm text-gray-500">{contest.description}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contest.status)}`}>
                {contest.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(contest.startDate).toLocaleDateString()} - {new Date(contest.endDate).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                {getGoalTypeIcon(contest.goalType)}
                <span>
                  {contest.goalType.replace('_', ' ')}: {contest.targetValue}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{contest.participants} participants</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Award className="h-4 w-4" />
                <span>{contest.reward}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{contest.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: `${contest.progress}%` }}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Link
                to={`/contests/${contest.id}`}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                View Details
              </Link>
              <Link
                to={`/contests/${contest.id}/edit`}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Edit Contest
              </Link>
            </div>
          </div>
        ))}

        {filteredContests.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No contests found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new contest.
            </p>
            <div className="mt-6">
              <button
                onClick={onCreateContest}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Contest
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestManagement; 