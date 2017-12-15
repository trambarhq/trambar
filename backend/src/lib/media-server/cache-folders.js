var _ = require('lodash');
var FS = require('fs');

var root = '/var/cache/media';
var image = `${root}/images`;
var video = `${root}/videos`;
var audio = `${root}/audios`;

module.exports = exports = {
    root,
    image,
    video,
    audio,

    create,
};

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
