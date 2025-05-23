import React, { useState } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label,
} from 'recharts';

const PieChart = ({
  data,
  dataKey,
  nameKey,
  height = 300,
  formatter = (value) => `${value.toLocaleString()} 원`,
  colors = ['#3498DB', '#FF8C00', '#2ECC71', '#9B59B6', '#E74C3C', '#1ABC9C', '#F1C40F', '#34495E'],
  donut = true,
  labelPosition = 'outside',
  showPercent = true,
  showLabelName = true,
  labelFormatter,
  centerLabel,
  tooltipFormatter,
  title,
  description,
  containerClassName = "shadow-lg rounded-lg p-4 bg-white",
}) => {
  // Manage visibility of each slice for dynamic legend control
  const [visibleSlices, setVisibleSlices] = useState(() => {
    const initialState = {};
    if (data && Array.isArray(data)) {
      data.forEach((item, index) => {
        initialState[item[nameKey] || `item-${index}`] = true;
      });
    }
    return initialState;
  });

  // Handle legend clicks to toggle slice visibility
  const handleLegendClick = (entry) => {
    const dataName = entry.payload[nameKey];
    setVisibleSlices(prevState => ({
      ...prevState,
      [dataName]: !prevState[dataName]
    }));
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
    const radius = labelPosition === 'inside'
      ? innerRadius + (outerRadius - innerRadius) * 0.5
      : outerRadius * 1.1;
    
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // Increased font size for clearer labels
    const textFontSize = 14;
    const textColor = labelPosition === 'inside' ? 'white' : colors[index % colors.length];
    const shouldShowLabel = percent > 0.05;
    if (!shouldShowLabel) return null;
    
    if (labelFormatter) {
      return (
        <text
          x={x}
          y={y}
          fill={textColor}
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
          fontSize={textFontSize}
          fontWeight="600"
        >
          {labelFormatter(value, name, { percent })}
        </text>
      );
    }
    
    let labelText = '';
    if (showPercent) {
      labelText += `${(percent * 100).toFixed(0)}%`;
    }
    if (showLabelName && labelText && name) {
      labelText += ` ${name}`;
    } else if (showLabelName && name) {
      labelText = name;
    }
    
    return (
      <text
        x={x}
        y={y}
        fill={textColor}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={textFontSize}
        fontWeight="600"
      >
        {labelText}
      </text>
    );
  };

  // Log data in development mode
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('PieChart data:', data);
    }
  }, [data]);

  return (
    <div className={containerClassName}>
      {(title || description) && (
        <div className="mb-4">
          {title && <h2 className="text-xl font-bold text-gray-800">{title}</h2>}
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <defs>
            {/* Orange gradient for specific status */}
            <linearGradient id="orangeGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFB347" />
              <stop offset="100%" stopColor="#FF8C00" />
            </linearGradient>
            {/* Blue pattern */}
            <pattern id="bluePattern" patternUnits="userSpaceOnUse" width="8" height="8">
              <rect x="0" y="0" width="8" height="8" fill="#3498DB" />
              <circle cx="4" cy="4" r="2" fill="#fff" opacity="0.3" />
            </pattern>
            {/* Gray gradient */}
            <linearGradient id="grayGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e0e0e0" />
              <stop offset="100%" stopColor="#bdbdbd" />
            </linearGradient>
          </defs>
          <Pie
            data={data.filter(item => visibleSlices[item[nameKey]])}
            cx="50%"
            cy="50%"
            labelLine={labelPosition !== 'inside'}
            label={renderCustomizedLabel}
            outerRadius={100}
            innerRadius={donut ? 60 : 0}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
            strokeWidth={donut ? 2 : 1}
            stroke="#fff"
            cornerRadius={5}
            paddingAngle={donut ? 3 : 0}
            isAnimationActive={true}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={
                  entry.name === 'In Progress'
                    ? 'url(#orangeGradient)'
                    : entry.name === 'Completed'
                    ? 'url(#bluePattern)'
                    : 'url(#grayGradient)'
                }
              />
            ))}
            {donut && labelPosition === 'center' && (
              <Label
                position="center"
                content={({ viewBox }) => {
                  const { cx, cy } = viewBox;
                  const total = data
                    .filter(item => visibleSlices[item[nameKey]])
                    .reduce((sum, entry) => sum + entry[dataKey], 0);
                  return (
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fontSize: '18px', fontWeight: 'bold', fill: '#333' }}
                    >
                      {formatter(total)}
                    </text>
                  );
                }}
              />
            )}
          </Pie>
          <Tooltip 
            formatter={tooltipFormatter}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              padding: '10px'
            }}
          />
          <Legend 
            layout="vertical" 
            verticalAlign="middle" 
            align="right" 
            wrapperStyle={{ paddingLeft: '20px' }}
            onClick={(entry) => handleLegendClick(entry)}
            formatter={(value, entry, index) => {
              const isVisible = visibleSlices[entry.payload[nameKey]];
              return (
                <span style={{ 
                  color: isVisible ? entry.color : '#999', 
                  opacity: isVisible ? 1 : 0.5, 
                  cursor: 'pointer',
                  textDecoration: 'none',
                  fontWeight: isVisible ? 'normal' : '300',
                  fontSize: '14px'
                }}>
                  {value}
                </span>
              );
            }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChart;