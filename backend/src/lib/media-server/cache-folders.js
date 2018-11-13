import _ from 'lodash';
import FS from 'fs';

var root = '/var/cache/media';
var image = `${root}/images`;
var video = `${root}/videos`;
var audio = `${root}/audios`;

/**
 * Create cache folders if they don't exist yet
 */
function create() {
    var folders = [ root, image, video, audio ];
    _.each(folders, (folder) => {
        if (!FS.existsSync(folder)) {
            FS.mkdirSync(folder);
        }
    });
}

export {
    root,
    image,
    video,
    audio,

    create,
};
