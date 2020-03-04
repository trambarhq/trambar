import _ from 'lodash';

function getDisplayName(project, env) {
  const { p } = env.locale;
  return p(_.get(project, 'details.title')) || _.get(project, 'name') || '';
}

export {
  getDisplayName,
};

// use code from backend
export * from '../../../../backend/src/lib/project-utils.mjs';