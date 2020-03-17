async function extractAlbumArt(blob) {
  const { Reader } = await import('jsmediatags/dist/jsmediatags.min.js' /* webpackChunkName: "jsmediatags" */);
  return new Promise((resolve, reject) => {
    const reader = new Reader(blob);
    reader.setTagsToRead([ 'picture' ]);
    reader.read({ onSuccess, onError });

    function onSuccess(meta) {
      const picture = meta.tags?.picture;
      if (picture?.data) {
        const bytes = new Uint8Array(picture.data)
        const blob = new Blob([ bytes ], { type: picture.format });
        resolve(blob);
      } else {
        resolve(null);
      }
    }

    function onError(error) {
      resolve(null)
    }
  });
}

export {
  extractAlbumArt,
};
