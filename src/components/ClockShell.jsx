/**
 * ClockShell Component
 * 
 * Main orchestrator that:
 * - Loads renderer based on config.type.style
 * - Manages timer state
 * - Handles MQTT commands
 * - Coordinates FadeWrapper and HintOverlay
 */

import React, { useState, useEffect, useRef } from 'react';
import FadeWrapper from './FadeWrapper';
import AnalogClock from './clocks/AnalogClock';
import LedClock from './clocks/LedClock';
import { CountdownTimer } from '../utils/time-service';
import { MQTTClient } from '../utils/mqtt-client';
import './ClockShell.css';

const NAMED_COLORS = new Set([
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
  'orange', 'purple', 'pink', 'gray', 'silver', 'navy', 'teal', 'lime',
]);

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const DEFAULT_DISPLAY_COLORS = {
  backgroundColor: 'white',
  textColor: 'black',
  textAlpha: 1,
  fadeTime: 0,
};

const normalizeColor = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (NAMED_COLORS.has(lower)) return lower;
  if (HEX_COLOR_RE.test(trimmed)) return trimmed;

  return null;
};

const normalizeTextAlpha = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    return null;
  }
  return parsed;
};

const normalizeFadeTime = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
};

const ClockShell = ({ config }) => {
  const [time, setTime] = useState(0);
  const [active, setActive] = useState(false);
  // LED clocks should be visible by default
  const [visible, setVisible] = useState(config.type.style.includes('digit') || config.type.style.includes('led'));
  const [visibilityLevel, setVisibilityLevel] = useState(
    config.type.style.includes('digit') || config.type.style.includes('led') ? 1 : 0
  );
  const [hintText, setHintText] = useState('');
  const [hintDuration, setHintDuration] = useState(15);
  const [displayColors, setDisplayColors] = useState(() => ({ ...DEFAULT_DISPLAY_COLORS }));

  const timerRef = useRef(null);
  const mqttRef = useRef(null);
  const hintTimeoutRef = useRef(null);
  const hintStartedAtRef = useRef(0);
  const hintRemainingMsRef = useRef(0);
  const hintTextRef = useRef('');
  const activeRef = useRef(active);
  const visibleRef = useRef(visible);
  const visibilityLevelRef = useRef(visibilityLevel);
  const timeRef = useRef(time);
  const displayColorsRef = useRef(displayColors);

  const formatMMSS = (totalSeconds) => {
    const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const mm = Math.floor(safeSeconds / 60);
    const ss = safeSeconds % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  const getDerivedClockState = () => {
    if (activeRef.current) return 'running';
    return timeRef.current > 0 ? 'paused' : 'stopped';
  };

  const getVisibilityFadeDurationMs = () => {
    if (config.type.style.includes('digit') || config.type.style.includes('led')) {
      return 600;
    }

    const parsed = Number(config.display.fade_duration_ms);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2000;
  };

  const buildStatePayload = (overrides = {}) => ({
    state: getDerivedClockState(),
    time: timerRef.current ? timerRef.current.formatTime() : formatMMSS(timeRef.current),
    seconds: timerRef.current ? timerRef.current.getTime() : timeRef.current,
    visibility: visibilityLevelRef.current,
    hint: hintTextRef.current,
    ...overrides,
  });

  const publishCommandReceived = (command, data = {}, valid = true) => {
    if (!mqttRef.current) return;
    mqttRef.current.publishEvent('command_received', {
      command,
      valid,
      ...data,
    });
  };

  const clearHintTimer = () => {
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
    hintStartedAtRef.current = 0;
  };

  const startHintTimer = (delayMs) => {
    clearHintTimer();

    if (!Number.isFinite(delayMs) || delayMs <= 0) {
      hintRemainingMsRef.current = 0;
      setHintText('');
      return;
    }

    hintRemainingMsRef.current = delayMs;
    hintStartedAtRef.current = Date.now();
    hintTimeoutRef.current = setTimeout(() => {
      hintTimeoutRef.current = null;
      hintStartedAtRef.current = 0;
      hintRemainingMsRef.current = 0;
      setHintText('');
    }, delayMs);
  };

  const clearHint = () => {
    console.warn('[ClockShell] clearHint()');
    clearHintTimer();
    hintRemainingMsRef.current = 0;
    setHintText('');
  };

  // Cleanup hint timer on unmount.
  useEffect(() => {
    return () => clearHintTimer();
  }, []);

  // Keep a live reference for command handlers invoked from long-lived subscriptions.
  useEffect(() => {
    hintTextRef.current = hintText;
  }, [hintText]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    visibilityLevelRef.current = visibilityLevel;
  }, [visibilityLevel]);

  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  // Track fade transitions and publish transitional visibility values (0.00..1.00).
  useEffect(() => {
    const target = visible ? 1 : 0;
    const start = visibilityLevelRef.current;
    const durationMs = getVisibilityFadeDurationMs();

    if (durationMs <= 0 || start === target) {
      if (start !== target) {
        setVisibilityLevel(target);
        if (mqttRef.current && mqttRef.current.isConnected()) {
          mqttRef.current.publishState({ visibility: target });
        }
      }
      return undefined;
    }

    const startedAt = Date.now();
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const t = Math.min(1, elapsed / durationMs);
      const raw = start + ((target - start) * t);
      const rounded = Math.round(raw * 100) / 100;

      setVisibilityLevel(rounded);
      if (mqttRef.current && mqttRef.current.isConnected()) {
        mqttRef.current.publishState({ visibility: rounded });
      }

      if (t >= 1) {
        clearInterval(intervalId);
      }
    }, 250);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, config.type.style, config.display.fade_duration_ms]);

  useEffect(() => {
    displayColorsRef.current = displayColors;
  }, [displayColors]);

  // Initialize timer
  useEffect(() => {
    const timer = new CountdownTimer(0);

    timer.on('tick', (seconds) => {
      setTime(seconds);

      // Publish state update if MQTT is connected
      if (mqttRef.current && mqttRef.current.isConnected()) {
        mqttRef.current.publishState(buildStatePayload({
          state: 'running',
          time: timer.formatTime(),
          seconds,
        }));
      }
    });

    timer.on('zero', () => {
      setActive(false);
      clearHint();

      if (mqttRef.current && mqttRef.current.isConnected()) {
        mqttRef.current.publishEvent('countdown_complete');
        mqttRef.current.publishState(buildStatePayload({
          state: 'stopped',
          time: '00:00',
          seconds: 0,
        }));
      }
    });

    timerRef.current = timer;

    return () => {
      timer.destroy();
    };
    // Timer lifecycle is intentionally initialized once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize MQTT (if configured)
  useEffect(() => {
    if (!config.mqtt) {
      console.log('[ClockShell] MQTT not configured, running in standalone mode');
      return;
    }

    try {
      const mqtt = new MQTTClient(config);
      mqttRef.current = mqtt;

      mqtt.connect();

      // Subscribe to commands
      const subscription = mqtt.subscribe('commands').subscribe((msg) => {
        try {
          const cmd = JSON.parse(msg.payload);
          console.log('[ClockShell] Received command:', cmd);

          // Handle commands (support Houdini Clock API + legacy)
          if (cmd.command === 'start') {
            if (cmd.time) {
              handleStart(cmd.time);
            } else if (typeof cmd.seconds === 'number') {
              handleSetSeconds(cmd.seconds);
              timerRef.current.start();
              setActive(true);
              setVisible(true);
              publishCommandReceived('start', { seconds: cmd.seconds });
              mqttRef.current.publishState(buildStatePayload({
                state: 'running',
                seconds: cmd.seconds,
                time: formatMMSS(cmd.seconds),
                visibility: 1.0,
              }));
            } else {
              // Start with current time if already set
              timerRef.current.start();
              setActive(true);
              setVisible(true);
              publishCommandReceived('start');
              mqttRef.current.publishState(buildStatePayload({
                state: 'running',
                visibility: 1.0,
              }));
            }
          } else if (cmd.command === 'pause') {
            handlePause();
          } else if (cmd.command === 'stop') {
            handleStop();
          } else if (cmd.command === 'resume') {
            handleResume(cmd);
          } else if (cmd.command === 'setTime') {
            if (cmd.time) {
              handleSetTime(cmd.time);
            } else if (typeof cmd.seconds === 'number') {
              handleSetSeconds(cmd.seconds);
            }
          } else if (cmd.command === 'setSeconds' && typeof cmd.seconds === 'number') {
            handleSetSeconds(cmd.seconds);
          } else if (cmd.command === 'clear') {
            handleClear();
          } else if (cmd.command === 'show' || cmd.command === 'fadeIn') {
            setVisible(true);
            if (mqttRef.current) {
              publishCommandReceived('show');
              mqttRef.current.publishState(buildStatePayload({ visibility: 1.0 }));
            }
          } else if (cmd.command === 'hide' || cmd.command === 'fadeOut' || cmd.command === 'fadeout') {
            clearHint();
            setVisible(false);
            if (mqttRef.current) {
              publishCommandReceived('hide');
              mqttRef.current.publishState(buildStatePayload({ visibility: 0.0 }));
            }
          } else if (cmd.command === 'clearHint') {
            clearHint();
            if (mqttRef.current) {
              publishCommandReceived('clearHint');
              mqttRef.current.publishState(buildStatePayload({ hint: '' }));
            }
          } else if (cmd.command === 'setDisplayColors') {
            handleSetDisplayColors(cmd);
          } else if (cmd.command === 'resetDisplayColors') {
            handleResetDisplayColors();
          } else if (cmd.command === 'hint' && cmd.text) {
            handleHint(cmd.text, cmd.duration);
          } else if (cmd.hint !== undefined) {
            // Legacy format support
            handleHint(cmd.hint, cmd.duration);
          } else {
            const unknownCommand = typeof cmd.command === 'string' ? cmd.command : '(missing command)';
            if (mqttRef.current) {
              mqttRef.current.publishWarning('Unknown command', { command: unknownCommand, payload: cmd });
              publishCommandReceived(unknownCommand, { payload: cmd }, false);
            }
          }
        } catch (error) {
          console.error('[ClockShell] Failed to parse command:', error);
          mqtt.publishWarning('Malformed command', { error: error.message });
          mqtt.publishEvent('command_received', {
            command: '(malformed)',
            valid: false,
            error: error.message,
          });
        }
      });

      return () => {
        subscription.unsubscribe();
        mqtt.disconnect();
      };
    } catch (error) {
      console.error('[ClockShell] MQTT initialization failed:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Publish periodic heartbeat state summary on /state.
  useEffect(() => {
    if (!config.mqtt) return;

    const parsedHeartbeat = Number(config.mqtt.heartbeat_ms);
    const heartbeatMs = Number.isFinite(parsedHeartbeat) && parsedHeartbeat > 0 ? parsedHeartbeat : 5000;

    const intervalId = setInterval(() => {
      if (mqttRef.current && mqttRef.current.isConnected()) {
        mqttRef.current.publishState(buildStatePayload());
      }
    }, heartbeatMs);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.mqtt]);

  // Command handlers
  const handleStart = (timeStr) => {
    try {
      const [mm, ss] = timeStr.split(':').map(Number);
      const seconds = mm * 60 + ss;
      clearHint();

      timerRef.current.setTime(seconds);
      timerRef.current.start();
      setTime(seconds);
      setActive(true);
      setVisible(true);

      if (mqttRef.current) {
        publishCommandReceived('start', { time: timeStr });
        mqttRef.current.publishState(buildStatePayload({
          state: 'running',
          time: timeStr,
          seconds,
          visibility: 1.0,
        }));
      }
    } catch (error) {
      console.error('[ClockShell] Start failed:', error);
      if (mqttRef.current) {
        mqttRef.current.publishWarning('Start command failed', { error: error.message });
      }
    }
  };

  const handlePause = () => {
    if (hintTextRef.current && hintTimeoutRef.current) {
      const elapsedMs = Date.now() - hintStartedAtRef.current;
      hintRemainingMsRef.current = Math.max(0, hintRemainingMsRef.current - elapsedMs);
      clearHintTimer();
    }

    timerRef.current.pause();
    setActive(false);

    if (mqttRef.current) {
      publishCommandReceived('pause');
      mqttRef.current.publishState(buildStatePayload({
        state: 'paused',
        time: timerRef.current.formatTime(),
        seconds: timerRef.current.getTime(),
      }));
    }
  };

  const handleStop = () => {
    clearHint();
    timerRef.current.pause();
    setActive(false);

    if (mqttRef.current) {
      publishCommandReceived('stop');
      mqttRef.current.publishState(buildStatePayload({
        state: 'stopped',
        time: timerRef.current.formatTime(),
        seconds: timerRef.current.getTime(),
      }));
    }
  };

  const handleResume = (cmd = {}) => {
    // If time is provided, set it before resuming
    if (cmd.time) {
      handleSetTime(cmd.time);
    } else if (typeof cmd.seconds === 'number') {
      handleSetSeconds(cmd.seconds);
    }

    if (hintTextRef.current && hintRemainingMsRef.current > 0) {
      startHintTimer(hintRemainingMsRef.current);
    }

    timerRef.current.resume();
    setActive(true);
    setVisible(true); // Ensure clock is visible on resume

    if (mqttRef.current) {
      publishCommandReceived('resume');
      mqttRef.current.publishState(buildStatePayload({
        state: 'running',
        time: timerRef.current.formatTime(),
        seconds: timerRef.current.getTime(),
        visibility: 1.0,
      }));
    }
  };

  const handleSetTime = (timeStr) => {
    try {
      const [mm, ss] = timeStr.split(':').map(Number);
      const seconds = mm * 60 + ss;

      timerRef.current.setTime(seconds);
      setTime(seconds);

      if (mqttRef.current) {
        publishCommandReceived('setTime', { time: timeStr });
        mqttRef.current.publishState(buildStatePayload({
          state: active ? 'running' : 'paused',
          time: timeStr,
          seconds,
        }));
      }
    } catch (error) {
      console.error('[ClockShell] SetTime failed:', error);
      if (mqttRef.current) {
        mqttRef.current.publishWarning('SetTime command failed', { error: error.message });
      }
    }
  };

  // New: set time from seconds number
  const handleSetSeconds = (seconds) => {
    try {
      const mm = Math.floor(seconds / 60);
      const ss = seconds % 60;
      const timeStr = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
      timerRef.current.setTime(seconds);
      setTime(seconds);

      if (mqttRef.current) {
        publishCommandReceived('setTime', { seconds });
        mqttRef.current.publishState(buildStatePayload({
          state: active ? 'running' : 'paused',
          time: timeStr,
          seconds,
        }));
      }
    } catch (error) {
      console.error('[ClockShell] SetSeconds failed:', error);
      if (mqttRef.current) {
        mqttRef.current.publishWarning('SetSeconds command failed', { error: error.message });
      }
    }
  };

  const handleClear = () => {
    clearHint();
    setVisible(false);

    if (mqttRef.current) {
      publishCommandReceived('clear');
      mqttRef.current.publishState(buildStatePayload({
        state: 'hidden',
        time: timerRef.current.formatTime(),
        seconds: timerRef.current.getTime(),
        visibility: 0.0,
        hint: '',
      }));
    }
  };

  const handleHint = (text, duration = 15) => {
    const normalizedText = typeof text === 'string' ? text.trim() : '';
    const parsedDuration = Number(duration);
    const normalizedDuration = Number.isFinite(parsedDuration) && parsedDuration > 0
      ? parsedDuration
      : 15;

    if (!normalizedText) {
      clearHint();
      return;
    }

    setHintDuration(normalizedDuration);
    setHintText(normalizedText);
    startHintTimer(normalizedDuration * 1000);

    if (mqttRef.current) {
      publishCommandReceived('hint', { text: normalizedText, duration: normalizedDuration });
      mqttRef.current.publishEvent('hint_displayed', { text: normalizedText, duration: normalizedDuration });
      mqttRef.current.publishState(buildStatePayload({ hint: normalizedText }));
    }
    console.warn('[ClockShell] handleHint: text=', JSON.stringify(normalizedText), 'duration=', normalizedDuration);
  };

  const handleSetDisplayColors = (cmd = {}) => {
    const base = { ...displayColorsRef.current };

    const updates = {};
    const warnings = [];

    // Default behavior when fadeTime is omitted: instant change.
    updates.fadeTime = 0;

    if (Object.prototype.hasOwnProperty.call(cmd, 'backgroundColor')) {
      const normalizedBackground = normalizeColor(cmd.backgroundColor);
      if (normalizedBackground) {
        updates.backgroundColor = normalizedBackground;
      } else {
        warnings.push(`Invalid backgroundColor: ${JSON.stringify(cmd.backgroundColor)}`);
      }
    }

    if (Object.prototype.hasOwnProperty.call(cmd, 'textColor')) {
      const normalizedTextColor = normalizeColor(cmd.textColor);
      if (normalizedTextColor) {
        updates.textColor = normalizedTextColor;
      } else {
        warnings.push(`Invalid textColor: ${JSON.stringify(cmd.textColor)}`);
      }
    }

    if (Object.prototype.hasOwnProperty.call(cmd, 'textAlpha')) {
      const normalizedAlpha = normalizeTextAlpha(cmd.textAlpha);
      if (normalizedAlpha !== null) {
        updates.textAlpha = normalizedAlpha;
      } else {
        warnings.push(`Invalid textAlpha: ${JSON.stringify(cmd.textAlpha)} (expected 0.0..1.0)`);
      }
    }

    if (Object.prototype.hasOwnProperty.call(cmd, 'fadeTime')) {
      const normalizedFade = normalizeFadeTime(cmd.fadeTime);
      if (normalizedFade !== null) {
        updates.fadeTime = normalizedFade;
      } else {
        warnings.push(`Invalid fadeTime: ${JSON.stringify(cmd.fadeTime)} (expected >= 0 seconds)`);
      }
    }

    if (!Object.keys(updates).length) {
      warnings.push('setDisplayColors command had no valid fields to apply');
    }

    const next = { ...base, ...updates };
    setDisplayColors(next);

    if (mqttRef.current) {
      publishCommandReceived('setDisplayColors');
      mqttRef.current.publishEvent('display_colors_updated', {
        backgroundColor: next.backgroundColor,
        textColor: next.textColor,
        textAlpha: next.textAlpha,
        fadeTime: next.fadeTime,
      });
      warnings.forEach((warning) => mqttRef.current.publishWarning(warning, { command: 'setDisplayColors' }));
      mqttRef.current.publishState(buildStatePayload());
    }
  };

  const handleResetDisplayColors = () => {
    const reset = { ...DEFAULT_DISPLAY_COLORS };
    setDisplayColors(reset);

    if (mqttRef.current) {
      publishCommandReceived('resetDisplayColors');
      mqttRef.current.publishEvent('display_colors_updated', {
        backgroundColor: reset.backgroundColor,
        textColor: reset.textColor,
        textAlpha: reset.textAlpha,
        fadeTime: reset.fadeTime,
        reset: true,
      });
      mqttRef.current.publishState(buildStatePayload());
    }
  };

  // Select renderer based on style
  const rendererMap = {
    'antique-analog-oval-portrait': AnalogClock,
    'simple-4-digit': LedClock,
  };

  const Renderer = rendererMap[config.type.style];

  if (!Renderer) {
    return (
      <div className="clock-shell-error">
        <p>Unknown clock style: {config.type.style}</p>
      </div>
    );
  }

  // Parse hint configuration
  const hintConfig = config.analog ? {
    position: {
      x: Number(config.analog['hint.x'] || 0),
      y: Number(config.analog['hint.y'] || 0),
      width: Number(config.analog['hint.width'] || 'auto'),
      height: Number(config.analog['hint.height'] || 'auto'),
      halign: config.analog['hint.halign'] || 'center',
      valign: config.analog['hint.valign'] || 'middle',
    },
    font: {
      family: config.analog['hint.font.family'] || 'Arial, sans-serif',
      size: Number(config.analog['hint.font.size'] || 24),
      style: config.analog['hint.font.style'] || 'normal',
      color: config.analog['hint.font.color'] || '#ffffff',
      alpha: Number(config.analog['hint.font.alpha'] || 1.0),
    },
  } : null;

  // LED clocks handle their own background, so don't wrap them
  const useFadeWrapper = !config.type.style.includes('digit') && !config.type.style.includes('led');

  return (
    <div className="clock-shell">
      {useFadeWrapper ? (
        <FadeWrapper
          visible={visible}
          duration={config.display.fade_duration_ms}
          backgroundType={config.display.fade_background_type}
          backgroundColor={config.display.fade_background_color}
          backgroundImage={config.display.fade_background_image}
        >
          <Renderer
            config={config}
            time={time}
            hint={hintText}
            hintText={hintText}
            hintDuration={hintDuration}
            hintFont={hintConfig?.font}
            displayColors={displayColors}
            visible={visible}
          />
        </FadeWrapper>
      ) : (
        <Renderer
          config={config}
          time={time}
          hint={hintText}
          hintText={hintText}
          hintDuration={hintDuration}
          hintFont={hintConfig?.font}
          displayColors={displayColors}
          visible={visible}
        />
      )}
    </div>
  );
};

export default ClockShell;
