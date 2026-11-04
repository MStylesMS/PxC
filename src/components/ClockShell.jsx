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
import AnalogClock from './clocks/AnalogClock';
import LedClock from './clocks/LedClock';
import LayoutStage from './LayoutStage';
import { CountdownTimer } from '../utils/time-service';
import { MQTTClient } from '../utils/mqtt-client';
import {
  assertKnownLayout,
  buildFieldState,
  normalizeVolume,
  safeAssetName,
  SET_LAYOUT_RESERVED,
  SET_MESSAGE_RESERVED,
} from '../utils/layout-runtime';
import {
  applyPackNavigation,
  lookupPackUrl,
  parseRefresh,
  persistMediaId,
  readStoredMediaId,
  resolvePackNavigation,
  sanitizeMediaId,
} from '../utils/media-pack';
import './ClockShell.css';

const NAMED_COLORS = new Set([
  'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
  'orange', 'purple', 'pink', 'gray', 'silver', 'navy', 'teal', 'lime',
]);

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
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
  const getDefaultFadeDurationMs = () => {
    const configuredDuration = Number(config?.display?.fade_duration_ms);
    return Number.isFinite(configuredDuration) && configuredDuration >= 0
      ? configuredDuration
      : 0;
  };

  const resolveCommandFadeDurationMs = (cmd = {}) => {
    const hasDuration = Object.prototype.hasOwnProperty.call(cmd, 'duration');
    const hasFadeTime = Object.prototype.hasOwnProperty.call(cmd, 'fadeTime');

    if (!hasDuration && !hasFadeTime) {
      return getDefaultFadeDurationMs();
    }

    const rawDuration = hasDuration ? cmd.duration : cmd.fadeTime;
    const parsedDurationSeconds = Number(rawDuration);
    if (!Number.isFinite(parsedDurationSeconds) || parsedDurationSeconds < 0) {
      return getDefaultFadeDurationMs();
    }

    return parsedDurationSeconds * 1000;
  };

  const [time, setTime] = useState(0);
  const [active, setActive] = useState(false);
  // LED clocks should be visible by default; safe fallback if config missing
  const [visible, setVisible] = useState(() => {
    if (!config || !config.type || !config.type.style) return false;
    return config.type.style.includes('digit') || config.type.style.includes('led');
  });
  const [fadeDurationMs, setFadeDurationMs] = useState(() => getDefaultFadeDurationMs());
  const [hintText, setHintText] = useState('');
  const [hintDuration, setHintDuration] = useState(15);
  const [displayColors, setDisplayColors] = useState(() => ({ ...DEFAULT_DISPLAY_COLORS }));
  const layoutsConfig = config && config.layouts && config.layouts.layouts ? config.layouts : null;
  const [activeLayout, setActiveLayout] = useState(() => (layoutsConfig ? layoutsConfig.default : null));
  const [fieldOverrides, setFieldOverrides] = useState({});
  const [imageOverride, setImageOverride] = useState(null);
  const [layoutVolume, setLayoutVolume] = useState(null);
  const [fieldOpacity, setFieldOpacity] = useState({});
  const [fieldFadeMs, setFieldFadeMs] = useState({});
  const [veilColor, setVeilColor] = useState(() => {
    if (!config || !config.display) return '#000000';
    return config.display.fade_color || config.display.fade_background_color || '#000000';
  });

  const timerRef = useRef(null);
  const mqttRef = useRef(null);
  const hintTimeoutRef = useRef(null);
  const hintStartedAtRef = useRef(0);
  const hintRemainingMsRef = useRef(0);
  const hintTextRef = useRef('');
  const displayColorsRef = useRef(displayColors);
  const activeRef = useRef(active);
  const visibleRef = useRef(visible);
  const mediaIdRef = useRef(readStoredMediaId());
  const activeLayoutRef = useRef(activeLayout);
  const fieldOverridesRef = useRef(fieldOverrides);
  const imageOverrideRef = useRef(imageOverride);
  const layoutVolumeRef = useRef(layoutVolume);
  const fieldOpacityRef = useRef(fieldOpacity);
  const layoutsConfigRef = useRef(layoutsConfig);
  const hintClearTimerRef = useRef(null);

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
    hintTextRef.current = '';
  };

  const cancelScheduledHintClear = () => {
    if (hintClearTimerRef.current) {
      clearTimeout(hintClearTimerRef.current);
      hintClearTimerRef.current = null;
    }
  };

  const scheduleHintClear = (delayMs) => {
    cancelScheduledHintClear();
    if (!delayMs || delayMs <= 0) {
      clearHint();
      return;
    }
    hintClearTimerRef.current = setTimeout(() => {
      hintClearTimerRef.current = null;
      clearHint();
    }, delayMs);
  };

  const requireLayouts = (cmd) => {
    if (!layoutsConfigRef.current) {
      rejectCommand('layouts_not_configured', cmd);
      return false;
    }
    return true;
  };

  const isAcceptableColor = (value) => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (NAMED_COLORS.has(trimmed.toLowerCase())) return true;
    return HEX_COLOR_RE.test(trimmed);
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
    displayColorsRef.current = displayColors;
  }, [displayColors]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    activeLayoutRef.current = activeLayout;
    fieldOverridesRef.current = fieldOverrides;
    imageOverrideRef.current = imageOverride;
    layoutVolumeRef.current = layoutVolume;
    fieldOpacityRef.current = fieldOpacity;
    layoutsConfigRef.current = layoutsConfig;
  }, [activeLayout, fieldOverrides, imageOverride, layoutVolume, fieldOpacity, layoutsConfig]);

  useEffect(() => {
    setFadeDurationMs(getDefaultFadeDurationMs());
    // The configured fade duration is static for a generated clock config.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const buildStatePayload = (overrides = {}) => {
    const seconds = timerRef.current ? timerRef.current.getTime() : 0;
    const formattedTime = timerRef.current ? timerRef.current.formatTime() : '00:00';

    let derivedState = 'stopped';
    if (activeRef.current) {
      derivedState = 'running';
    } else if (seconds > 0) {
      derivedState = 'paused';
    }

    const payload = {
      state: derivedState,
      time: formattedTime,
      seconds,
      visible: visibleRef.current,
      ...overrides,
    };

    // Omit mediaId when unset so old UIs see today's payload.
    if (mediaIdRef.current != null && !Object.prototype.hasOwnProperty.call(overrides, 'mediaId')) {
      payload.mediaId = mediaIdRef.current;
    } else if (Object.prototype.hasOwnProperty.call(overrides, 'mediaId') && overrides.mediaId == null) {
      delete payload.mediaId;
    }

    const layoutsNow = layoutsConfigRef.current;
    const layoutName = activeLayoutRef.current;
    if (layoutsNow && layoutName && layoutsNow.layouts[layoutName]) {
      const layout = layoutsNow.layouts[layoutName];
      payload.layout = layoutName;
      payload.fields = buildFieldState(layout, {
        timeText: formattedTime,
        hintText: hintTextRef.current,
        overrides: fieldOverridesRef.current,
        opacity: fieldOpacityRef.current,
      });
      if (layout.backgroundVideo) {
        payload.volume = layoutVolumeRef.current != null ? layoutVolumeRef.current : layout.volume;
      }
    }

    return payload;
  };

  const publishCurrentState = (overrides = {}) => {
    if (mqttRef.current && mqttRef.current.isConnected()) {
      mqttRef.current.publishState(buildStatePayload(overrides));
    }
  };

  const rejectCommand = (reason, cmd = {}, details = {}) => {
    if (!mqttRef.current) {
      return;
    }

    mqttRef.current.publishEvent('command_rejected', {
      command: typeof cmd.command === 'string' ? cmd.command : null,
      reason,
      ...details,
    });

    mqttRef.current.publishWarning('Command rejected', {
      command: typeof cmd.command === 'string' ? cmd.command : null,
      reason,
      ...details,
    });
  };

  /**
   * Apply switchMedia. Does not prefix media_dir — loads a prebuilt pack URL.
   * @returns {{ accepted: boolean, navigated: boolean }}
   */
  const applySwitchMedia = (cmd = {}, { allowClear = true } = {}) => {
    if (!Object.prototype.hasOwnProperty.call(cmd, 'mediaId')) {
      rejectCommand('invalid_parameter', cmd, { required: 'mediaId' });
      return { accepted: false, navigated: false };
    }

    if (!allowClear && (cmd.mediaId === null || cmd.mediaId === '')) {
      return { accepted: true, navigated: false };
    }

    const parsed = sanitizeMediaId(cmd.mediaId);
    if (!parsed.ok) {
      rejectCommand('invalid_parameter', cmd, { field: 'mediaId' });
      return { accepted: false, navigated: false };
    }

    const refresh = parseRefresh(cmd.refresh);
    const previousId = mediaIdRef.current;
    const nextId = parsed.mediaId;
    const url = lookupPackUrl(config.media, nextId);
    const navigation = resolvePackNavigation({
      currentId: previousId,
      nextId,
      refresh,
      url,
    });

    mediaIdRef.current = nextId;
    persistMediaId(nextId);

    const refreshed = refresh && navigation !== 'none' ? ['bundle'] : [];

    if (mqttRef.current) {
      mqttRef.current.publishEvent('command_received', { command: 'switchMedia' });
      mqttRef.current.publishEvent('mediaSwitched', {
        mediaId: nextId,
        refresh,
        refreshed,
      });

      if (!url && nextId != null) {
        mqttRef.current.publishWarning(
          'No pack URL configured for this mediaId. Rooms must build one site per pack and set [media.N] url in the clock INI. PxC does not prefix a media_dir.',
          { command: 'switchMedia', mediaId: nextId }
        );
      }

      const stateOverrides = {};
      if (nextId == null) {
        stateOverrides.mediaId = null;
      }
      publishCurrentState(stateOverrides);
    }

    applyPackNavigation(navigation, url);
    return { accepted: true, navigated: navigation !== 'none' };
  };

  // Initialize timer
  useEffect(() => {
    const timer = new CountdownTimer(0);

    timer.on('tick', (seconds) => {
      setTime(seconds);

      // Publish state update if MQTT is connected
      if (mqttRef.current && mqttRef.current.isConnected()) {
        publishCurrentState({
          state: 'running',
          time: timer.formatTime(),
          seconds,
        });
      }
    });

    timer.on('zero', () => {
      setActive(false);
      clearHint();

      if (mqttRef.current && mqttRef.current.isConnected()) {
        mqttRef.current.publishEvent('countdown_complete');
        publishCurrentState({
          state: 'stopped',
          time: '00:00',
          seconds: 0,
        });
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

          if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd)) {
            rejectCommand('invalid_format', {}, { payload: msg.payload });
            return;
          }

          console.log('[ClockShell] Received command:', cmd);

          if (cmd.hint !== undefined && cmd.command === undefined) {
            // Legacy format support
            handleHint(cmd.hint, cmd.duration);
            return;
          }

          if (typeof cmd.command !== 'string' || !cmd.command.trim()) {
            rejectCommand('invalid_format', cmd, { payload: msg.payload });
            return;
          }

          switch (cmd.command) {
            case 'switchMedia': {
              applySwitchMedia(cmd);
              break;
            }
            case 'start':
              if (Object.prototype.hasOwnProperty.call(cmd, 'mediaId')) {
                const switched = applySwitchMedia(cmd, { allowClear: false });
                if (!switched.accepted || switched.navigated) {
                  break;
                }
              }
              if (cmd.time) {
                handleStart(cmd.time);
              } else if (typeof cmd.seconds === 'number') {
                handleSetSeconds(cmd.seconds);
                setFadeDurationMs(getDefaultFadeDurationMs());
                timerRef.current.start();
                setActive(true);
                setVisible(true);
                if (mqttRef.current) {
                  mqttRef.current.publishEvent('command_received', { command: 'start', seconds: cmd.seconds });
                  publishCurrentState({ state: 'running', visible: true });
                }
              } else {
                setFadeDurationMs(getDefaultFadeDurationMs());
                timerRef.current.start();
                setActive(true);
                setVisible(true);
                if (mqttRef.current) {
                  mqttRef.current.publishEvent('command_received', { command: 'start' });
                  publishCurrentState({ state: 'running', visible: true });
                }
              }
              break;
            case 'pause':
              handlePause();
              break;
            case 'stop':
              handleStop();
              break;
            case 'resume':
              handleResume(cmd);
              break;
            case 'setTime':
              if (cmd.time) {
                handleSetTime(cmd.time);
              } else if (typeof cmd.seconds === 'number') {
                handleSetSeconds(cmd.seconds);
              } else {
                rejectCommand('invalid_parameter', cmd, { required: 'time or seconds' });
              }
              break;
            case 'setSeconds':
              if (typeof cmd.seconds === 'number') {
                handleSetSeconds(cmd.seconds);
              } else {
                rejectCommand('invalid_parameter', cmd, { required: 'seconds' });
              }
              break;
            case 'clear':
              handleClear();
              break;
            case 'show':
            case 'hide':
            case 'fadeIn':
            case 'fadeOut':
              handleVisibility(cmd);
              break;
            case 'setLayout':
              handleSetLayout(cmd);
              break;
            case 'setMessage':
              handleSetMessage(cmd);
              break;
            case 'setImage':
              handleSetImage(cmd);
              break;
            case 'setVolume':
              handleSetVolume(cmd);
              break;
            case 'getState':
              if (mqttRef.current) {
                mqttRef.current.publishEvent('command_received', { command: 'getState' });
              }
              publishCurrentState();
              break;
            case 'clearHint':
              clearHint();
              if (mqttRef.current) {
                mqttRef.current.publishEvent('command_received', { command: 'clearHint' });
              }
              break;
            case 'setDisplayColors':
              handleSetDisplayColors(cmd);
              break;
            case 'resetDisplayColors':
              handleResetDisplayColors();
              break;
            case 'hint':
              if (cmd.text) {
                handleHint(cmd.text, cmd.duration, cmd.fadeTime);
              } else {
                rejectCommand('invalid_parameter', cmd, { required: 'text' });
              }
              break;
            default:
              rejectCommand('unknown_command', cmd);
              break;
          }
        } catch (error) {
          console.error('[ClockShell] Failed to parse command:', error);
          rejectCommand('invalid_format', {}, { payload: msg.payload, error: error.message });
          mqtt.publishWarning('Malformed command', { error: error.message });
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
      setFadeDurationMs(getDefaultFadeDurationMs());
      setVisible(true);

      if (mqttRef.current) {
        mqttRef.current.publishEvent('command_received', { command: 'start', time: timeStr });
        publishCurrentState({ state: 'running', time: timeStr, seconds, visible: true });
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
      mqttRef.current.publishEvent('command_received', { command: 'pause' });
      publishCurrentState({ state: 'paused' });
    }
  };

  const handleStop = () => {
    clearHint();
    timerRef.current.pause();
    setActive(false);

    if (mqttRef.current) {
      mqttRef.current.publishEvent('command_received', { command: 'stop' });
      publishCurrentState({ state: 'stopped' });
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
    setFadeDurationMs(getDefaultFadeDurationMs());
    setVisible(true); // Ensure clock is visible on resume

    if (mqttRef.current) {
      mqttRef.current.publishEvent('command_received', { command: 'resume' });
      publishCurrentState({ state: 'running', visible: true });
    }
  };

  const handleSetTime = (timeStr) => {
    try {
      const [mm, ss] = timeStr.split(':').map(Number);
      const seconds = mm * 60 + ss;

      timerRef.current.setTime(seconds);
      setTime(seconds);

      if (mqttRef.current) {
        mqttRef.current.publishEvent('command_received', { command: 'setTime', time: timeStr });
        publishCurrentState({
          state: activeRef.current ? 'running' : 'paused',
          time: timeStr,
          seconds,
        });
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
        mqttRef.current.publishEvent('command_received', { command: 'setSeconds', seconds });
        publishCurrentState({
          state: activeRef.current ? 'running' : 'paused',
          time: timeStr,
          seconds,
        });
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
    setFadeDurationMs(getDefaultFadeDurationMs());
    setVisible(false);

    if (mqttRef.current) {
      mqttRef.current.publishEvent('command_received', { command: 'clear' });
      publishCurrentState({ state: 'hidden', visible: false });
    }
  };

  const handleHint = (text, duration = 15, fadeTime) => {
    const layout = layoutsConfigRef.current
      && layoutsConfigRef.current.layouts[activeLayoutRef.current];
    if (layout && !layout.fields.hint) {
      rejectCommand('unknown_field', { command: 'hint' }, { field: 'hint' });
      return;
    }

    const normalizedText = typeof text === 'string' ? text.trim() : '';
    const parsedDuration = Number(duration);
    const normalizedDuration = Number.isFinite(parsedDuration) && parsedDuration > 0
      ? parsedDuration
      : 15;

    if (!normalizedText) {
      clearHint();
      return;
    }

    const fadeMs = fadeTime == null || fadeTime === ''
      ? 0
      : resolveCommandFadeDurationMs({ fadeTime });
    if (layout) {
      fieldOpacityRef.current = { ...fieldOpacityRef.current, hint: 1 };
      setFieldOpacity(fieldOpacityRef.current);
      setFieldFadeMs((prev) => ({ ...prev, hint: fadeMs }));
    }

    setHintDuration(normalizedDuration);
    hintTextRef.current = normalizedText;
    setHintText(normalizedText);
    startHintTimer(normalizedDuration * 1000);

    if (mqttRef.current) {
      mqttRef.current.publishEvent('hint_displayed', { text: normalizedText, duration: normalizedDuration });
    }
    console.warn('[ClockShell] handleHint: text=', JSON.stringify(normalizedText), 'duration=', normalizedDuration);
  };

  const handleVisibility = (cmd) => {
    const hiding = cmd.command === 'hide' || cmd.command === 'fadeOut';
    const instant = cmd.command === 'show' || cmd.command === 'hide';
    const durationMs = instant ? 0 : resolveCommandFadeDurationMs(cmd);

    if (Object.prototype.hasOwnProperty.call(cmd, 'color')) {
      if (!isAcceptableColor(cmd.color)) {
        rejectCommand('invalid_parameter', cmd, { field: 'color' });
        return;
      }
      setVeilColor(cmd.color);
    }

    if (cmd.field) {
      const layout = layoutsConfigRef.current
        && layoutsConfigRef.current.layouts[activeLayoutRef.current];
      if (!layout || !layout.fields[cmd.field]) {
        rejectCommand('unknown_field', cmd, { field: cmd.field });
        return;
      }
      fieldOpacityRef.current = { ...fieldOpacityRef.current, [cmd.field]: hiding ? 0 : 1 };
      setFieldOpacity(fieldOpacityRef.current);
      setFieldFadeMs((prev) => ({ ...prev, [cmd.field]: durationMs }));
      if (mqttRef.current) {
        mqttRef.current.publishEvent('command_received', { command: cmd.command, field: cmd.field });
      }
      return;
    }

    setFadeDurationMs(durationMs);
    setVisible(!hiding);
    visibleRef.current = !hiding;
    if (hiding) scheduleHintClear(durationMs);
    else cancelScheduledHintClear();
    if (mqttRef.current) {
      mqttRef.current.publishEvent('command_received', { command: cmd.command });
    }
  };

  const handleSetLayout = (cmd) => {
    if (!requireLayouts(cmd)) return;
    const layoutsNow = layoutsConfigRef.current;
    let layout;
    try {
      layout = assertKnownLayout(layoutsNow, cmd.layout);
    } catch (error) {
      rejectCommand(error.reason || 'unknown_layout', cmd, {
        layout: cmd.layout,
        available: error.available,
      });
      return;
    }

    const overrides = {};
    const unknown = [];
    Object.keys(cmd).forEach((key) => {
      if (SET_LAYOUT_RESERVED.has(key)) return;
      if (!layout.fields[key] || key === 'time' || key === 'hint') {
        unknown.push(key);
        return;
      }
      overrides[key] = cmd[key] == null ? layout.fields[key].text : String(cmd[key]);
    });
    if (unknown.length) {
      rejectCommand('unknown_field', cmd, { field: unknown[0] });
      return;
    }

    let nextVolume = layout.volume;
    if (Object.prototype.hasOwnProperty.call(cmd, 'volume')) {
      const parsed = normalizeVolume(cmd.volume);
      if (parsed === null) {
        rejectCommand('invalid_parameter', cmd, { field: 'volume' });
        return;
      }
      if (!layout.backgroundVideo) {
        rejectCommand('no_video', cmd);
        return;
      }
      nextVolume = parsed;
    }

    const previous = activeLayoutRef.current;
    activeLayoutRef.current = layout.name;
    fieldOverridesRef.current = overrides;
    imageOverrideRef.current = null;
    layoutVolumeRef.current = nextVolume;
    fieldOpacityRef.current = {};
    hintTextRef.current = '';
    setActiveLayout(layout.name);
    setFieldOverrides(overrides);
    setImageOverride(null);
    setLayoutVolume(nextVolume);
    setFieldOpacity({});
    setFieldFadeMs({});
    clearHint();

    if (mqttRef.current) {
      mqttRef.current.publishEvent('command_received', { command: 'setLayout', layout: layout.name });
      mqttRef.current.publishEvent('layout_changed', { layout: layout.name, previous });
      publishCurrentState();
    }
  };

  const handleSetMessage = (cmd) => {
    if (!requireLayouts(cmd)) return;
    const layout = layoutsConfigRef.current.layouts[activeLayoutRef.current];
    const keys = Object.keys(cmd).filter((key) => !SET_MESSAGE_RESERVED.has(key));
    if (!keys.length) {
      rejectCommand('invalid_parameter', cmd, { required: 'field' });
      return;
    }
    const unknown = keys.find((key) => !layout.fields[key] || key === 'time' || key === 'hint');
    if (unknown) {
      rejectCommand('unknown_field', cmd, { field: unknown });
      return;
    }

    const next = { ...fieldOverridesRef.current };
    keys.forEach((key) => {
      if (cmd[key] == null) delete next[key];
      else next[key] = String(cmd[key]);
    });
    fieldOverridesRef.current = next;
    setFieldOverrides(next);

    const fadeMs = Object.prototype.hasOwnProperty.call(cmd, 'fadeTime')
      ? resolveCommandFadeDurationMs({ fadeTime: cmd.fadeTime })
      : 0;
    if (fadeMs) {
      const fade = { ...fieldFadeMs };
      keys.forEach((key) => { fade[key] = fadeMs; });
      setFieldFadeMs(fade);
    }

    if (mqttRef.current) {
      mqttRef.current.publishEvent('command_received', { command: 'setMessage' });
      mqttRef.current.publishEvent('message_changed', { fields: keys });
      publishCurrentState();
    }
  };

  const handleSetImage = (cmd) => {
    if (!requireLayouts(cmd)) return;
    const file = safeAssetName(cmd.file);
    const assets = layoutsConfigRef.current.assets || [];
    if (!file || !assets.includes(file)) {
      rejectCommand('unknown_file', cmd, { file: cmd.file });
      return;
    }
    imageOverrideRef.current = file;
    setImageOverride(file);
    if (mqttRef.current) {
      mqttRef.current.publishEvent('command_received', { command: 'setImage', file });
      mqttRef.current.publishEvent('image_changed', { file });
      publishCurrentState();
    }
  };

  const handleSetVolume = (cmd) => {
    if (!requireLayouts(cmd)) return;
    const layout = layoutsConfigRef.current.layouts[activeLayoutRef.current];
    if (!layout || !layout.backgroundVideo) {
      rejectCommand('no_video', cmd);
      return;
    }
    const parsed = normalizeVolume(cmd.volume);
    if (parsed === null) {
      rejectCommand('invalid_parameter', cmd, { field: 'volume' });
      return;
    }
    layoutVolumeRef.current = parsed;
    setLayoutVolume(parsed);
    if (mqttRef.current) {
      mqttRef.current.publishEvent('command_received', { command: 'setVolume', volume: parsed });
      mqttRef.current.publishEvent('volume_changed', { volume: parsed });
      publishCurrentState();
    }
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
      mqttRef.current.publishEvent('command_received', { command: 'setDisplayColors' });
      mqttRef.current.publishEvent('display_colors_updated', {
        backgroundColor: next.backgroundColor,
        textColor: next.textColor,
        textAlpha: next.textAlpha,
        fadeTime: next.fadeTime,
      });
      warnings.forEach((warning) => mqttRef.current.publishWarning(warning, { command: 'setDisplayColors' }));
    }
  };

  const handleResetDisplayColors = () => {
    const reset = { ...DEFAULT_DISPLAY_COLORS };
    setDisplayColors(reset);

    if (mqttRef.current) {
      mqttRef.current.publishEvent('command_received', { command: 'resetDisplayColors' });
      mqttRef.current.publishEvent('display_colors_updated', {
        backgroundColor: reset.backgroundColor,
        textColor: reset.textColor,
        textAlpha: reset.textAlpha,
        fadeTime: reset.fadeTime,
        reset: true,
      });
    }
  };

  // Validate config structure before rendering
  if (!config || !config.type || !config.type.style || !config.display) {
    return (
      <div className="clock-shell-error">
        <p>Error: Invalid config structure - missing required sections</p>
      </div>
    );
  }

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

  const veilBackground = config.display
    && config.display.fade_background_type === 'image'
    && config.display.fade_background_image
    && !layoutsConfig
    ? `url(${config.display.fade_background_image}) center / cover no-repeat`
    : veilColor;

  return (
    <div className="clock-shell">
      {layoutsConfig ? (
        <LayoutStage
          layoutsConfig={layoutsConfig}
          active={activeLayout}
          seconds={time}
          hintText={hintText}
          overrides={fieldOverrides}
          imageOverride={imageOverride}
          volume={layoutVolume}
          fieldOpacity={fieldOpacity}
          fieldFadeMs={fieldFadeMs}
        />
      ) : (
        <Renderer
          config={config}
          time={time}
          active={active}
          hint={hintText}
          hintText={hintText}
          hintDuration={hintDuration}
          hintFont={hintConfig?.font}
          displayColors={displayColors}
          visible
        />
      )}
      <div
        className="pxc-veil"
        data-testid="pxc-veil"
        style={{
          opacity: visible ? 0 : 1,
          transition: `opacity ${fadeDurationMs}ms ease-in-out`,
          background: veilBackground,
        }}
      />
    </div>
  );
};

export default ClockShell;
