import _ from 'lodash';

/**
 * Move the MOOV atom in a QuickTime container to the beginning of the file
 *
 * @param  {Blob} file
 *
 * @return {Promise<Blob|null>}
 */
async function optimizeVideo(file) {
  try {
    let preambles = await loadPreambles(file);
    let ftypIndex = _.findIndex(preambles, { name: 'ftyp' });
    let moovIndex = _.findIndex(preambles, { name: 'moov' });
    // process the file only if ftyp is the first atom and
    // moov isn't the second atom
    if (!(ftypIndex === 0 && moovIndex > 1)) {
      return null;
    }
    let ftyp = preambles[ftypIndex];
    let moov = preambles[moovIndex];
    let ftypData = await loadAtom(file, ftyp);
    let moovData = await loadAtom(file, moov);
    // shift offsets inside moov that reference data between ftyp
    // and moov by size of moov
    let bytes = new Uint8Array(moovData);
    shiftOffsets(bytes, 8, bytes.length, ftyp.offset + ftyp.size, moov.offset, moov.size);

    // build a new blob
    let dataBeforeMoov = file.slice(ftyp.offset + ftyp.size, moov.offset);
    let dataAfterMoov = file.slice(moov.offset + moov.size);
    let blobParts = [
      ftypData,
      moovData,
      dataBeforeMoov,
      dataAfterMoov,
    ];
    let output = new Blob(blobParts, { type: file.type });
    return output;
  } catch (err) {
    return null;
  }
}

/**
 * Recursively look for stco and co64 atoms, shifting their offsets if they
 * fall within the indicated range
 *
 * @param  {UInt8Array} bytes
 * @param  {Number} offset
 * @param  {Number} end
 * @param  {Number} rangeStart
 * @param  {Number} rangeEnd
 * @param  {Number} shift
 */
function shiftOffsets(bytes, offset, end, rangeStart, rangeEnd, shift) {
  while (offset < end) {
    let atomSize = BE32(bytes, offset);
    let atomName = NAME(bytes, offset + 4);
    if (atomSize < 8) {
      break;
    }
    switch (atomName) {
      case 'stco': // "Chunk Offset Atom"
        for (let i = 0, oc = BE32(bytes, offset + 12); i < oc; i++) {
          let doOffset = offset + 16 + (i * 4);
          let dataOffset = BE32(bytes, doOffset);
          if (rangeStart <= dataOffset && dataOffset <= rangeEnd) {
            // if the offset points to data in front of moov, shift
            // it backward to account for moov's new position
            dataOffset += shift;
            bytes[doOffset+0] = (dataOffset >> 24) & 0xFF
            bytes[doOffset+1] = (dataOffset >> 16) & 0xFF
            bytes[doOffset+2] = (dataOffset >>  8) & 0xFF
            bytes[doOffset+3] = (dataOffset >>  0) & 0xFF
          }
        }
        break;
      case 'co64': // "Chunk Offset Atom, 64-bit"
        for (let i = 0, oc = BE32(bytes, offset + 12); i < oc; i++) {
          let doOffset = offset + 16 + (i * 8);
          let dataOffset = BE64(bytes, doOffset);
          if (rangeStart <= dataOffset && dataOffset <= rangeEnd) {
            dataOffset += shift;
            bytes[doOffset+0] = (dataOffset >> 56) & 0xFF
            bytes[doOffset+1] = (dataOffset >> 48) & 0xFF
            bytes[doOffset+2] = (dataOffset >> 40) & 0xFF
            bytes[doOffset+3] = (dataOffset >> 32) & 0xFF
            bytes[doOffset+4] = (dataOffset >> 24) & 0xFF
            bytes[doOffset+5] = (dataOffset >> 16) & 0xFF
            bytes[doOffset+6] = (dataOffset >>  8) & 0xFF
            bytes[doOffset+7] = (dataOffset >>  0) & 0xFF
          }
        }
        break;
      case 'trak': // "Track Atom"
      case 'mdia': // "Media Atom"
      case 'minf': // "Media Information Atom"
      case 'stbl': // "Sample Table Atom"
        shiftOffsets(bytes, offset + 8, offset + atomSize, rangeStart, rangeEnd, shift);
        break;
    }
    offset += atomSize;
  }
}

/**
 * Load all atom preambles from file
 *
 * @param  {Blob} file
 *
 * @return {Promise<Array<Object>>}
 */
async function loadPreambles(file) {
  let preambles = [];
  let offset = 0;
  let size = file.size;
  let hasFtyp = false;
  let hasMoov = false;

  // keep scanning until we have ftype and moov
  while (!hasFtyp || !hasMoov) {
    let p = await loadPreamble(file, offset);
    let bogus = false;
    if (!hasFtyp) {
      if (p.name === 'ftyp') {
        hasFtyp = true;
      } else {
        bogus = true;
      }
    } else {
      if (p.name === 'moov') {
        hasMoov = true;
      }
    }
    offset += p.size;
    if (offset > size) {
      bogus = true;
    }
    if (bogus) {
      throw new Error('File does not appear to a QuickTime container');
    }
    preambles.push(p);
  }
  return preambles;
}

/**
 * Load atom preamble at give offset
 *
 * @param  {Blob} blob
 * @param  {Number} offset
 *
 * @return {Promise<Object>}
 */
async function loadPreamble(blob, offset) {
  return new Promise((resolve, reject) => {
    // load 16 bytes, just in case we need the 64-bit size
    let preambleSize = 16;
    let slice = blob.slice(offset, offset + preambleSize);
    let fr = new FileReader();
    fr.readAsArrayBuffer(slice);
    fr.onload = (evt) => {
      let bytes = new Uint8Array(evt.target.result);
      let size = BE32(bytes, 0);
      let min = 8;
      if (size === 1) {
        // atom size overflows a 32-bit integer
        size = BE64(bytes, 8);
        min = 16;
      }
      if (!(size >= min)) {
        reject(new Error('Invalid atom size'));
      }
      let name = NAME(bytes, 4);
      let preamble = { offset, size, name };
      resolve(preamble);
    };
    fr.onerror = (evt) => {
      reject(new Error('Unable to load data'));
    };
  });
}

/**
 * Load an atom
 *
 * @param  {Blob} blob
 * @param  {Object} preamble
 *
 * @return {Promise<ArrayBuffer>}
 */
async function loadAtom(blob, preamble) {
  return new Promise((resolve, reject) => {
    let slice = blob.slice(preamble.offset, preamble.offset + preamble.size);
    let fr = new FileReader();
    fr.readAsArrayBuffer(slice);
    fr.onload = (evt) => {
      resolve(evt.target.result);
    };
    fr.onerror = (evt) => {
      reject(new Error('Unable to load data'));
    };
  });
}

/**
 * Return 32-bit big-endian integer at byte offset
 *
 * @param  {Uint8Array} b
 * @param  {Number} i
 *
 * @return {Number}
 */
function BE32(b, i) {
  return b[i+0] << 24 | b[i+1] << 16 | b[i+2] << 8 | b[i+3];
}

/**
 * Return 64-bit big-endian integer at byte offset
 *
 * @param  {Uint8Array} b
 * @param  {Number} i
 *
 * @return {Number}
 */
function BE64(b, i) {
  return b[i+0] << 56 | b[i+1] << 48 | b[i+2] << 40 | b[i+3] << 32
     | b[i+4] << 24 | b[i+5] << 16 | b[i+6] << 8 | b[i+7];
}

/**
 * Return 4-letter atom identifier
 *
 * @param  {Uint8Array} b
 * @param  {Number} i
 *
 * @return {String}
 */
function NAME(b, i) {
  return String.fromCharCode(b[i+0]) + String.fromCharCode(b[i+1])
     + String.fromCharCode(b[i+2]) + String.fromCharCode(b[i+3]);
}

export {
  optimizeVideo,
};
