import React, {PureComponent} from 'react';
import './HoursHand.css';

export default class HoursHand extends PureComponent {
    render() {
        const rotate = Math.round(((this.props.time / 3600) % 12) * 360 / 12);
        return (
            <div className="hh">
                <div className="h"
                     style={{transform: `translate(0, 1.0em) rotate(${rotate}deg) translate(0, 1.0em)`}}></div>
            </div>
        );
    }
}