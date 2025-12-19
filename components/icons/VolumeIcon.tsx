
import React from 'react';

interface VolumeIconProps {
  className?: string;
  level?: number; // 0 to 1
}

const VolumeIcon: React.FC<VolumeIconProps> = ({ className = "w-5 h-5", level = 1 }) => {
  if (level === 0) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.5a1.125 1.125 0 0 1-1.125-1.125V9.375A1.125 1.125 0 0 1 4.5 8.25h1.5Z" />
      </svg>
    );
  }
  
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.5a1.125 1.125 0 0 1-1.125-1.125V9.375A1.125 1.125 0 0 1 4.5 8.25h1.5Z" />
    </svg>
  );
};

export default VolumeIcon;
