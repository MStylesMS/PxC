import React, {Component} from 'react';
import './Clock.css';
import SecondsHand from "./SecondsHand";
import MinutesHand from "./MinutesHand";

export default class Clock extends Component {
    tickInterval;

    constructor(props) {
        super(props);
        this.state = {
            active: props.active || false,
            time: props.time || {value: 0, updated: new Date().getTime()},
            withMin: props.time.value >= 60
        };
    }

    componentDidUpdate(prevProps) {
        if (typeof(this.props.active) !== 'undefined' && prevProps.active !== this.props.active) {
            if (this.props.active) {
                this.startTicking();
            }
            else {
                this.stopTicking();
            }
        }
        if (
            this.willTimeChange(this.props, prevProps)
        ) {
            this.setState({
                time: this.props.time,
                withMin: this.props.time.value >= 60
            });
        }
    }

    willTimeChange(currentProps, prevProps) {
        if (
            typeof(currentProps.time) === 'undefined' ||
            currentProps.time.updated <= this.state.time.updated
        ) {
            return false;
        }
        let timeChange = (currentProps.time.value - this.state.time.value) !== 0;
        if (this.state.active) {
            timeChange = Math.abs(currentProps.time.value - this.state.time.value) > 1;
        }
        return timeChange;
    }

    _tick() {
        const nextTime = this.state.time.value - 1;
        if (nextTime < 0) {
            this.stopTicking();
        }
        else
            this.setState({time: {...this.state.time, value: nextTime}});
    }

    startTicking() {
        if (this.tickInterval)
            return false;
        else if (this.state.time.value <= 0)
            return this.stopTicking();
        this._tick();
        this.tickInterval = setInterval(() => this._tick(), 1000);
        this.setState({active: true});
    }

    stopTicking() {
        clearTimeout(this.tickInterval);
        this.tickInterval = null;
        this.setState({active: false});
    }

    render() {
        console.debug('Clock render');
        return (
            <div id="clock">
                <div id="a">
                    <div id="b">
                        {this.state.withMin && <MinutesHand time={this.state.time.value}/>}
                        <SecondsHand time={this.state.time.value} animated={this.state.active}/>
                    </div>
                </div>
            </div>
        );
    }
}