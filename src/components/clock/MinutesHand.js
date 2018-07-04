import React, {PureComponent} from 'react';
import './MinutesHand.css';

export default class MinutesHand extends PureComponent {
    render() {
        const rotate = Math.round(Math.floor((this.props.time / 60) % 60) * 360 / 60);
        return (
            <div className="mm">
                <div className="m"
                     style={{transform: `translate(0px, calc(85vh / 2.5 / 2)) rotate(${rotate}deg) translate(0px, calc(-85vh / 2.5 / 2))`}}></div>
            </div>
        );
    }
}