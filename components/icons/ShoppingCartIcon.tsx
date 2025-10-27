
import React from 'react';

const ShoppingCartIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .962-.343 1.087-.835l1.823-6.836a.75.75 0 00-.74-1.018H5.25w.008v.008L4.5 4.508m2.25 9.75h5.378a2.25 2.25 0 012.25 2.25 2.25 2.25 0 01-2.25 2.25H7.5a2.25 2.25 0 01-2.25-2.25 2.25 2.25 0 012.25-2.25z" />
    </svg>
);

export default ShoppingCartIcon;
