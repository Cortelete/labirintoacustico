import React from 'react';

const LiveIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg viewBox="0 0 8 8" fill="currentColor" className={className}>
        <circle cx="4" cy="4" r="4"/>
    </svg>
);

export default LiveIcon;
