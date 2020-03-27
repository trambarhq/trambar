function getServerName(server, env) {
  const { p, t } = env.locale;
  let title = p(server?.details?.title);
  if (!title && server?.type) {
    title = t(`server-type-${server.type}`);
  }
  return title;
}

function getServerIconClass(server) {
  switch (server?.type) {
    case 'dropbox':
      return 'fab fa-dropbox';
    case 'facebook':
      return 'fab fa-facebook-square';
    case 'github':
      return 'fab fa-github-square';
    case 'gitlab':
      return 'fab fa-gitlab';
    case 'google':
      return 'fab fa-google';
    case 'windows':
      return 'fab fa-windows';
    default:
      return '';
  }
}

export {
  getServerName,
  getServerIconClass,
};
