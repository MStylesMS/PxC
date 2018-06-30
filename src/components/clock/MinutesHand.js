import React, {PureComponent} from 'react';
import './MinutesHand.css';

export default class MinutesHand extends PureComponent {
    render() {
        const rotate = Math.round(Math.round((this.props.time / 60) % 60) * 360 / 60);
        return (
            <div className="mm">
                <div className="m"
                     style={{transform: `translate(0, 1.6em) rotate(${rotate}deg) translate(0, -1.6em)`}}></div>
                <div className="mr"></div>
            </div>
        );
    }
}