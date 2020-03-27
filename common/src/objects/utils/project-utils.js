function getProjectName(project, env) {
  const { p } = env.locale;
  return p(project?.details?.title) || project?.name || '';
}

export {
  getProjectName,
};

// use code from backend
export * from '../../../../backend/src/lib/project-utils.mjs';
