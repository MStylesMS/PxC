import React, { useRef, useMemo } from 'react';
import config from '../../config';
import './SecondsHand.css';

const SecondsHand = React.memo(({ time, animated, adjusting = false }) => {
  const animationClassIdxRef = useRef(0);

  // Memoize rotation calculation for performance
  const prevRotationRef = useRef(null);

  const rotate = useMemo(() => {
    // Original elliptical mapping for correct visual geometry
    let raw = (Math.PI * 3) / 2 +
      Math.atan2(
        Math.cos((-Math.PI * time) / 30),
        (3 / 5) * Math.sin((-Math.PI * time) / 30)
      );

    if (raw === Math.PI * 2) {
      raw = 0;
    }

    const twoPi = 2 * Math.PI;
    if (prevRotationRef.current == null) {
      prevRotationRef.current = raw;
      return raw;
    }

    // Choose the shortest angular path between previous and new angle.
    // Normalize delta to (-PI, PI] and apply it directly so the hand
    // can move clockwise or counter-clockwise depending on which
    // is shorter (prevents large full-rotation jumps).
    let delta = raw - prevRotationRef.current;
    // Normalize to (-PI, PI]
    delta = ((delta + Math.PI) % twoPi) - Math.PI;
    const adjusted = prevRotationRef.current + delta;
    prevRotationRef.current = adjusted;
    return adjusted;
  }, [time]);

  // Memoize transform string to avoid recalculation
  const transformStyle = useMemo(() => ({
    transform: `translate(0px, calc(85vh / 3 / 2)) rotate(${rotate}rad) translate(0px, calc(-85vh / 3 / 2))`,
    // Feed current angle to CSS for tick keyframes (deg for small deltas)
    '--angle': `${(rotate * 180) / Math.PI}deg`,
    transition: adjusting ? 'transform 800ms ease-out' : undefined,
  }), [rotate, adjusting]);

  // Toggle animation class for tick effect
  animationClassIdxRef.current = !animationClassIdxRef.current & 1;

  // Determine tick style from config
  const tickStyle = (config.display && config.display.seconds_tick_style) || 'alternate';
  let tickClass = '';
  if (animated && !adjusting && tickStyle !== 'off') {
    if (tickStyle === 'alternate') {
      tickClass = `tick-animation-${animationClassIdxRef.current}`;
    } else if (tickStyle === 'tick1') {
      tickClass = 'tick-animation-0';
    } else if (tickStyle === 'tick2') {
      tickClass = 'tick-animation-1';
    }
  }

  return (
    <div className={`ss ${tickClass}`}>
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
