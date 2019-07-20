import _ from 'lodash';
import Moment from 'moment';
import Database from '../database.mjs';
import { BasicTask, PeriodicTask } from '../task-queue.mjs';

import * as CacheManager from './cache-manager.mjs';
import * as ExcelRetriever from './excel-retriever.mjs';
import * as TrafficMonitor from './traffic-monitor.mjs';

// accessors
import Project from '../accessors/project.mjs';
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
            const pattern = new RegExp(`^/srv/www/${schema}/.*`);
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
        const pattern = new RegExp(`^/srv/www/${schema}/.*`);
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
        const pattern = new RegExp(`^/srv/www/${schema}/excel/${name}`);
        await CacheManager.purge(pattern);
    }
}

class TaskPurgeWiki extends BasicTask {
    constructor(schema, slug) {
        super();
        this.schema = schema;
        this.slug = slug;
    }

    async run() {
        const { schema, slug } = this;
        const pattern = new RegExp(`^/srv/www/${schema}/wiki/([^/]+/)?${slug}`);
        await CacheManager.purge(pattern);
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

export {
    TaskImportSpreadsheet,

    TaskPurgeSnapshotHead,
    TaskPurgeProject,
    TaskPurgeSpreadsheet,
    TaskPurgeWiki,
    TaskPurgeAll,

    PeriodicTaskSaveWebsiteTraffic,
    PeriodicTaskUpdateGeoIPDatabase,
};
