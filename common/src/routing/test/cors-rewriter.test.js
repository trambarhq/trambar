import { expect } from 'chai';

import { CORSRewriter } from '../cors-rewriter.js';

describe('CORSRewriter', function() {
  describe('#extract()', function() {
    it('should extract an address from the path part of a URL', function() {
      let urlParts = {
        path: '/https/death-star.ge/somewhere/info'
      };
      let params = {};
      CORSRewriter.from(urlParts, params);
      expect(urlParts.path).to.equal('/somewhere/info');
      expect(params.address).to.equal('https://death-star.ge');
      expect(params.cors).to.be.true;
    })
    it('should add address of document to parameters when there is no CORS host', function() {
      let urlParts = {
        path: '/somewhere/info'
      };
      let params = {};
      CORSRewriter.from(urlParts, params);
      expect(urlParts.path).to.equal('/somewhere/info');
      expect(params.address).to.equal(`http://localhost`);
      expect(params.cors).to.be.false;
    })
  })
  describe('#insert()', function() {
    it('should insert CORS host address into path', function() {
      let urlParts = {
        path: '/somewhere/info'
      };
      let params = {
        cors: true,
        address: 'https://death-star.ge'
      };
      CORSRewriter.to(urlParts, params);
      expect(urlParts.path).to.equal('/https/death-star.ge/somewhere/info');
    })
    it('should do nothing when CORS is not employed', function() {
      let urlParts = {
        path: '/somewhere/info'
      };
      let params = {
        cors: false,
        address: `${location.protocol}//${location.host}`
      };
      CORSRewriter.to(urlParts, params);
      expect(urlParts.path).to.equal('/somewhere/info');
    })
  })
})
