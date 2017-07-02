var _ = require('lodash');
var Chai = require('chai'), expect = Chai.expect;

var ListParser = require('utils/list-parser');

describe('ListParser', function() {
    describe('#extract', function() {
        it('should extract list from text', function() {
            var text = `
Pick an item:

[ ] item 1
[ ] item 2
[ ] item 3
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

                [ ] item 1
                [ ] item 2
                [ ] item 3
            `
            var tokens = ListParser.extract(text);
            expect(tokens[0]).to.be.a('string');
            expect(tokens[1]).to.be.an('array').that.has.lengthOf(3);
            _.each(tokens[1], (item) => {
                expect(item).to.have.property('before').that.contains('    ');
            });
        })
        it('should extract items varying number of whitespaces between the brackets', function() {
            var text = `
                Pick an item:

                [] item 1
                [ ] item 2
                [  ] item 3
                [   ] item 4
            `
            var tokens = ListParser.extract(text);
            expect(tokens[0]).to.be.a('string');
            expect(tokens[1]).to.be.an('array').that.has.lengthOf(4);
        })
        it('should extract items that have been checked', function() {
            var text = `
                Pick an item:

                [x] item 1
                [ x ] item 2
                [x ] item 3
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

                [ ] item 1
                [ ] item 2
                [ ] item 3

                Pick another item:

                [ ] item 4
                [ ] item 5
            `
            var tokens = ListParser.extract(text);
            expect(tokens[0]).to.be.a('string');
            expect(tokens[1]).to.be.an('array').that.has.lengthOf(3);
            expect(tokens[2]).to.be.a('string');
            expect(tokens[3]).to.be.an('array').that.has.lengthOf(2);
        })
        it('should capture text before and after an item', function() {
            var text = 'start\n[ ] item 1\nend';
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
    describe('#update', function() {
        it('should not alter whitespace within the text', function() {
            var text = `
                Pick an item:

                [ ] item 1
                [ ] item 2
                [ ] item 3

                Pick another item:

                [ ] item 4
                [ ] item 5
            `
            text = ListParser.update(text, 1, false);
            text = ListParser.update(text, 4, false);
            expect(text).to.be.a('string').that.equals(text);
        })
        it('should not alter whitespace within the text', function() {
            var text = `
                Pick an item:

                [ ] item 1
                [ ] item 2
                [ ] item 3

                Pick another item:

                [ ] item 4
                [ ] item 5
            `
            text = ListParser.update(text, 1, true);
            text = ListParser.update(text, 4, true);
            var tokens = ListParser.extract(text);
            tokens = _.flattenDeep(tokens);
            var item1 = _.find(tokens, { key: 1 });
            var item2 = _.find(tokens, { key: 2 });
            var item4 = _.find(tokens, { key: 4 });
            expect(item1).to.have.property('checked').that.equals(true);
            expect(item2).to.have.property('checked').that.equals(false);
            expect(item4).to.have.property('checked').that.equals(true);
        })
    })
})
