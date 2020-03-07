import { expect } from 'chai';
import TestServer from './lib/test-server.js';
import { delay } from '../../utils/delay.js';

import { WebsocketNotifier } from '../websocket-notifier.js';

let port = 7979;
let baseURL = `http://localhost:${port}`;

describe('WebsocketNotifier', function() {
  before(() => {
    return TestServer.start(port);
  })
  it ('should connect to test server', async function() {
    let component = new WebsocketNotifier;
    let result = await component.connect(baseURL);
    expect(result).to.be.true;
    component.disconnect();
  })
  it ('should receive a connection token from the server', async function() {
    let component = new WebsocketNotifier;
    let token;
    component.addEventListener('connection', (evt) => {
      token = evt.connection.token;
    })
    let result = await component.connect(baseURL);
    expect(result).to.be.true;
    await delay(50);
    expect(token).to.be.a('string');
    component.disconnect();
  })
  it ('should receive change notification from the server', async function() {
    let component = new WebsocketNotifier;
    let token;
    component.addEventListener('connection', (evt) => {
      token = evt.connection.token;
    })
    let changes;
    component.addEventListener('notify', (evt) => {
      changes = evt.changes;
    })
    let result = await component.connect(baseURL);
    await delay(50);
    let payload = {
      changes: {
        'global.user': {
          ids: [1, 2],
          gns: [3, 3],
        }
      }
    };
    await TestServer.send(token, payload);
    await delay(50);
    expect(changes).to.be.an('array');
    component.disconnect();
  })
  it ('should keep trying to connect until succeeding', async function() {
    await TestServer.stop();
    setTimeout(() => {
      TestServer.start(port);
    }, 500);
    let component = new WebsocketNotifier({ reconnectionDelay: 50 });
    let result = await component.connect(baseURL);
    expect(result).to.be.true;
    component.disconnect();
  })
  it ('should reconnect to server after disconnection', async function() {
    let component = new WebsocketNotifier({ reconnectionDelay: 50 });
    let disconnected = false;
    component.addEventListener('disconnect', (evt) => {
      disconnected = true;
    })
    let result = await component.connect(baseURL);
    expect(result).to.be.true;
    await TestServer.stop();
    await TestServer.start(port);
    await delay(50);
    expect(disconnected).to.be.true;
    expect(component.reconnectionCount).to.be.above(0);
    expect(component.socket).to.not.be.null;
    component.disconnect();
  })
  after(() => {
    return TestServer.stop();
  })
})
