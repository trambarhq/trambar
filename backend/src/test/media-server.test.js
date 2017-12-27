var _ = require('lodash');
var Promise = require('bluebird');
var Chai = require('chai'), expect = Chai.expect;
var FS = Promise.promisifyAll(require('fs'));
var Path = require('path');
var Sharp = require('sharp');
var Request = require('request');

// service being tested
var MediaServer = require('media-server');

describe('MediaServer', function() {
    before(function() {
        if (!process.env.DOCKER_MOCHA) {
            return this.skip();
        }
        return MediaServer.start();
    })
    it('should accept an image upload', function() {
        var url = `http://localhost/media/images/upload/`;
        var path = `${__dirname}/images/pultusk.jpg`;
        return uploadFiles([ path ], url, 'images', 'image/jpeg').then((resp) => {
            expect(resp).to.have.property('statusCode', 200);
        });
    })
    it('should accept multiple images', function() {
        var url = `http://localhost/media/images/upload/`;
        var path1 = `${__dirname}/images/pultusk.jpg`;
        var path2 = `${__dirname}/images/krzeszowice.jpg`;
        return uploadFiles([ path1, path2 ], url, 'images', 'image/jpeg').then((resp) => {
            var results = JSON.parse(resp.body);
            expect(results.files).to.have.property('length', 2);
        });
    })
    it('should serve an image that was sent earlier', function() {
        var url = `http://localhost/media/images/upload/`;
        var path = `${__dirname}/images/pultusk.jpg`;
        return uploadFiles([ path ], url, 'images', 'image/jpeg').then((resp) => {
            var results = JSON.parse(resp.body);
            var file = _.first(results.files);
            var imageURL = `http://localhost${file.url}`;
            return retrieveFile(imageURL).then((resp) => {
                var buffer = resp.body;
                expect(buffer.length).to.be.above(1000);
            });
        });
    })
    it('should serve a resized version of an image', function() {
        var url = `http://localhost/media/images/upload/`;
        var path = `${__dirname}/images/pultusk.jpg`;
        return uploadFiles([ path ], url, 'images', 'image/jpeg').then((resp) => {
            var results = JSON.parse(resp.body);
            var file = _.first(results.files);
            var filters = [
                'width400',
                'gray',
                'quality90'
            ];
            var imageURL = `http://localhost${file.url}/${filters.join('+')}`;
            return retrieveFile(imageURL).then((resp) => {
                var image = Sharp(resp.body);
                return Promise.resolve(image.metadata()).then((metadata) => {
                    expect(metadata).to.have.property('width', 400);
                    expect(metadata).to.have.property('format', 'jpeg');
                });
            });
        });
    })
    it('should serve PNG version of an image', function() {
        var url = `http://localhost/media/images/upload/`;
        var path = `${__dirname}/images/pultusk.jpg`;
        return uploadFiles([ path ], url, 'images', 'image/jpeg').then((resp) => {
            var results = JSON.parse(resp.body);
            var file = _.first(results.files);
            var filters = [
                'width400',
            ];
            var imageURL = `http://localhost${file.url}/${filters.join('+')}.png`;
            return retrieveFile(imageURL).then((resp) => {
                var image = Sharp(resp.body);
                return Promise.resolve(image.metadata()).then((metadata) => {
                    expect(metadata).to.have.property('format', 'png');
                });
            });
        });
    })
    it('should generate a screenshot of a website', function() {
        var url = `http://localhost/media/html/screenshot/`;
        var payload = {
            url: 'http://www.google.com/'
        };
        return retrieveData(url, payload).then((resp) => {
            var screenshot = resp.body;
            var screenshotURL = `http://localhost${screenshot.url}`;
            return retrieveFile(screenshotURL).then((resp) => {
                var image = Sharp(resp.body);
                return Promise.resolve(image.metadata()).then((metadata) => {
                    expect(metadata).to.have.property('format', 'jpeg');
                    expect(metadata).to.have.property('width').that.is.above(500);
                    expect(screenshot).to.have.property('title', 'Google');
                });
            });

        });
    }).timeout(20000)
    after(function() {
        if (MediaServer) {
            return MediaServer.stop();
        }
    })
})

function retrieveData(url, payload) {
    return new Promise((resolve, reject) => {
        var options = {
            body: payload,
            json: true,
            url,
        };
        var req = Request.post(options, function(err, resp, body) {
            if (!err) {
                resolve(resp);
            } else {
                reject(err);
            }
        });
    });
}

function retrieveFile(url) {
    return new Promise((resolve, reject) => {
        var req = Request.get({ url, encoding: null }, function(err, resp, body) {
            if (!err) {
                resolve(resp);
            } else {
                reject(err);
            }
        });
    });
}

function uploadFiles(paths, url, varName, mimeType) {
    return Promise.map(paths, (path) => {
        return FS.readFileAsync(path).then((buffer) => {
            buffer.filename = Path.basename(path);
            return buffer;
        });
    }).then((buffers) => {
        return new Promise((resolve, reject) => {
            var req = Request.post(url, function(err, resp, body) {
                if (!err) {
                    resolve(resp);
                } else {
                    reject(err);
                }
            });
            var form = req.form();
            _.each(buffers, (buffer) => {
                form.append(varName, buffer, {
                    filename: buffer.filename,
                    contentType: mimeType
                });
            });
        });
    });
}
