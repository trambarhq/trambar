import { expect } from 'chai';

import * as Markdown from '../markdown';

describe('Markdown', function() {
    describe('#detect()', function() {
        it('should detect that text contains Markdown formatting', function() {
            let text = `_hello_ world`;
            let result = Markdown.detect(text);
            expect(result).to.be.true;
        })
        it('should detect that text does not contain Markdown formatting', function() {
            let text = `This is a test`;
            let result = Markdown.detect(text);
            expect(result).to.be.false;
        })
    });
    describe('#findReferencedResource()', function() {
        let resources = [
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
})
