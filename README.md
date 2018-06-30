## Houdini escape room project

### Clock

### Install

`yarn install`

### Run

`yarn instart`

### MQTT connection credentials

Edit `package.json`'s `start` script to set proper MQTT host, port, etc.

### Development environment
```
"start": "cross-env REACT_APP_MQTT_HOST=mqtt-example.com REACT_APP_MQTT_PORT=8383 react-scripts start"
```

### Production environment
```
"build": "cross-env REACT_APP_MQTT_HOST=mqtt-example.com REACT_APP_MQTT_PORT=8383 react-scripts start"
```