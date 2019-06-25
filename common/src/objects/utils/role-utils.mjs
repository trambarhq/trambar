import _ from 'lodash';

function getDisplayName(role, env) {
    const { p } = env.locale;
    return p(_.get(role, 'details.title')) || _.get(role, 'name') || '';
}

export {
    getDisplayName,
};
