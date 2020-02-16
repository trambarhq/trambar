import _ from 'lodash';
import Bluebird from 'bluebird';
import FS from 'fs'; Bluebird.promisifyAll(FS);

const root = '/var/cache/media';
const image = `${root}/images`;
const video = `${root}/videos`;
const audio = `${root}/audios`;

/**
 * Create cache folders if they don't exist yet
 */
async function create() {
  const folders = [ root, image, video, audio ];
  for (let folder of folders) {
    try {
      await FS.statAsync(folder);
    } catch (err) {
      await FS.mkdirAsync(folder);
    }
  }
}

export {
  root,
  image,
  video,
  audio,

  create,
};
