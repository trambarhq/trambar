/**
 * Return a square cropping rect that's centered on the image
 *
 * @param  {number} width
 * @param  {number} height
 *
 * @return {Object}
 */
function centerSquare(width, height) {
  let left = 0, top = 0;
  let length = Math.min(width, height);
  if (width > length) {
    left = Math.floor((width - length) / 2);
  } else if (height > length) {
    top = Math.floor((height - length) / 2);
  }
  return { left, top, width: length, height: length };
}

export {
  centerSquare,
};
