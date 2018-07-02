import React, {PureComponent} from 'react';
import './Clock.css';
import HoursHand from './HoursHand';
import SecondsHand from "./SecondsHand";
import MinutesHand from "./MinutesHand";

export default class Clock extends PureComponent {
    tickInterval;

    constructor(props) {
        super(props);
        this.state = {
            firstRender: false,
            active: props.active || false,
            time: props.time || 0,
            withHour: props.time >= 60 * 60,
            withMin: props.time >= 60
        };
    }

    componentWillReceiveProps(nextProps) {
        if (typeof(nextProps.time) !== 'undefined' && nextProps.time !== this.props.time) {
            this.setState({
                time: nextProps.time || 0,
                withHour: nextProps.time >= 60 * 60,
                withMin: nextProps.time >= 60
            });
        }
        if (typeof(nextProps.active) !== 'undefined') {
            if (nextProps.active) {
                this.startTicking();
            }
            else {
                this.stopTicking();
            }
        }
    }

    _tick() {
        if (this.state.time - 1 < 0) {
            this.stopTicking();
        }
        else
            this.setState({time: this.state.time - 1});
    }

    startTicking() {
        if (this.tickInterval)
            return false;
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
        return (
            <div id="clock">
                <div id="a">
                    <div id="b">
                        <div id="shadow">
                            {this.state.withHour && <HoursHand time={this.state.time}/>}
                            {this.state.withMin && <MinutesHand time={this.state.time}/>}
                            <SecondsHand time={this.state.time}/>
                        </div>
                        {this.state.withHour && <HoursHand time={this.state.time}/>}
                        {this.state.withMin && <MinutesHand time={this.state.time}/>}
                        <SecondsHand time={this.state.time}/>
                    </div>
                </div>
            </div>
        );
    }
}