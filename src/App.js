import React, {PureComponent} from 'react';
import Clock from './clock/Clock';
import './App.css';
import MQTT from './MQTT';
import {filter, map} from 'rxjs/operators';

class App extends PureComponent {
    constructor(props) {
        super(props)
        this.state = {
            active: false,
            time: 0
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
                } else if (commandObject.command) {
                    switch (commandObject.command) {
                        case 'start':
                            this.setState({active: true});
                            break;
                        case 'pause':
                            this.setState({active: false});
                            break;
                        default:
                            console.warn(`Unexpected command object: ${JSON.stringify(commandObject)}`);
                    }
                }
            });
    }

    render() {
        return (
            <div className="App">
                <Clock active={this.state.active} time={this.state.time}></Clock>
            </div>
        );
    }
}

export default App;
