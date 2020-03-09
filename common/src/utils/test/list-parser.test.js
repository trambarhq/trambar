import { expect } from 'chai';

import {
  extractListItems,
  setListItem,
  updateListItem,
  findListItem,
  countListItems,
  isList,
  stringifyList,
} from '../list-parser.js';

describe('ListParser', function() {
  describe('#extract()', function() {
    it('should extract list from text', function() {
      const text = `
Pick an item:

* [ ] item 1
* [ ] item 2
* [ ] item 3
      `
      const tokens = extractListItems(text);
      expect(tokens[0]).to.have.property('text');
      expect(tokens[1]).to.be.an('array').that.has.lengthOf(3);
      for (let item of tokens[1]) {
        expect(item).to.have.property('label').that.match(/item \d/);
        expect(item).to.have.property('key').that.is.a('number');
      }
    })
    it('should extract items with whitespaces in front of them', function() {
      const text = `
        Pick an item:

        * [ ] item 1
        * [ ] item 2
        * [ ] item 3
      `
      const tokens = extractListItems(text);
      expect(tokens[0]).to.have.property('text');
      expect(tokens[1]).to.be.an('array').that.has.lengthOf(3);
      for (let item of tokens[1]) {
        expect(item).to.have.property('before').that.contains('  ');
      }
    })
    it('should extract items that have been checked', function() {
      const text = `
        Pick an item:

        * [x] item 1
        * [x] item 2
        * [x] item 3
      `
      const tokens = extractListItems(text);
      expect(tokens[0]).to.have.property('text');
      expect(tokens[1]).to.be.an('array').that.has.lengthOf(3);
      for (let item of tokens[1]) {
        expect(item).to.have.property('checked').that.equals(true);
      }
    })
    it('should extract multiple lists', function() {
      const text = `
        Pick an item:

        * [ ] item 1
        * [ ] item 2
        * [ ] item 3

        Pick another item:

        * [ ] item 4
        * [ ] item 5
      `
      const tokens = extractListItems(text);
      expect(tokens[0]).to.have.property('text');
      expect(tokens[1]).to.be.an('array').that.has.lengthOf(3);
      expect(tokens[2]).to.have.property('text');
      expect(tokens[3]).to.be.an('array').that.has.lengthOf(2);
    })
    it('should capture text before and after an item', function() {
      const text = 'start\n* [ ] item 1\nend';
      const tokens = extractListItems(text);
      expect(tokens[0]).to.have.property('text', 'start\n');
      expect(tokens[2]).to.have.property('text', '\nend');
    })
    it('should just return the text when there is no list', function() {
      const text = 'This is a test and this is only a test\n\nHello world';
      const tokens = extractListItems(text);
      expect(tokens).to.be.an('array').that.that.has.lengthOf(1);
      expect(tokens[0]).to.have.property('text', text);
    })
  })
  describe('#stringifyList', function() {
    it('should reproduce the original text', function() {
      const text = `
        Pick an item:

        * [ ] item 1
        * [ ] item 2
        * [ ] item 3

        Pick another item:

        * [ ] item 4
        * [ ] item 5
      `
      const tokens = extractListItems(text);
      const output = stringifyList(tokens);
      expect(output).to.equal(text);
    })
  })
  describe('#find', function() {
    it('should find an item', function() {
      const text = `
        Pick an item:

        * [ ] item 1
        * [ ] item 2
        * [ ] item 3

        Pick another item:

        * [ ] item 4
        * [ ] item 5
      `
      const tokens = extractListItems(text);
      const item2 = findListItem(tokens, 1, 2);
      const item5 = findListItem(tokens, 2, 5);
      expect(item2).to.have.property('label', 'item 2');
      expect(item5).to.have.property('label', 'item 5');
    })
  })
  describe('#count', function() {
    it('should count the number of items', function() {
      const text = `
        Pick an item:

        * [x] item 1
        * [x] item 2
        * [ ] item 3

        Pick another item:

        * [x] item 4
        * [ ] item 5
      `
      const tokens = extractListItems(text);
      const count = countListItems(tokens);
      expect(count).to.equal(5);
    })
    it('should count the number of checked/unchecked items', function() {
      const text = `
        Pick an item:

        * [x] item 1
        * [x] item 2
        * [ ] item 3

        Pick another item:

        * [x] item 4
        * [ ] item 5
      `
      const tokens = extractListItems(text);
      const count1 = countListItems(tokens, true);
      const count2 = countListItems(tokens, false);
      expect(count1).to.equal(3);
      expect(count2).to.equal(2);
    })
  })
  describe('#set()', function() {
    it('should correctly set items', function() {
      const text = `
        Pick an item:

        * [ ] item 1
        * [ ] item 2
        * [ ] item 3

        Pick another item:

        * [ ] item 4
        * [ ] item 5
      `
      const tokens = extractListItems(text);
      setListItem(tokens, 1, 1, true);
      setListItem(tokens, 2, 4, true);
      const item1 = findListItem(tokens, 1, 1);
      const item2 = findListItem(tokens, 1, 2);
      const item4 = findListItem(tokens, 2, 4);
      expect(item1).to.have.property('checked', true);
      expect(item2).to.have.property('checked', false);
      expect(item4).to.have.property('checked', true);
    })
    it('should correctly unset items', function() {
      const text = `
        Pick an item:

        * [x] item 1
        * [x] item 2
        * [ ] item 3

        Pick another item:

        * [X] item 4
        * [ ] item 5
      `
      const tokens = extractListItems(text);
      setListItem(tokens, 1, 1, false);
      setListItem(tokens, 2, 4, false);
      const item1 = findListItem(tokens, 1, 1);
      const item2 = findListItem(tokens, 1, 2);
      const item4 = findListItem(tokens, 2, 4);
      expect(item1).to.have.property('checked', false);
      expect(item2).to.have.property('checked', true);
      expect(item4).to.have.property('checked', false);
    })
    it('should clear other items when an item is set', function() {
      const text = `
        Pick an item:

        * [ ] item 1
        * [x] item 2
        * [ ] item 3

        Pick another item:

        * [X] item 4
        * [ ] item 5
      `
      const tokens = extractListItems(text);
      setListItem(tokens, 1, 1, true, true);
      setListItem(tokens, 2, 5, true, true);
      const item1 = findListItem(tokens, 1, 1);
      const item2 = findListItem(tokens, 1, 2);
      const item4 = findListItem(tokens, 2, 4);
      const item5 = findListItem(tokens, 2, 5);
      expect(item1).to.have.property('checked', true);
      expect(item2).to.have.property('checked', false);
      expect(item4).to.have.property('checked', false);
      expect(item5).to.have.property('checked', true);
    })
    it('should use Cyrillic x (ch) when label is in Cyrillic', function() {
      const text = `
        Выберите пункт:

        * [ ] пункт 1
        * [ ] пункт 2
        * [ ] пункт 3
      `;
      const tokens = extractListItems(text);
      setListItem(tokens, 1, 1, true);
      const item1 = findListItem(tokens, 1, 1);
      expect(item1).to.have.property('answer', '\u0445');
    })
  })
})
