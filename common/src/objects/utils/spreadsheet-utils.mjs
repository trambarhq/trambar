import _ from 'lodash';

function getDisplayName(spreadsheet, env) {
    const { p } = env.locale;
    return p(_.get(spreadsheet, 'details.title')) || _.get(spreadsheet, 'name') || '';
}

export {
    getDisplayName,
};
