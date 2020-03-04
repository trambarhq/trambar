import _ from 'lodash';
import Moment from 'moment';
import 'moment-timezone';
import CrossFetch from 'cross-fetch';
import Zlib from 'zlib';
import Tar from 'tar';
import ConcatStream from 'concat-stream';
import GeoIP2Node from '@maxmind/geoip2-node';
import { Database } from '../database.mjs';
import { TaskLog } from '../task-log.mjs';

import * as ProjectSettings from './project-settings.mjs';
import { Story } from '../accessors/story.mjs';

let traffic = {};

async function recordIP(project, ip) {
  try {
    const country = await findCountry(ip);
    const tz = _.get(project.settings, 'timezone');
    const date = getDate(tz);
    const path = [ schema, date, country ];
    const count = _.get(traffic, path, 0);
    _.set(traffic, path, count + 1);
    return country;
  } catch (err) {
    return 'zz';
  }
}

function moveStatistics(schemaBefore, schemaAfter) {
  const stats = _.get(traffic, schemaBefore);
  _.unset(traffic, schemaBefore);
  if (stats) {
    _.set(traffic, schemaAfter, stats);
  }
}

async function saveStatistics() {
  const oldTraffic = traffic;
  traffic = {};

  const db = await Database.open();
  for (let [ schema, stats ] of _.entries(oldTraffic)) {
    const taskLog = TaskLog.start('website-statistics-save', {
      project: schema,
    });
    try {
      const project = ProjectSettings.find({ name: schema });
      if (!project) {
        throw new Error('Project not found');
      }
      let total = 0;
      for (let [ date, dailyStats ] of _.entries(stats)) {
        // look for existing story
        const tz = _.get(project.settings, 'timezone');
        const range = getDateRange(date, tz);
        const criteria = {
          type: 'website-traffic',
          created_between: range,
        };
        const story = await Story.findOne(db, schema, criteria, 'id, details');
        const storyChanges = story || {
          type: 'website-traffic',
          details: { date }
        };
        let addition = 0;
        for (let [ country, count ] of _.entries(dailyStats)) {
          const path = [ 'by_country', country ];
          const existingCount = _.get(storyChanges.details, path, 0);
          _.set(storyChanges.details, path, existingCount + count);
          addition += count;
        }
        const existingTotal = _.get(storyChanges.details, 'total', 0);
        _.set(storyChanges.details, 'total', existingTotal + addition);
        const storyAfter = await Story.saveOne(db, schema, storyChanges);
        total += existingTotal + addition;
      }
      taskLog.set('visitors', total);
      await taskLog.finish();
    } catch (err) {
      await taskLog.abort(err);
    }
  }
}

const lastPublicationTimes = {};

async function publishStatistics(initial) {
  for (let project of ProjectSettings.all()) {
    const tz = _.get(project.settings, 'timezone');
    const reportTime = _.get(project.settings, 'traffic_report_time', '23:59:59');
    const reportTimeToday = getTime(reportTime, tz);
    const currentTime = Moment().toISOString();
    if (currentTime > reportTimeToday || initial) {
      const lastPublicationTime = lastPublicationTimes[project.id];
      if (lastPublicationTime > reportTimeToday) {
        // already published today's report
        continue;
      }
      const schema = project.name;
      const taskLog = TaskLog.start('website-statistics-publish', {
        project: schema
      });
      try {
        const db = await Database.open();
        const criteria = {
          type: 'website-traffic',
          published: false,
        };
        const stories = await Story.find(db, schema, criteria, 'id');
        const storyChanges = _.map(stories, (story) => {
          return {
            id: story.id,
            published: true,
            ptime: new String('NOW()')
          };
        });
        const storiesAfter = await Story.save(db, schema, storyChanges);
        if (!_.isEmpty(storiesAfter)) {
          taskLog.set('count', storiesAfter.length);
        }
        lastPublicationTimes[project.id] = currentTime;
        await taskLog.finish();
      } catch (err) {
        await taskLog.abort(err);
      }
    }
  }
}

async function findCountry(ip) {
  const reader = await initializeReader();
  const response = await reader.country(ip);
  return _.toLower(response.country.isoCode);
}

function getDate(tz) {
  const now = (tz) ? Moment().tz(tz) : Moment();
  const start = now.startOf('day');
  return start.format('YYYY-MM-DD');
}

function getDateRange(date, tz) {
  const start = (tz) ? Moment.tz(date, tz) : Moment(date);
  const end = start.clone().add(1, 'day');
  return `[${start.toISOString()},${end.toISOString()})`;
}

function getTime(time, tz) {
  const format = 'HH:mm:ss';
  const at = (tz) ? Moment(time, format) : Moment.tz(time, format, tz);
  return at.toISOString();
}

let readerPromise, reader, lastModified;

async function initializeReader() {
  if (!readerPromise) {
    readerPromise = initializeReaderUncached();
  }
  return readerPromise;
}

async function initializeReaderUncached() {
  const buffer = await downloadGeoLite2();
  reader = GeoIP2Node.Reader.openBuffer(buffer);
  lastModified = buffer.mtime;
  return reader;
}

async function updateDatabase() {
  if (lastModified) {
    const buffer = await downloadGeoLite2(lastModified);
    if (buffer) {
      reader = GeoIP2Node.Reader.openBuffer(buffer);
      readerPromise = Promise.resolve(reader);
      lastModified = buffer.mtime;
    }
  }
}

const geoLite2URL = 'https://geolite.maxmind.com/download/geoip/database/GeoLite2-Country.tar.gz';

async function downloadGeoLite2(lastModified) {
  return {};
  const taskLog = TaskLog.start('geoip-database-download');
  try {
    const options = {};
    if (lastModified) {
      options.headers = {
        'if-modified-since': lastModified
      }
    }
    const res = await CrossFetch(geoLite2URL, options);
    if (res.status >= 400) {
      throw new HTTPError(res.status);
    }
    let data = null;
    if (res.status === 200) {
      data = await new Promise(function (resolve, reject) {
        const tar = res.body.pipe(Zlib.createGunzip()).pipe(new Tar.Parse);
        let mmdb;
        tar.on('entry', (entry) => {
          entry.pipe(ConcatStream((buf) => {
            if (!mmdb && /\.mmdb$/.test(entry.path)) {
              mmdb = buf;
            }
          }));
        });
        tar.on('end', () => {
          resolve(mmdb);
        });
        tar.on('error', (err) => {
          reject(err);
        });
      });
      data.mtime = res.headers.get('last-modified');
      taskLog.set('size', data.length, 'byte');
    }
    await taskLog.finish();
    return data;
  } catch (err) {
    await taskLog.abort(err);
  }
}

export {
  recordIP,
  findCountry,
  saveStatistics,
  publishStatistics,
  moveStatistics,
  updateDatabase,
};
