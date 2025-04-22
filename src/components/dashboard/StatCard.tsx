import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  isLoading?: boolean;
};

const StatCard = ({
  title,
  value,
  change,
  icon,
  iconBg,
  iconColor,
  isLoading = false,
}: StatCardProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-200 hover:shadow-md">
      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-300 rounded w-1/3 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
            <div className={`p-2 rounded-lg ${iconBg}`}>
              <span className={iconColor}>{icon}</span>
            </div>
          </div>
          <div className="flex items-end">
            <span className="text-2xl font-semibold text-gray-900">{value}</span>
          </div>
          {change !== undefined && (
            <div className="mt-2 flex items-center">
              {change > 0 ? (
                <span className="flex items-center text-green-600 text-xs font-medium">
                  <ArrowUp size={14} className="mr-1" />
                  {Math.abs(change)}%
                </span>
              ) : change < 0 ? (
                <span className="flex items-center text-red-600 text-xs font-medium">
                  <ArrowDown size={14} className="mr-1" />
                  {Math.abs(change)}%
                </span>
              ) : (
                <span className="text-gray-500 text-xs font-medium">No change</span>
              )}
              <span className="text-gray-500 text-xs ml-1">vs last period</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StatCard;