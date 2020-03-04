import _ from 'lodash';

function getDisplayName(server, env) {
  const { p, t } = env.locale;
  let title = p(_.get(server, 'details.title'));
  if (title && server && server.type) {
    title = t(`server-type-${server.type}`);
  }
  return title || '';
}

function getIcon(server) {
  const type = _.get(server, 'type', '');
  if (type === 'facebook') {
    return 'facebook-official';
  }
  return type;
}

export {
  getDisplayName,
  getIcon,
};
