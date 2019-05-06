import _ from 'lodash';
import Moment from 'moment';
import * as TaskLog from 'task-log';
import * as Localization from 'localization';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

import * as Transport from 'gitlab-adapter/transport';
import * as UserImporter from 'gitlab-adapter/user-importer';

// accessors
import Project from 'accessors/project';
import Repo from 'accessors/repo';
import Story from 'accessors/story';

/**
 * Import an activity log entry about an repo action
 *
 * @param  {Database} db
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} author
 * @param  {Project} project
 * @param  {Object} glEvent
 *
 * @return {Promise<Story>}
 */
async function importEvent(db, system, server, repo, project, author, glEvent) {
    let schema = project.name;
    let storyNew = copyEventProperties(null, system, server, repo, author, glEvent);
    return Story.insertOne(db, schema, storyNew);
}

/**
 * Copy properties of an event object
 *
 * @param  {Story|null} story
 * @param  {System} system
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {User} user
 * @param  {Object} glEvent
 *
 * @return {Story}
 */
function copyEventProperties(story, system, server, repo, author, glEvent) {
    let defLangCode = Localization.getDefaultLanguageCode(system);

    let storyAfter = _.cloneDeep(story) || {};
    ExternalDataUtils.inheritLink(storyAfter, server, repo);
    ExternalDataUtils.importProperty(storyAfter, server, 'type', {
        value: 'repo',
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'language_codes', {
        value: [ defLangCode ],
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'user_ids', {
        value: [ author.id ],
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'role_ids', {
        value: author.role_ids,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'details.action', {
        value: glEvent.action_name,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'public', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'published', {
        value: true,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(storyAfter, server, 'ptime', {
        value: Moment(glEvent.created_at).toISOString(),
        overwrite: 'always',
    });
    if (_.isEqual(storyAfter, story)) {
        return story;
    }
    storyAfter.itime = new String('NOW()');
    return storyAfter;
}

/**
 * Import repositories that aren't in the system yet
 *
 * @param  {Database} db
 * @param  {Server} server
 *
 * @return {Promise<Array<Repo>>}
 */
async function importRepositories(db, server) {
    let taskLog = TaskLog.start('gitlab-repo-import', {
        server_id: server.id,
        server: server.name,
    });
    try {
        // find existing repos connected with server (including deleted ones)
        let criteria = {
            external_object: ExternalDataUtils.createLink(server)
        };
        let repos = await Repo.find(db, 'global', criteria, '*');
        let glRepos = await fetchRepos(server);

        // delete ones that no longer exists at GitLab
        let deleted = [];
        for (let repo of repos) {
            let repoLink = ExternalDataUtils.findLink(repo, server);
            if (!_.some(glRepos, { id: repoLink.project.id })) {
                deleted.push(repo.name);
                await Repo.updateOne(db, 'global', { id: repo.id, deleted: true });
            }
        }

        let added = [];
        let modified = [];
        let index = 0;
        for (let glRepo of glRepos) {
            let glLabels = await fetchLabels(server, glRepo.id);
            let glUsers = await fetchMembers(server, glRepo.id);

            // find members
            let members = [];
            for (let glUser of glUsers) {
                let member = await UserImporter.findUser(db, server, glUser);
                if (member) {
                    members.push(member);
                }
            }
            // add owner to the list
            if (!_.some(glUsers, { id: glRepo.creator_id })) {
                let member = await UserImporter.findUser(db, server, { id: glRepo.creator_id });
                if (member) {
                    members.push(member);
                }
            }

            let repo = await findExistingRepo(db, server, repos, glRepo);
            let repoAfter = copyRepoDetails(repo, server, members, glRepo, glLabels);
            if (repoAfter !== repo) {
                if (repo) {
                    repoAfter = await Repo.updateOne(db, 'global', repoAfter);
                    modified.push(repoAfter.name);
                } else {
                    repoAfter = await Repo.insertOne(db, 'global', repoAfter);
                    added.push(repoAfter.name);
                }

                // add new members to Trambar project
                let newMembers = _.filter(members, (user) => {
                    // exclude root user
                    if (user.username !== 'root') {
                        if (!user.disabled && !user.deleted) {
                            return !repo || !_.includes(repo.user_ids);
                        }
                    }
                });
                await addProjectMembers(db, repoAfter, newMembers);
            }
            if (added.length + deleted.length + modified.length > 0) {
                taskLog.report(index + 1, glRepos.length, { added, deleted, modified });
            }
            index++;
        }
        await taskLog.finish();
    } catch (err) {
        await taskLog.abort(err);
    }
}

/**
 * Find repo from among existing ones
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Array<Repo>} repos
 * @param  {Object} glRepo
 *
 * @return {Promise<Repo|null>}
 */
async function findExistingRepo(db, server, repos, glRepo) {
    let repo = _.find(repos, (repo) => {
        return ExternalDataUtils.findLink(repo, server, {
            project: { id: glRepo.id }
        });
    });
    if (repo) {
        if (repo.deleted) {
            // restore it
            repo = await Repo.updateOne(db, 'global', { id: repo.id, deleted: false });
        }
    }
    return repo || null;
}

/**
 * Add users to projects associated with the repo
 *
 * @param {Database} db
 * @param {Repo} repo
 * @param {Array<User>} users
 *
 * @return {Promise<Array<Project>>}
 */
async function addProjectMembers(db, repo, users) {
    let newUserIDs = _.map(users, 'id');
    let criteria = {
        repo_ids: [ repo.id ]
    };
    let projectList = [];
    let projects = await Project.find(db, 'global', criteria, 'id, user_ids');
    for (let project of projects) {
        project.user_ids = _.union(project.user_ids, newUserIDs);
        project = await Project.updateOne(db, 'global', project);
        projectList.push(project);
    }
    return projectList;
}

/**
 * Copy details from Gitlab project object
 *
 * @param  {Repo|null} repo
 * @param  {Server} server
 * @param  {Array<User>} members
 * @param  {Object} glRepo
 * @param  {Array<Object>} glLabels
 *
 * @return {Repo}
 */
function copyRepoDetails(repo, server, members, glRepo, glLabels) {
    let repoAfter = _.cloneDeep(repo) || {};
    ExternalDataUtils.addLink(repoAfter, server, {
        project: { id: glRepo.id }
    });
    ExternalDataUtils.importProperty(repoAfter, server, 'type', {
        value: 'gitlab',
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(repoAfter, server, 'name', {
        value: glRepo.name,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(repoAfter, server, 'user_ids', {
        value: _.map(members, 'id'),
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(repoAfter, server, 'details.web_url', {
        value: glRepo.web_url,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(repoAfter, server, 'details.issues_enabled', {
        value: glRepo.issues_enabled,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(repoAfter, server, 'details.archived', {
        value: glRepo.archived,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(repoAfter, server, 'details.default_branch', {
        value: glRepo.default_branch,
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(repoAfter, server, 'details.labels', {
        value: _.map(glLabels, 'name'),
        overwrite: 'always',
    });
    ExternalDataUtils.importProperty(repoAfter, server, 'details.label_colors', {
        value: _.map(glLabels, 'color'),
        overwrite: 'always',
    });
    if (repoAfter.deleted) {
        repoAfter.deleted = false;
    }
    if (_.isEqual(repoAfter, repo)) {
        return repo;
    }
    repoAfter.itime = new String('NOW()');
    return repoAfter;
}

/**
 * Retrieve all repos on a Gitlab server
 *
 * @param  {Server} server
 *
 * @return {Promise<Array<Object>>}
 */
async function fetchRepos(server) {
    let url = `/projects`;
    return Transport.fetchAll(server, url);
}

/**
 * Retrieve all labels used by a Gitlab repo
 *
 * @param  {Server} server
 * @param  {Number} glRepoID
 *
 * @return {Promise<Object>}
 */
async function fetchLabels(server, glRepoID) {
    let url = `/projects/${glRepoID}/labels`;
    return Transport.fetchAll(server, url);
}

/**
 * Retrieve member records from Gitlab (these are not complete user records)
 *
 * @param  {Server} server
 * @param  {Number} glRepoID
 *
 * @return {Promise<Array<Object>>}
 */
async function fetchMembers(server, glRepoID) {
    let url = `/projects/${glRepoID}/members`;
    return Transport.fetchAll(server, url);
}

export {
    importEvent,
    importRepositories,
};
