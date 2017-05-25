/**
 * Parse embeded path in a JPEG image
 *
 * @param  {Uint8Array} bytes
 *
 * @return {Object|null}
 */
exports.parse = function(bytes) {
    var p = findPhotoshopSegment(bytes);
    if(p !== -1) {
        return parse8BIMData(bytes, p);
    }
    return null;
};

exports.createSVGPath = function(path, w, h) {
	var commands = [];
	for(var j = 0; j < path.length; j++) {
		var s = path[j];
        var x0 = Math.round(s[0].x * w);
        var y0 = Math.round(s[0].y * h);
		commands.push('M' + x0 + ',' + y0);
		for(var i = 1; i + 2 < s.length; i += 3) {
            var x1 = Math.round(s[i].x * w);
            var y1 = Math.round(s[i].y * h);
            var x2 = Math.round(s[i+1].x * w);
            var y2 = Math.round(s[i+1].y * h);
            var x3 = Math.round(s[i+2].x * w);
            var y3 = Math.round(s[i+2].y * h);
			commands.push('C' + x1 + ',' + y1 + ' ' + x2 + ',' + y2 + ' ' + x3 + ',' + y3);
		}
	}
	return commands.join(' ');
};

/**
 * Look for Photoshop metadata
 *
 * @param  {Uint8Array} bytes
 *
 * @return {Number}
 */
function findPhotoshopSegment(bytes) {
	var size = bytes.length;
	var p = 0;
	var signature = bytes[p++] << 8 | bytes[p++];

	if(signature == 0xFFD8) {
		// look for segment with the APP13 marker
		while(p < size) {
			var marker = bytes[p++] << 8 | bytes[p++];
			var length = bytes[p++] << 8 | bytes[p++];
			if(marker == 0xFFED) {
				// see if the identifier is "Photoshop 3.0"
				if(bytes[p+0] == 0x50 && bytes[p+1] == 0x68 && bytes[p+2] == 0x6F && bytes[p+3] == 0x74
				&& bytes[p+4] == 0x6F && bytes[p+5] == 0x73 && bytes[p+6] == 0x68 && bytes[p+7] == 0x6F
				&& bytes[p+8] == 0x70 && bytes[p+9] == 0x20  && bytes[p+10] == 0x33 && bytes[p+11] == 0x2E
				&& bytes[p+12] == 0x30) {
					p += 14;
					return p;
				}
			} else if(marker == 0xFFDA) {
				// image data starts--time to stop
				break;
			}
			p += length - 2;
		}
	}
    return -1;
}

/**
 * Parse 8BIM data in search of paths
 *
 * @param  {Uint8Array} bytes
 * @param  {Number} offset
 *
 * @return {Object|null}
 */
function parse8BIMData(bytes, offset) {
	var size = bytes.length;
	var paths = null;
	var p = offset;
	while(p + 4 < size) {
		// look for '8BIM' marker
		if(bytes[p+0] == 0x38 && bytes[p+1] == 0x42 && bytes[p+2] == 0x49 && bytes[p+3] == 0x4D) {
			p += 4;
			var segmentType = bytes[p++] << 8 | bytes[p++];
			var nameLength = bytes[p++];
			var name = '';
			for(var i = 0; i < nameLength; i++) {
				name += String.fromCharCode(bytes[p++]);
			}
			p++;
			var unknown = bytes[p++] << 8 | bytes[p++];
			var segmentSize = bytes[p++] << 8 | bytes[p++];
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
 * @param  {Number} offset
 * @param  {Number} size
 *
 * @return {Array}
 */
function parsePathData(bytes, offset, size) {
	var recordCount = size / 26;
	var knotCount = 0;
	var path = [];
	var subPath = [];
	var p = offset;
	for(var i = 0; i < recordCount; i++) {
		var selector = bytes[p++] << 8 | bytes[p++];
		switch(selector) {
			case 0:
			case 3:
				knotCount = bytes[p++] << 8 | bytes[p++];
				p += 22;
				break;
			case 1:
			case 2:
			case 4:
			case 5:
				for(var j = 0; j < 3; j++) {
					var y = bytes[p++] << 24 | bytes[p++] << 16 | bytes[p++] << 8 | bytes[p++];
					var x = bytes[p++] << 24 | bytes[p++] << 16 | bytes[p++] << 8 | bytes[p++];
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
