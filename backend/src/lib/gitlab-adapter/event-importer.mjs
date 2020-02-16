import _ from 'lodash';
import Moment from 'moment';
import * as TaskLog from '../task-log.mjs';
import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';

import * as Transport from './transport.mjs';
import * as IssueImporter from './issue-importer.mjs';
import * as MergeRequestImporter from './merge-request-importer.mjs';
import * as MilestoneImporter from './milestone-importer.mjs';
import * as BranchImporter from './branch-importer.mjs';
import * as PushImporter from './push-importer.mjs';
import * as RepoImporter from './repo-importer.mjs';
import * as UserImporter from './user-importer.mjs';
import * as NoteImporter from './note-importer.mjs';

// accessors
import Story from '../accessors/story.mjs';

/**
 * Retrieve activity log entries from Gitlab server and turn them into stories
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Object} glHookEvent
 *
 * @return {Promise}
 */
async function processNewEvents(db, system, server, repo, project, glHookEvent) {
  const lastTask = await TaskLog.last('gitlab-event-import', {
    server_id: server.id,
    repo_id: repo.id,
    project_id: project.id,
  });
  const lastEventTime = _.get(lastTask, 'details.last_event_time');
  const repoLink = ExternalDataUtils.findLink(repo, server);
  const url = `/projects/${repoLink.project.id}/events`;
  const params = { sort: 'asc' };
  if (lastEventTime) {
    // the GitLab API's 'after' param only supports a date for some reason
    // need to start one day back to ensure all events are fetched
    const dayBefore = Moment(lastEventTime).subtract(1, 'day');
    params.after = dayBefore.format('YYYY-MM-DD');
  }
  const taskLog = TaskLog.start('gitlab-event-import', {
    saving: true,
    server_id: server.id,
    server: server.name,
    repo_id: repo.id,
    repo: repo.name,
    project_id: project.id,
    project: project.name,
  });
  const now = Moment();
  let firstEventAge;
  try {
    await Transport.fetchEach(server, url, params, async (glEvent, index, total) => {
      const ctime = glEvent.created_at;
      if (lastEventTime) {
        if (ctime <= lastEventTime) {
          return;
        }
      }
      let nom = index + 1;
      let denom = total;
      if (!total) {
        // when the number of events is not yet known, use the event
        // time to calculate progress
        const eventAge = now.diff(ctime);
        if (firstEventAge === undefined) {
          firstEventAge = eventAge;
        }
        nom = (firstEventAge - eventAge);
        denom = firstEventAge;
      }
      await processEvent(db, system, server, repo, project, glEvent, glHookEvent);
      taskLog.append('added', glEvent.action_name);
      taskLog.set('last_event_time', ctime);
      taskLog.report(nom, denom);
    });
    await taskLog.finish();
  } catch (err) {
    await taskLog.abort(err);
  }
}

/**
 * Process an activity log entry, creating a story or updating an existing one
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 * @param  {Object} glEvent
 * @param  {Object} glHookEvent
 *
 * @return {Promise}
 */
async function processEvent(db, system, server, repo, project, glEvent, glHookEvent) {
  try {
    const author = await UserImporter.importUser(db, server, glEvent.author);
    if (!author) {
      return;
    }

    const targetType = _.snakeCase(glEvent.target_type);
    const actionName = _.snakeCase(glEvent.action_name);
    if (targetType === 'issue') {
      await IssueImporter.processEvent(db, system, server, repo, project, author, glEvent);
    } else if (targetType === 'milestone') {
      await MilestoneImporter.processEvent(db, system, server, repo, project, author, glEvent);
    } else if (targetType === 'merge_request' || targetType === 'mergerequest') {
      await MergeRequestImporter.processEvent(db, system, server, repo, project, author, glEvent);
    } else if (targetType === 'note') {
      // the hook event object is only used when we're importing a commit note
      await NoteImporter.processEvent(db, system, server, repo, project, author, glEvent, glHookEvent);
    } else if (actionName === 'created' || actionName === 'imported') {
      await RepoImporter.processEvent(db, system, server, repo, project, author, glEvent);
    } else if (actionName === 'deleted') {
      if (glEvent.push_data || glEvent.data) {
        await BranchImporter.processEvent(db, system, server, repo, project, author, glEvent);
      } else {
        await RepoImporter.processEvent(db, system, server, repo, project, author, glEvent);
      }
    } else if (actionName === 'joined' || actionName === 'left') {
      await UserImporter.processEvent(db, system, server, repo, project, author, glEvent);
    } else if (actionName === 'pushed_new' || actionName === 'pushed_to') {
      await PushImporter.processEvent(db, system, server, repo, project, author, glEvent);
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Unknown event: target_type = ${targetType}, action_name = ${actionName}`);
        console.log(glEvent);
        console.log('******************************************************')
      }
    }
  } catch (err) {
    if (err.statusCode !== 404) {
      throw err;
    }
  }
}

export {
  processNewEvents,
};
