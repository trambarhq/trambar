var _ = require('lodash');
var Promise = require('bluebird');
var Moment = require('moment');
var Async = require('utils/async-do-while');

var Transport = require('gitlab-adapter/transport');
var PushRetriever = require('gitlab-adapter/push-retriever');
var PushDecorator = require('gitlab-adapter/push-decorator');
var UserImporter = require('gitlab-adapter/user-importer');

// accessors
var Reaction = require('accessors/reaction');
var Story = require('accessors/story');

exports.importEvents = importEvents;

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
            per_page: 100,
            page: 1,
        };
        if (lastEventTime) {
            var dayBefore = lastEventTime.clone().subtract(1, 'day');
            query.after = dayBefore.format('YYYY-MM-DD');
        }
        var done = false;
        var stories = [];
        Async.do(() => {
            return Transport.fetch(server, url, query).then((events) => {
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
        Async.while(() => { return !done });
        Async.return(() => { return stories });
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
    return UserImporter.importUser(db, server, event.author).then((author) => {
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
    return Transport.fetch(server, url).then((issue) => {
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
                }).then(() => {
                    return importIssueComments(db, server, repo, issue, project);
                }).return(story);
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
    story.public = !issue.confidential;
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
    return Transport.fetch(server, url).then((milestone) => {
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
//         return importMergeRequestComments(db, server, repo, msg.merge_request, project);
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
    var ref = evt.data.ref;
    var headId = evt.data.after;
    var tailId = evt.data.before;
    var count = evt.data.total_commits_count;
    return PushRetriever.retrievePush(server, repo, ref, headId, tailId, count).then((push) => {
        // look for component descriptions
        var impact = new PushImpact(push);
        return PushDecorator.retrieveDescriptions(server, repo, push).then((components) => {
            var commitIds = [];
            var details = {
                commit_ids: _.keys(push.commits),
                commit_id_before: push.tailId,
                commit_id_after: push.headId,
                lines: push.lines,
                files: _.transform(push.files, (counts, list, op) => {
                    // set the count if there's are items
                    if (!_.isEmpty(list)) {
                        counts[op] = list.length;
                    }
                }, {}),
                components: components,
                branch: _.last(_.split(push.ref, '/')),
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
            return Story.insertOne(db, schema, story).then((story) => {
                return Promise.each(commits, (commit) => {
                    return importCommitComments(db, server, repo, commit, project);
                }).return(story);
            });
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
 * Import a wiki related event
 *
 * @param  {Database} db
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Object} message
 * @param  {Project} project
 *
 * @return {Promise<Story|null>}
 */
function importWikiEvent(db, server, repo, message, project) {
    var schema = project.name;
    // the user id for some reason isn't included in the message, only the user name
    var criteria = {
        username: message.user.username,
        server_id: server.id,
    };
    return User.findOne(db, 'global', criteria, 'id, role_ids').then((author) => {
        if (!author) {
            return null;
        }
        var object = message.object_attributes;
        // see if there's story about this page recently
        var criteria = {
            type: 'wiki',
            newer_than: Moment().subtract(1, 'day').toISOString(),
            repo_id: repo.id,
            url: object.url,
        };
        return Story.findOne(db, schema, criteria, 'id').then((story) => {
            if (story) {
                if (object.action === 'delete') {
                    // remove the story if the page is no longer there
                    story.deleted = true;
                    return Story.saveOne(db, schema, story);
                } else if (story.deleted) {
                    // unerase the old story
                    story.deleted = false;
                    return Story.saveOne(db, schema, story);
                } else {
                    // ignore, as one story a day about a page is enough
                    return null;
                }
            } else {
                var fields = [ 'url', 'title', 'action', 'slug' ];
                story = {
                    type: criteria.type,
                    user_ids: [ author.id ],
                    role_ids: author.role_ids,
                    repo_id: repo.id,
                    details: _.pick(object, fields),
                    published: true,
                    ptime: Moment().toISOString(),
                    public: true,
                };
                return Story.saveOne(db, schema, story);
            }
        });
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
 * Return time at which event occurred
 *
 * @param  {Object} event
 *
 * @return {String}
 */
function getPublicationTime(event) {
    return Moment(event.created_at).toISOString();
}
