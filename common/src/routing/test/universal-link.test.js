import { expect } from 'chai';

import {
  createActivationURL,
  parseActivationURL,
} as UniversalLink from '../universal-link.js';

describe('UniversalLink', function() {
  describe('#createActivationURL()', function() {
    it('should form a URL with given address and path', function() {
      let url = createActivationURL('https://example.net', 'catbert', '0123456789');
      expect(url).to.equal('https://trambar.io/https/example.net/?ac=0123456789&p=catbert');
    })
  })
  describe('#parseActivationURL()', function() {
    it('should find the path', function() {
      let url = 'https://trambar.io/https/example.net/?ac=0123456789&p=catbert';
      let info = parseActivationURL(url);
      expect(info).to.have.property('address', 'https://example.net');
      expect(info).to.have.property('activationCode', '0123456789');
      expect(info).to.have.property('schema', 'catbert');
    })
  })
})
