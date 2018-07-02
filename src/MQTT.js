import {BehaviorSubject, Observable, Subject} from 'rxjs';
import {filter, switchMap} from 'rxjs/operators';

// Create a client instance
import {Client} from "paho-mqtt";

const {EventEmitter} = require('fbemitter');

const clientId = `180624_houdini[${Math.round(Math.random() * 100000).toString(16)}]`;
const client = new Client(process.env.REACT_APP_MQTT_HOST, Number(process.env.REACT_APP_MQTT_PORT), clientId);
client.startTrace();

const connect$ = new BehaviorSubject(false);

// set callback handlers
client.onConnectionLost = responseObject => {
    console.log(client.getTraceLog());
    connect$.next(false);
    if (responseObject.errorCode !== 0) {
        console.error("onConnectionLost:" + responseObject.errorMessage);
    }
};
client.onMessageArrived = message => subscribeEmitter.emit(message.destinationName, message.payloadString);

// connect the client
client.connect({onSuccess: () => connect$.next(true)});

const subscribeEmitter = new EventEmitter();

export default {
    subscribe: function (topic) {
        return connect$
            .pipe(
                filter(connected => connected),
                switchMap(() => {
                    client.subscribe(topic);
                    const topicSubscribe$ = new Subject();
                    subscribeEmitter.addListener(topic, response => {
                        topicSubscribe$.next(response);
                    });
                    return topicSubscribe$;
                })
            );
    },
    publish: function (topic, payload, retained) {
        return connect$
            .filter(connected => connected)
            .map(() => {
                client.publish(topic, payload, 2, retained);
                return Observable.of(true);
            });
    }
};