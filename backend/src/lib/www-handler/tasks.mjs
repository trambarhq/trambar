import _ from 'lodash';
import Moment from 'moment';
import Database from '../database.mjs';
import { BasicTask, PeriodicTask } from '../task-queue.mjs';

import * as CacheManager from './cache-manager.mjs';
import * as ExcelRetriever from './excel-retriever.mjs';
import * as RestRetriever from './rest-retriever.mjs';
import * as TrafficMonitor from './traffic-monitor.mjs';
import * as ProjectSettings from './project-settings.mjs';

// accessors
import Project from '../accessors/project.mjs';
import Repo from '../accessors/repo.mjs';
import Snapshot from '../accessors/snapshot.mjs';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

class TaskImportSpreadsheet extends BasicTask {
  constructor(schema, name) {
    super();
    this.schema = schema;
    this.name = name;
  }

  async run() {
    const { schema, name } = this;
    await ExcelRetriever.retrieve(schema, name, false);
  }
}

class TaskPurgeTemplate extends BasicTask {
  constructor(repoID) {
    super();
    this.repoID = repoID;
  }

  async run() {
    const { repoID } = this;
    const projects = ProjectSettings.filter({ template_repo_id: repoID });
    for (let project of projects) {
      const pattern = new RegExp(`^(?!/data/)`);
      await CacheManager.purge(project, pattern);
    }
  }
}

class TaskPurgeProject extends BasicTask {
  constructor(project) {
    super();
    this.project = project;
  }

  async run() {
    const { project } = this;
    await CacheManager.purge(project);
  }
}

class TaskPurgeChangedDomains extends BasicTask {
  constructor(projectBefore, projectAfter) {
    super();
    this.projectBefore = projectBefore;
    this.projectAfter = projectAfter;
  }

  async run() {
    const { projectBefore, projectAfter } = this;
    const before = _.get(projectBefore, 'settings.domains', []);
    const after = _.get(projectAfter, 'settings.domains', []);
    const changes = _.xor(before, after);
    if (!_.isEmpty(changes)) {
      const project = _.cloneDeep(projectAfter);
      project.settings.domains = changes;
      await CacheManager.purge(project);
    }
  }
}

class TaskPurgeMetadata extends BasicTask {
  constructor(project) {
    super();
    this.project = project;
  }

  async run() {
    const { project } = this;
    const pattern = new RegExp(`^/data/meta/$`);
    await CacheManager.purge(project, pattern);
  }
}

class TaskPurgeSpreadsheet extends BasicTask {
  constructor(schema, name) {
    super();
    this.schema = schema;
    this.name = name;
  }

  async run() {
    const { schema, name } = this;
    const project = ProjectSettings.find({ name: schema });
    if (project) {
      const pattern = new RegExp(`^/data/excel/${name}/`);
      await CacheManager.purge(project, pattern);

      const listPattern = new RegExp(`^/data/excel/(\\?|$)`);
      await CacheManager.purge(project, listPattern);
    }
  }
}

class TaskPurgeWiki extends BasicTask {
  constructor(schema, repoID, slug) {
    super();
    this.schema = schema;
    this.repoID = repoID;
    this.slug = slug;
  }

  async run() {
    const { schema, repoID, slug } = this;
    const db = Database.open();
    const name = await getRepoName(db, repoID);
    const project = ProjectSettings.find({ name: schema });
    if (project) {
      const pattern = new RegExp(`^/data/wiki/${name}/${slug}/`);
      await CacheManager.purge(project, pattern);
      const listPattern1 = new RegExp(`^/data/wiki/${name}/(\\?|$)`);
      await CacheManager.purge(project, listPattern1);
      const listPattern2 = new RegExp(`^/data/wiki/(\\?|$)`);
      await CacheManager.purge(project, listPattern2);
    }
  }
}

class TaskPurgeRest extends BasicTask {
  constructor(schema, name) {
    super();
    this.schema = schema;
    this.name = name;
  }

  async run() {
    const { schema, name } = this;
    const project = ProjectSettings.find({ name: schema });
    if (project) {
      const pattern = new RegExp(`^/data/rest/${name}/`);
      await CacheManager.purge(project, pattern);

      const listPattern = new RegExp(`^/data/rest/(\\?|$)`);
      await CacheManager.purge(project, listPattern);
    }
  }
}

class TaskPurgeRequest extends BasicTask {
  constructor(host, url, method) {
    super();
    this.host = host;
    this.url = url;
    this.method = method;
  }

  async run() {
    const { host, url, method } = this;
    const purges = await RestRetriever.translatePurgeRequest(host, url, method);
    for (let { project, identifier, url, method } of purges) {
      const prefix = `/data/rest/${identifier}`;
      let criteria;
      if (method === 'regex') {
        criteria = new RegExp(prefix + url);
      } else if (method === 'default') {
        criteria = prefix + url;
      }
      await CacheManager.purge(project, criteria);
    }
  }
}

class TaskPurgeAll extends BasicTask {
  async run() {
    await CacheManager.purge();
  }
}

class PeriodicTaskSaveWebsiteTraffic extends PeriodicTask {
  delay(initial) {
    if (initial) {
      // start it at the hour
      return Moment().startOf('hour').add(1, 'hour') - Moment();
    } else {
      return 1 * HOUR;
    }
  }

  async run() {
    return TrafficMonitor.saveStatistics();
  }
}

class PeriodicTaskPublishWebsiteTraffic extends PeriodicTask {
  delay(initial) {
    return (initial) ? 0 : 1 * MIN;
  }

  async run(queue, initial) {
    return TrafficMonitor.publishStatistics(initial);
  }
}

class PeriodicTaskUpdateGeoIPDatabase extends PeriodicTask {
  delay(initial) {
    return 24 * HOUR;
  }

  async run() {
    return TrafficMonitor.updateDatabase();
  }
}

function getSnapshot(db, snapshotID) {
  const criteria = {
    id: snapshotID,
    deleted: false,
  };
  return Snapshot.findOne(db, 'global', criteria, '*');
}

function getRepoName(db, repoID) {
  const criteria = {
    id: repoID,
  };
  const repo = Repo.find(db, 'global', criteria, 'name');
  return (repo) ? repo.name : '';
}

export {
  TaskImportSpreadsheet,
  TaskPurgeTemplate,
  TaskPurgeProject,
  TaskPurgeChangedDomains,
  TaskPurgeMetadata,
  TaskPurgeSpreadsheet,
  TaskPurgeWiki,
  TaskPurgeRest,
  TaskPurgeRequest,
  TaskPurgeAll,

  PeriodicTaskSaveWebsiteTraffic,
  PeriodicTaskPublishWebsiteTraffic,
  PeriodicTaskUpdateGeoIPDatabase,
};
