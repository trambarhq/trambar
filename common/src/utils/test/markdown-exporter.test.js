import { expect } from 'chai';

import * as MarkdownExporter from '../markdown-exporter.js';

describe('MarkdownExporter', function() {
  describe('#escape()', function() {
    it('should escape Markdown characters with slashes', function() {
      let text1 = '_hello_ world';
      let text2 = '* This is a [test]';
      let result1 = MarkdownExporter.escape(text1);
      let result2 = MarkdownExporter.escape(text2);
      expect(result1).to.equal('\\_hello\\_ world');
      expect(result2).to.equal('\\* This is a \\[test\\]');
    });
  })
  describe('#attachResources()', function() {
    it('should attach resources as thumbnails', function() {
      let resources = [
        { type: 'image', url: '/images/0', clip: { left: 5, top: 5, width: 100, height: 100 } },
        { type: 'video', url: '/videos/0', poster_url: '/images/1', clip: { left: 5, top: 5, width: 100, height: 100 } },
        { type: 'image', url: '/images/2', clip: { left: 5, top: 5, width: 100, height: 100 } },
      ];
      let address = 'https://example.net';
      let text = 'Hello world';
      let result = MarkdownExporter.attachResources(text, resources, address);
      let expected = `\
Hello world

[![image-1-thumb]][image-1] [![video-1-thumb]][video-1] [![image-2-thumb]][image-2]

[image-1]: https://example.net/images/0
[image-1-thumb]: https://example.net/images/0/cr5-5-100-100+re128-128
[video-1]: https://example.net/videos/0
[video-1-thumb]: https://example.net/images/1/cr5-5-100-100+re128-128
[image-2]: https://example.net/images/2
[image-2-thumb]: https://example.net/images/2/cr5-5-100-100+re128-128`;
      expect(result).to.equal(expected);
    })
    it('should replace embedded image tag with ones utililizing icon', function() {
      let resources = [
        { type: 'image', url: '/images/0', clip: { left: 5, top: 5, width: 100, height: 100 } },
        { type: 'video', url: '/videos/0', poster_url: '/images/1', clip: { left: 5, top: 5, width: 100, height: 100 } },
        { type: 'image', url: '/images/2', clip: { left: 5, top: 5, width: 100, height: 100 } },
      ];
      let address = 'https://example.net';
      let text = `\
Image 1: ![picture-1]
Image 2: ![photo-2]
Video 1: ![video-1]
`;
      let result = MarkdownExporter.attachResources(text, resources, address);
      let expected = `\
Image 1: [![image-1-icon]][image-1]
Image 2: [![image-2-icon]][image-2]
Video 1: [![video-1-icon]][video-1]

[image-1]: https://example.net/images/0
[image-1-icon]: https://example.net/images/0/cr5-5-100-100+re24-24
[video-1]: https://example.net/videos/0
[video-1-icon]: https://example.net/images/1/cr5-5-100-100+re24-24
[image-2]: https://example.net/images/2
[image-2-icon]: https://example.net/images/2/cr5-5-100-100+re24-24`;
      expect(result).to.equal(expected);
    })
    it('should add thumbnail to unreferenced resources', function() {
      let resources = [
        { type: 'image', url: '/images/0', clip: { left: 5, top: 5, width: 100, height: 100 } },
        { type: 'video', url: '/videos/0', poster_url: '/images/1', clip: { left: 5, top: 5, width: 100, height: 100 } },
        { type: 'image', url: '/images/2', clip: { left: 5, top: 5, width: 100, height: 100 } },
      ];
      let address = 'https://example.net';
      let text = `\
Image 1: ![picture-1]
`;
      let result = MarkdownExporter.attachResources(text, resources, address);
      let expected = `\
Image 1: [![image-1-icon]][image-1]

[![video-1-thumb]][video-1] [![image-2-thumb]][image-2]

[image-1]: https://example.net/images/0
[image-1-icon]: https://example.net/images/0/cr5-5-100-100+re24-24
[video-1]: https://example.net/videos/0
[video-1-thumb]: https://example.net/images/1/cr5-5-100-100+re128-128
[image-2]: https://example.net/images/2
[image-2-thumb]: https://example.net/images/2/cr5-5-100-100+re128-128`;
      expect(result).to.equal(expected);
    })
    it('should use special clipart for audio resource', function() {
      let resources = [
        { type: 'audio', url: '/audios/0' },
      ];
      let address = 'https://example.net';
      let text = `\
Listen to this: ![audio-1]
`;
      let result = MarkdownExporter.attachResources(text, resources, address);
      let expected = `\
Listen to this: [![audio-1-icon]][audio-1]

[audio-1]: https://example.net/audios/0
[audio-1-icon]: https://example.net/srv/media/cliparts/speaker-icon.png`;
      expect(result).to.equal(expected);
    })
  })
})
