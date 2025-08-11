import React, { useState, useEffect, useRef } from 'react';
import './Hint.css';

const FADEIN_ANIMATION_DURATION = 200;

export default function Hint({ text, duration = 25 }) {
    const [state, setState] = useState({
        duration: 25,
        text: '',
        shown: false
    });
    const timerRef = useRef(null);

    const stopTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = null;
    };

    const startTimer = () => {
        const timerDuration = state.duration * 1000 + FADEIN_ANIMATION_DURATION;
        if (!isNaN(timerDuration)) {
            timerRef.current = setTimeout(() => {
                setState(prev => ({ ...prev, shown: false }));
                timerRef.current = null;
            }, timerDuration);
        }
    };

    useEffect(() => {
        console.debug('Hint.useEffect', { text, duration });
        
        stopTimer();
        const trimmedText = text && text.trim();
        
        if (trimmedText) {
            setState({
                text: trimmedText,
                duration: duration || 25,
                shown: true
            });
            // Start timer after state update
            const timerDuration = (duration || 25) * 1000 + FADEIN_ANIMATION_DURATION;
            if (!isNaN(timerDuration)) {
                timerRef.current = setTimeout(() => {
                    setState(prev => ({ ...prev, shown: false }));
                    timerRef.current = null;
                }, timerDuration);
            }
        } else {
            setState({
                text: null,
                duration: duration || 25,
                shown: false
            });
        }

        // Cleanup timer on unmount
        return () => stopTimer();
    }, [text, duration]);

    return (
        <div id="hint" className={state.shown ? 'shown' : ''}>
            <div>{state.text}</div>
        </div>
    );
}