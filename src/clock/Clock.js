import React, {Component} from 'react';
import './Clock.css';
import HoursHand from './HoursHand';
import SecondsHand from "./SecondsHand";
import MinutesHand from "./MinutesHand";

export default class Clock extends Component {
    tickInterval;

    constructor(props) {
        super(props);
        this.state = {
            active: props.active || false,
            time: props.time || 0
        };
    }

    tick() {
        if (this.state.time - 1 < 0) {
            this.setState({active: false});
        }
        else
            this.setState({
                active: true,
                time: this.state.time - 1
            });
    }

    componentDidMount() {
        this.tickInterval = setInterval(() => this.tick(), 10);
    }

    render() {
        return (
            <div id="clock">
                <div id="a">
                    <div id="b">
                        <div id="c">
                            <div id="d">
                                <div id="shadow">
                                    <HoursHand time={this.state.time}/>
                                    <MinutesHand time={this.state.time}/>
                                    <SecondsHand time={this.state.time}/>
                                </div>
                                <div id="ii">
                                    <b><i></i><i></i><i></i><i></i></b>
                                    <b><i></i><i></i><i></i><i></i></b>
                                    <b><i></i><i></i><i></i><i></i></b>
                                    <b><i></i><i></i><i></i><i></i></b>
                                    <b><i></i><i></i><i></i><i></i></b>
                                    <b><i></i><i></i><i></i><i></i></b>
                                </div>
                                <div id="e">
                                    <div id="f">
                                        <u>12<u>1<u>2<u>3</u>4</u>5</u></u>
                                    </div>
                                    <div id="g">
                                        <u><u>11<u>10<u>9</u>8</u>7</u>6</u>
                                    </div>
                                </div>
                                <HoursHand time={this.state.time}/>
                                <MinutesHand time={this.state.time}/>
                                <SecondsHand time={this.state.time}/>
                                <div id="k"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}