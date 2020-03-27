const schema = 'global';
const table = 'picture';

async function savePictures(db, pictures) {
  const picturesAfter = await db.save({ schema, table }, pictures);
  return picturesAfter;
}

async function removePictures(db, pictures) {
  const pictureChanges = pictures.map((picture) => {
    return {
      id: picture.id,
      deleted: true,
    };
  });
  return savePictures(db, pictures);
}

async function uploadPictures(db, payloads, files) {
  // lists from event objects would disappear after an await operation
  files = files.slice();

  const currentUserID = await db.start();
  const newPictures = [];
  // create a picture object for each file, attaching payloads to them
  for (let file of files) {
    if (/^image\//.test(file.type)) {
      const payload = payloads.add('image').attachFile(file);
      const meta = await MediaLoader.getImageMetadata(file);
      newPictures.push({
        purpose,
        user_id: currentUserID,
        details: {
          payload_token: payload.id,
          width: meta.width,
          height: meta.height,
          format: meta.format,
        },
      });
    }
  }
  // save picture objects
  const savedPictures = savePictures(db, newPictures);
  for (let savedPicture of savedPictures) {
    // send the payload
    payloads.dispatch(savedPicture);
  }
  return savedPictures;
}

export {
  savePictures,
  removePictures,
  uploadPictures,
};
