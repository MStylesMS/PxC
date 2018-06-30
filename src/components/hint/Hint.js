import React, {PureComponent} from 'react';
import './Hint.css';
import {CSSTransitionGroup} from 'react-transition-group';

const FADEIN_ANIMATION_DURATION = 200;

export default class Clock extends PureComponent {
    timer = null;

    constructor(props) {
        super(props);
        this.state = {
            duration: 25,
            text: '',
            shown: false
        }
    }

    componentWillReceiveProps(nextProps) {
        console.debug('Clock.componentWillReceiveProps', nextProps);
        this.stopTimer();
        const text = nextProps.text && nextProps.text.trim();
        if (text) {
            this.setState({
                text: text,
                duration: nextProps.duration || 25,
                shown: true
            }, () => this.startTimer());
        }
        else
            this.setState({
                text: null,
                duration: nextProps.duration || 25,
                shown: false
            });
    }

    stopTimer() {
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = null;
    }

    startTimer() {
        const duration = this.state.duration * 1000 + FADEIN_ANIMATION_DURATION;
        if (!isNaN(duration))
            this.timer = setTimeout(() => {
                this.setState({shown: false});
                this.timer = null;
            }, duration);
    }

    render() {
        return (
            <div id="hint" className={this.state.shown ? 'shown' : ''}>
                <div>{this.state.text}</div>
            </div>
        );
    }
}