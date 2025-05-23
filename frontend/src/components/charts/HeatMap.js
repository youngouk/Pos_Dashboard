import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';

const HeatMap = ({
  data,
  xAxis,
  yAxis,
  valueKey = 'value',
  height = 300,
  formatter = (value) => `${value.toLocaleString()} 원`,
  title,
  description,
  containerClassName = "shadow-lg rounded-lg p-4 bg-white"
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={containerClassName}>
        {(title || description) && (
          <div className="mb-4">
            {title && <h2 className="text-xl font-bold text-gray-800">{title}</h2>}
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
        )}
        <p className="text-center text-gray-500">데이터가 없습니다.</p>
      </div>
    );
  }
  
  // Define color scale based on values
  const getColorScale = (value, min, max) => {
    // Normalize value between 0 and 1
    const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
    
    // Generate color (blue to red gradient)
    const r = Math.floor(normalized * 255);
    const b = Math.floor((1 - normalized) * 255);
    const g = Math.floor(Math.max(0, 0.7 - Math.abs(normalized - 0.5)) * 255);
    
    return `rgb(${r}, ${g}, ${b})`;
  };
  
  // Find min/max values for color scaling
  const minValue = Math.min(...data.map(item => item[valueKey]));
  const maxValue = Math.max(...data.map(item => item[valueKey]));
  
  // Create custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const { x, y, z } = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-md text-sm">
          <p className="font-semibold">{`${x} × ${y}`}</p>
          <p>{formatter(z)}</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className={containerClassName}>
      {(title || description) && (
        <div className="mb-4">
          {title && <h2 className="text-xl font-bold text-gray-800">{title}</h2>}
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
          <XAxis 
            dataKey="x" 
            type="category" 
            name={xAxis.name} 
            allowDuplicatedCategory={false} 
          />
          <YAxis 
            dataKey="y" 
            type="category" 
            name={yAxis.name} 
            allowDuplicatedCategory={false} 
          />
          <ZAxis 
            dataKey="z" 
            range={[100, 1000]} 
            name="value" 
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter
            data={data.map(item => ({
              x: item[xAxis.key],
              y: item[yAxis.key],
              z: item[valueKey]
            }))}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getColorScale(entry[valueKey], minValue, maxValue)}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HeatMap; 