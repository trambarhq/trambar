import _ from 'lodash';

function getServerName(server, env) {
  const { p, t } = env.locale;
  let title = p(_.get(server, 'details.title'));
  if (title && server && server.type) {
    title = t(`server-type-${server.type}`);
  }
  return title || '';
}

function getServerIconClass(server) {
  const type = _.get(server, 'type', '');
  switch (type) {
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
  }
  return '';
}

export {
  getServerName,
  getServerIconClass,
};
