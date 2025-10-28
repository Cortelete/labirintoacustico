import React from 'react';

const STAR_COUNT = 70;

const Stars: React.FC = () => {
    const stars = React.useMemo(() => {
        return Array.from({ length: STAR_COUNT }).map((_, i) => {
            const size = Math.random() * 2 + 1; // 1px to 3px
            return {
                id: i,
                style: {
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    animationDuration: `${Math.random() * 3 + 4}s`, // 4s to 7s
                    animationDelay: `${Math.random() * 5}s`,
                },
            };
        });
    }, []);

    return (
        <div className="fixed top-0 left-0 w-full h-full" aria-hidden="true">
            {stars.map(star => (
                <div key={star.id} className="star" style={star.style} />
            ))}
        </div>
    );
};

export default Stars;
