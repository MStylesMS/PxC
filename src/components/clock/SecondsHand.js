import React, { useRef, useMemo } from 'react';
import './SecondsHand.css';

const SecondsHand = React.memo(({ time, animated }) => {
  const animationClassIdxRef = useRef(0);

  // Memoize rotation calculation for performance
  const rotate = useMemo(() => {
    let rotation =
      (Math.PI * 3) / 2 +
      Math.atan2(Math.cos((-Math.PI * time) / 30), (3 / 5) * Math.sin((-Math.PI * time) / 30));
    
    if (rotation === Math.PI * 2) {
      rotation = 0;
    }
    
    return rotation;
  }, [time]);

  // Memoize transform string to avoid recalculation
  const transformStyle = useMemo(() => ({
    transform: `translate(0px, calc(85vh / 3 / 2)) rotate(${rotate}rad) translate(0px, calc(-85vh / 3 / 2))`,
    transition: 'all 1s',
  }), [rotate]);

  // Toggle animation class for tick effect
  animationClassIdxRef.current = !animationClassIdxRef.current & 1;

  return (
    <div className={`ss ${animated ? `tick-animation-${animationClassIdxRef.current}` : ''}`}>
      <div
        className="s"
        style={transformStyle}
        data-testid="seconds-hand"
      />
    </div>
  );
});

SecondsHand.displayName = 'SecondsHand';

export default SecondsHand;
