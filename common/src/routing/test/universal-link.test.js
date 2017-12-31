var _ = require('lodash');
var Chai = require('chai'), expect = Chai.expect;

var UniversalLink = require('routing/universal-link');

describe('UniversalLink', function() {
    describe('#form', function() {
        it('should form a URL with given address and path', function() {
            var url = UniversalLink.form('https://example.net', '/trambar/news');
            expect(url).to.equal('https://trambar.io/https/example.net/trambar/news');
        })
        it('should form a URL with query variables', function() {
            var url = UniversalLink.form('https://example.net', '/trambar/news', { a: 'hello', b: 1 });
            expect(url).to.equal('https://trambar.io/https/example.net/trambar/news?a=hello&b=1');
        })
        it('should form a URL with query variables and hash ', function() {
            var url = UniversalLink.form('https://example.net', '/trambar/news', { a: 'hello', b: 1 }, 'world');
            expect(url).to.equal('https://trambar.io/https/example.net/trambar/news?a=hello&b=1#world');
        })
    })
    describe('#parse', function() {
        it('should find the address and path', function() {
            var url = 'https://trambar.io/https/example.net/trambar/news';
            var info = UniversalLink.parse(url);
            expect(info).to.have.property('address', 'https://example.net')
            expect(info).to.have.property('path', '/trambar/news');
        })
        it('should find the query variables', function() {
            var url = 'https://trambar.io/https/example.net/trambar/news?a=hello&b=1';
            var info = UniversalLink.parse(url);
            expect(info).to.have.deep.property('query.a', 'hello');
            expect(info).to.have.deep.property('query.b', '1');
        })
        it('should find the hash', function() {
            var url = 'https://trambar.io/https/example.net/trambar/news?a=hello&b=1#world';
            var info = UniversalLink.parse(url);
            expect(info).to.have.property('hash', 'world');
        })
    })
})
