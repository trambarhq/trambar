import Bluebird from 'bluebird';
import FS from 'fs'; Bluebird.promisifyAll(FS);
import Path from 'path';
import Database from '../database.mjs';

import Picture from '../accessors/picture.mjs';

import * as CacheFolders from './cache-folders.mjs';
import * as ImageManager from './image-manager.mjs';

async function importPhotos() {
    const db = await Database.open();
    await db.need('global');
    const purposes = [ 'background', 'profile-image', 'project-emblem' ];
    for (let purpose of purposes) {
        const folder = Path.resolve(`../media/${purpose}`);
        const files = await FS.readdirAsync(folder);
        for (let file of files) {
            const url = `/srv/media/images/${file}`;
            const pictureCriteria = { purpose, url };
            const picture = await Picture.findOne(db, 'global', pictureCriteria, 'id');
            if (picture) {
                // exists in the database already
                continue;
            }

            // assume the files are already named as their MD5 hash
            const srcPath = `${folder}/${file}`;
            const metadata = await ImageManager.getImageMetadata(srcPath);

            const details = {
                url,
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
            };
            picture = { purpose, details };
            await Picture.insertOne(db, 'global', picture);

            const dstPath = `${CacheFolders.image}/${file}`;
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
