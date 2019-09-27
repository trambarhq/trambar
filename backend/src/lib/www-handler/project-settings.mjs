import _ from 'lodash';
import Project from '../accessors/project.mjs';

const cache = [];
const columns = 'id, name, details, settings';

async function load(db) {
    const projects = await Project.find(db, 'global', { deleted: false }, columns);
    for (let project of projects) {
        const index = _.sortedIndexBy(cache, project, 'id');
        cache.splice(index, 0, project);
    }
}

async function update(db, id) {
    const project = await Project.findOne(db, 'global', { id, deleted: false }, columns);
    _.remove(cache, { id });
    if (project) {
        const index = _.sortedIndexBy(cache, project, 'id');
        cache.splice(index, 0, project);
    }
}

function find(criteria) {
    const host = criteria.host;
    if (host) {
        criteria = (project) => {
            return _.includes(project.settings.domains, host);
        };
    }
    return _.find(cache, criteria);
}

function all() {
    return cache;
}

export {
    load,
    update,
    find,
    all,
};
