import React, { useState, useEffect } from 'react';
import { BarChart3, ChevronDown, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type SalesChartProps = {
  isLoading?: boolean;
};

type SalesDataPoint = {
  label: string;
  value: number;
  previousValue?: number;
};

const SalesChart = ({ isLoading = false }: SalesChartProps) => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('This Month');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [salesData, setSalesData] = useState<SalesDataPoint[]>([]);
  const [totalSales, setTotalSales] = useState(0);
  const [salesGrowth, setSalesGrowth] = useState(0);

  const periods = ['Today', 'This Week', 'This Month', 'This Quarter', 'This Year'];

  // Generate realistic sales data based on selected period
  useEffect(() => {
    // In a real app, this would be an API call
    const generateSalesData = () => {
      let data: SalesDataPoint[] = [];
      let total = 0;
      let previousTotal = 0;
      
      if (period === 'This Week') {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const currentValues = [45000, 62000, 78000, 55000, 82000, 67000, 32000];
        const previousValues = [42000, 58000, 68000, 59000, 75000, 60000, 28000];
        
        data = days.map((day, index) => {
          total += currentValues[index];
          previousTotal += previousValues[index];
          return {
            label: day,
            value: currentValues[index],
            previousValue: previousValues[index]
          };
        });
      } else if (period === 'This Month') {
        const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        const currentValues = [185000, 220000, 198000, 240000];
        const previousValues = [175000, 190000, 210000, 205000];
        
        data = weeks.map((week, index) => {
          total += currentValues[index];
          previousTotal += previousValues[index];
          return {
            label: week,
            value: currentValues[index],
            previousValue: previousValues[index]
          };
        });
      } else if (period === 'This Quarter') {
        const months = ['Jan', 'Feb', 'Mar'];
        const currentValues = [780000, 820000, 950000];
        const previousValues = [720000, 790000, 880000];
        
        data = months.map((month, index) => {
          total += currentValues[index];
          previousTotal += previousValues[index];
          return {
            label: month,
            value: currentValues[index],
            previousValue: previousValues[index]
          };
        });
      } else if (period === 'This Year') {
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        const currentValues = [2500000, 2800000, 3100000, 2900000];
        const previousValues = [2300000, 2600000, 2800000, 2700000];
        
        data = quarters.map((quarter, index) => {
          total += currentValues[index];
          previousTotal += previousValues[index];
          return {
            label: quarter,
            value: currentValues[index],
            previousValue: previousValues[index]
          };
        });
      } else { // Today
        const hours = ['9AM', '11AM', '1PM', '3PM', '5PM', '7PM'];
        const currentValues = [12000, 18000, 22000, 15000, 20000, 8000];
        const previousValues = [10000, 16000, 20000, 18000, 17000, 7000];
        
        data = hours.map((hour, index) => {
          total += currentValues[index];
          previousTotal += previousValues[index];
          return {
            label: hour,
            value: currentValues[index],
            previousValue: previousValues[index]
          };
        });
      }
      
      setSalesData(data);
      setTotalSales(total);
      
      // Calculate growth percentage
      const growth = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0;
      setSalesGrowth(parseFloat(growth.toFixed(1)));
    };
    
    generateSalesData();
  }, [period]);

  const maxValue = Math.max(...salesData.map(item => Math.max(item.value, item.previousValue || 0)));
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between mb-4">
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

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-500 mb-1">Total Sales</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl font-semibold text-gray-800">{formatCurrency(totalSales)}</h4>
            <div className={`flex items-center text-sm ${salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {salesGrowth >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{Math.abs(salesGrowth)}%</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 mb-1">vs Previous {period.split(' ')[1]}</p>
          <a href="/analytics" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center justify-end gap-1">
            View detailed report <ArrowRight size={14} />
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse h-64">
          <div className="h-full bg-gray-200 rounded-md"></div>
        </div>
      ) : (
        <div className="h-64">
          <div className="flex h-full items-end gap-2">
            {salesData.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center group">
                <div className="w-full h-full flex items-end justify-center relative">
                  {/* Previous period bar (lighter color) */}
                  {item.previousValue && (
                    <div 
                      className="w-5 bg-indigo-200 rounded-t-sm absolute left-1/2 -ml-6"
                      style={{ height: `${(item.previousValue / maxValue) * 85}%` }}
                      title={`Previous: ${formatCurrency(item.previousValue)}`}
                    ></div>
                  )}
                  
                  {/* Current period bar */}
                  <div 
                    className="w-5 bg-indigo-500 rounded-t-sm absolute left-1/2 -ml-2.5 transition-all duration-500 ease-out"
                    style={{ height: `${(item.value / maxValue) * 85}%` }}
                    title={`Current: ${formatCurrency(item.value)}`}
                  ></div>
                  
                  {/* Hover tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {formatCurrency(item.value)}
                    {item.previousValue && (
                      <span className="text-gray-300 ml-1">
                        ({item.value > (item.previousValue || 0) ? '+' : ''}
                        {(((item.value - (item.previousValue || 0)) / (item.previousValue || 1)) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
                <div className="w-full text-center mt-2 text-xs text-gray-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-4 flex justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-indigo-500 rounded-sm"></div>
          <span>Current {period.split(' ')[1]}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-indigo-200 rounded-sm"></div>
          <span>Previous {period.split(' ')[1]}</span>
        </div>
      </div>
    </div>
  );
};

export default SalesChart;