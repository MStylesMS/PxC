import React from 'react';
import './MinutesHand.css';

export default function MinutesHand({ time }) {
  const rotate =
    Math.PI * (3 / 2) +
    Math.atan2(Math.cos((-Math.PI * time) / 1800), (3 / 5) * Math.sin((-Math.PI * time) / 1800));

  return (
    <div className="mm">
      <div
        className="m"
        style={{
          transform: `translate(0px, calc(85vh / 2.5 / 2)) rotate(${rotate}rad) translate(0px, calc(-85vh / 2.5 / 2))`,
        }}
      ></div>
    </div>
  );
}
