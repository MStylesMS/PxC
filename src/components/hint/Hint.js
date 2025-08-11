import React, {PureComponent} from 'react';
import './Hint.css';

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

    componentDidUpdate(prevProps) {
        console.debug('Hint.componentDidUpdate', this.props);
        
        // Only process if text prop actually changed
        if (prevProps.text !== this.props.text) {
            this.stopTimer();
            const text = this.props.text && this.props.text.trim();
            if (text) {
                this.setState({
                    text: text,
                    duration: this.props.duration || 25,
                    shown: true
                }, () => this.startTimer());
            }
            else
                this.setState({
                    text: null,
                    duration: this.props.duration || 25,
                    shown: false
                });
        }
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