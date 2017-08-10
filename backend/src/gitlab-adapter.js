var _ = require('lodash');
var Promise = require('bluebird');
var Express = require('express');
var BodyParser = require('body-parser');
var Request = require('request');
var Moment = require('moment');
var ParseDiff = require('parse-diff');
var Database = require('database');
var TaskQueue = require('utils/task-queue');
var Async = require('utils/async-do-while');
var HttpError = require('errors/http-error');

// accessors
var Project = require('accessors/project');
var Reaction = require('accessors/reaction');
var Repo = require('accessors/repo');
var Server = require('accessors/server');
var Story = require('accessors/story');
var User = require('accessors/user');

var server;
var database;

function start() {
    return Database.open(true).then((db) => {
        database = db;

        // listen for Webhook invocation
        var app = Express();
        app.use(BodyParser.json());
        app.set('json spaces', 2);
        app.post('/gitlab/hook/:repoId/:projectId', handleHookCallback);
        server = app.listen(80);

        return updateAllProjectHooks(db).then(() => {
            // import object from Gitlab server upon program start
            return updateFromAllServers(db);
        }).then(() => {
            // import events from repos
            return updateAllProjects(db);
        }).then(() => {
            // listen for database change events
            var tables = [
                'project',
                'reaction',
                'server',
                'story',
            ];
            return db.listen(tables, 'change', handleDatabaseChanges, 100);
        });
    });
}

function stop() {
    return new Promise((resolve, reject) => {
        if (server) {
            server.close();
            server.on('close', () => {
                resolve();
            });
        } else {
            resolve();
        }
    });
}

var taskQueue = new TaskQueue;

function handleDatabaseChanges(events) {
    var db = database;
    _.each(events, (event) => {
        if (event.action === 'DELETE') {
            return;
        }
        if (event.table === 'server') {
            // import users, roles, and repos from server
            if (event.diff.details) {
                taskQueue.schedule(() => {
                    var serverId = event.id;
                    return Server.findOne(db, 'global', { id: serverId }, '*').then((server) => {
                        if (server.type === 'gitlab') {
                            if (!server.details.url || !server.details.credentials) {
                                return;
                            }
                            return importServerObjects(db, server);
                        }
                    });
                });
            }
        } else if (event.table === 'project') {
            // import events from repository when it's added to project
            if (event.diff.repo_ids) {
                var projectId = event.id;
                var repoIdsBefore = event.diff.repo_ids[0];
                var repoIdsAfter = event.diff.repo_ids[1];
                var newRepoIds = _.difference(repoIdsAfter, repoIdsBefore);
                _.each(newRepoIds, (repoId) => {
                    taskQueue.schedule(() => {
                        var db = database;
                        return Repo.findOne(db, 'global', { id: repoId }, '*').then((repo) => {
                            return Project.findOne(db, 'global', { id: projectId }, '*').then((project) => {
                                if (!repo || !project) {
                                    return;
                                }
                                return Server.findOne(db, 'global', { id: repo.server_id }, '*').then((server) => {
                                    return importEvents(db, server, repo, project);
                                });
                            });
                        });
                    });
                });
            }
        } else if (event.table === 'story') {
            if (event.diff.repo_id) {
                return;
            }
            // copy contents from story to issue tracker
            var storyId = event.id;
            Story.findOne(db, event.schema, { id: storyId }, '*').then((story) => {
                var issueTracking = story.details.issue_tracking;
                var repoId = story.repo_id;
                var issueId = story.external_id;
                if (issueTracking && repoId) {
                    taskQueue.schedule(() => {
                        return Repo.findOne(db, 'global', { id: repoId }, '*').then((repo) => {
                            return Project.findOne(db, 'global', { name: schema }, '*').then((project) => {
                                if (!repo || !project || !_.includes(project.repo_ids, repo.id)) {
                                    return;
                                }
                                return Server.findOne(db, 'global', { id: repo.server_id }, '*').then((server) => {
                                    return exportStory(project, reaction, server, repo, issueId);
                                });
                            });
                        });
                    });
                }
            });
        } else if (event.table === 'reaction') {
            if (event.diff.repo_id) {
                return;
            }
            // add comments to issue tracker
            var schema = event.schema;
            var reactionId = event.id;
            Reaction.findOne(db, schema, { id: reactionId }, '*').then((reaction) => {
                if (!reaction || !reaction.ptime || reaction.type !== 'comment') {
                    return;
                }
                return Story.findOne(db, event.schema, { id: story_id }, '*').then((story) => {
                    var repoId = story.repo_id;
                    var issueId = story.external_id;
                    if (repoId && issueId) {
                        taskQueue.schedule(() => {
                            return Repo.findOne(db, 'global', { id: repoId }, '*').then((repo) => {
                                return Project.findOne(db, 'global', { name: schema }, '*').then((project) => {
                                    if (!repo || !project || !_.includes(project.repo_ids, repo.id)) {
                                        return;
                                    }
                                    return Server.findOne(db, 'global', { id: repo.server_id }, '*').then((server) => {
                                        exportComment(project, reaction, server, repo, issueId);
                                    });
                                });
                            });
                        });
                    }
                });
            });
        }
    });
}

function handleHookCallback(req, res) {
    var repoId = req.params.repoId;
    var projectId = req.params.projectId;
    var message = req.body;
    console.log('Incoming: ', message);
    taskQueue.schedule(() => {
        var db = database;
        return Repo.findOne(db, 'global', { id: repoId }, '*').then((repo) => {
            return Project.findOne(db, 'global', { id: projectId }, '*').then((project) => {
                if (!repo || !project || !_.includes(project.repo_ids, repo.id)) {
                    return;
                }
                return Server.findOne(db, 'global', { id: repo.server_id }, '*').then((server) => {
                    if (message.object_kind === 'note') {
                        return importComments(db, server, repo, message, project);
                    } else {
                        return importEvents(db, server, repo, project);
                    }
                });
            });
        });
    });
    res.end();
}

/**
 * Import objects from all Gitlab servers
 *
 * @param  {Database} db
 *
 * @return {Promise}
 */
function updateFromAllServers(db) {
    var criteria = {
        type: 'gitlab',
        deleted: false,
    };
    return Server.find(db, 'global', criteria, '*').each((server) => {
        return importServerObjects(db, server);
    });
}

/**
 * Import certain Gitlab objects
 *
 * @param  {Database} db
 * @param  {Server} server
 *
 * @return {Promise}
 */
function importServerObjects(db, server) {
    return Promise.resolve().then(() => {
        return importRepositories(db, server);
    }).then(() => {
        return importUsers(db, server);
    }).then(() => {
        return importProjectMemberships(db, server);
    });
}

/**
 * Import repositories from Gitlab
 *
 * @param  {Database} db
 * @param  {Server} server
 *
 * @return {Promise<Array<Repo>>}
 */
function importRepositories(db, server) {
    var url = `/projects`;
    return fetch(server, url).then((projects) => {
        return Repo.find(db, 'global', { server_id: server.id }, '*').then((repos) => {
            var changes = [];
            var imported = {};
            _.each(repos, (repo) => {
                var project = _.find(projects, { id: repo.external_id });
                if (project) {
                    var repoBefore = _.cloneDeep(repo);
                    repo.deleted = false;
                    copyRepoDetails(repo, project);
                    if (!_.isEqual(repo, repoBefore)) {
                        changes.push(repo);
                    }
                    imported[project.id] = true;
                } else {
                    if (repo.deleted !== true) {
                        repo.deleted = true;
                        changes.push(repo);
                    }
                }
            });
            _.each(projects, (project) => {
                if (!imported[project.id]) {
                    var repo = {
                        server_id: server.id,
                        external_id: project.id,
                        type: 'gitlab',
                        details: {},
                    };
                    copyRepoDetails(repo, project);
                    changes.push(repo);
                }
            });
            return Repo.save(db, 'global', changes);
        });
    });
}

/**
 * Copy details from Gitlab project object
 *
 * @param  {Repo} repo
 * @param  {Object} project
 */
function copyRepoDetails(repo, project) {
    var fields = [
        'name',
        'ssh_url',
        'http_url',
        'web_url',
        'issues_enabled',
        'archived',
    ];
    _.assign(repo.details, _.pick(project, fields));
}

/**
 * Import users from Gitlab
 *
 * @param  {Database} db
 * @param  {Server} server
 *
 * @return {Promise<Array<User>>}
 */
function importUsers(db, server) {
    var url = `/users`;
    return fetch(server, url).then((accounts) => {
        return User.find(db, 'global', { server_id: server.id }, '*').then((users) => {
            var changes = [];
            var imported = {};
            _.each(users, (user) => {
                var account = _.find(accounts, { id: user.external_id });
                if (account) {
                    var userBefore = _.cloneDeep(user);
                    user.deleted = false;
                    copyUserDetails(user, account);
                    if (!_.isEqual(user, userBefore)) {
                        changes.push(user);
                    }
                    imported[account.id] = true;
                } else {
                    if (user.deleted !== true) {
                        user.deleted = true;
                        changes.push(user);
                    }
                }
            });
            _.each(accounts, (account) => {
                if (!imported[account.id]) {
                    var user = {
                        server_id: server.id,
                        external_id: account.id,
                        type: 'member',
                        emails: [],
                        details: {},
                    };
                    copyUserDetails(user, account);
                    changes.push(user);
                }
            });
            return User.save(db, 'global', changes);
        });
    });
}

/**
 * Copy details from Gitlab user object
 *
 * @param  {Repo} repo
 * @param  {Object} project
 */
function copyUserDetails(user, account) {
    user.details.name = account.name;
    var nameParts = _.split(account.name, /\s+/);
    user.details.first_name = (nameParts.length >= 2) ? _.first(nameParts) : undefined;
    user.details.last_name = (nameParts.length >= 2) ? _.last(nameParts) : undefined;
    user.details.web_url = account.web_url;
    user.details.username = account.username;
    user.details.skype_username = account.skype || undefined;
    user.details.twiter_username = account.twitter || undefined;
    user.details.linkedin_username = account.linkedin_name || undefined;
    if (!_.includes(user.emails, account.email)) {
        user.emails.push(account.email);
    }
}

function importProjectMemberships(db, server) {
    // find users originating from server
    var criteria = {
        server_id: server.id
    };
    return User.find(db, 'global', criteria, '*').then((users) => {
        var changes = [];
        // go through all projects
        var criteria = {
            deleted: false
        };
        return Project.find(db, 'global', criteria, '*').each((project) => {
            // look at repo from this server
            var criteria = {
                id: project.repo_ids,
                server_id: server.id,
            };
            return Repo.find(db, 'global', criteria, '*').then((repos) => {
                if (_.isEmpty(repos) === 0) {
                    return null;
                }
                // this project is linked with this server
                // fetch member list from Gitlab
                var memberLists = [];
                return Promise.each(repos, (repo) => {
                    if (repo.deleted) {
                        return;
                    }
                    var url = `/projects/${repo.external_id}/members`;
                    var query = {
                        page: 1,
                        per_page: 100,
                    };
                    var done = false;
                    Async.do(() => {
                        return fetch(server, url, query).then((members) => {
                            memberLists.push(members);
                            if (members.length === query.per_page && query.page < 100) {
                                query.page++;
                            } else {
                                done = true;
                            }
                        });
                    });
                    Async.while(() => {
                        return !done;
                    });
                    Async.finally((err) => {
                        if (err) {
                            throw err;
                        }
                    });
                    return Async.end();
                }).then(() => {
                    return _.flatten(memberLists);
                });
            }).then((members) => {
                if (members) {
                    // add/remove project id to users' project list
                    _.each(users, (user) => {
                        var member = _.find(members, { id: user.external_id });
                        var changed = false;
                        if (member) {
                            if (!_.includes(user.project_ids, project.id)) {
                                user.project_ids.push(project.id);
                                changed = true;
                            }
                        } else {
                            if (_.includes(user.project_ids, project.id)) {
                                _.pull(user.project_ids, project.id);
                                changed = true;
                            }
                        }
                        if (changed && !_.includes(changes, user)) {
                            changes.push(user);
                        }
                    });
                }
            });
        }).then(() => {
            return User.save(db, 'global', changes);
        });
    });
}

/**
 * Find user with Gitlab user id
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Number} gitlabUserId
 *
 * @return {Promise<Use|null>}
 */
function findUser(db, server, gitlabUserId) {
    return findUsers(db, server, [ gitlabUserId ]).then((users) => {
        return (users.length > 0) ? users[0] : null;
    });
}

/**
 * Find users with Gitlab user ids, importing them records are missing
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Array<Number>} gitlabUserIds
 *
 * @return {Promise<Array<User>>}
 */
function findUsers(db, server, gitlabUserIds) {
    var criteria = {
        server_id: server.id,
        external_id: gitlabUserIds,
    };
    return User.find(db, 'global', criteria, '*').then((users) => {
        var missing = _.some(gitlabUserIds, (id) => {
            return !_.find(users, { external_id: id });
        });
        if (!missing) {
            return users;
        } else {
            return importUsers(db, server).then((imported) => {
                var missingBefore = _.filter(imported, (user) => {
                    return _.includes(gitlabUserIds, user.external_id);
                });
                users = _.concat(users, missingBefore);
                return users;
            });
        }
    });
}

/**
 * Return publication time of the most recent story from repository
 *
 * @param  {Database} db
 * @param  {Project} project
 * @param  {Repo} repo
 *
 * @return {Promise<Moment>}
 */
function findLastEventTime(db, project, repo) {
    var schema = project.name;
    var criteria = {
        repo_id: repo.id,
        ready: true,
    };
    return Story.findOne(db, schema, criteria, 'MAX(ptime) AS time').then((row) => {
        return (row && row.time) ? Moment(row.time) : null;
    });
}

/**
 * Retrieve events from all repositories attached to projects
 *
 * @param  {Database} db
 *
 * @return {Promise}
 */
function updateAllProjects(db) {
    var criteria = {
        deleted: false,
    };
    return Project.find(db, 'global', criteria, '*').each((project) => {
        var criteria = {
            id: project.repo_ids,
            deleted: false,
        };
        return Repo.find(db, 'global', criteria, '*').each((repo) => {
            return Server.findOne(db, 'global', { id: repo.server_id }, '*').then((server) => {
                return importEvents(db, server, repo, project);
            });
        });
    });
}

/**
 * Retrieve activity log entries from Gitlab server and turn them into stories
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importEvents(db, server, repo, project) {
    return findLastEventTime(db, project, repo).then((lastEventTime) => {
        var url = `/projects/${repo.external_id}/events`;
        var query = {
            sort: 'asc',
            per_page: 50,
            page: 1,
        };
        if (lastEventTime) {
            var dayBefore = lastEventTime.clone().subtract(1, 'day');
            query.after = dayBefore.format('YYYY-MM-DD');
        }
        var done = false;
        var stories = [];
        Async.do(() => {
            return fetch(server, url, query).then((events) => {
                if (lastEventTime) {
                    events = _.filter(events, (event) => {
                        return Moment(event.created_at) > lastEventTime;
                    });
                }
                console.log('Events: ' + _.size(events));
                return Promise.each(events, (event) => {
                    return importEvent(db, server, repo, event, project).then((story) => {
                        if (story) {
                            stories.push(story);
                        }
                    });
                }).then(() => {
                    if (events.length === query.per_page) {
                        query.page++;
                    } else {
                        done = true;
                    }
                });
            });
        });
        Async.while(() => {
            return !done;
        });
        Async.finally((err) => {
            if (err) {
                throw err;
            }
            return stories;
        });
        return Async.end();
    });
}

/**
 * Import an activity log entry, creating a story or updating an existing one
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} event
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importEvent(db, server, repo, event, project) {
    return findUser(db, server, event.author_id).then((author) => {
        if (!author) {
            return;
        }
        switch (event.target_type) {
            case 'Issue':
                return importIssueEvent(db, server, repo, event, author, project);
            case 'Milestone':
                return importMilestoneEvent(db, server, repo, event, author, project);
            case 'MergeRequest':
                return importMergeRequestEvent(db, server, repo, event, author, project);
        }
        switch (event.action_name) {
            case 'deleted':
            case 'created':
            case 'imported':
                return importRepoEvent(db, server, repo, event, author, project);
            case 'joined':
            case 'left':
                return importMembershipEvent(db, server, repo, event, author, project);
            case 'pushed new':
            case 'pushed_new':
            case 'pushed new':
            case 'pushed_to':
            case 'pushed to':
                return importPushEvent(db, server, repo, event, author, project);
        }
    });
}

/**
 * Import an activity log entry about an issue
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} event
 * @param  {User} author
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importIssueEvent(db, server, repo, event, author, project) {
    var schema = project.name;
    var issueId = event.target_id;
    var url = `/projects/${repo.external_id}/issues/${issueId}`;
    return fetch(server, url).then((issue) => {
        // look for existing story
        var criteria = {
            type: 'issue',
            external_id: issueId,
        };
        return Story.findOne(db, schema, criteria, '*').then((story) => {
            if (!story) {
                story = {
                    type: criteria.type,
                    user_ids: [ author.id ],
                    role_ids: author.role_ids,
                    repo_id: repo.id,
                    external_id: issueId,
                    details: {},
                    published: true,
                    ptime: getPublicationTime(event),
                };
            }
            copyIssueDetails(story, issue);
            return Story.saveOne(db, schema, story).then((story) => {
                return Promise.mapSeries(issue.assignees, (assignee) => {
                    return findUser(db, server, assignee.id);
                }).then((users) => {
                    // add assignment reaction
                    var criteria = {
                        type: 'assignment',
                        story_id: story.id,
                    };
                    return Reaction.find(db, schema, criteria, '*').then((reactions) => {
                        var changes = [];
                        _.each(users, (user) => {
                            var reaction = _.find(reactions, { user_id: user.id });
                            if (!reaction) {
                                reaction = {
                                    type: criteria.type,
                                    story_id: story.id,
                                    repo_id: repo.id,
                                    external_id: issue.id,
                                    user_id: user.id,
                                    target_user_ids: _.uniq([ author.id, user.id ]),
                                    details: {
                                        issue_number: issue.iid,
                                    },
                                    published: true,
                                    ptime: Moment(issue.updated_at).toISOString(),
                                };
                                changes.push(reaction);
                            }
                        });
                        return Reaction.save(db, schema, changes);
                    });
                });
            });
        });
    });
}

function copyIssueDetails(story, issue) {
    story.details.state = issue.state;
    story.details.labels = issue.labels;
    story.details.milestone = _.get(issue.milestone, 'title');
    story.details.title = { zz: issue.title };
    story.details.number = issue.iid;
    story.public = issue.confidential;
}

/**
 * Import an activity log entry about an issue
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} event
 * @param  {User} author
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importMilestoneEvent(db, server, repo, event, author, project) {
    var schema = project.name;
    var milestoneId = event.target_id;
    var url = `/projects/${repo.external_id}/milestones/${milestoneId}`;
    return fetch(server, url).then((milestone) => {
        // look for existing story
        var criteria = {
            type: 'milestone',
            external_id: milestoneId,
        };
        return Story.findOne(db, schema, criteria, '*').then((story) => {
            if (!story) {
                story = {
                    type: criteria.type,
                    user_ids: [ author.id ],
                    role_ids: author.role_ids,
                    repo_id: repo.id,
                    external_id: milestoneId,
                    details: {},
                    published: true,
                    public: true,
                    ptime: getPublicationTime(event),
                };
            }
            copyMilestoneDetails(story, milestone);
            return Story.saveOne(db, schema, story);
        });
    });
}

function copyMilestoneDetails(story, milestone) {
    story.details.state = milestone.state;
    story.details.title = { zz: milestone.title };
    story.details.due_date = milestone.due_date;
    story.details.start_date = milestone.start_date;
    story.details.number = milestone.iid;
}

/**
 * Import an activity log entry about an issue
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} event
 * @param  {User} author
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importMergeRequestEvent(db, server, repo, event, author, project) {

}

/**
 * Import an activity log entry about an issue
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} event
 * @param  {User} author
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importRepoEvent(db, server, repo, event, author, project) {
    var schema = project.name;
    var details = {
        action: event.action_name,
        name: repo.details.name,
    };
    var story = {
        type: 'repo',
        user_ids: [ author.id ],
        role_ids: author.role_ids,
        repo_id: repo.id,
        details,
        published: true,
        public: true,
        ptime: getPublicationTime(event),
    };
    return Story.insertOne(db, schema, story);
}

/**
 * Import an activity log entry about a push
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} event
 * @param  {User} author
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importPushEvent(db, server, repo, event, author, project) {
    var schema = project.name;
    var previousCommitHash = event.data.before;
    var finalCommitHash = event.data.after;
    var totalCommitCount = event.data.total_commits_count;
    return fetchCommits(server, repo, finalCommitHash, previousCommitHash, totalCommitCount).then((commits) => {
        // look for component descriptions
        return retrieveComponentDescriptions(server, repo, commits).then((componentChanges) => {
            var commitIds = [];
            var lineChanges = {
                added: 0,
                deleted: 0,
            };
            var added = {};
            var renamed = {};
            var deleted = {};
            var modified = {};
            _.each(commits, (commit) => {
                commitIds.push(commit.id);

                if (commit.lines) {
                    lineChanges.added += commit.lines.additions;
                    lineChanges.deleted += commit.lines.deletions;
                }
                if (commit.files) {
                    _.each(commit.files.added, (path) => {
                        added[path] = true;
                    });
                    _.each(commit.files.deleted, (path) => {
                        // if the file was deleted within this push, ignore it
                        if (added[path]) {
                            delete added[path];
                        } else {
                            deleted[path] = true;
                        }
                    });
                    _.each(commit.files.renamed, (path) => {
                        // if the file was renamed within this push, treat it
                        // as an addition under the new name
                        if (added[path.before]) {
                            delete added[path.before];
                            added[path.after] = true;
                        } else {
                            if (renamed[path.before]) {
                                delete renamed[path.before];
                            }
                            renamed[path.after] = true;
                        }
                    });
                    _.each(commit.files.modified, (path) => {
                        // if the file was added by this push, don't treat it
                        // as a modification
                        if (!added[path]) {
                            modified[path] = true;
                        }
                    });
                }
            });
            var fileChanges = _.pickBy({
                added: _.size(added),
                renamed: _.size(renamed),
                deleted: _.size(deleted),
                modified: _.size(modified),
            });
            var details = {
                commit_ids: commitIds,
                lines: lineChanges,
                files: fileChanges,
                components: componentChanges,
            };
            var story = {
                type: 'push',
                user_ids: [ author.id ],
                role_ids: author.role_ids,
                repo_id: repo.id,
                details,
                published: true,
                public: true,
                ptime: getPublicationTime(event),
            };
            return Story.insertOne(db, schema, story);
        });
    });
}

/**
 * Import an activity log entry about someone joining the project
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} event
 * @param  {User} author
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importMembershipEvent(db, server, repo, event, author, project) {
    var schema = project.name;
    var story = {
        type: 'member',
        user_ids: [ author.id ],
        role_ids: author.role_ids,
        repo_id: repo.id,
        details: {
            action: event.action_name
        },
        published: true,
        public: true,
        ptime: getPublicationTime(event),
    };
    return Story.insertOne(db, schema, story);
}

/**
 * Import comments
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} msg
 * @param  {Project} project
 *
 * @return {Promise}
 */
function importComments(db, server, repo, msg, project) {
    if (msg.commit) {
        return importCommitComments(db, server, repo, msg.commit, project);
    } else if (msg.issue) {
        return importIssueComments(db, server, repo, msg.issue, project);
    } else if (msg.merge_request) {
        return importMergeRequestComments(db, server, repo, msg.merge_request, project);
    }
}

function importCommitComments(db, server, repo, commit, project) {
    var schema = project.name;
    var criteria = {
        commit_id: commit.id,
    };
    return Story.findOne(db, schema, criteria, '*').then((story) => {
        if (!story) {
            return;
        }
        var url = `/projects/${repo.external_id}/repository/commits/${commit.id}/comments`;
        return importStoryComments(db, server, url, project, story);
    });
}

function importIssueComments(db, server, repo, issue, project) {
    var schema = project.name;
    var criteria = {
        external_id: issue.id,
    };
    return Story.findOne(db, schema, criteria, '*').then((story) => {
        if (!story) {
            return;
        }
        var url = `/projects/${repo.external_id}/issues/${issue.iid}/notes`;
        return importStoryComments(db, server, url, project, story);
    });
}

function importMergeRequestComments(db, server, repo, mergeRequest, project) {
    var schema = project.name;
    var criteria = {
        external_id: mergeRequest.id,
    };
    return Story.findOne(db, schema, criteria, '*').then((story) => {
        if (!story) {
            return;
        }
        var url = `/projects/${repo.external_id}/merge_requests/${mergeRequest.iid}/notes`;
        return importStoryComments(db, server, url, project, story);
    });

}

function importStoryComments(db, server, url, project, story) {
    var schema = project.name;
    var changes = [];
    var criteria = {
        story_id: story.id,
        repo_id: story.repo_id,
    };
    return Reaction.find(db, schema, criteria, '*').then((reactions) => {
        var query = {
            page: 1,
            per_page: 100
        };
        var done = false;
        Async.do(() => {
            return fetch(server, url).then((notes) => {
                var nonSystemNotes = _.filter(notes, (note) => {
                    return !note.system;
                });
                var accountIds = _.map(nonSystemNotes, (note) => {
                    return note.author.id;
                });
                return findUsers(db, server, accountIds).then((users) => {
                    _.each(nonSystemNotes, (note, index) => {
                        // commit comments don't have ids for some reason
                        var noteId = note.id || index;
                        var reaction = _.find(reactions, { external_id: noteId });
                        var author = _.find(users, { external_id: note.author.id });
                        if (reaction || !author) {
                            return;
                        }
                        reaction = {
                            type: 'note',
                            story_id: story.id,
                            repo_id: story.repo_id,
                            external_id: noteId,
                            user_id: author.id,
                            target_user_ids: story.user_ids,
                            details: {},
                            published: true,
                            ptime: getPublicationTime(note),
                        };
                        changes.push(reaction);
                    });
                });
            }).then(() => {
                if (notes.length === query.per_page && query.page < 100) {
                    query.page++;
                } else {
                    done = true;
                }
            });
        });
        Async.while(() => {
            return !done;
        })
        return Async.end();
    }).then(() => {
        changes = _.orderBy(changes, [ 'ptime' ], [ 'asc' ]);
        return Reaction.save(db, schema, changes);
    });
}

/**
 * Return time at which event occurred
 *
 * @param  {Object} event
 *
 * @return {String}
 */
function getPublicationTime(event) {
    return Moment(event.created_at).toISOString();
}

function updateAllProjectHooks(db) {
    var criteria = {
        deleted: false
    };
    return Project.find(db, 'global', criteria, '*').each((project) => {
        var criteria = {
            id: project.repo_ids,
            deleted: false,
        };
        return Repo.find(db, 'global', criteria, '*').each((repo) => {
            return installProjectHooks(db, project, repo);
        });
    });
}

function installProjectHooks(db, project, repo) {
    var hook = createHook(project, repo);
    return Server.findOne(db, 'global', { id: repo.server_id }, '*').then((server) => {
        var url = `/projects/${repo.external_id}/hooks`;
        var query = { per_page: 100 };
        return fetch(server, url, query).then((hooks) => {
            var installed = _.find(hooks, { url: hook.url });
            if (installed) {
                if (!_.isEqual(_.pick(installed, _.keys(hook)), hook)) {
                    return removeHook(server, repo, hook).then(() => {
                        return false;
                    });
                }
                return true;
            } else {
                return false;
            }
        }).then((installed) => {
            if (!installed) {
                return post(server, url, hook);
            }
        });
    });
}

function createHook(project, repo) {
    // TODO: use env vars
    var protocol = 'http';
    var domain = '172.19.0.1';
    return {
        url: `${protocol}://${domain}/gitlab/hook/${repo.id}/${project.id}`,
        push_events: true,
        issues_events: true,
        merge_requests_events: true,
        tag_push_events: true,
        note_events: true,
        job_events: true,
        pipeline_events: true,
        wiki_page_events: true,
        enable_ssl_verification: false,
    };
}

function removeHook(server, repo, hook) {
    var url = `/projects/${repo.external_id}/hooks`;
    return remove(server, url);
}

/**
 * Retrieve commits from Gitlab server
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} finalCommitHash
 * @param  {String} previousCommitHash
 * @param  {Number} totalCommitCount
 *
 * @return {Promise<Array<Object>>}
 */
function fetchCommits(server, repo, finalCommitHash, previousCommitHash, totalCommitCount) {
    var commits = [];
    return fetchCommitsRecursive(server, repo, finalCommitHash, previousCommitHash, totalCommitCount, commits).then(() => {
        return _.orderBy(commits, [ 'committed_date' ], [ 'asc' ]);
    });
}

/**
 * Currently retrieve commits and their parents until the end is reach
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} hash
 * @param  {String} endHash
 * @param  {Number} limit
 * @param  {Array} results
 *
 * @return {Promise}
 */
function fetchCommitsRecursive(server, repo, hash, endHash, limit, results) {
    if (hash === endHash || results.length === limit) {
        return Promise.resolve();
    }
    var url1 = `/projects/${repo.external_id}/repository/commits/${hash}`;
    return fetch(server, url1).then((commit) => {
        var url2 = `${url1}/diff`;
        return fetch(server, url2).then((files) => {
            var fileChanges = {
                added: [],
                deleted: [],
                renamed: [],
                modified: [],
            };
            _.each(files, (file) => {
                if (file.new_file) {
                    fileChanges.added.push(file.new_path);
                } else if (file.deleted_file) {
                    fileChanges.deleted.push(file.old_path);
                } else if (file.renamed_file) {
                    fileChanges.renamed.push({
                        before: file.old_path,
                        after: file.new_path,
                    });
                    if (file.diff) {
                        // check if the file was renamed and modified
                        var diff = _.first(ParseDiff(file.diff));
                        if (diff) {
                            if (diff.additions || diff.deletions) {
                                fileChanges.modified.push(file.new_path);
                            }
                        }
                    }
                } else {
                    fileChanges.modified.push(file.new_path);
                }
            });
            results.push({
                id: commit.id,
                author_email: commit.author_email,
                committed_date: commit.committed_date,
                lines: commit.stats,
                files: fileChanges,
            });
        }).then(() => {
            if (commit.parent_ids instanceof Array) {
                return Promise.each(commit.parent_ids, (hash) => {
                    return fetchCommitsRecursive(server, repo, hash, endHash, limit, results)
                });
            }
        });
    });
}

function retrieveComponentDescriptions(server, repo, commits) {
    var components = [];
    return Promise.resolve(components);
}

function fetch(server, uri, query) {
    return new Promise((resolve, reject) => {
        var options = {
            json: true,
            baseUrl: server.details.url,
            headers: {
                'PRIVATE-TOKEN': server.details.credentials.token,
            },
            qs: query,
            uri,
        };
        Request.get(options, (err, resp, body) => {
            if (!err) {
                resolve(body);
            } else {
                reject(err);
            }
        });
    });
}

function post(server, uri, payload) {
    return new Promise((resolve, reject) => {
        var options = {
            json: true,
            baseUrl: server.details.url,
            headers: {
                'PRIVATE-TOKEN': server.details.credentials.token,
            },
            body: payload,
            uri,
        };
        Request.post(options, (err, resp, body) => {
            if (!err) {
                resolve(body);
            } else {
                reject(err);
            }
        });
    });
}

function remove(server, uri) {
    return new Promise((resolve, reject) => {
        var options = {
            json: true,
            baseUrl: server.details.url,
            headers: {
                'PRIVATE-TOKEN': server.details.credentials.token,
            },
            uri,
        };
        Request.delete(options, (err, resp, body) => {
            if (!err) {
                resolve(body);
            } else {
                reject(err);
            }
        });
    });
}

exports.start = start;
exports.stop = stop;

if (process.argv[1] === __filename) {
    start();
}
