import React, { Component } from 'react';
import Clock from './components/clock/Clock';
import Hint from './components/hint/Hint';
import './App.css';
import MQTT from './MQTT';
import { filter, map } from 'rxjs/operators';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      active: false,
      time: {
        value: 0,
        updated: new Date().getTime(),
      },
      shown: false,
      fadeDuration: 2000,
    };
  this.heartbeatInterval = null;
  this.statePublishInterval = null;
  }

  componentDidMount() {
    // Start heartbeat and state publisher
    this.startHeartbeat();
    this.startStatePublisher();

    const stream = MQTT && typeof MQTT.subscribe === 'function'
      ? MQTT.subscribe()
      : null;

    if (!stream || typeof stream.pipe !== 'function') {
      // In tests or if MQTT unavailable, no subscription
      return;
    }

    stream
      .pipe(
        map(payload => {
          try {
            if (payload == null) return null;
            if (typeof payload === 'object') return payload;
            if (typeof payload === 'string') return JSON.parse(payload);
            return null;
          } catch (e) {
            // Always publish warning for malformed JSON
            MQTT.publishWarning('Malformed JSON received', {
              payload: typeof payload === 'string' ? payload : String(payload),
              error: e.message
            }).subscribe({
              error: (err) => console.error('Failed to publish warning:', err)
            });
            return null;
          }
        }),
        filter(cmd => {
          if (!cmd) return false;
          // If not an object or missing expected fields, warn
          if (typeof cmd !== 'object' || (!cmd.command && !cmd.time && !cmd.hint)) {
            MQTT.publishWarning('Unrecognized command format', { received: cmd }).subscribe({
              error: (err) => console.error('Failed to publish warning:', err)
            });
            return false;
          }
          return true;
        })
      )
      .subscribe(commandObject => {
        try {
          // Combined time+command handling
          const hasTime = commandObject && commandObject.time;
          const hasCommand = commandObject && commandObject.command;
          if ((hasCommand && (commandObject.command === 'start' || commandObject.command === 'resume')) && hasTime) {
            // Validate MM:SS
            let mm = 0, ss = 0, valid = false;
            try {
              const parts = commandObject.time.split(':');
              mm = Number(parts[0]);
              ss = Number(parts[1]);
              valid = (
                Number.isInteger(mm) && Number.isInteger(ss) &&
                mm >= 0 && mm <= 60 && ss >= 0 && ss < 60 &&
                (mm < 60 || (mm === 60 && ss === 0))
              );
            } catch (e) {
              valid = false;
            }
            if (!valid) {
              MQTT.publishWarning('Invalid time format (MM:SS must be 0-59, or 60:00 only)', { received: commandObject.time }).subscribe({
                error: (err) => console.error('Failed to publish warning:', err)
              });
              return;
            }
            const time = mm * 60 + ss;
            // Set time and start/resume in one atomic update
            this.setState({
              active: true,
              shown: true,
              time: { value: time, updated: Date.now() }
            }, () => {
              const payload = this.buildStatePayload();
              MQTT.publishState(payload).subscribe({
                error: (err) => console.error('Failed to publish state after start/resume+time:', err)
              });
            });
          } else if (hasTime) {
            // Validate MM:SS
            let mm = 0, ss = 0, valid = false;
            try {
              const parts = commandObject.time.split(':');
              mm = Number(parts[0]);
              ss = Number(parts[1]);
              valid = (
                Number.isInteger(mm) && Number.isInteger(ss) &&
                mm >= 0 && mm <= 60 && ss >= 0 && ss < 60 &&
                (mm < 60 || (mm === 60 && ss === 0))
              );
            } catch (e) {
              valid = false;
            }
            if (!valid) {
              MQTT.publishWarning('Invalid time format (MM:SS must be 0-59, or 60:00 only)', { received: commandObject.time }).subscribe({
                error: (err) => console.error('Failed to publish warning:', err)
              });
              return;
            }
            const time = mm * 60 + ss;
            this.setState({
              time: {
                value: time,
                updated: new Date().getTime(),
              },
            }, () => {
              // Publish state after time update
              const payload = this.buildStatePayload();
              MQTT.publishState(payload).subscribe({
                error: (err) => console.error('Failed to publish state after time set:', err)
              });
            });
          } else if (commandObject && commandObject.hint) {
            this.setState({
              hint: commandObject.hint,
              duration: commandObject.duration,
            });
          } else if (commandObject && commandObject.command) {
            switch (commandObject.command) {
              case 'start':
              case 'resume': {
                // Only run if not already handled above (no time field)
                if (!hasTime) {
                  this.setState({ active: true, shown: true }, () => {
                    const payload = this.buildStatePayload();
                    MQTT.publishState(payload).subscribe({
                      error: (err) => console.error('Failed to publish state after resume/start:', err)
                    });
                  });
                }
                break;
              }
              case 'pause': {
                // Only update time if a new time is being set (handled above)
                this.setState({ active: false, fadeDuration: commandObject.duration || 2000 }, () => {
                  const payload = this.buildStatePayload();
                  MQTT.publishState(payload).subscribe({
                    error: (err) => console.error('Failed to publish state after pause:', err)
                  });
                });
                break;
              }
              case 'fadeout':
              case 'fadeOut':
                this.setState({ shown: false, fadeDuration: commandObject.duration || 2000 });
                break;
              case 'fadein':
              case 'fadeIn':
                this.setState({ shown: true, fadeDuration: commandObject.duration || 2000 });
                break;
              default:
                const warningMsg = `Unknown command: ${commandObject.command}`;
                // eslint-disable-next-line no-console
                console.warn(warningMsg);
                MQTT.publishWarning(warningMsg, commandObject).subscribe({
                  error: (err) => console.error('Failed to publish warning:', err)
                });
            }
          }
        } catch (e) {
          const errorMsg = 'Error processing command';
          // eslint-disable-next-line no-console
          console.error(errorMsg, e);
          MQTT.publishWarning(errorMsg, { 
            command: commandObject, 
            error: e.message 
          }).subscribe({
            error: (err) => console.error('Failed to publish warning:', err)
          });
        }
      });
  }

  componentWillUnmount() {
    this.stopHeartbeat();
    this.stopStatePublisher();
    if (MQTT && typeof MQTT.disconnect === 'function') {
      MQTT.disconnect();
    }
  }

  startHeartbeat() {
    // Heartbeat removed; state topic now covers periodic status.
    this.heartbeatInterval = null;
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Helper to format seconds -> MM:SS
  formatMMSS(totalSeconds) {
    const t = Math.max(0, Math.round(totalSeconds || 0));
    const m = Math.floor(t / 60);
    const s = t % 60;
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(m)}:${pad(s)}`;
  }

  // Compute current derived seconds remaining based on last update and active flag
  getDerivedTimeValue() {
    const base = this.state.time || { value: 0, updated: Date.now() };
    const now = Date.now();
    const elapsed = Math.max(0, Math.floor((now - (base.updated || now)) / 1000));
    const value = this.state.active ? (base.value - elapsed) : base.value;
    return Math.max(0, value);
  }

  // Try to detect kiosk mode (best effort)
  detectKioskMode() {
    try {
      // Heuristic: no window chrome, full screen, or custom flag
      if (window.navigator && window.navigator['kiosk']) return true;
      if (window.matchMedia && window.matchMedia('(display-mode: kiosk)').matches) return true;
      if (window.outerWidth && window.outerHeight && window.screen) {
        // Allow a few pixels for borders
        const dw = Math.abs(window.outerWidth - window.screen.width);
        const dh = Math.abs(window.outerHeight - window.screen.height);
        if (dw < 16 && dh < 80) return true;
      }
    } catch (_) {}
    return false;
  }

  // Build current state payload
  buildStatePayload() {
    const stateStr = this.state.active ? 'running' : 'paused';
    const timeStr = this.formatMMSS(this.getDerivedTimeValue());
    let kiosk = false;
    if (typeof window !== 'undefined') {
      kiosk = this.detectKioskMode();
    }
    return { state: stateStr, time: timeStr, kiosk };
  }

  // Publish state every 10 seconds
  startStatePublisher() {
    if (this.statePublishInterval) return;
    this.statePublishInterval = setInterval(() => {
      try {
        const payload = this.buildStatePayload();
        if (MQTT && typeof MQTT.publishState === 'function') {
          MQTT.publishState(payload).subscribe({
            error: (err) => console.error('Failed to publish periodic state:', err)
          });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('State publisher error:', e);
      }
    }, 10000);
    // Initial publish
    try {
      const payload = this.buildStatePayload();
      MQTT.publishState(payload).subscribe({
        error: (err) => console.error('Failed to publish initial state:', err)
      });
    } catch (_) {}
  }

  stopStatePublisher() {
    if (this.statePublishInterval) {
      clearInterval(this.statePublishInterval);
      this.statePublishInterval = null;
    }
  }

  render() {
    // eslint-disable-next-line no-console
    console.debug('App render');
    const appClasses = `App ${this.state.shown ? 'shown' : 'hidden'}`;
    const appStyle = { animationDuration: `${this.state.fadeDuration}ms` };
    
    return (
      <div className={appClasses} style={appStyle} role="main" data-testid="app">
        <Clock 
          active={this.state.active} 
          time={this.state.time} 
          data-testid="clock"
        />
        <Hint 
          text={this.state.hint} 
          duration={this.state.duration} 
          data-testid="hint"
        />
      </div>
    );
  }
}

export default App;
