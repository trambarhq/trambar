import _ from 'lodash';

async function extractAlbumArt(blob) {
    let module = await import('jsmediatags/dist/jsmediatags' /* webpackChunkName: "jsmediatags" */);
    return new Promise((resolve, reject) => {
        let reader = new module.Reader(blob);
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
