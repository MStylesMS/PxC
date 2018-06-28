import React, {Component} from 'react';
import './SecondsHand.css';

export default class SecondsHand extends Component {
    render() {
        const rotate = (this.props.time % 60) * 360 / 60;
        return (
            <div className="ss">
                <div className="s"
                     style={{transform: `translate(0, 1.0em) rotate(${rotate}deg) translate(0, -1.0em)`}}></div>
                <div className="sr"></div>
            </div>
        );
    }
}