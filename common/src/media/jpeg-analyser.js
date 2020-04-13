/**
 * Get the orientation of a JPEG image
 *
 * @param  {Uint8Array} bytes
 *
 * @return {Object|undefined}
 */
function getDimensions(bytes) {
	let p = findSegment(bytes, (marker, p, length) => {
		if (marker === 0xFFC0 || marker === 0xFFC2) {
			return p;
		}
	});
	if (p > 0) {
		let precision = bytes[p++];
		let height = beShort(bytes[p++], bytes[p++]);
		let width = beShort(bytes[p++], bytes[p++]);
		return { width, height };
	}
}

/**
 * Get the orientation of a JPEG image
 *
 * @param  {Uint8Array} bytes
 *
 * @return {number|undefined}
 */
function getOrientation(bytes) {
	let short = beShort;
	let long = beLong;
	let p = findSegment(bytes, (marker, start, length) => {
		// look for APP1
		if (marker === 0xFFE1) {
			// see if the identifier is "Exif\0\0"
			let p = start;
			let end = start + length;
			if(bytes[p++] == 0x45 && bytes[p++] == 0x78
			&& bytes[p++] == 0x69 && bytes[p++] == 0x66
			&& bytes[p++] == 0x00 && bytes[p++] == 0x00) {
				let base = p;
				// see if data is stored in Big Endian (MM) or Little Endian (II)
				let endian = String.fromCharCode(bytes[p++]) + String.fromCharCode(bytes[p++]);
				if (endian === 'II') {
					short = leShort;
					long = leLong;
				}
				let magic = short(bytes[p++], bytes[p++]);
				if (magic !== 42) {
					return;
				}
				do {
					// find offset to IFD
					let offset = long(bytes[p++], bytes[p++], bytes[p++], bytes[p++]);
					if (offset === 0) {
						break;
					}
					p = base + offset;

					// look through the Exif tags
					let tagCount = short(bytes[p++], bytes[p++]);
					for (let i = 0; i < tagCount; i++) {
						let tagID = short(bytes[p++], bytes[p++]);
						let tagType = short(bytes[p++], bytes[p++]);
						let valueCount = long(bytes[p++], bytes[p++], bytes[p++], bytes[p++]);
						if (tagID === 0x0112 && tagType === 3 && valueCount === 1) {
							return p;
						} else {
							p += 4;
						}
					}
				} while(p < end);
			}
		}
	});
	if (p > 0) {
		let value = short(bytes[p++], bytes[p++]);
		return value;
	}
}

function beShort(b1, b2) {
	return b1 << 8 | b2;
}

function leShort(b1, b2) {
	return b2 << 8 | b1;
}

function beLong(b1, b2, b3, b4) {
	return b1 << 24 | b2 << 16 | b3 << 8 | b4;
}

function leLong(b1, b2, b3, b4) {
	return b4 << 24 | b3 << 16 | b2 << 8 | b1;
}

/**
 * Find embeded paths in a JPEG image
 *
 * @param  {Uint8Array} bytes
 *
 * @return {Object|null}
 */
function extractPaths(bytes) {
  let p = findPhotoshopSegment(bytes);
  if(p !== -1) {
    return parse8BIMData(bytes, p);
  }
  return null;
};

/**
 * Find a JPEG segment
 *
 * @param  {Uint8Array}   bytes
 * @param  {Function} callback
 *
 * @return {number}
 */
function findSegment(bytes, callback) {
	let size = bytes.length;
	let p = 0;
	let signature = beShort(bytes[p++], bytes[p++]);
	if(signature == 0xFFD8) {
		// look for segment with the APP13 marker
		while(p < size) {
			let marker = beShort(bytes[p++], bytes[p++]);
			let length = beShort(bytes[p++], bytes[p++]);
			if(marker == 0xFFDA) {
				// image data starts--time to stop
				break;
			}
			let result = callback(marker, p, length);
			if (result !== undefined && result !== false) {
				return result;
			}
			p += length - 2;
		}
	}
	return -1;
}

/**
 * Look for Photoshop metadata
 *
 * @param  {Uint8Array} bytes
 *
 * @return {number}
 */
function findPhotoshopSegment(bytes) {
	return findSegment(bytes, (marker, p) => {
		if(marker == 0xFFED) {
			// see if the identifier is "Photoshop 3.0"
			if(bytes[p++] == 0x50 && bytes[p++] == 0x68
			&& bytes[p++] == 0x6F && bytes[p++] == 0x74
			&& bytes[p++] == 0x6F && bytes[p++] == 0x73
			&& bytes[p++] == 0x68 && bytes[p++] == 0x6F
			&& bytes[p++] == 0x70 && bytes[p++] == 0x20
			&& bytes[p++] == 0x33 && bytes[p++] == 0x2E
			&& bytes[p++] == 0x30) {
				return p;
			}
		}
	});
}

/**
 * Parse 8BIM data in search of paths
 *
 * @param  {Uint8Array} bytes
 * @param  {number} offset
 *
 * @return {Object|null}
 */
function parse8BIMData(bytes, offset) {
	let size = bytes.length;
	let paths = null;
	let p = offset;
	while(p + 4 < size) {
		// look for '8BIM' marker
		if(bytes[p+0] == 0x38 && bytes[p+1] == 0x42 && bytes[p+2] == 0x49 && bytes[p+3] == 0x4D) {
			p += 4;
			let segmentType = beShort(bytes[p++], bytes[p++]);
			let nameLength = bytes[p++];
			let name = '';
			for(let i = 0; i < nameLength; i++) {
				name += String.fromCharCode(bytes[p++]);
			}
			p++;
			let unknown = beShort(bytes[p++], bytes[p++]);
			let segmentSize = beShort(bytes[p++], bytes[p++]);
			if(segmentType >= 1999 && segmentType <= 2998) {
				if(!paths) {
					paths = {};
				}
				paths[name] = parsePathData(bytes, p, segmentSize);
			}
			p += segmentSize;
		} else {
			p++;
		}
	}
	return paths;
}

/**
 * Parse a path at given offset
 *
 * @param  {Uint8Array} bytes
 * @param  {number} offset
 * @param  {number} size
 *
 * @return {Array}
 */
function parsePathData(bytes, offset, size) {
	let recordCount = size / 26;
	let knotCount = 0;
	let path = [];
	let subPath = [];
	let p = offset;
	for(let i = 0; i < recordCount; i++) {
		let selector = beShort(bytes[p++], bytes[p++]);
		switch(selector) {
			case 0:
			case 3:
				knotCount = beShort(bytes[p++], bytes[p++]);
				p += 22;
				break;
			case 1:
			case 2:
			case 4:
			case 5:
				for(let j = 0; j < 3; j++) {
					let y = beLong(bytes[p++], bytes[p++], bytes[p++], bytes[p++]);
					let x = beLong(bytes[p++], bytes[p++], bytes[p++], bytes[p++]);
					if(y >= 2147483648) {
						y = (2147483647 - y) / 16777216.0;
					} else {
						y = y / 16777216.0;
					}
					if(x >= 2147483648) {
						x = (2147483647 - x) / 16777216.0;
					} else {
						x = x / 16777216.0;
					}
					subPath.push({ x:x, y:y });
				}

				knotCount--;
				if(knotCount == 0) {
					subPath.push(subPath.shift());
					subPath.push(subPath[0]);
					path.push(subPath);
					subPath = [];
				}
				break;
			default:
				p += 24;
		}
	}
	return path;
}

export {
	getDimensions,
	getOrientation,
	extractPaths,
};
