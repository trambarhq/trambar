import Promise from 'bluebird';
import { expect } from 'chai';
import TestServer from './lib/test-server';

import WebsocketNotifier from 'transport/websocket-notifier';

let port = 7979;
let baseURL = `http://localhost:${port}`;

describe('WebsocketNotifier', function() {
    before(() => {
        return TestServer.start(port);
    })
    it ('should connect to test server', function() {
        let component = new WebsocketNotifier;
        return component.connect(baseURL).then((result) => {
            expect(result).to.be.true;
        }).then(() => {
            component.disconnect();
        });
    })
    it ('should receive a connection token from the server', function() {
        let component = new WebsocketNotifier;
        let token;
        component.addEventListener('connection', (evt) => {
            token = evt.connection.token;
        })
        return component.connect(baseURL).then((result) => {
            expect(result).to.be.true;
            return Promise.delay(50);
        }).then(() => {
            expect(token).to.be.a('string');
            component.disconnect();
        });
    })
    it ('should receive change notification from the server', function() {
        let component = new WebsocketNotifier;
        let token;
        component.addEventListener('connection', (evt) => {
            token = evt.connection.token;
        })
        let changes;
        component.addEventListener('notify', (evt) => {
            changes = evt.changes;
        })
        return component.connect(baseURL).then((result) => {
            return Promise.delay(50);
        }).then(() => {
            var payload = {
                changes: {
                    'global.user': {
                        ids: [1, 2],
                        gns: [3, 3],
                    }
                }
            };
            return TestServer.send(token, payload);
        }).then(() => {
            return Promise.delay(50);
        }).then(() => {
            expect(changes).to.be.an('array');
            component.disconnect();
        });
    })
    it ('should keep trying to connect until succeeding', function() {
        return TestServer.stop().then(() => {
            setTimeout(() => {
                TestServer.start(port);
            }, 500);
            let component = new WebsocketNotifier({ reconnectionDelay: 50 });
            return component.connect(baseURL).then((result) => {
                expect(result).to.be.true;
            }).then(() => {
                component.disconnect();
            });
        });
    })
    it ('should reconnect to server after disconnection', function() {
        let component = new WebsocketNotifier({ reconnectionDelay: 50 });
        let disconnected = false;
        component.addEventListener('disconnect', (evt) => {
            disconnected = true;
        })
        return component.connect(baseURL).then((result) => {
            expect(result).to.be.true;
        }).then(() => {
            return TestServer.stop().then(() => {
                return TestServer.start(port);
            });
        }).then(() => {
            return Promise.delay(50);
        }).then(() => {
            expect(disconnected).to.be.true;
            expect(component.reconnectionCount).to.be.above(0);
            expect(component.socket).to.not.be.null;

            component.disconnect();
        });
    })
    after(() => {
        return TestServer.stop();
    })
})
