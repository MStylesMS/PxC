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
  }

  componentDidMount() {
    // Start heartbeat
    this.startHeartbeat();

    const stream = MQTT && typeof MQTT.subscribe === 'function'
      ? MQTT.subscribe()
      : null;

    if (!stream || typeof stream.pipe !== 'function') {
      // In tests or if MQTT unavailable, no subscription
      return;
    }

    stream
      .pipe(
        // Normalize payloads: accept already-parsed objects or JSON strings
        map(payload => {
          try {
            if (payload == null) return null;
            if (typeof payload === 'object') return payload;
            if (typeof payload === 'string') return JSON.parse(payload);
            return null;
          } catch (e) {
            // Publish warning for malformed JSON
            MQTT.publishWarning('Invalid JSON received', { 
              payload: typeof payload === 'string' ? payload : String(payload),
              error: e.message 
            });
            return null;
          }
        }),
        filter(cmd => !!cmd)
      )
      .subscribe(commandObject => {
        try {
          // Publish event for received command
          MQTT.publishEvent('command_received', commandObject).subscribe({
            error: (err) => console.error('Failed to publish event:', err)
          });

          if (commandObject && commandObject.time) {
            let time = this.state.time;
            try {
              time = commandObject.time.split(':').map(t => Number(t));
              time = time[0] * 60 + time[1];
              if (isNaN(time)) {
                MQTT.publishWarning('Invalid time format', { received: commandObject.time }).subscribe({
                  error: (err) => console.error('Failed to publish warning:', err)
                });
                time = this.state.time;
              }
    } catch (e) {
              MQTT.publishWarning('Time parsing error', { 
                received: commandObject.time, 
                error: e.message 
              }).subscribe({
                error: (err) => console.error('Failed to publish warning:', err)
              });
            }
            this.setState({
              time: {
                value: time,
                updated: new Date().getTime(),
              },
            });
          } else if (commandObject && commandObject.hint) {
            this.setState({
              hint: commandObject.hint,
              duration: commandObject.duration,
            });
          } else if (commandObject && commandObject.command) {
            switch (commandObject.command) {
              case 'start':
              case 'resume':
                this.setState({ active: true, shown: true });
                break;
              case 'pause':
                this.setState({ active: false, fadeDuration: commandObject.duration || 2000 });
                break;
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
          } else {
            const warningMsg = 'Unrecognized command format';
            // eslint-disable-next-line no-console
            console.warn(warningMsg, commandObject);
            MQTT.publishWarning(warningMsg, commandObject).subscribe({
              error: (err) => console.error('Failed to publish warning:', err)
            });
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
    if (MQTT && typeof MQTT.disconnect === 'function') {
      MQTT.disconnect();
    }
  }

  startHeartbeat() {
    // Send heartbeat every 15 seconds
    this.heartbeatInterval = setInterval(() => {
      if (MQTT && typeof MQTT.publishState === 'function') {
        MQTT.publishState('active').subscribe({
          error: (err) => {
            // eslint-disable-next-line no-console
            console.error('Failed to send heartbeat:', err);
          }
        });
      }
    }, 15000);

    // Send initial heartbeat
    if (MQTT && typeof MQTT.publishState === 'function') {
      MQTT.publishState('active').subscribe({
        error: (err) => {
          // eslint-disable-next-line no-console
          console.error('Failed to send initial heartbeat:', err);
        }
      });
    }
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
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
