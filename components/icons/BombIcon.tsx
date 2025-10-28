
import React from 'react';

const BombIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 5.25a.75.75 0 00-1.06-.02L12 6.5l-1.19-1.27a.75.75 0 00-1.06.02L8.25 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 3.75a2.25 2.25 0 00-2.25-2.25h-1.5A2.25 2.25 0 009 3.75" />
    </svg>
);

export default BombIcon;
