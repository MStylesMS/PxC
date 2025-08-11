import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './Clock.css';
import SecondsHand from './SecondsHand';
import MinutesHand from './MinutesHand';

const Clock = React.memo(({ active = false, time: propTime }) => {
  // Provide safe defaults for props
  const defaultTime = { value: 0, updated: new Date().getTime() };
  const safeTime = propTime || defaultTime;
  
  const [state, setState] = useState({
    active: active,
    time: safeTime,
    withMin: (safeTime.value || 0) >= 60,
  });

  const tickIntervalRef = useRef(null);

  // Memoize time change detection function
  const willTimeChange = useCallback((currentTime, currentActive) => {
    if (typeof currentTime === 'undefined' || currentTime.updated <= state.time.updated) {
      return false;
    }
    let timeChange = currentTime.value - state.time.value !== 0;
    if (currentActive) {
      timeChange = Math.abs(currentTime.value - state.time.value) > 1;
    }
    return timeChange;
  }, [state.time.updated]);

  // Optimize tick function with useCallback
  const tick = useCallback(() => {
    setState(prevState => {
      const nextTime = prevState.time.value - 1;
      if (nextTime < 0) {
        // Stop ticking
        if (tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
        return { ...prevState, active: false, time: { ...prevState.time, value: 0 } };
      } else {
        return {
          ...prevState,
          time: { ...prevState.time, value: nextTime },
        };
      }
    });
  }, []);

  // Optimize start/stop functions with useCallback
  const startTicking = useCallback(() => {
    if (tickIntervalRef.current) {
      return false;
    } else if (state.time.value <= 0) {
      return stopTicking();
    }

    tick();
    tickIntervalRef.current = setInterval(() => tick(), 1000);
    setState(prevState => ({ ...prevState, active: true }));
  }, [state.time.value, tick]);

  const stopTicking = useCallback(() => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    setState(prevState => ({ ...prevState, active: false }));
  }, []);

  // Handle prop changes with dependency optimization
  useEffect(() => {
    if (typeof active !== 'undefined' && state.active !== active) {
      if (active) {
        startTicking();
      } else {
        stopTicking();
      }
    }
  }, [active, state.active, startTicking, stopTicking]);

  // Ensure ticking starts on initial mount if active is true
  useEffect(() => {
    if (active) {
      startTicking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (willTimeChange(propTime, state.active)) {
      setState(prevState => ({
        ...prevState,
        time: propTime,
        withMin: propTime.value >= 60,
      }));
    }
  }, [propTime, state.active, willTimeChange]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  }, []);

  // Memoize className to prevent unnecessary re-renders
  const clockClassName = useMemo(() => state.active ? 'active' : 'inactive', [state.active]);

  // Remove debug console.log in production
  if (process.env.NODE_ENV === 'development') {
    console.debug('Clock render');
  }

  return (
    <div id="clock" data-testid="clock" className={clockClassName}>
      <div id="a">
        <div id="b">
          {state.withMin && <MinutesHand time={state.time.value} />}
          <SecondsHand time={state.time.value} animated={state.active} />
        </div>
      </div>
    </div>
  );
});

Clock.displayName = 'Clock';

export default Clock;
