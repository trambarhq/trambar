import { expect } from 'chai';
import TestServer from './lib/test-server';

import HTTPRequest from 'transport/http-request';

var port = 7878;
var baseURL = `http://localhost:${port}`;

describe('HTTPRequest', function() {
    before(function() {
        return TestServer.start(port);
    })

    describe('#fetch()', function() {
        it('should retrieve a JSON object using GET', function() {
            let url = `${baseURL}/echo`;
            let payload = {
                msg: 'hello world',
                life: 42,
            };
            let options = {
                responseType: 'json'
            };
            return HTTPRequest.fetch('GET', url, payload, options).then((result) => {
                expect(result).to.have.property('life', '42');
            });
        })
        it('should retrieve a JSON object using POST', function() {
            let url = `${baseURL}/echo`;
            let payload = {
                life: 42,
            };
            let options = {
                contentType: 'application/json',
                responseType: 'json'
            };
            return HTTPRequest.fetch('POST', url, payload, options).then((result) => {
                expect(result).to.have.property('life', 42);
            });
        })
        it('should retrieve a string using GET', function() {
            let url = `${baseURL}/echo`;
            let payload = {
                msg: 'hello world',
                life: 42,
            };
            let options = {
                responseType: 'text'
            };
            return HTTPRequest.fetch('GET', url, payload, options).then((result) => {
                expect(result).to.be.a('string');
            });
        })
        it('should retrieve a blob using GET', function() {
            let url = `${baseURL}/echo`;
            let payload = {
                msg: 'hello world',
                life: 42,
            };
            let options = {
                responseType: 'blob'
            };
            return HTTPRequest.fetch('GET', url, payload, options).then((result) => {
                expect(result).to.be.an.instanceof(Blob);
            });
        })
        it('should reject with an error when the host is unreachable', function() {
            this.timeout(5000);
            let url = 'http://domain.test/';
            return HTTPRequest.fetch('GET', url).catch((err) => {
                expect(err).to.be.an('error');
            }).then((result) => {
                expect(result).to.be.an('undefined');
            });
        })
        it('should reject with an error when timeout is short', function() {
            let url = `${baseURL}/delay/1000`;
            let options = {
                timeout: 200
            };
            let promise = HTTPRequest.fetch('GET', url, {}, options).catch((err) => {
                expect(err).to.be.an('error');
            }).then((result) => {
                expect(result).to.be.an('undefined');
            });
        })
    })
    after(function() {
        return TestServer.stop();
    })
})
