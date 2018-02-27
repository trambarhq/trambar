var _ = require('lodash');
var Chai = require('chai'), expect = Chai.expect;

var CORSRewriter = require('routing/cors-rewriter');

describe('CORSRewriter', function() {
    describe('#extract()'), function() {
        it('should extract an address from the path part of a URL', function() {
            var urlParts = {
                path: '/https/death-star.ge/somewhere/info'
            };
            var params = {};
            CORSRewriter.extract(urlParts, params);
            expect(urlParts.path).to.equal('/somewhere/info');
            expect(params.address).to.equal('https://death-star.ge');
            expect(params.cors).to.be.true;
        })
        it('should add address of document to parameters when there is no CORS host', function() {
            var urlParts = {
                path: '/somewhere/info'
            };
            var params = {};
            CORSRewriter.extract(urlParts, params);
            expect(urlParts.path).to.equal('/somewhere/info');
            expect(params.address).to.equal(`${location.protocol}//${location.host}`);
            expect(params.cors).to.be.false;
        })
    })
    describe('#insert()'), function() {
        it('should insert CORS host address into path', function() {
            var urlParts = {
                path: '/somewhere/info'
            };
            var params = {
                cors: true,
                address: 'https://death-star.ge'
            };
            CORSRewriter.insert(urlParts, params);
            expect(urlParts.path).to.equal('/https/death-star.ge/somewhere/info');
        })
        it('should do nothing when CORS is not employed', function() {
            var urlParts = {
                path: '/somewhere/info'
            };
            var params = {
                cors: false,
                address: `${location.protocol}//${location.host}`
            };
            CORSRewriter.insert(urlParts, params);
            expect(urlParts.path).to.equal('/somewhere/info');
        })
    })
})
