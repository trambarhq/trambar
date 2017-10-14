var _ = require('lodash');
var FS = require('fs');

exports.root = '/var/cache/media';
exports.image = `${exports.root}/images`;
exports.video = `${exports.root}/videos`;
exports.audio = `${exports.root}/audios`;

exports.create = create;

/**
 * Create cache folders if they don't exist yet
 */
function create() {
    var folders = [
        exports.root,
        exports.image,
        exports.video, exports.audio
    ];
    _.each(folders, (folder) => {
        if (!FS.existsSync(folder)) {
            FS.mkdirSync(folder);
        }
    });
}
