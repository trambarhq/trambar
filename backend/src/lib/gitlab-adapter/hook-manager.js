var _ = require('lodash');
var Promise = require('bluebird');
var Database = require('database');

var Transport = require('gitlab-adapter/transport');

// accessors
var Project = require('accessors/project');
var Repo = require('accessors/repo');
var Server = require('accessors/server');

exports.installHooks = installHooks;

function installHooks(db) {
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
                return installProjectHook(server, repo, project);
            });
        });
    });
}

function installProjectHook(server, repo, project) {
    // TODO: use env vars
    var protocol = 'http';
    var domain = '172.19.0.1';
    var hook = new Hook;
    hook.url = `${protocol}://${domain}/gitlab/hook/${repo.id}/${project.id}`;
    return retrieveHooks(server, repo).then((hooks) => {
        var installed = _.find(hooks, { url: hook.url });
        if (installed) {
            var different = _.some(installed, (value, name) => {
                if (name !== 'id') {
                    if (value !== hook[name]) {
                        return true;
                    }
                }
            });
            if (different) {
                console.log('Different: ', installed, hook)
                return removeHook(server, repo, hook).then(() => {
                    return false;
                });
            }
        }
        return !!installed;
    }).then((installed) => {
        var url = `/projects/${repo.external_id}/hooks`;
        return Transport.post(server, url, hook);
    });
}

/**
 * Retrieve hooks installed for project
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
 * Remove a hook from the Gitlab server
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Hook} hook
 *
 * @return {Promise}
 */
function removeHook(server, repo, hook) {
    var url = `/projects/${repo.external_id}/hooks/${hook.id}`;
    return Transport.remove(server, url);
}

function Hook() {
    this.id = null;
    this.url = null;
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
