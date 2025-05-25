import React, { useState } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';

const BarChart = ({ 
  data, 
  xDataKey, 
  barDataKey, 
  barName, 
  barColor = '#3498DB', 
  secondaryDataKey = null,
  secondaryBarName = null,
  secondaryBarColor = '#FF8C00',
  layout = 'vertical', 
  formatter = (value) => `${value.toLocaleString()} 원`,
  title,
  description,
  containerClassName = "shadow-lg rounded-lg p-4 bg-white",
  reference = null,
  references = [],
  tickFormatter,
  height = 300,
  yAxisWidth = 180,
  removeReferenceLabelBackground = false,
}) => {
  const [visibleBars, setVisibleBars] = useState({
    [barDataKey]: true,
    [secondaryDataKey]: true
  });
  
  const allRefs = references.length ? references : reference ? [reference] : [];
  
  if (!data || data.length === 0) {
    return (
      <div className={containerClassName}>
        <p className="text-center text-gray-500">데이터가 없습니다.</p>
      </div>
    );
  }
  
  const handleLegendClick = (dataKey) => {
    setVisibleBars(prevState => ({
      ...prevState,
      [dataKey]: !prevState[dataKey]
    }));
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
        <RechartsBarChart
          data={data}
          layout={layout}
          margin={{
            top: 20,
            right: 30,
            left: layout === 'vertical' ? Math.max(10, yAxisWidth - 100) : 30,
            bottom: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          
          {layout === 'vertical' ? (
            <>
              <XAxis 
                type="number" 
                tickFormatter={(value) => value.toLocaleString()} 
                tick={{ fontSize: 14, fill: '#64748b' }}
                tickLine={{ stroke: '#e2e8f0' }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                dataKey={xDataKey} 
                type="category" 
                width={yAxisWidth} 
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickLine={{ stroke: '#e2e8f0' }}
                axisLine={{ stroke: '#e2e8f0' }}
                interval={0}
                tickFormatter={tickFormatter || (v => v.length > 15 ? v.slice(0,15)+'…' : v)}
              />
            </>
          ) : (
            <>
              <XAxis 
                dataKey={xDataKey} 
                tick={{ fontSize: 14, fill: '#64748b' }}
                tickLine={{ stroke: '#e2e8f0' }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                tickFormatter={(value) => value.toLocaleString()} 
                tick={{ fontSize: 14, fill: '#64748b' }}
                tickLine={{ stroke: '#e2e8f0' }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
            </>
          )}
          
          <Tooltip 
            formatter={formatter}
            labelFormatter={(value) => `${value}`}
            contentStyle={{ 
              backgroundColor: 'white', 
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              padding: '10px'
            }}
          />
          <Legend 
            verticalAlign="top" 
            height={36}
            wrapperStyle={{ paddingBottom: '10px' }}
            onClick={(e) => handleLegendClick(e.dataKey)}
            formatter={(value, entry) => {
              const isVisible = visibleBars[entry.dataKey];
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
          
          <Bar 
            dataKey={barDataKey} 
            fill={barColor}
            name={barName} 
            radius={[4, 4, 0, 0]}
            animationDuration={1000}
            barSize={layout === 'vertical' ? 15 : 30}
            hide={!visibleBars[barDataKey]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill || barColor} />
            ))}
          </Bar>
          
          {secondaryDataKey && (
            <Bar 
              dataKey={secondaryDataKey} 
              fill={secondaryBarColor} 
              name={secondaryBarName || secondaryDataKey} 
              radius={[4, 4, 0, 0]}
              animationDuration={1200}
              barSize={layout === 'vertical' ? 15 : 30}
              hide={!visibleBars[secondaryDataKey]}
            />
          )}
          
          {allRefs.map((ref, idx) => (
            layout === 'horizontal' ? (
              <ReferenceLine
                key={`ref-${idx}`}
                y={ref.value}
                stroke={ref.stroke || '#000'}
                strokeDasharray={ref.strokeDasharray || '3 3'}
                label={ref.label ? (props => {
                  const { viewBox } = props;
                  const x = (viewBox && viewBox.x) || 0;
                  const y = (viewBox && viewBox.y) || 0;
                  const width = 160;
                  const height = 20;
                  let labelY;
                  if (ref.labelPosition === 'bottom') {
                    labelY = y + 2;
                  } else if (ref.labelPosition === 'top') {
                    labelY = y - height - 2;
                  } else if (removeReferenceLabelBackground && allRefs.length > 1) {
                    // 배경 제거 모드에서 여러 기준선이 있을 때 겹침 방지
                    labelY = idx % 2 === 0 ? y - height - 5 : y + 5;
                  } else {
                    labelY = y - height / 2;
                  }
                  const centerX = (viewBox && viewBox.width) ? (x + viewBox.width / 2 - width / 2) : (x - width / 2);
                  return (
                    <foreignObject x={centerX} y={labelY} width={width} height={height} style={{ pointerEvents: 'none' }}>
                      <div style={{
                        background: removeReferenceLabelBackground ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.65)',
                        color: ref.stroke || '#000',
                        padding: '1px 3px',
                        borderRadius: '8px',
                        fontSize: 13,
                        fontWeight: 500,
                        border: 'none',
                        display: 'inline-block',
                        textAlign: 'center',
                      }}>
                        {ref.label}
                      </div>
                    </foreignObject>
                  );
                }) : undefined}
              />
            ) : (
              <ReferenceLine
                key={`ref-${idx}`}
                x={ref.value}
                stroke={ref.stroke || '#000'}
                strokeDasharray={ref.strokeDasharray || '3 3'}
                label={ref.label ? (props => {
                  const { viewBox } = props;
                  const x = (viewBox && viewBox.x) || 0;
                  const y = (viewBox && viewBox.y) || 0;
                  const width = 160;
                  const height = 20;
                  let labelX;
                  if (ref.labelPosition === 'right') {
                    labelX = x + 2;
                  } else {
                    labelX = x - width / 2;
                  }
                  const centerY = (viewBox && viewBox.height) ? (y + viewBox.height / 2 - height / 2) : (y - height / 2);
                  return (
                    <foreignObject x={labelX} y={centerY} width={width} height={height} style={{ pointerEvents: 'none' }}>
                      <div style={{
                        background: removeReferenceLabelBackground ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.65)',
                        color: ref.stroke || '#000',
                        padding: '1px 3px',
                        borderRadius: '8px',
                        fontSize: 13,
                        fontWeight: 500,
                        border: 'none',
                        display: 'inline-block',
                        textAlign: 'center',
                      }}>
                        {ref.label}
                      </div>
                    </foreignObject>
                  );
                }) : undefined}
              />
            )
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarChart;