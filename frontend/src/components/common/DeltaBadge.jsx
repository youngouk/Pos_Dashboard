import React from 'react';

const DeltaBadge = ({ value }) => {
  const isPositive = value >= 0;
  const arrow = isPositive ? '▲' : '▼';
  const absValue = Math.abs(value).toFixed(1);
  const bgClass = isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

  return (
    <span
      role="status"
      aria-label={`변화율 ${isPositive ? '증가' : '감소'} ${absValue}%`}
      className={`absolute right-4 top-4 inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${bgClass}`}
    >
      {arrow} {absValue}%
    </span>
  );
};

export default DeltaBadge; 