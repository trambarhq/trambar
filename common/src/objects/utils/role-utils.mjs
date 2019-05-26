import _ from 'lodash';

function getDisplayName(role, env) {
    const { p } = env.locale;
    return p(role.details.title) || role.name;
}

export {
    getDisplayName,
};
