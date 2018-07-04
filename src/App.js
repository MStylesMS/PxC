import React, {Component} from 'react';
import Clock from './components/clock/Clock';
import Hint from './components/hint/Hint';
import './App.css';
import MQTT from './MQTT';
import {filter, map} from 'rxjs/operators';

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            active: false,
            time: 0,
            updatedTimestamp: new Date().getTime(),
            shown: false,
            fadeDuration: 2000
        }
    }

    componentDidMount() {
        MQTT.subscribe('Paradox/Houdini/Mirror/Clock/Commands')
            .pipe(
                filter(response => response),
                map(payload => {
                    try {
                        return JSON.parse(payload);
                    }
                    catch (e) {
                    }
                }))
            .subscribe(commandObject => {
                if (commandObject.time) {
                    let time = this.state.time;
                    try {
                        time = commandObject.time.split(':').map(t => Number(t));
                        time = time[0] * 60 + time[1];
                        if (isNaN(time)) time = this.state.time;
                    } catch (e) {
                    }
                    this.setState({time: time});
                }
                else if (commandObject.hint) {
                    this.setState({
                        hint: commandObject.hint,
                        duration: commandObject.duration,
                    });
                }
                else if (commandObject.command) {
                    switch (commandObject.command) {
                        case 'start':
                            this.setState({active: true});
                            break;
                        case 'pause':
                            this.setState({active: false, fadeDuration: commandObject.duration || 2000});
                            break;
                        case 'fadeout':
                            this.setState({shown: false, fadeDuration: commandObject.duration || 2000});
                            break;
                        case 'fadein':
                            this.setState({shown: true, fadeDuration: commandObject.duration || 2000});
                            break;
                        default:
                            console.warn(`Unexpected command object: ${JSON.stringify(commandObject)}`);
                    }
                }
            });
    }

    render() {
        const appClasses = `App ${this.state.shown ? 'shown' : 'hidden'}`;
        const appStyle = {animationDuration: `${this.state.fadeDuration}ms`};
        return (
            <div className={appClasses}
                 style={appStyle}>
                <Clock active={this.state.active} time={this.state.time}></Clock>
                <Hint text={this.state.hint} duration={this.state.duration}></Hint>
            </div>
        );
    }
}

export default App;
