import _ from 'lodash';
import { Project } from '../accessors/project.mjs';

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
  criteria = transformCriteria(criteria);
  return _.find(cache, criteria);
}

function filter(criteria) {
  criteria = transformCriteria(criteria);
  return _.filter(cache, criteria);
}

function all() {
  return filter(undefined);
}

function transformCriteria(criteria) {
  if (criteria) {
    const { host } = criteria;
    if (host) {
      // look for domain name with "www." prepended or stripped
      const alias = _.startsWith(host, 'www.') ? host.substr(4) : `www.${host}`;
      return (project) => {
        const { domains } = project.settings;
        return _.includes(domains, host) || _.includes(domains, alias);
      };
    }
  }
  return criteria;
}

export {
  load,
  update,
  find,
  filter,
  all,
};
