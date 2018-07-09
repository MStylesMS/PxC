import React, {PureComponent} from 'react';
import './SecondsHand.css';

export default class SecondsHand extends PureComponent {
    animationClassIdx = 0;

    render() {
        let rotate = (this.props.time % 60) * 360 / 60;
        this.animationClassIdx = !this.animationClassIdx & 1;
        return (
            <div className={"ss " + (this.props.animated ? ("tick-animation-" + this.animationClassIdx) : "")}>
                <div className="s"
                     style={{transform: `translate(0px, calc(85vh / 3 / 2)) rotate(${rotate}deg) translate(0px, calc(-85vh / 3 / 2))`}}></div>
            </div>
        );
    }
}