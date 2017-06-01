var _ = require('lodash');
var Promise = require('bluebird');
var Chai = require('chai'), expect = Chai.expect;
var FS = Promise.promisifyAll(require('fs'));
var Path = require('path');
var Request = require('request');

if (process.env.DOCKER_MOCHA) {
    var MediaServer = require('media-server');
    var mediaServerReady = new Promise((resolve, reject) => {
        MediaServer.onReady = () => {
            resolve();
        };
    });
}

describe('MediaServer', function() {
    before(function() {
        if (!MediaServer) {
            this.skip()
        }
    })
    it('should call the onReady handler at some point', function() {
        return mediaServerReady;
    })
    it('should accept an image upload', function() {
        var url = `http://localhost/media/images/upload/`;
        var path = `${__dirname}/images/pultusk.jpg`;
        return uploadFiles([ path ], url, 'images', 'image/jpeg').then((resp) => {
            expect(resp).to.have.property('statusCode', 200);
        });
    }).timeout(10000);
    after(function() {
        if (MediaServer) {
            MediaServer.exit();
        }
    })
})

function uploadFiles(paths, url, varName, mimeType) {
    return Promise.map(paths, (path) => {
        return FS.readFileAsync(path).then((buffer) => {
            buffer.filename = Path.basename(path);
            return buffer;
        });
    }).then((buffers) => {
        return new Promise((resolve, reject) => {
            var req = Request.post(url, function (err, resp, body) {
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
