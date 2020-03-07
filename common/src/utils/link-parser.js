import _ from 'lodash';

/**
 * Parse contents of a .ini file for properties of web bookmark
 *
 * @param  {String} text
 *
 * @return {Object|null}
 */
function parseLink(text) {
  let props = {};
  let re = /^(\w+)=(.*)/g;
  let lines = _.split(text, /[\r\n]+/);
  for (let line of lines) {
    let match = /^(\w+)\s*=\s*(.*)/.exec(line);
    if (match) {
      let name = _.lowerCase(match[1]);
      let value = _.trim(match[2]);
      props[name] = value;
    }
  }
  return (props.url) ? props : null;
}

export {
  parseLink,
};
