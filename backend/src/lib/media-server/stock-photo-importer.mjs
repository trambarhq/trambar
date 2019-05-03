import Bluebird from 'bluebird';
import FS from 'fs'; Bluebird.promisifyAll(FS);
import Path from 'path';
import Database from 'database';

import Picture from 'accessors/picture';

import * as CacheFolders from 'media-server/cache-folders';
import * as ImageManager from 'media-server/image-manager';

async function importPhotos() {
    let db = await Database.open();
    await db.need('global');
    let purposes = [ 'background', 'profile-image', 'project-emblem' ];
    for (let purpose of purposes) {
        let folder = Path.resolve(`../media/${purpose}`);
        let files = await FS.readdirAsync(folder);
        for (let file of files) {
            let url = `/srv/media/images/${file}`;
            let pictureCriteria = { purpose, url };
            let picture = await Picture.findOne(db, 'global', pictureCriteria, 'id');
            if (picture) {
                // exists in the database already
                continue;
            }

            // assume the files are already named as their MD5 hash
            let srcPath = `${folder}/${file}`;
            let metadata = await ImageManager.getImageMetadata(srcPath);

            let details = {
                url,
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
            };
            picture = { purpose, details };
            await Picture.insertOne(db, 'global', picture);

            let dstPath = `${CacheFolders.image}/${file}`;
            try {
                await FS.statAsync(dstPath);
            } catch (err) {
                console.log(dstPath + ' -> ' + srcPath);
                await FS.symlinkAsync(srcPath, dstPath);

            }
        }
    }
}

export {
    importPhotos,
};
