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
      hint: '',
      duration: 3000,
      time: {
        value: 0,
        updated: new Date().getTime(),
      },
      shown: true,
      fadeDuration: 2000,
    };
  }

  componentDidMount() {
    try {
      MQTT.subscribe('Paradox/Houdini/Mirror/Clock/Commands')
        .pipe(
          filter(response => response),
          map(payload => {
            try {
              return JSON.parse(payload);
            } catch (e) {
              console.log('JSON parse error:', e);
              return null;
            }
          }),
          filter(commandObject => commandObject !== null)
        )
        .subscribe(commandObject => {
          try {
            if (commandObject.time) {
              let time = this.state.time.value;
              try {
                const timeParts = commandObject.time.split(':').map(t => Number(t));
                time = timeParts[0] * 60 + timeParts[1];
                if (isNaN(time)) time = this.state.time.value;
              } catch (e) {
                console.log('Time parsing error:', e);
              }
              this.setState({
                time: {
                  value: time,
                  updated: new Date().getTime(),
                },
              });
            } else if (commandObject.hint) {
              this.setState({
                hint: commandObject.hint,
                duration: commandObject.duration || 3000,
              });
            } else if (commandObject.action) {
              switch (commandObject.action) {
                case 'start':
                  this.setState({ active: true });
                  break;
                case 'stop':
                  this.setState({ active: false });
                  break;
                case 'fadeout':
                  this.setState({ shown: false, fadeDuration: commandObject.duration || 2000 });
                  break;
                case 'fadein':
                  this.setState({ shown: true, fadeDuration: commandObject.duration || 2000 });
                  break;
                default:
                  console.warn(`Unexpected command object: ${JSON.stringify(commandObject)}`);
              }
            }
          } catch (e) {
            console.log('Command processing error:', e);
          }
        });
    } catch (error) {
      console.error('Failed to initialize MQTT:', error);
    }
  }

  render() {
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
