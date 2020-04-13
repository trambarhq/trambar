import _ from 'lodash';

/**
 * Parse contents of a .ini file for properties of web bookmark
 *
 * @param  {string} text
 *
 * @return {Object|null}
 */
function parseLink(text) {
  const props = {};
  const lines = text.split(/[\r\n]+/);
  for (let line of lines) {
    const m = /^(\w+)\s*=\s*(.*)/.exec(line);
    if (m) {
      const name = m[1].toLowerCase();
      const value = m[2].trim();
      props[name] = value;
    }
  }
  return (props.url) ? props : null;
}

export {
  parseLink,
};
