var Chai = require('chai'), expect = Chai.expect, assert = Chai.assert;

var HttpRequest = require('transport/http-request');

describe('HttpRequest', () => {
    describe('#fetch', () => {
        it('should retrieve a JSON object using GET', () => {
            var url = 'http://httpbin.org/get';
            var payload = {
                msg: 'hello world',
                life: 42,
            };
            var options = {
                responseType: 'json'
            };
            return HttpRequest.fetch('GET', url, payload, options).then((result) => {
                expect(result).to.have.deep.property('args.life', '42');
            });
        })
        it('should retrieve a JSON object using POST', () => {
            var url = 'http://httpbin.org/post';
            var payload = {
                life: 42,
            };
            var options = {
                contentType: 'application/json',
                responseType: 'json'
            };
            return HttpRequest.fetch('POST', url, payload, options).then((result) => {
                expect(result).to.have.property('data').to.contain('42');
            });
        })
        it('should retrieve a string object using GET', () => {
            var url = 'http://httpbin.org/get';
            var payload = {
                msg: 'hello world',
                life: 42,
            };
            var options = {
                responseType: 'text'
            };
            return HttpRequest.fetch('GET', url, payload, options).then((result) => {
                expect(result).to.be.a('string');
            });
        })
        it('should retrieve a blob using GET', () => {
            var url = 'http://httpbin.org/get';
            var payload = {
                msg: 'hello world',
                life: 42,
            };
            var options = {
                responseType: 'blob'
            };
            return HttpRequest.fetch('GET', url, payload, options).then((result) => {
                expect(result).to.be.a('blob');
            });
        })
        it('should reject with an error when the host is unreachable', () => {
            var url = 'http://domain.test/';
            return HttpRequest.fetch('GET', url).catch((err) => {
                expect(err).to.be.an('error');
            }).then((result) => {
                expect(result).to.be.an('undefined');
            });
        })
        it('should reject with an error when timeout is short', () => {
            var url = 'http://httpbin.org/delay/1';
            var options = {
                timeout: 200
            };
            var promise = HttpRequest.fetch('GET', url, {}, options).catch((err) => {
                expect(err).to.be.an('error');
            }).then((result) => {
                expect(result).to.be.an('undefined');
            });
        })
    })
})
