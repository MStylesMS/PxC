import React, {PureComponent} from 'react';
import './SecondsHand.css';

export default class SecondsHand extends PureComponent {
    animationClassIdx = 0;

    render() {
        let rotate = (Math.PI * 3/2) + Math.atan2(Math.cos((-Math.PI * this.props.time)/30), ((3/5)*Math.sin((-Math.PI * this.props.time)/30)));
      if(rotate === (Math.PI * 2)){
       // console.log("greater than");
        rotate = 0;
}
        this.animationClassIdx = !this.animationClassIdx & 1;
        return (
            <div className={"ss " + (this.props.animated ? ("tick-animation-" + this.animationClassIdx) : "")}>
                <div className="s"
                     style={{transform: `translate(0px, calc(85vh / 3 / 2)) rotate(${rotate}rad) translate(0px, calc(-85vh / 3 / 2))`, transition: 'all 1s'}}></div>
            </div>
        );
    }
}
