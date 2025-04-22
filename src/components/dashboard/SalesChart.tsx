import React from 'react';
import { BarChart3, ChevronDown } from 'lucide-react';

// Note: In a real app, you would use a charting library like Chart.js or Recharts
// We're creating a simple visual representation for the mockup

type SalesChartProps = {
  isLoading?: boolean;
};

const SalesChart = ({ isLoading = false }: SalesChartProps) => {
  const [period, setPeriod] = React.useState('This Month');
  const [showPeriodDropdown, setShowPeriodDropdown] = React.useState(false);

  const periods = ['Today', 'This Week', 'This Month', 'This Quarter', 'This Year'];

  // Mock data
  const data = React.useMemo(() => {
    return [
      { day: 'Mon', value: 45 },
      { day: 'Tue', value: 60 },
      { day: 'Wed', value: 75 },
      { day: 'Thu', value: 55 },
      { day: 'Fri', value: 80 },
      { day: 'Sat', value: 65 },
      { day: 'Sun', value: 30 },
    ];
  }, []);

  const maxValue = Math.max(...data.map(item => item.value));
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-indigo-600" size={20} />
          <h3 className="text-gray-800 font-medium">Sales Overview</h3>
        </div>
        
        <div className="relative">
          <button
            className="text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md flex items-center gap-1"
            onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
          >
            {period}
            <ChevronDown size={16} />
          </button>
          
          {showPeriodDropdown && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              {periods.map((p) => (
                <button
                  key={p}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    setPeriod(p);
                    setShowPeriodDropdown(false);
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse h-64">
          <div className="h-full bg-gray-200 rounded-md"></div>
        </div>
      ) : (
        <div className="h-64">
          <div className="flex h-full items-end gap-4">
            {data.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-indigo-100 rounded-t-md relative"
                  style={{ height: `${(item.value / maxValue) * 80}%` }}
                >
                  <div 
                    className="absolute inset-0 bg-indigo-500 opacity-60 rounded-t-md"
                    style={{ 
                      height: `${item.value}%`,
                      maxHeight: '100%',
                      transition: 'height 1s ease-out'
                    }}
                  ></div>
                </div>
                <div className="w-full text-center mt-2 text-xs text-gray-500">{item.day}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesChart;