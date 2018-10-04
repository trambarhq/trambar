import _ from 'lodash';
import { expect } from 'chai';

import * as UniversalLink from 'routing/universal-link';

describe('UniversalLink', function() {
    describe('#form()', function() {
        it('should form a URL with given address and path', function() {
            let link = UniversalLink.form('https://example.net', '/trambar/news/?a=hello&b=1#world');
            expect(link).to.equal('https://trambar.io/https/example.net/trambar/news/?a=hello&b=1#world');
        })
    })
    describe('#parse()', function() {
        it('should find the path', function() {
            let url = 'https://trambar.io/https/example.net/trambar/news/?a=hello&b=1#world';
            let info = UniversalLink.parse(url);
            expect(info).to.have.property('address', 'https://example.net');
            expect(info).to.have.property('url', '/trambar/news/?a=hello&b=1#world');
        })
    })
})
