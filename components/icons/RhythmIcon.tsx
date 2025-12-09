
import React from 'react';

const RhythmIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" opacity="0.3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" opacity="0.5" strokeDasharray="2 2" />
    </svg>
);

export default RhythmIcon;
