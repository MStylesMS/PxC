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
  }

  componentDidMount() {
    const stream = MQTT && typeof MQTT.subscribe === 'function'
      ? MQTT.subscribe('Paradox/Houdini/Mirror/Clock/Commands')
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
            // Swallow JSON parse errors
            return null;
          }
        }),
        filter(cmd => !!cmd)
      )
      .subscribe(commandObject => {
        try {
          if (commandObject && commandObject.time) {
            let time = this.state.time;
            try {
              time = commandObject.time.split(':').map(t => Number(t));
              time = time[0] * 60 + time[1];
              if (isNaN(time)) time = this.state.time;
    } catch (e) {}
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
                this.setState({ active: true, shown: true });
                break;
              case 'pause':
                this.setState({ active: false, fadeDuration: commandObject.duration || 2000 });
                break;
              case 'fadeout':
                this.setState({ shown: false, fadeDuration: commandObject.duration || 2000 });
                break;
              case 'fadein':
                this.setState({ shown: true, fadeDuration: commandObject.duration || 2000 });
                break;
              default:
        // eslint-disable-next-line no-console
        console.warn(`Unexpected command object: ${JSON.stringify(commandObject)}`);
            }
          }
        } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
        }
      });
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
