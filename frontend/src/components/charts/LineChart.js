import React, { useMemo, useState } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ReferenceLine,
} from 'recharts';

// 이동평균 계산 함수
const calculateMovingAverage = (data, dataKey, period) => {
  if (!data || !Array.isArray(data) || data.length <= period) {
    return data;
  }
  
  // 원본 데이터 복사
  const result = JSON.parse(JSON.stringify(data));
  
  // 이동평균 계산
  for (let i = 0; i < result.length; i++) {
    const maKey = `MA${period}_${dataKey}`;
    
    if (i < period - 1) {
      // 이동평균 기간보다 적은 데이터는 null 처리
      result[i][maKey] = null;
    } else {
      // 이동평균 계산
      let sum = 0;
      let validCount = 0;
      
      for (let j = 0; j < period; j++) {
        const value = Number(result[i - j][dataKey] || 0);
        if (!isNaN(value)) {
          sum += value;
          validCount++;
        }
      }
      
      // 유효한 값이 없으면 null, 있으면 평균값
      result[i][maKey] = validCount > 0 ? Math.round(sum / validCount) : null;
    }
  }
  
  return result;
};

const LineChart = ({
  data,
  xDataKey,
  lines = [],
  height = 300,
  formatter = (value) => `${value?.toLocaleString() || 0} 원`,
  animate = true,
  // 추가: 새 props 구현
  connectNulls = true,
  allowDecimals = false,
  fillEmptyValues = false,
  yAxisDomain,
  showMovingAverageOnly = false, // 이동평균만 표시 여부
  chartStyle,
  containerClassName,
  references = [], // 기준선 추가
}) => {
  // Panze 색상 팔레트
  const colors = ['#3498DB', '#FF8C00', '#2ECC71', '#9B59B6', '#E74C3C'];
  
  // 각 라인의 표시여부를 관리하는 상태 추가
  const [visibleLines, setVisibleLines] = useState(() => {
    // 초기 상태: 모든 라인 표시
    const initialState = {};
    lines.forEach(line => {
      // 일반 라인
      initialState[line.dataKey] = true;
      // 이동평균 라인
      if (line.showMovingAverage) {
        initialState[`MA${line.movingAveragePeriod || 15}_${line.dataKey}`] = true;
      }
    });
    return initialState;
  });

  // 데이터 로깅 (디버깅용)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('LineChart data:', data);
      console.log('LineChart lines:', lines);
    }
  }, [data, lines]);
  
  // 상태가 변경될 때 visibleLines 업데이트
  React.useEffect(() => {
    setVisibleLines(prevState => {
      const newState = { ...prevState };
      lines.forEach(line => {
        // 기존에 설정되지 않은 라인은 기본값으로 설정
        if (newState[line.dataKey] === undefined) {
          newState[line.dataKey] = true;
        }
        if (line.showMovingAverage && newState[`MA${line.movingAveragePeriod || 15}_${line.dataKey}`] === undefined) {
          newState[`MA${line.movingAveragePeriod || 15}_${line.dataKey}`] = true;
        }
      });
      return newState;
    });
  }, [lines]);
  
  // 범례 클릭 핸들러 - 개선된 버전
  const handleLegendClick = (dataKey) => {
    setVisibleLines(prevState => ({
      ...prevState,
      [dataKey]: !prevState[dataKey]
    }));
  };
  
  // 이동평균이 적용된 데이터 계산
  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    // 이동평균 적용이 필요한 라인 확인
    const showMovingAverageLines = lines.filter(line => line.showMovingAverage);
    
    if (showMovingAverageLines.length === 0) {
      return data;
    }
    
    console.log('이동평균 계산 시작', { 
      라인개수: showMovingAverageLines.length, 
      데이터개수: data.length 
    });
    
    let resultData = [...data];
    
    // 각 라인별로 이동평균 데이터 추가
    showMovingAverageLines.forEach(line => {
      const period = line.movingAveragePeriod || 15; // 기본값 15일로 변경
      resultData = calculateMovingAverage(resultData, line.dataKey, period);
    });
    
    return resultData;
  }, [data, lines]);

  if (!data || data.length === 0) {
    return (
      <div className={containerClassName}>
        <p className="text-center text-gray-500">데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={processedData}
        margin={chartStyle?.margin || {
          top: 20,
          right: 30,
          left: 30,
          bottom: 20,
        }}
      >
        <defs>
          {lines.map((line, index) => (
            <linearGradient key={`gradient-${line.dataKey}`} id={`gradient-${line.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={line.color || colors[index % colors.length]} stopOpacity={0.2} />
              <stop offset="95%" stopColor={line.color || colors[index % colors.length]} stopOpacity={0} />
            </linearGradient>
          ))}
          {/* 수입(Income) 라인 그라데이션 */}
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3498DB" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#3498DB" stopOpacity={0.05} />
          </linearGradient>
          {/* 지출(Expense) 라인 그라데이션 */}
          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF8C00" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#FF8C00" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
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
          domain={yAxisDomain || ['auto', 'auto']}
          allowDecimals={allowDecimals}
        />
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
          isAnimationActive={false}
        />
        <Legend 
          verticalAlign={chartStyle?.legend?.verticalAlign || "top"} 
          height={36}
          wrapperStyle={{ paddingBottom: '10px' }}
          onClick={(e) => handleLegendClick(e.dataKey)}
          // 개선된 범례 클릭 동작: 범례를 클릭해도 범례 자체는 계속 표시되고,
          // 비활성화된 범례는 투명도를 50%로 낮추고 회색으로 표시됨
          formatter={(value, entry) => {
            const isVisible = visibleLines[entry.dataKey];
            return (
              <span style={{ 
                color: isVisible ? entry.color : '#999', // 비활성화 시 회색으로 변경
                opacity: isVisible ? 1 : 0.5, // 비활성화 시 투명도 50%로 설정
                cursor: 'pointer',
                // 취소선 스타일 제거 - 더 깔끔한 UI
                textDecoration: 'none',
                fontWeight: isVisible ? 'normal' : '300' // 비활성화 시 약간 더 가볍게 표시
              }}>
                {value}
              </span>
            );
          }}
        />

        {lines.map((line, index) => (
          <React.Fragment key={line.dataKey}>
            {/* 원본 데이터 영역 - 이동평균만 표시 모드에서는 숨김 */}
            {!showMovingAverageOnly && visibleLines[line.dataKey] && (
              <Area
                type="monotone"
                dataKey={line.dataKey}
                name={line.name || line.dataKey}
                stroke={line.color || colors[index % colors.length]}
                fillOpacity={1}
                fill={`url(#gradient-${line.dataKey})`}
                strokeWidth={0}
                dot={false}
                isAnimationActive={animate}
                connectNulls={connectNulls} // null 값을 연결할지 여부 
              />
            )}
            
            {/* 원본 데이터 라인 - 이동평균만 표시 모드에서는 숨김 */}
            {!showMovingAverageOnly && visibleLines[line.dataKey] && (
              <Line
                type="monotone"
                dataKey={line.dataKey}
                name={line.name || line.dataKey}
                stroke={line.color || colors[index % colors.length]}
                activeDot={false}
                strokeWidth={2}
                dot={false}
                isAnimationActive={animate}
                connectNulls={connectNulls} // null 값을 연결할지 여부
              />
            )}
            
            {/* 이동평균 라인 추가 */}
            {line.showMovingAverage && visibleLines[`MA${line.movingAveragePeriod || 7}_${line.dataKey}`] && (
              <Line
                type="monotone"
                dataKey={`MA${line.movingAveragePeriod || 15}_${line.dataKey}`}
                name={`${line.name || line.dataKey} ${line.movingAveragePeriod || 15}일 이동평균`}
                stroke={line.color || colors[index % colors.length]}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                isAnimationActive={animate}
                connectNulls={true}
              />
            )}
          </React.Fragment>
        ))}
        
        {/* 기준선 추가 */}
        {references.map((ref, idx) => (
          <ReferenceLine
            key={`ref-${idx}`}
            y={ref.value}
            stroke={ref.stroke || '#000'}
            strokeDasharray={ref.strokeDasharray || '3 3'}
            label={ref.label ? { 
              position: 'topRight', 
              value: ref.label, 
              fill: ref.stroke || '#000', 
              fontSize: 12, 
              fontWeight: 'bold' 
            } : undefined}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
};

export default LineChart;