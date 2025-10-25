import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import config from '../../config';
import './Hint.css';

const FADEIN_ANIMATION_DURATION = 200;

const Hint = React.memo(({ text, duration, mqtt }) => {
  const [state, setState] = useState({
    duration: config.display.hint_duration_default,
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
        // Publish hint expiration event before hiding
        if (mqtt && typeof mqtt.publishEvent === 'function') {
          mqtt.publishEvent('hint_expired', { text: text?.trim() }).subscribe({
            error: (err) => console.error('Failed to publish hint expiration event:', err)
          });
        }
        setState(prev => ({ ...prev, shown: false }));
        timerRef.current = null;
      }, timerDuration);
    }
  }, [text, mqtt]);

  // Optimize text processing with useMemo
  const trimmedText = useMemo(() => text && text.trim(), [text]);

  useEffect(() => {
    // Remove debug console.log in production
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug('Hint.useEffect', { duration });
    }

    stopTimer();

    if (trimmedText) {
      const newDuration = duration || config.display.hint_duration_default;
      const wasShown = state.shown;
      const previousText = state.text;
      
      // Check if this is replacing an existing hint
      if (wasShown && previousText && previousText !== trimmedText) {
        // Publish hint interruption event
        if (mqtt && typeof mqtt.publishEvent === 'function') {
          mqtt.publishEvent('hint_interrupted', { 
            interrupted_text: previousText,
            new_text: trimmedText,
            new_duration: newDuration
          }).subscribe({
            error: (err) => console.error('Failed to publish hint interruption event:', err)
          });
        }
      }
      
      setState({
        text: trimmedText,
        duration: newDuration,
        shown: true,
      });
      
      // Publish hint displayed event
      if (mqtt && typeof mqtt.publishEvent === 'function') {
        mqtt.publishEvent('hint_displayed', { 
          text: trimmedText, 
          duration: newDuration,
          replaced_previous: wasShown && previousText && previousText !== trimmedText
        }).subscribe({
          error: (err) => console.error('Failed to publish hint displayed event:', err)
        });
      }
      
      // Start timer with optimized calculation
      const timerDuration = newDuration * 1000 + FADEIN_ANIMATION_DURATION;
      startTimer(timerDuration);
    } else {
      // Handle hint clearing - if we were showing a hint before, publish clearing event
      const wasShown = state.shown;
      const previousText = state.text;
      
      if (wasShown && previousText) {
        // Publish hint cleared event
        if (mqtt && typeof mqtt.publishEvent === 'function') {
          mqtt.publishEvent('hint_cleared_display', { 
            cleared_text: previousText
          }).subscribe({
            error: (err) => console.error('Failed to publish hint cleared display event:', err)
          });
        }
      }
      
      setState({
        text: null,
        duration: duration || config.display.hint_duration_default,
        shown: false,
      });
    }

    // Cleanup timer on unmount or dependency change
    return () => stopTimer();
  }, [trimmedText, duration, stopTimer, startTimer, mqtt]);

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
