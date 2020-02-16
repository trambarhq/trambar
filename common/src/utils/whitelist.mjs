import _ from 'lodash';

/**
 * Return true if a email address matches an item on a whitelist
 *
 * @param  {String} email
 * @param  {String} whitelist
 *
 * @return {Boolean}
 */
function match(email, whitelist) {
  let items = _.split(_.trim(whitelist), /\s*\n\s*/);
  let emailParts = _.split(email, '@');
  let name = emailParts[0];
  let domain = emailParts[1];
  return _.some(items, (item) => {
    if (/^#/.test(item)) {
      return;
    }
    let permitted = _.split(item, '@');
    if (permitted.length === 1) {
      if (domain === permitted[0]) {
        return true;
      }
    } else if (permitted.length === 2) {
      if (domain === permitted[1] && name === permitted[0]) {
        return true;
      }
    }
  });
}

export {
  match,
};
