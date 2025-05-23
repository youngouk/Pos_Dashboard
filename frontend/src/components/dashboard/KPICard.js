import React from 'react';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import DeltaBadge from '../common/DeltaBadge';

const KpiCard = ({
  title,
  value,
  previousValue,
  formatter = (val) => val.toLocaleString(),
  icon,
  trend = 'neutral', // 'up', 'down', or 'neutral'
  trendIsPositive = true, // Whether up trend is positive (green) or negative (red)
  backgroundClass = 'bg-white',
}) => {
  // Calculate percentage change
  const percentChange = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;
  
  // Determine trend icon and color
  let trendIcon = null;
  let trendColor = 'text-gray-500';
  
  if (trend === 'up' || percentChange > 0) {
    trendIcon = <FiArrowUp className="w-4 h-4" />;
    trendColor = trendIsPositive ? 'text-panze-green' : 'text-panze-red';
  } else if (trend === 'down' || percentChange < 0) {
    trendIcon = <FiArrowDown className="w-4 h-4" />;
    trendColor = trendIsPositive ? 'text-panze-red' : 'text-panze-green';
  }
  
  return (
    <div className={`relative ${backgroundClass} rounded-panze shadow-panze p-5 h-full transition-all duration-200 hover:shadow-lg`}>
      {/* 변화율 배지 */}
      {previousValue !== undefined && <DeltaBadge value={percentChange} />}
      <div className="flex items-center mb-3">
        {icon && <div className="mr-2 text-panze-orange">{icon}</div>}
        <p className="text-gray-600 text-sm font-medium">{title}</p>
      </div>
      
      <div className="flex flex-col">
        <p className="text-2xl font-bold text-panze-dark">{formatter(value)}</p>
        
        {previousValue !== undefined && (
          <div className={`text-sm font-medium ${trendColor} flex items-center mt-2`}>
            <span className="mr-1">
              {trendIcon}
            </span>
            <span>
              {Math.abs(percentChange).toFixed(1)}%
            </span>
            <span className="ml-1 text-xs text-gray-500">vs 이전 기간</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KpiCard;