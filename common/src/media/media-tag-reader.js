var _ = require('lodash');
var Promise = require('bluebird');
var JSMediaTags = require('jsmediatags/dist/jsmediatags');

module.exports = {
    extractAlbumArt,
};

function extractAlbumArt(blob) {
    return new Promise((resolve, reject) => {
        var reader = new JSMediaTags.Reader(blob);
        reader.setTagsToRead([ 'picture' ]);
        reader.read({
            onSuccess: function(meta) {
                var picture = _.get(meta, 'tags.picture');
                if (picture && picture.data) {
                    var data = picture.data;
                    var bytes = new Uint8Array(data)
                    var blob = new Blob([ bytes ], { type: picture.format });
                    resolve(blob);
                } else {
                    resolve(null);
                }
            },
            onError: function(error) {
                resolve(null)
            },
        });
    });
}
