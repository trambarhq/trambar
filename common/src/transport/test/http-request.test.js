var Chai = require('chai'), expect = Chai.expect;

var HTTPRequest = require('transport/http-request');

describe('HTTPRequest', function() {
    describe('#fetch()', function() {
        it('should retrieve a JSON object using GET', function() {
            var url = 'http://httpbin.org/get';
            var payload = {
                msg: 'hello world',
                life: 42,
            };
            var options = {
                responseType: 'json'
            };
            return HTTPRequest.fetch('GET', url, payload, options).then((result) => {
                expect(result).to.have.deep.property('args.life', '42');
            });
        })
        it('should retrieve a JSON object using POST', function() {
            var url = 'http://httpbin.org/post';
            var payload = {
                life: 42,
            };
            var options = {
                contentType: 'application/json',
                responseType: 'json'
            };
            return HTTPRequest.fetch('POST', url, payload, options).then((result) => {
                expect(result).to.have.property('data').to.contain('42');
            });
        })
        it('should retrieve a string object using GET', function() {
            var url = 'http://httpbin.org/get';
            var payload = {
                msg: 'hello world',
                life: 42,
            };
            var options = {
                responseType: 'text'
            };
            return HTTPRequest.fetch('GET', url, payload, options).then((result) => {
                expect(result).to.be.a('string');
            });
        })
        it('should retrieve a blob using GET', function() {
            var url = 'http://httpbin.org/get';
            var payload = {
                msg: 'hello world',
                life: 42,
            };
            var options = {
                responseType: 'blob'
            };
            return HTTPRequest.fetch('GET', url, payload, options).then((result) => {
                expect(result).to.be.a('blob');
            });
        })
        it('should reject with an error when the host is unreachable', function() {
            this.timeout(5000);
            var url = 'http://domain.test/';
            return HTTPRequest.fetch('GET', url).catch((err) => {
                expect(err).to.be.an('error');
            }).then((result) => {
                expect(result).to.be.an('undefined');
            });
        })
        it('should reject with an error when timeout is short', function() {
            var url = 'http://httpbin.org/delay/1';
            var options = {
                timeout: 200
            };
            var promise = HTTPRequest.fetch('GET', url, {}, options).catch((err) => {
                expect(err).to.be.an('error');
            }).then((result) => {
                expect(result).to.be.an('undefined');
            });
        })
    })
})
