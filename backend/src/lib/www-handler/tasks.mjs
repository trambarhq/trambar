import _ from 'lodash';
import Moment from 'moment';
import Database from '../database.mjs';
import { BasicTask, PeriodicTask } from '../task-queue.mjs';

import * as CacheManager from './cache-manager.mjs';
import * as ExcelRetriever from './excel-retriever.mjs';
import * as TrafficMonitor from './traffic-monitor.mjs';

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

class TaskPurgeSnapshotHead extends BasicTask {
    constructor(snapshotID) {
        super();
        this.snapshotID = snapshotID;
    }

    async run() {
        const { snapshotID } = this;
        const db = await Database.open();
        const snapshot = await getSnapshot(db, snapshotID);
        const projects = await getSnapshotProjects(db, snapshot);
        for (let project of projects) {
            const schema = project.name;
            const pattern = new RegExp(`^/srv/www/${schema}/`);
            await CacheManager.purge(pattern);
        }
    }
}

class TaskPurgeProject extends BasicTask {
    constructor(schema) {
        super();
        this.schema = schema;
    }

    async run() {
        const { schema } = this;
        const pattern = new RegExp(`^/srv/www/${schema}/`);
        await CacheManager.purge(pattern);
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
        const pattern = new RegExp(`^/srv/www/${schema}/data/excel/${name}/`);
        await CacheManager.purge(pattern);

        const listPattern = new RegExp(`^/srv/www/${schema}/data/excel/(\\?|$)`);
        await CacheManager.purge(listPattern);
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
        const pattern = new RegExp(`^/srv/www/${schema}/data/wiki/${name}/${slug}/`);
        await CacheManager.purge(pattern);

        const listPattern1 = new RegExp(`^/srv/www/${schema}/data/wiki/${name}/(\\?|$)`);
        await CacheManager.purge(listPattern1);
        const listPattern2 = new RegExp(`^/srv/www/${schema}/data/wiki/(\\?|$)`);
        await CacheManager.purge(listPattern2);
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
        const pattern = new RegExp(`^/srv/www/${schema}/data/rest/${name}/`);
        await CacheManager.purge(pattern);

        const listPattern = new RegExp(`^/srv/www/${schema}/data/rest/(\\?|$)`);
        await CacheManager.purge(listPattern);
    }
}

class TaskPurgeRequest extends BasicTask {
    constructor(url, method, address) {
        this.url = url;
        this.method = method;
        this.address = address;
    }

    async run() {
        const { url, method, address } = this;
        const purges = await RestRetriever.translatePurgeRequest(url, method, address);
        for (let { schema, identifier, url, method } of purges) {
            const prefix = `/srv/www/${schema}/data/rest/${identifier}`;
            let criteria;
            if (method === 'regex') {
                criteria = new RegExp(prefix + url);
            } else if (method === 'default') {
                criteria = prefix + url;
            }
            await CacheManager.purge(criteria);
        }
    }
}

class TaskPurgeAll extends BasicTask {
    async run() {
        const pattern = new RegExp('.*');
        await CacheManager.purge(pattern);
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

function getSnapshotProjects(db, snapshot) {
    if (!snapshot) {
        return [];
    }
    const criteria = {
        id: snapshot.repo_id,
        deleted: false,
    };
    return Project.find(db, 'global', criteria, '*');
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

    TaskPurgeSnapshotHead,
    TaskPurgeProject,
    TaskPurgeSpreadsheet,
    TaskPurgeWiki,
    TaskPurgeRest,
    TaskPurgeRequest,
    TaskPurgeAll,

    PeriodicTaskSaveWebsiteTraffic,
    PeriodicTaskPublishWebsiteTraffic,
    PeriodicTaskUpdateGeoIPDatabase,
};
