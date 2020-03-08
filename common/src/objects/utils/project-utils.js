import _ from 'lodash';

function getProjectName(project, env) {
  const { p } = env.locale;
  return p(_.get(project, 'details.title')) || _.get(project, 'name') || '';
}

export {
  getProjectName,
};

// use code from backend
export * from '../../../../backend/src/lib/project-utils.mjs';
