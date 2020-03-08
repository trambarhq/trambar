import _ from 'lodash';

function getRestName(rest, env) {
  const { p } = env.locale;
  let name = _.get(rest, 'details.title');
  if (!name) {
    name = _.get(rest, 'name');
  }
  return name;
}

export {
  getRestName,
};
