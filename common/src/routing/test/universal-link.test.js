import _ from 'lodash';
import { expect } from 'chai';

import UniversalLink from 'routing/universal-link';

describe('UniversalLink', function() {
    describe('#form()', function() {
        it('should form a URL with given address and path', function() {
            let url = UniversalLink.form('https://example.net', '/trambar/news');
            expect(url).to.equal('https://trambar.io/https/example.net/trambar/news');
        })
        it('should form a URL with query letiables', function() {
            let url = UniversalLink.form('https://example.net', '/trambar/news', { a: 'hello', b: 1 });
            expect(url).to.equal('https://trambar.io/https/example.net/trambar/news?a=hello&b=1');
        })
        it('should form a URL with query letiables and hash ', function() {
            let url = UniversalLink.form('https://example.net', '/trambar/news', { a: 'hello', b: 1 }, 'world');
            expect(url).to.equal('https://trambar.io/https/example.net/trambar/news?a=hello&b=1#world');
        })
    })
    describe('#parse()', function() {
        it('should find the address and path', function() {
            let url = 'https://trambar.io/https/example.net/trambar/news';
            let info = UniversalLink.parse(url);
            expect(info).to.have.property('address', 'https://example.net')
            expect(info).to.have.property('path', '/trambar/news');
        })
        it('should find the query letiables', function() {
            let url = 'https://trambar.io/https/example.net/trambar/news?a=hello&b=1';
            let info = UniversalLink.parse(url);
            expect(info).to.have.deep.property('query.a', 'hello');
            expect(info).to.have.deep.property('query.b', '1');
        })
        it('should find the hash', function() {
            let url = 'https://trambar.io/https/example.net/trambar/news?a=hello&b=1#world';
            let info = UniversalLink.parse(url);
            expect(info).to.have.property('hash', 'world');
        })
    })
})
