import Promise from 'bluebird';
import FS from 'fs'; Promise.promisifyAll(FS);
import Path from 'path';
import Database from 'database';

import Picture from 'accessors/picture';

import * as CacheFolders from 'media-server/cache-folders';
import * as ImageManager from 'media-server/image-manager';

function importPhotos() {
    Database.open().then((db) => {
        return db.need('global').then(() => {
            var purposes = [ 'background', 'profile-image', 'project-emblem' ];
            return Promise.map(purposes, (purpose) => {
                var folder = Path.resolve(`../media/${purpose}`);
                return FS.readdirAsync(folder).each((file) => {
                    var url = `/srv/media/images/${file}`;
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

export {
    importPhotos,
};
