var _ = require('lodash');
var Chai = require('chai'), expect = Chai.expect;

var ListParser = require('utils/list-parser');

describe('ListParser', function() {
    describe('#extract()', function() {
        it('should extract list from text', function() {
            var text = `
Pick an item:

* [ ] item 1
* [ ] item 2
* [ ] item 3
            `
            var tokens = ListParser.extract(text);
            expect(tokens[0]).to.be.a('string');
            expect(tokens[1]).to.be.an('array').that.has.lengthOf(3);
            _.each(tokens[1], (item) => {
                expect(item).to.have.property('label').that.match(/item \d/);
                expect(item).to.have.property('key').that.is.a('number');
            });
        })
        it('should extract items with whitespaces in front of them', function() {
            var text = `
                Pick an item:

                * [ ] item 1
                * [ ] item 2
                * [ ] item 3
            `
            var tokens = ListParser.extract(text);
            expect(tokens[0]).to.be.a('string');
            expect(tokens[1]).to.be.an('array').that.has.lengthOf(3);
            _.each(tokens[1], (item) => {
                expect(item).to.have.property('before').that.contains('    ');
            });
        })
        it('should extract items that have been checked', function() {
            var text = `
                Pick an item:

                * [x] item 1
                * [x] item 2
                * [x] item 3
            `
            var tokens = ListParser.extract(text);
            expect(tokens[0]).to.be.a('string');
            expect(tokens[1]).to.be.an('array').that.has.lengthOf(3);
            _.each(tokens[1], (item) => {
                expect(item).to.have.property('checked').that.equals(true);
            });
        })
        it('should extract multiple lists', function() {
            var text = `
                Pick an item:

                * [ ] item 1
                * [ ] item 2
                * [ ] item 3

                Pick another item:

                * [ ] item 4
                * [ ] item 5
            `
            var tokens = ListParser.extract(text);
            expect(tokens[0]).to.be.a('string');
            expect(tokens[1]).to.be.an('array').that.has.lengthOf(3);
            expect(tokens[2]).to.be.a('string');
            expect(tokens[3]).to.be.an('array').that.has.lengthOf(2);
        })
        it('should capture text before and after an item', function() {
            var text = 'start\n* [ ] item 1\nend';
            var tokens = ListParser.extract(text);
            expect(tokens[0]).to.be.a('string').that.equals('start\n');
            expect(tokens[2]).to.be.a('string').that.equals('\nend');
        })
        it('should just return the text when there is no list', function() {
            var text = 'This is a test and this is only a test\n\nHello world';
            var tokens = ListParser.extract(text);
            expect(tokens).to.be.an('array').that.that.has.lengthOf(1);
            expect(tokens[0]).to.be.a('string').that.equals(text);
        })
    })
    describe('#join', function() {
        it('should reproduce the original text', function() {
            var text = `
                Pick an item:

                * [ ] item 1
                * [ ] item 2
                * [ ] item 3

                Pick another item:

                * [ ] item 4
                * [ ] item 5
            `
            var tokens = ListParser.extract(text);
            var output = ListParser.join(tokens);
            expect(output).to.be.a('string').that.equals(text);
        })
    })
    describe('#find', function() {
        it('should find an item', function() {
            var text = `
                Pick an item:

                * [ ] item 1
                * [ ] item 2
                * [ ] item 3

                Pick another item:

                * [ ] item 4
                * [ ] item 5
            `
            var tokens = ListParser.extract(text);
            var item2 = ListParser.find(tokens, 1, 2);
            var item5 = ListParser.find(tokens, 2, 5);
            expect(item2).to.have.property('label', 'item 2');
            expect(item5).to.have.property('label', 'item 5');
        })
    })
    describe('#count', function() {
        it('should count the number of items', function() {
            var text = `
                Pick an item:

                * [x] item 1
                * [x] item 2
                * [ ] item 3

                Pick another item:

                * [x] item 4
                * [ ] item 5
            `
            var tokens = ListParser.extract(text);
            var count = ListParser.count(tokens);
            expect(count).to.equal(5);
        })
        it('should count the number of checked/unchecked items', function() {
            var text = `
                Pick an item:

                * [x] item 1
                * [x] item 2
                * [ ] item 3

                Pick another item:

                * [x] item 4
                * [ ] item 5
            `
            var tokens = ListParser.extract(text);
            var count1 = ListParser.count(tokens, true);
            var count2 = ListParser.count(tokens, false);
            expect(count1).to.equal(3);
            expect(count2).to.equal(2);
        })
    })
    describe('#set()', function() {
        it('should correctly set items', function() {
            var text = `
                Pick an item:

                * [ ] item 1
                * [ ] item 2
                * [ ] item 3

                Pick another item:

                * [ ] item 4
                * [ ] item 5
            `
            var tokens = ListParser.extract(text);
            ListParser.set(tokens, 1, 1, true);
            ListParser.set(tokens, 2, 4, true);
            var item1 = ListParser.find(tokens, 1, 1);
            var item2 = ListParser.find(tokens, 1, 2);
            var item4 = ListParser.find(tokens, 2, 4);
            expect(item1).to.have.property('checked', true);
            expect(item2).to.have.property('checked', false);
            expect(item4).to.have.property('checked', true);
        })
        it('should correctly unset items', function() {
            var text = `
                Pick an item:

                * [x] item 1
                * [x] item 2
                * [ ] item 3

                Pick another item:

                * [X] item 4
                * [ ] item 5
            `
            var tokens = ListParser.extract(text);
            ListParser.set(tokens, 1, 1, false);
            ListParser.set(tokens, 2, 4, false);
            var item1 = ListParser.find(tokens, 1, 1);
            var item2 = ListParser.find(tokens, 1, 2);
            var item4 = ListParser.find(tokens, 2, 4);
            expect(item1).to.have.property('checked', false);
            expect(item2).to.have.property('checked', true);
            expect(item4).to.have.property('checked', false);
        })
        it('should clear other items when an item is set', function() {
            var text = `
                Pick an item:

                * [ ] item 1
                * [x] item 2
                * [ ] item 3

                Pick another item:

                * [X] item 4
                * [ ] item 5
            `
            var tokens = ListParser.extract(text);
            ListParser.set(tokens, 1, 1, true, true);
            ListParser.set(tokens, 2, 5, true, true);
            var item1 = ListParser.find(tokens, 1, 1);
            var item2 = ListParser.find(tokens, 1, 2);
            var item4 = ListParser.find(tokens, 2, 4);
            var item5 = ListParser.find(tokens, 2, 5);
            expect(item1).to.have.property('checked', true);
            expect(item2).to.have.property('checked', false);
            expect(item4).to.have.property('checked', false);
            expect(item5).to.have.property('checked', true);
        })
        it('should use Cyrillic x (ch) when label is in Cyrillic', function() {
            var text = `
                Выберите пункт:

                * [ ] пункт 1
                * [ ] пункт 2
                * [ ] пункт 3
            `;
            var tokens = ListParser.extract(text);
            ListParser.set(tokens, 1, 1, true);
            var item1 = ListParser.find(tokens, 1, 1);
            expect(item1).to.have.property('answer', '\u0445');
        })
    })
})
