import Bluebird from 'bluebird';
import FS from 'fs'; Bluebird.promisifyAll(FS);
import Path from 'path';
import { Database } from '../database.mjs';
import { TaskLog } from '../task-log.mjs';

import { Picture } from '../accessors/picture.mjs';

import * as CacheFolders from './cache-folders.mjs';
import * as ImageManager from './image-manager.mjs';

async function importPhotos() {
  const db = await Database.open();
  await db.need('global');
  const purposes = [ 'background', 'profile-image', 'project-emblem' ];
  const taskLog = TaskLog.start('stock-photo-import');
  try {
    for (let purpose of purposes) {
      const folder = Path.resolve(`../media/${purpose}`);
      const files = await FS.readdirAsync(folder);
      for (let file of files) {
        const url = `/srv/media/images/${file}`;
        const pictureCriteria = { purpose, url };
        let picture = await Picture.findOne(db, 'global', pictureCriteria, 'id');
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
          taskLog.describe(`creating symlink: ${dstPath} -> ${srcPath}`);
          await FS.symlinkAsync(srcPath, dstPath);
        }
      }
      taskLog.append('added', purpose);
    }
    await taskLog.finish();
  } catch (err) {
    await taskLog.abort(err);
  }
}

export {
  importPhotos,
};
