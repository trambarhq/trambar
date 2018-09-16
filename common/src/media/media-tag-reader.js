import _ from 'lodash';
import Promise from 'bluebird';
import JSMediaTags from 'jsmediatags/dist/jsmediatags';

function extractAlbumArt(blob) {
    return new Promise((resolve, reject) => {
        let reader = new JSMediaTags.Reader(blob);
        reader.setTagsToRead([ 'picture' ]);
        reader.read({
            onSuccess: function(meta) {
                let picture = _.get(meta, 'tags.picture');
                if (picture && picture.data) {
                    let data = picture.data;
                    let bytes = new Uint8Array(data)
                    let blob = new Blob([ bytes ], { type: picture.format });
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

export {
    extractAlbumArt,
};
