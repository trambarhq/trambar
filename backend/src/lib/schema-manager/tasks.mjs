import _ from 'lodash';
import Moment from 'moment';
import { Database } from '../database.mjs';
import { PeriodicTask } from '../task-queue.mjs';
import { TaskLog } from '../task-log.mjs';
import * as Accessors from './accessors.mjs';

import { Project } from '../accessors/project.mjs';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

const DEFAULT_GARBAGE_PRESERVATION = (process.env.NODE_ENV === 'production') ? '2 WEEKS' : '1 HOUR';

class PeriodicTaskClearMessageQueue extends PeriodicTask {
  delay(initial) {
    return 5 * MIN;
  }

  async run(queue) {
    const db = await Database.open();
    const lifetime = '1 hour';
    const sql = `DELETE FROM "message_queue" WHERE ctime + CAST($1 AS INTERVAL) < NOW()`;
    await db.execute(sql, [ lifetime ]);
  }
}

class PeriodicTaskCollectGarbage extends PeriodicTask {
  constructor() {
    super();
    this.lastGCTime = 0;
  }

  delay(initial) {
    return (initial) ? 0 : 10 * MIN;
  }

  shouldRun() {
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    // do it in the middle of the night
    const now = Moment();
    if (now.hour() !== 3) {
      return false;
    }
    const elapsed = now - this.lastGCTime;
    if (!(elapsed > 23 * HOUR)) {
      return false;
    }
    this.lastGCTime = now;
    return true;
  }

  async run(queue) {
    if (!this.shouldRun()) {
      return;
    }

    const taskLog = TaskLog.start('garbage-collect');
    try {
      const db = await Database.open();
      const preservation = process.env.GARBAGE_PRESERVATION || DEFAULT_GARBAGE_PRESERVATION;
      const projects = await Project.find(db, 'global', { deleted: false }, 'name');
      const schemas = [ 'global', ..._.map(projects, 'name') ];
      let total = 0;
      for (let schema of schemas) {
        const existing = await db.schemaExists(schema);
        if (!existing) {
          continue;
        }
        let schemaTotal = 0;
        const accessors = Accessors.get(schema);
        for (let accessor of accessors) {
          const table = accessor.getTableName(schema);
          taskLog.describe(`cleaning ${table}`);
          const count = await accessor.clean(db, schema, preservation);
          schemaTotal += count;
        }
        if (schemaTotal > 0)  {
          taskLog.append('cleaned', schema);
          total += schemaTotal;
        }
      }
      if (total > 0) {
        taskLog.set('removed', total);
      }
      await taskLog.finish();
    } catch (err) {
      await taskLog.abort(err);
    }
  }
}

class PeriodicTaskReportSchemaSize extends PeriodicTask {
  delay(initial) {
    return (initial) ? 0 : 1 * HOUR;
  }

  async run(queue) {
    const db = await Database.open();
    const taskLog = TaskLog.start('schema-size-report');
    try {
      const schemas = await db.getSchemaNames();
      for (let schema of schemas) {
        const size = await db.getSchemaSize(schema);
        taskLog.set(schema, size, 'byte');
      }
      await taskLog.finish();
    } catch (err) {
      await taskLog.abort(err);
    }
  }
}

export {
  PeriodicTaskClearMessageQueue,
  PeriodicTaskCollectGarbage,
  PeriodicTaskReportSchemaSize,
};
