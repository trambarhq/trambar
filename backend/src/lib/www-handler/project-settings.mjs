import _ from 'lodash';
import Project from '../accessors/project.mjs';

const cache = [];

async function load(db) {
    const criteria = { website: false, deleted: false };
    const projects = await Project.find(db, 'global', criteria, '*');
    for (let project of projects) {
        const index = _.sortedIndexBy(cache, project, 'id');
        cache.splice(index, 0, project);
    }
}

async function update(db, id) {
    const criteria = { id, website: false, deleted: false };
    const project = await Project.findOne(db, 'global', criteria, '*');
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

function filter(criteria) {
    return _.filter(cache, criteria);
}

function all() {
    return filter(undefined);
}

export {
    load,
    update,
    find,
    filter,
    all,
};
