var _ = require('lodash');
var Chai = require('chai'), expect = Chai.expect;

var TagScanner = require('utils/tag-scanner');

describe('TagScanner', function() {
    describe('#findTags', function() {
        it('should find a tag in text', function() {
            var result = TagScanner.findTags('Hello #world');
            expect(result).to.deep.equal([ '#world' ]);
        })
        it('should find multiple tags in text', function() {
            var result = TagScanner.findTags('#hello #world');
            expect(result).to.deep.equal([ '#hello', '#world' ]);
        })
        it('should find convert upper case tags to lowercase', function() {
            var result = TagScanner.findTags('#HELLO #World');
            expect(result).to.deep.equal([ '#hello', '#world' ]);
        })
        it('should find tags in multilingual text object', function() {
            var text = {
                en: '#hello #world',
                pl: 'Cześć'
            };
            var result = TagScanner.findTags(text);
            expect(result).to.deep.equal([ '#hello', '#world' ]);
        })
    })
    describe('#isTag', function() {
        it('should return true when given a tag', function() {
            var result = TagScanner.isTag('#hello');
            expect(result).to.be.true;
        })
        it('should return false when given something that is not a tag', function() {
            var result = TagScanner.isTag('hello world');
            expect(result).to.be.false;
        })
        it('should return false when the text contains a tag somewhere', function() {
            var result = TagScanner.isTag('hello #world');
            expect(result).to.be.false;
        })
        it('should return false when the text contains a tag at the beginning', function() {
            var result = TagScanner.isTag('#hello world');
            expect(result).to.be.false;
        })
    });
})
