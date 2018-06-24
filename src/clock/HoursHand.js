import React, {Component} from 'react';
import './HoursHand.css';

export default class HoursHand extends Component {
    rotate = null;

    constructor(props) {
        super(props);
        this.state = {
            rotate: null
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        const rotate = Math.round(((this.props.time / 3600) % 12) * 360 / 12);
        if (rotate == this.rotate) {
            return false;
        }
        this.rotate = rotate;
        return true;
    }

    render() {
        let rotate = this.rotate === null ? 0 : this.rotate;
        return (
            <div className="hh">
                <div className="h"
                     style={{transform: `translate(0, 1.0em) rotate(${rotate}deg) translate(0, 1.0em)`}}></div>
            </div>
        );
    }
}