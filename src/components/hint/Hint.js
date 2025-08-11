import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './Hint.css';

const FADEIN_ANIMATION_DURATION = 200;

const Hint = React.memo(({ text, duration = 25 }) => {
  const [state, setState] = useState({
    duration: 25,
    text: '',
    shown: false,
  });
  const timerRef = useRef(null);

  // Optimize timer functions with useCallback
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((timerDuration) => {
    if (!isNaN(timerDuration) && timerDuration > 0) {
      timerRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, shown: false }));
        timerRef.current = null;
      }, timerDuration);
    }
  }, []);

  // Optimize text processing with useMemo
  const trimmedText = useMemo(() => text && text.trim(), [text]);

  useEffect(() => {
    // Remove debug console.log in production
    if (process.env.NODE_ENV === 'development') {
      console.debug('Hint.useEffect', { text, duration });
    }

    stopTimer();

    if (trimmedText) {
      const newDuration = duration || 25;
      setState({
        text: trimmedText,
        duration: newDuration,
        shown: true,
      });
      
      // Start timer with optimized calculation
      const timerDuration = newDuration * 1000 + FADEIN_ANIMATION_DURATION;
      startTimer(timerDuration);
    } else {
      setState({
        text: null,
        duration: duration || 25,
        shown: false,
      });
    }

    // Cleanup timer on unmount or dependency change
    return () => stopTimer();
  }, [trimmedText, duration, stopTimer, startTimer]);

  // Memoize className to prevent unnecessary re-renders
  const hintClassName = useMemo(() => state.shown ? 'shown' : '', [state.shown]);

  return (
    <div id="hint" data-testid="hint" className={hintClassName}>
      <div>{state.text}</div>
    </div>
  );
});

Hint.displayName = 'Hint';

export default Hint;
