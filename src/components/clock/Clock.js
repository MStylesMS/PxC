import React, { useState, useEffect, useRef } from 'react';
import './Clock.css';
import SecondsHand from "./SecondsHand";
import MinutesHand from "./MinutesHand";

export default function Clock({ active, time: propTime }) {
    const [state, setState] = useState({
        active: active || false,
        time: propTime || { value: 0, updated: new Date().getTime() },
        withMin: (propTime?.value || 0) >= 60
    });
    
    const tickIntervalRef = useRef(null);

    const willTimeChange = (currentTime, currentActive) => {
        if (
            typeof(currentTime) === 'undefined' ||
            currentTime.updated <= state.time.updated
        ) {
            return false;
        }
        let timeChange = (currentTime.value - state.time.value) !== 0;
        if (currentActive) {
            timeChange = Math.abs(currentTime.value - state.time.value) > 1;
        }
        return timeChange;
    };

    const tick = () => {
        setState(prevState => {
            const nextTime = prevState.time.value - 1;
            if (nextTime < 0) {
                // Stop ticking
                if (tickIntervalRef.current) {
                    clearInterval(tickIntervalRef.current);
                    tickIntervalRef.current = null;
                }
                return { ...prevState, active: false };
            } else {
                return {
                    ...prevState,
                    time: { ...prevState.time, value: nextTime }
                };
            }
        });
    };

    const startTicking = () => {
        if (tickIntervalRef.current) {
            return false;
        } else if (state.time.value <= 0) {
            return stopTicking();
        }
        
        tick();
        tickIntervalRef.current = setInterval(() => tick(), 1000);
        setState(prevState => ({ ...prevState, active: true }));
    };

    const stopTicking = () => {
        if (tickIntervalRef.current) {
            clearInterval(tickIntervalRef.current);
            tickIntervalRef.current = null;
        }
        setState(prevState => ({ ...prevState, active: false }));
    };

    // Handle prop changes
    useEffect(() => {
        if (typeof(active) !== 'undefined' && state.active !== active) {
            if (active) {
                startTicking();
            } else {
                stopTicking();
            }
        }
    }, [active]);

    useEffect(() => {
        if (willTimeChange(propTime, state.active)) {
            setState(prevState => ({
                ...prevState,
                time: propTime,
                withMin: propTime.value >= 60
            }));
        }
    }, [propTime]);

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (tickIntervalRef.current) {
                clearInterval(tickIntervalRef.current);
            }
        };
    }, []);

    console.debug('Clock render');
    return (
        <div id="clock">
            <div id="a">
                <div id="b">
                    {state.withMin && <MinutesHand time={state.time.value}/>}
                    <SecondsHand time={state.time.value} animated={state.active}/>
                </div>
            </div>
        </div>
    );
}