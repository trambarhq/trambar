var Promise = require('bluebird');
var FS = Promise.promisifyAll(require('fs'));
var Path = require('path');
var Database = require('database');

var Picture = require('accessors/picture');

var CacheFolders = require('media-server/cache-folders');
var ImageManager = require('media-server/image-manager');

module.exports = {
    importPhotos,
};

function importPhotos() {
    Database.open().then((db) => {
        return db.need('global').then(() => {
            var purposes = [ 'background', 'profile-image', 'project-emblem' ];
            return Promise.map(purposes, (purpose) => {
                var folder = Path.resolve(`../media/${purpose}`);
                return FS.readdirAsync(folder).each((file) => {
                    var url = `/media/images/${file}`;
                    var criteria = { purpose, url };
                    return Picture.findOne(db, 'global', criteria, 'id').then((picture) => {
                        if (picture) {
                            return false;
                        }
                        // assume the files are already named as their MD5 hash
                        var srcPath = `${folder}/${file}`;
                        return ImageManager.getImageMetadata(srcPath).then((metadata) => {
                            var details = {
                                url,
                                width: metadata.width,
                                height: metadata.height,
                                format: metadata.format,
                            };
                            var picture = { purpose, details };
                            return Picture.insertOne(db, 'global', picture);
                        }).then((picture) => {
                            var dstPath = `${CacheFolders.image}/${file}`;
                            return FS.statAsync(dstPath).then((stat) => {
                                return true;
                            }).catch((err) => {
                                console.log(dstPath + ' -> ' + srcPath);
                                return FS.symlinkAsync(srcPath, dstPath).return(true);
                            });
                        });
                    });
                });
            });
        });
    });
}
