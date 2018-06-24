import React, {Component} from 'react';
import './MinutesHand.css';

export default class MinutesHand extends Component {
    rotate = null;

    constructor(props) {
        super(props);
        this.state = {
            rotate: null
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        const rotate = Math.round(Math.round((this.props.time / 60) % 60) * 360 / 60);
        if (rotate == this.rotate) {
            return false;
        }
        this.rotate = rotate;
        return true;
    }

    render() {
        let rotate = this.rotate === null ? 0 : this.rotate;
        return (
            <div className="mm">
                <div className="m"
                     style={{transform: `translate(0, 1.6em) rotate(${rotate}deg) translate(0, -1.6em)`}}></div>
                <div className="mr"></div>
            </div>
        );
    }
}