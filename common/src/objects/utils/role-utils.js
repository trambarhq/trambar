function getRoleName(role, env) {
  const { p } = env.locale;
  return p(role?.details?.title) || role?.name || '';
}

export {
  getRoleName,
};
