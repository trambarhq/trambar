function getRestName(rest, env) {
  const { p } = env.locale;
  return p(rest?.details?.title) || rest?.name || '';
}

export {
  getRestName,
};
