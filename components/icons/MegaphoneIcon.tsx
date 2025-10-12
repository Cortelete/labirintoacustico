import React from 'react';

const MegaphoneIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 3.34a1.5 1.5 0 011.32 0l6.36 3.69a1.5 1.5 0 010 2.62l-6.36 3.69a1.5 1.5 0 01-2.64-1.31V4.65a1.5 1.5 0 011.32-1.31zM19.5 7.5v9a1.5 1.5 0 01-1.5 1.5h-5.25a1.5 1.5 0 01-1.5-1.5v-2.25a1.5 1.5 0 011.5-1.5h3a.75.75 0 00.75-.75V9a.75.75 0 00-.75-.75h-3a1.5 1.5 0 01-1.5-1.5V4.5a1.5 1.5 0 011.5-1.5h5.25a1.5 1.5 0 011.5 1.5z" />
    </svg>
);

export default MegaphoneIcon;
