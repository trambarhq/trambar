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
        it('should find tags in multilingual text object', function() {
            var text = {
                en: '#hello #world',
                pl: 'Cześć'
            };
            var result = TagScanner.findTags(text);
            expect(result).to.deep.equal([ '#hello', '#world' ]);
        })
        it('ignore the hash portion of URL', function() {
            var url = `Here's a URL: https://en.wikipedia.org/wiki/Iron_Man_in_other_media#Live-action from Wikipedia`;
            var result = TagScanner.findTags(url);
            expect(result).to.deep.equal([]);
        });
        it('ignore e-mail address', function() {
            var url = `Here's an email address: someone@somewhere.net. It's bogus`;
            var result = TagScanner.findTags(url);
            expect(result).to.deep.equal([]);
        });
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
