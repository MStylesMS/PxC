import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import * as MQTT from './MQTT';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);
  ReactDOM.unmountComponentAtNode(div);
});
