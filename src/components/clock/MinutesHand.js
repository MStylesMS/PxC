import React, { useMemo } from 'react';
import './MinutesHand.css';

const MinutesHand = React.memo(({ time }) => {
  // Memoize rotation calculation for performance
  const rotate = useMemo(() => {
    return Math.PI * (3 / 2) +
           Math.atan2(Math.cos((-Math.PI * time) / 1800), (3 / 5) * Math.sin((-Math.PI * time) / 1800));
  }, [time]);

  // Memoize transform style to avoid recalculation
  const transformStyle = useMemo(() => ({
    transform: `translate(0px, calc(85vh / 2.5 / 2)) rotate(${rotate}rad) translate(0px, calc(-85vh / 2.5 / 2))`,
  }), [rotate]);

  return (
    <div className="mm">
      <div
        className="m"
        style={transformStyle}
        data-testid="minutes-hand"
      />
    </div>
  );
});

MinutesHand.displayName = 'MinutesHand';

export default MinutesHand;
