import { expect } from 'chai';

import {
  findTags,
  findTagsInText,
  isTag,
} from '../tag-scanner.js';

describe('TagScanner', function() {
  describe('#findTags()', function() {
    it('should find a tag in text', function() {
      const result = findTags('Hello #world');
      expect(result).to.deep.equal([ '#world' ]);
    })
    it('should find multiple tags in text', function() {
      const result = findTags('#hello #world');
      expect(result).to.deep.equal([ '#hello', '#world' ]);
    })
    it('ignore the hash portion of URL', function() {
      const url = `Here's a URL: https://en.wikipedia.org/wiki/Iron_Man_in_other_media#Live-action from Wikipedia`;
      const result = findTags(url);
      expect(result).to.deep.equal([]);
    });
    it('ignore e-mail address', function() {
      const url = `Here's an email address: someone@somewhere.net. It's bogus`;
      const result = findTags(url);
      expect(result).to.deep.equal([]);
    });
  })
  describe('#findTagsInText', function() {
    it('should find tags in multilingual text object', function() {
      const text = {
        en: '#hello #world',
        pl: 'Cześć'
      };
      const result = findTagsInText(text, false);
      expect(result).to.deep.equal([ '#hello', '#world' ]);
    })
    it('ignore the hash portion of URL when scanning markdown text', function() {
      const text = `
Iron Man
--------

Here's a URL: https://en.wikipedia.org/wiki/Iron_Man_in_other_media#Live-action from Wikipedia
      `.trim();
      const result = findTagsInText(text, true);
      expect(result).to.deep.equal([]);
    })
    it ('ignore code sections when scanning markdown text', function() {
      const text = `
The following is messed up:

\`\`\`html
<span style="color: #ffffff">Hello</span>

<span>@hello</span>
\`\`\`

#bug for @john
      `.trim();
      const result = findTagsInText(text, true);
      expect(result).to.deep.equal([ '#bug', '@john' ]);
    })
  })
  describe('#isTag()', function() {
    it('should return true when given a tag', function() {
      const result = isTag('#hello');
      expect(result).to.be.true;
    })
    it('should return false when given something that is not a tag', function() {
      const result = isTag('hello world');
      expect(result).to.be.false;
    })
    it('should return false when the text contains a tag somewhere', function() {
      const result = isTag('hello #world');
      expect(result).to.be.false;
    })
    it('should return false when the text contains a tag at the beginning', function() {
      const result = isTag('#hello world');
      expect(result).to.be.false;
    })
  });
})
