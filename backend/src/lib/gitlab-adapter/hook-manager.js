var _ = require('lodash');
var Promise = require('bluebird');
var Database = require('database');

var Transport = require('gitlab-adapter/transport');

// accessors
var Project = require('accessors/project');
var Repo = require('accessors/repo');
var Server = require('accessors/server');

exports.installHooks = installHooks;
exports.installProjectHook = installProjectHook;
exports.removeHooks = removeHooks;
exports.removeProjectHook = removeProjectHook;

/**
 * Re-install all project hooks
 *
 * @param  {Database} db
 * @param  {String} host
 *
 * @return {Promise}
 */
function installHooks(db, host) {
    return forEachProject(db, installProjectHook, host);
}

/**
 * Remove all project hooks
 *
 * @param  {Database} db
 * @param  {String} host
 *
 * @return {Promise}
 */
function removeHooks(db, host) {
    return forEachProject(db, removeProjectHook, host);
}

/**
 * Call function on every project in the database
 *
 * @param  {Database} db
 * @param  {Function} f
 * @param  {String} host
 *
 * @return {Promise}
 */
function forEachProject(db, f, host) {
    // load projects
    var criteria = {
        deleted: false
    };
    return Project.find(db, 'global', criteria, '*').each((project) => {
        // load repos connected with project
        var criteria = {
            id: project.repo_ids,
            deleted: false,
        };
        return Repo.find(db, 'global', criteria, '*').each((repo) => {
            // load server record
            var criteria = {
                id: repo.server_id,
                deleted: false,
            };
            return Server.findOne(db, 'global', criteria, '*').then((server) => {
                if (!server) {
                    return;
                }
                return f(host, server, repo, project);
            });
        });
    });
}

/**
 * Install project hook on Gitlab server
 *
 * @param  {String} host
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 *
 * @return {Promise}
 */
function installProjectHook(host, server, repo, project) {
    if (!host) {
        console.log('Unable to install hook due to missing server address');
        return Promise.resolve();
    }
    console.log(`Installing web-hook on repo for project: ${repo.name} -> ${project.name}`);
    return retrieveHooks(server, repo).then((hooks) => {
        var hook = new Hook(host, server, repo, project);
        var installed = _.find(hooks, { url: hook.url });
        if (installed) {
            // remove the installed hook if it's different from what we expect
            var different = _.some(_.omit(hook, 'id'), (value, name) => {
                if (value !== installed[name]) {
                    return true;
                }
            });
            if (different) {
                console.log(`Removing existing hook: ${installed.url}`);
                destroyHook(server, repo, installed);
                installed = null;
            }
        }
        if (!installed) {
            return createHook(server, repo, hook);
        }
    });
}

/**
 * Remove project hook from Gitlab server
 *
 * @param  {String} host
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Project} project
 *
 * @return {Promise}
 */
function removeProjectHook(host, server, repo, project) {
    if (!host) {
        return Promise.resolve();
    }
    console.log(`Removing web-hook on repo for project: ${repo.name} -> ${project.name}`);
    return retrieveHooks(server, repo).each((existingHook) => {
        var hook = new Hook(host, server, repo, project);
        if (existingHook.url === hook.url) {
            return destroyHook(server, repo, existingHook);
        }
    });
}

/**
 * Retrieve all hooks installed on repo
 *
 * @param  {Server} server
 * @param  {Repo} repo
 *
 * @return {Array<Hook>}
 */
function retrieveHooks(server, repo) {
    var url = `/projects/${repo.external_id}/hooks`;
    return Transport.fetchAll(server, url).map((info) => {
        var hook = new Hook;
        _.forIn(info, (value, name) => {
            if (hook.hasOwnProperty(name)) {
                hook[name] = value;
            }
        });
        return hook;
    });
}

/**
 * Install a hook from Gitlab server
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Hook} hook
 *
 * @return {Promise}
 */
function createHook(server, repo, hook) {
    var url = `/projects/${repo.external_id}/hooks`;
    return Transport.post(server, url, _.omit(hook, 'id'));
}

/**
 * Remove a hook from Gitlab server
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Hook} hook
 *
 * @return {Promise}
 */
function destroyHook(server, repo, hook) {
    var url = `/projects/${repo.external_id}/hooks/${hook.id}`;
    return Transport.remove(server, url);
}

function Hook(host, server, repo, project) {
    if (host && server && repo && project) {
        this.url = `${host}/gitlab/hook/${repo.id}/${project.id}`;
    } else {
        this.url = undefined;
    }
    this.id = undefined;
    this.push_events = true;
    this.issues_events = true;
    this.merge_requests_events = true;
    this.tag_push_events = true;
    this.note_events = true;
    this.job_events = true;
    this.pipeline_events = true;
    this.wiki_page_events = true;
    this.enable_ssl_verification = false;
}
