var _ = require('lodash');
var Chai = require('chai'), expect = Chai.expect;

var Markdown = require('utils/markdown');

describe('Markdown', function() {
    describe('#detect()', function() {
        it('should detect that text contains Markdown formatting', function() {
            var text = `_hello_ world`;
            var result = Markdown.detect(text);
            expect(result).to.be.true;
        })
        it('should detect that text does not contain Markdown formatting', function() {
            var text = `This is a test`;
            var result = Markdown.detect(text);
            expect(result).to.be.false;
        })
    });
    describe('#findReferencedResource()', function() {
        var resources = [
            { type: 'image' },
            { type: 'video' },
            { type: 'audio' },
            { type: 'website' },
            { type: 'image' },
        ]
        it('should find resources by number (or not)', function() {
            expect(Markdown.findReferencedResource(resources, 'image-1')).to.equal(resources[0]);
            expect(Markdown.findReferencedResource(resources, 'image-2')).to.equal(resources[4]);
            expect(Markdown.findReferencedResource(resources, 'video-2')).to.be.null;
        })
        it('should find image resources by name variants', function() {
            expect(Markdown.findReferencedResource(resources, 'photo-1')).to.equal(resources[0]);
            expect(Markdown.findReferencedResource(resources, 'picture-2')).to.equal(resources[4]);
        })
        it('should find use the first resource when number is omitted', function() {
            expect(Markdown.findReferencedResource(resources, 'image')).to.equal(resources[0]);
            expect(Markdown.findReferencedResource(resources, 'video')).to.equal(resources[1]);
            expect(Markdown.findReferencedResource(resources, 'audio')).to.equal(resources[2]);
            expect(Markdown.findReferencedResource(resources, 'website')).to.equal(resources[3]);
        })
    })
    describe('#attachClipRect()', function() {
        it('should attach clipping rectangle coordinates as query variables to URL', function() {
            var url = 'blob://something';
            var rect = { left: 4, top: 8, width: 50, height: 100 };
            var newURL = Markdown.attachClipRect(url, rect);
            expect(newURL).to.equal(`${url}?left=4&top=8&width=50&height=100`);
        })
    })
})
