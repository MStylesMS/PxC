import React, { useRef } from 'react';
import './SecondsHand.css';

export default function SecondsHand({ time, animated }) {
    const animationClassIdxRef = useRef(0);

    let rotate = (Math.PI * 3/2) + Math.atan2(Math.cos((-Math.PI * time)/30), ((3/5)*Math.sin((-Math.PI * time)/30)));
    if(rotate === (Math.PI * 2)){
        // console.log("greater than");
        rotate = 0;
    }
    
    animationClassIdxRef.current = !animationClassIdxRef.current & 1;
    
    return (
        <div className={"ss " + (animated ? ("tick-animation-" + animationClassIdxRef.current) : "")}>
            <div className="s"
                 style={{transform: `translate(0px, calc(85vh / 3 / 2)) rotate(${rotate}rad) translate(0px, calc(-85vh / 3 / 2))`, transition: 'all 1s'}}></div>
        </div>
    );
}
