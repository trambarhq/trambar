function getOrientationMatrix(orientation, width, height) {
  switch (orientation) {
    case 1:
      // normal
      return [1, 0, 0, 1, 0, 0];
    case 2:
      // flip horizontally
      return [-1, 0, 0, 1, width, 0];
    case 3:
      // rotate 180
      return [-1, 0, 0, -1, width, height];
    case 4:
      // flip vertically
      return [1, 0, 0, -1, 0, height];
    case 5:
      // transpose
      return [0, 1, 1, 0, 0, 0];
    case 6:
      // rotate 90
      return [0, 1, -1, 0, height, 0];
    case 7:
      // transverse
      return [0, -1, -1, 0, height, width];
    case 8:
      return [0, -1, 1, 0, 0, width];
    default:
      return [1, 0, 0, 1, 0, 0];
  }
}

/**
 * Calculate inverse of affine matrix
 *
 * @param  {number[]} m
 *
 * @return {number[]}
 */
function invertMatrix(m) {
	let [a, b, c, d, e, f] = m;
	let dt = (a * d - b * c);
	return [
		d / dt,
		-b / dt,
		-c / dt,
		a / dt,
		(c * f - d * e) / dt,
		-(a * f - b * e) / dt,
	];
}

/**
 * Transform a point using affine matrix
 *
 * @param  {number[]} m
 * @param  {number[]} p
 *
 * @return {number[]}
 */
function transform(m, p) {
	let [a, b, c, d, e, f] = m;
	let [x, y] = p;
	return [
		a * x + c * y + e,
		b * x + d * y + f,
	];
}

/**
 * Transform a rectangle using affine matrix
 *
 * @param  {number[]} m
 * @param  {Object} r
 *
 * @return {Object}
 */
function transformRect(m, r) {
	let c1 = [ r.left, r.top ];
	let c2 = [ r.left + r.width, r.top + r.height ];
	c1 = transform(m, c1);
	c2 = transform(m, c2);
	return {
		width: Math.abs(c2[0] - c1[0]),
		height: Math.abs(c2[1] - c1[1]),
		left: Math.min(c2[0], c1[0]),
		top: Math.min(c2[1], c1[1]),
	};
}

export {
  getOrientationMatrix,
  invertMatrix,
  transformRect,
};
