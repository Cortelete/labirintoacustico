
import React from 'react';

const GuitarIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V7.5A2.25 2.25 0 0013.5 6h-3a2.25 2.25 0 00-2.25 2.25v1.5m1.5 6.331A2.25 2.25 0 119 15a2.25 2.25 0 011.5 2.081z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V6.236a2.25 2.25 0 011.013-1.925l1.02- .51a2.25 2.25 0 012.44 0l1.02.51A2.25 2.25 0 0117.25 6.236V9" />
    </svg>
);

export default GuitarIcon;