import _ from 'lodash';

function getDisplayName(spreadsheet, env) {
    const { p } = env.locale;
    let name = _.get(spreadsheet, 'details.filename');
    if (!name) {
        name = _.get(spreadsheet, 'name');
    }
    return name;
}

export {
    getDisplayName,
};
