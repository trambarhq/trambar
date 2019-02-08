import { expect } from 'chai';
import TestServer from './lib/test-server';

import * as HTTPRequest from 'transport/http-request';

let port = 7878;
let baseURL = `http://localhost:${port}`;

describe('HTTPRequest', function() {
    before(function() {
        return TestServer.start(port);
    })

    describe('#fetch()', function() {
        it('should retrieve a JSON object using GET', async function() {
            let url = `${baseURL}/echo`;
            let payload = {
                msg: 'hello world',
                life: 42,
            };
            let options = {
                responseType: 'json'
            };
            let result = await HTTPRequest.fetch('GET', url, payload, options);
            expect(result).to.have.property('life', '42');
        })
        it('should retrieve a JSON object using POST', async function() {
            let url = `${baseURL}/echo`;
            let payload = {
                life: 42,
            };
            let options = {
                contentType: 'application/json',
                responseType: 'json'
            };
            let result = await HTTPRequest.fetch('POST', url, payload, options);
            expect(result).to.have.property('life', 42);
        })
        it('should retrieve a string using GET', async function() {
            let url = `${baseURL}/echo`;
            let payload = {
                msg: 'hello world',
                life: 42,
            };
            let options = {
                responseType: 'text'
            };
            let result = await HTTPRequest.fetch('GET', url, payload, options);
            expect(result).to.be.a('string');
        })
        it('should retrieve a blob using GET', async function() {
            let url = `${baseURL}/echo`;
            let payload = {
                msg: 'hello world',
                life: 42,
            };
            let options = {
                responseType: 'blob'
            };
            let result = await HTTPRequest.fetch('GET', url, payload, options);
            expect(result).to.be.an.instanceof(Blob);
        })
        it('should reject with an error when the host is unreachable', async function() {
            this.timeout(5000);
            let url = 'http://domain.test/';
            let error;
            try {
                await HTTPRequest.fetch('GET', url);
            } catch (err) {
                error = err;
            }
            expect(error).to.be.an('error');
        })
        it('should reject with an error when timeout is short', async function() {
            let url = `${baseURL}/delay/1000`;
            let options = {
                timeout: 200
            };
            let error;
            try {
                await HTTPRequest.fetch('GET', url, {}, options);
            } catch (err) {
                error = err;
            }
            expect(error).to.be.an('error');
        })
    })
    after(function() {
        return TestServer.stop();
    })
})
