import React, {Component} from 'react';
import Clock from './clock/Clock';
import './App.css';
import MQTT from './MQTT';

class App extends Component {
    render() {
        return (
            <div className="App">
                <Clock active={true} time={1 * 60 * 60}></Clock>
            </div>
        );
    }
}

export default App;
