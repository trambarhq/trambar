import _ from 'lodash';

function getRoleName(role, env) {
  const { p } = env.locale;
  return p(_.get(role, 'details.title')) || _.get(role, 'name') || '';
}

export {
  getRoleName,
};
