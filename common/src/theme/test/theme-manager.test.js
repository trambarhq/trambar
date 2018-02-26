var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react');
var Chai = require('chai'), expect = Chai.expect;
var Enzyme = require('enzyme');

var ThemeManager = require('theme/theme-manager.jsx');

describe('ThemeManager', function() {
    var props = {
        modes: { A: 0, B: 400 },
        serverAddress: 'http://some-server',
        networkType: 'wifi',
        useWebP: false,
    };
    window.devicePixelRatio = 1;
    var wrapper = Enzyme.mount(<ThemeManager {...props} />);
    var manager = wrapper.instance();

    describe('#getImageURL()', function() {
        it('should return a URL to a clipped image', function() {
            var jpeg = {
                type: 'image',
                url: '/media/images/12345',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
                format: 'jpeg'
            };
            var url = manager.getImageURL(jpeg);
            expect(url).to.equal('http://some-server/media/images/12345/cr5-5-250-250.jpg');
        })
        it('should return a URL to a clipped image, resized to specified width', function() {
            var jpeg = {
                type: 'image',
                url: '/media/images/12345',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
                format: 'jpeg'
            };
            var url = manager.getImageURL(jpeg, { width: 200 });
            expect(url).to.equal('http://some-server/media/images/12345/cr5-5-250-250+w200.jpg');
        })
        it('should return a URL to a clipped image, resized to specified height', function() {
            var jpeg = {
                type: 'image',
                url: '/media/images/12345',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
                format: 'jpeg'
            };
            var url = manager.getImageURL(jpeg, { height: 100 });
            expect(url).to.equal('http://some-server/media/images/12345/cr5-5-250-250+h100.jpg');
        })
        it('should return a URL to an image, unclipped, resized to specified width and height', function() {
            var jpeg = {
                type: 'image',
                url: '/media/images/12345',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
                format: 'jpeg'
            };
            var url = manager.getImageURL(jpeg, { width: 50, height: 50, clip: null });
            expect(url).to.equal('http://some-server/media/images/12345/re50-50.jpg');
        })
        it('should return a URL to the original file', function() {
            var jpeg = {
                type: 'image',
                url: '/media/images/12345',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
                format: 'jpeg'
            };
            var url = manager.getImageURL(jpeg, { original: true });
            expect(url).to.equal('http://some-server/media/images/12345');
        })
        it('should choose PNG when original is PNG', function() {
            var png = {
                type: 'image',
                url: '/media/images/23456',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
                format: 'png'
            };
            var url = manager.getImageURL(png);
            expect(url).to.equal('http://some-server/media/images/23456/cr5-5-250-250.png');
        })
        it('should choose PNG when original is GIF', function() {
            var gif = {
                type: 'image',
                url: '/media/images/34567',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
                format: 'gif'
            };
            var url = manager.getImageURL(gif);
            expect(url).to.equal('http://some-server/media/images/34567/cr5-5-250-250.png');
        })
        it('should return a URL to a video poster (i.e. preview)', function() {
            var mp4 = {
                type: 'video',
                poster_url: '/media/images/abcdef',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
                format: 'mp4'
            };
            var url = manager.getImageURL(mp4);
            expect(url).to.equal('http://some-server/media/images/abcdef/cr5-5-250-250.jpg');
        })
        it('should return a URL to a audio poster (i.e. album art)', function() {
            var mp3 = {
                type: 'audio',
                poster_url: '/media/images/qwerty',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
                format: 'mp3'
            };
            var url = manager.getImageURL(mp3);
            expect(url).to.equal('http://some-server/media/images/qwerty/cr5-5-250-250.jpg');
        })
        it('should return a URL to a website poster (i.e. thumbnail)', function() {
            var website = {
                type: 'website',
                poster_url: '/media/images/zxcvb',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
            };
            var url = manager.getImageURL(website);
            expect(url).to.equal('http://some-server/media/images/zxcvb/cr5-5-250-250.jpg');
        })
        it('should use WebP when set to do so', function() {
            wrapper.setProps({ useWebP: true });
            var jpeg = {
                type: 'image',
                url: '/media/images/12345',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
                format: 'jpeg'
            };
            var url = manager.getImageURL(jpeg);
            expect(url).to.equal('http://some-server/media/images/12345/cr5-5-250-250.webp');
        })
        it('should choose WebP also when original is PNG', function() {
            var png = {
                type: 'image',
                url: '/media/images/23456',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
                format: 'png'
            };
            var url = manager.getImageURL(png);
            expect(url).to.equal('http://some-server/media/images/23456/cr5-5-250-250.webp');
        })
        it('should choose WebP also when original is GIF', function() {
            var gif = {
                type: 'image',
                url: '/media/images/34567',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
                format: 'gif'
            };
            var url = manager.getImageURL(gif);
            expect(url).to.equal('http://some-server/media/images/34567/cr5-5-250-250.webp');
        })
    })
    describe('#getAudioURL()', function() {
        it('should return the URL to a high-bitrate version of an audio file', function() {
            var mp3 = {
                type: 'audio',
                url: '/media/audios/qwerty',
                versions: [
                    {
                        name: '128kbps',
                        bitrates: {
                            audio: 128  * 1000,
                        },
                        format: 'mp3',
                    },
                    {
                        name: '32kbps',
                        bitrates: {
                            audio: 32  * 1000,
                        },
                        format: 'mp3',
                    },
                ],
                duration: 3000,
                format: 'mp3'
            };
            var url = manager.getAudioURL(mp3);
            expect(url).to.equal('http://some-server/media/audios/qwerty.128kbps.mp3');
        })
        it('should return the URL to the original audio file', function() {
            var mp3 = {
                type: 'audio',
                url: '/media/audios/qwerty',
                versions: [
                    {
                        name: '128kbps',
                        bitrates: {
                            audio: 128  * 1000,
                        },
                        format: 'mp3',
                    },
                    {
                        name: '32kbps',
                        bitrates: {
                            audio: 32  * 1000,
                        },
                        format: 'mp3',
                    },
                ],
                duration: 3000,
                format: 'mp3'
            };
            var url = manager.getAudioURL(mp3, { original: true });
            expect(url).to.equal('http://some-server/media/audios/qwerty');
        })
    })
    describe('#getVideoURL()', function() {
        it('should return the URL to a high-bitrate version of an video file', function() {
            var mp4 = {
                type: 'video',
                url: '/media/videos/abcdef',
                versions: [
                    {
                        name: '1000kbps',
                        bitrates: {
                            video: 1000 * 1000,
                            audio: 128 * 1000,
                        },
                        format: 'mp4',
                        width: 896,
                        height: 640,
                    },
                    {
                        name: '500kbps',
                        bitrates: {
                            video: 500 * 1000,
                            audio: 64 * 1000,
                        },
                        format: 'mp4',
                        width: 640,
                        height: 480,
                    },
                ],
                duration: 10000,
                format: 'mp4'
            };
            var url = manager.getVideoURL(mp4);
            expect(url).to.equal('http://some-server/media/videos/abcdef.1000kbps.mp4');
        })
        it('should return the URL to a low-bitrate version of an video file when bandwidth is limited', function() {
            wrapper.setProps({ networkType: '3g' });
            var mp4 = {
                type: 'video',
                url: '/media/videos/abcdef',
                versions: [
                    {
                        name: '1000kbps',
                        bitrates: {
                            video: 1000 * 1000,
                            audio: 128 * 1000,
                        },
                        format: 'mp4',
                        width: 896,
                        height: 640,
                    },
                    {
                        name: '500kbps',
                        bitrates: {
                            video: 500 * 1000,
                            audio: 64 * 1000,
                        },
                        format: 'mp4',
                        width: 640,
                        height: 480,
                    },
                ],
                duration: 10000,
                format: 'mp4'
            };
            var url = manager.getVideoURL(mp4);
            expect(url).to.equal('http://some-server/media/videos/abcdef.500kbps.mp4');
        })
    })
    describe('#getDimensions()', function() {
        it('should return the dimension of a clipped image', function() {
            var jpeg = {
                type: 'image',
                url: '/media/images/12345',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
                format: 'jpeg'
            };
            var dims = manager.getDimensions(jpeg);
            expect(dims).to.have.property('width', 250);
            expect(dims).to.have.property('height', 250);
        })
        it('should return the dimension of the original image', function() {
            var jpeg = {
                type: 'image',
                url: '/media/images/12345',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
                format: 'jpeg'
            };
            var dims = manager.getDimensions(jpeg, { original: true });
            expect(dims).to.have.property('width', 1000);
            expect(dims).to.have.property('height', 1000);
        })
        it('should return the dimension of the video version', function() {
            wrapper.setProps({ networkType: '3g' });
            var mp4 = {
                type: 'video',
                url: '/media/videos/abcdef',
                poster_url: '/media/images/abcdef',
                width: 1000,
                height: 1000,
                clip: { left: 5, top: 5, width: 250, height: 250 },
                versions: [
                    {
                        name: '1000kbps',
                        bitrates: {
                            video: 1000 * 1000,
                            audio: 128 * 1000,
                        },
                        format: 'mp4',
                        width: 896,
                        height: 640,
                    },
                    {
                        name: '500kbps',
                        bitrates: {
                            video: 500 * 1000,
                            audio: 64 * 1000,
                        },
                        format: 'mp4',
                        width: 640,
                        height: 480,
                    },
                ],
                duration: 10000,
                format: 'mp4'
            };

            var dims = manager.getDimensions(mp4, { clip: null });
            expect(dims).to.have.property('width', 640);
            expect(dims).to.have.property('height', 480);
        })
    })
})
