import Promise from 'bluebird';
import { expect } from 'chai';

import BlobManager from 'transport/blob-manager';
import CordovaFile from 'transport/cordova-file';
import * as HTTPRequest from 'transport/http-request';

describe('BlobManager', function() {
    let fetchOriginal = HTTPRequest.fetch;
    after(function() {
        HTTPRequest.fetch = fetchOriginal;
    })

    describe('#manage()', function() {
        it('should accept a blob and return its URL', function() {
            let blob = new Blob([ 'Hello' ]);
            let url = BlobManager.manage(blob);
            expect(url).to.match(/^blob:/);
        })
        it('should return the same URL when given the same blob again', function() {
            let blob = new Blob([ 'Hello' ]);
            let url1 = BlobManager.manage(blob);
            let url2 = BlobManager.manage(blob);
            expect(url2).to.equal(url1);
        })
        if (process.env.PLATFORM === 'cordova') {
            it('should accept a Cordova file object', function() {
                let file = new CordovaFile('/home/bob/nice.jpg', 'image/jpeg');
                let url = BlobManager.manage(file);
                return expect(url).to.equal(file.fullPath);
            })
        }
    })
    describe('#find()', function() {
        it('should find a blob by its URL', function() {
            let blob1 = new Blob([ 'Hello' ]);
            let url = BlobManager.manage(blob1);
            let blob2 = BlobManager.find(url);
            return expect(blob2).to.equal(blob1);
        })
        it('should return null when given an unknown URL', function() {
            let url = BlobManager.find('http://does.not.exists');
            return expect(url).to.be.null;
        })
    })
    describe('#associate()', function() {
        it('should associate a blob with an external URL', function() {
            let blob1 = new Blob([ 'Hello' ]);
            let url = BlobManager.manage(blob1);
            let remoteURL = 'http://somewhere.out.there';
            BlobManager.associate(blob1, remoteURL);
            let blob2 = BlobManager.find(remoteURL);
            return expect(blob2).to.equal(blob1);
        })
    })
    describe('#fetch()', function() {
        it('should fetch a blob over HTTP', function() {
            let blob1 = new Blob([ 'Hello' ]);
            HTTPRequest.fetch = (method, url, payload, options) => {
                return Promise.resolve(blob1);
            };
            return BlobManager.fetch('http://blobhub.net/123').then((blob2) => {
                expect(blob2).to.equal(blob1);
            });
        })
        it('should return the blob if given a blob URL', function() {
            let blob1 = new Blob([ 'Hello' ]);
            let url = BlobManager.manage(blob1);
            return BlobManager.fetch(url).then((blob2) => {
                expect(blob2).to.equal(blob1);
            });
        })
        it('should not repeat a file transfer', function() {
            let blob1 = new Blob([ 'Hello' ]);
            let count = 0;
            HTTPRequest.fetch = (method, url, payload, options) => {
                count++;
                return Promise.resolve(blob1);
            };
            return BlobManager.fetch('http://blobhub.net/567').then((blob2) => {
                return BlobManager.fetch('http://blobhub.net/567').then((blob3) => {
                    expect(blob3).to.equal(blob2);
                    expect(blob2).to.equal(blob1);
                    expect(count).to.equal(1);
                });
            });
        })
    })
    describe('#release()', function() {
        it('should remove a loaded blob', function() {
            let blob1 = new Blob([ 'Hello' ]);
            let url = BlobManager.manage(blob1);
            BlobManager.release(blob1);
            let blob2 = BlobManager.find(url);
            expect(blob2).to.be.null;
            return fetchOriginal('GET', url).catch((err) => {
                return err;
            }).then((result) => {
                expect(result).to.be.an.instanceOf(Error);
            });
        })
    })
})
