var _ = require('lodash');
var Promise = require('bluebird');
var Path = require('path');
var Request = require('request');
var Ignore = require('ignore');
var MarkGor = require('mark-gor');
var HTTPError = require('errors/http-error');
var ExternalDataUtils = require('objects/utils/external-data-utils');

var Transport = require('gitlab-adapter/transport');

var languageCode = (process.env.LANG || 'en').substr(0, 2).toLowerCase();

module.exports = {
    retrieveDescriptions,
};

/**
 * Retrieve component descriptions about a push
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Push} push
 * @param  {String} languageCode
 *
 * @return {Promise<Array<Object>>}
 */
function retrieveDescriptions(server, repo, push, languageCode) {
    clearAffectedCacheEntries(server, repo, push);

    var commitId = push.headId;
    return loadDescriptors(server, repo, commitId, '', languageCode).then((descriptors) => {
        return findMatchingComponents(push, descriptors);
    }).then((components) => {
        return _.map(components, (component) => {
            return _.pick(component, 'text', 'image', 'icon')
        });
    });
}

/**
 * Find component definition in a .trambar folder matching
 * a file
 *
 * @param  {Push} push
 * @param  {Array<Descriptor>} descriptors
 *
 * @return {Array<Component>}
 */
function findMatchingComponents(push, descriptors) {
    var fileChanges = _.filter(_.concat(
        push.files.added,
        push.files.deleted,
        push.files.modified,
        _.map(push.files.renamed, 'before'),
        _.map(push.files.renamed, 'after')
    ));
    var matching = [];
    _.each(fileChanges, (path) => {
        _.each(descriptors, (descriptor) => {
            if (!_.includes(matching, descriptor)) {
                if (matchDescriptor(path, descriptor)) {
                    matching.push(descriptor);
                }
            }
        });
    });
    return _.map(matching, 'component');
}

var isTrambar = /\/.trambar\//;

/**
 * Return true if a path matches the descriptor's rules
 *
 * @param  {String} path
 * @param  {Descriptor} descriptor
 *
 * @return {Boolean}
 */
function matchDescriptor(path, descriptor) {
    if (descriptor.matching) {
        if (isInFolder(path, descriptor.folderPath)) {
            if (!isTrambar.test(path)) {
                var relativePath = Path.relative(descriptor.folderPath, path);
                if (descriptor.matching(relativePath)) {
                    return true;
                }
            }
        }
    }
    if (descriptor.matchingRelative) {
        if (!isTrambar.test(path)) {
            var relativePath = Path.relative(descriptor.folderPath, path);
            if (descriptor.matchingRelative(relativePath)) {
                return true;
            }
        }
    }
    if (descriptor.matchingTrambar) {
        if (isTrambar.test(path)) {
            var relativePath = Path.relative(descriptor.folderPath, path);
            if (descriptor.matchingTrambar(relativePath)) {
                return true;
            }
        }
    }
    return false;
}

function isInFolder(filePath, folderPath) {
    var len = folderPath.length;
    if (len === 0) {
        return true;
    }
    if (filePath.substr(0, len) === folderPath) {
        if (filePath.charAt(len) === '/') {
            return true;
        }
    }
    return false;
}

/**
 * Clear cache entries affected by changes
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Push} push
 */
function clearAffectedCacheEntries(server, repo, push) {
    // clear cached info of files
    var fileChanges = _.filter(_.concat(
        push.files.deleted,
        push.files.modified,
        _.map(push.files.renamed, 'before')
    ));
    _.each(fileChanges, (path) => {
        clearDescriptorCache(server, repo, path);
    });

    // clear cached info of folders
    var folderChanges = _.uniq(_.map(_.filter(_.concat(
        push.files.added,
        push.files.deleted,
        _.map(push.files.renamed, 'before'),
        _.map(push.files.renamed, 'after')
    )), (path) => {
        var dir = Path.dirname(path);
        if (dir === '.') {
            dir = '';
        }
        return dir;
    }));
    _.each(folderChanges, (path) => {
        clearFolderCache(server, repo, path);
    });
}

var descriptorCache = {};

/**
 * Return cache entry for repo
 *
 * @param  {Server} server
 * @param  {Repo} repo
 *
 * @return {Object}
 */
function getDescriptorCache(server, repo) {
    var path = [ server.id, repo.id ];
    var cache = _.get(descriptorCache, path);
    if (!cache) {
        cache = {};
        _.set(descriptorCache, path, cache);
    }
    return cache;
}

/**
 * Clear cached .trambar folders
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} filePath
 *
 * @return {Boolean}
 */
function clearDescriptorCache(server, repo, filePath) {
    var cache = getDescriptorCache(server, repo);
    if (cache[filePath]) {
        delete cache[filePath];
        return true;
    }
    return false;
}

/**
 * Load Trambar descriptor from repo
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} commitId
 * @param  {String} folderPath
 * @param  {String} path
 * @param  {String} languageCode
 *
 * @return {Promise<Descriptor>}
 */
function loadDescriptor(server, repo, commitId, folderPath, path, languageCode) {
    var cache = getDescriptorCache(server, repo);
    var info = cache[path];
    if (info) {
        return Promise.resolve(info);
    }
    return parseDescriptorFile(server, repo, commitId, path, languageCode).then((info) => {
        var rules = info.rules;
        var name = _.replace(Path.basename(path), /\.\w+$/, '');
        if (!rules) {
            // implict rule: match <filename>.*
            rules = [ `${name}.*` ];
        }
        var id = `${folderPath}/${name}`;
        var component = new Component(id, info.descriptions, info.icon);
        var descriptor = new Descriptor(name, folderPath, rules, component);
        cache[path] = descriptor;
        return descriptor;
    });
    return promise;
}

/**
 * Load Trambar descriptors from repo recursively
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} commitId
 * @param  {String} folderPath
 * @param  {String} languageCode
 *
 * @return {Promise<Array<Descriptor>>}
 */
function loadDescriptors(server, repo, commitId, folderPath, languageCode) {
    var tfPath = (folderPath) ? `${folderPath}/.trambar` : '.trambar';
    return scanFolder(server, repo, commitId, tfPath).filter((fileRecord) => {
        if (fileRecord.type === 'blob') {
            return /\.md$/.test(fileRecord.name);
        } else {
            return false;
        }
    }).mapSeries((fileRecord) => {
        return loadDescriptor(server, repo, commitId, folderPath, fileRecord.path, languageCode);
    }).then((descriptors) => {
        return scanFolder(server, repo, commitId, folderPath).filter((fileRecord) => {
            if (fileRecord.type === 'tree') {
                // .trambar folder cannot be nested
                if (fileRecord.name !== '.trambar') {
                    return true;
                }
            }
        }).each((subfolderRecord) => {
            return loadDescriptors(server, repo, commitId, subfolderRecord.path, languageCode).each((descriptor) => {
                descriptors.push(descriptor);
            });
        }).then(() => {
            return descriptors;
        });
    });
}

/**
 * Parse a Trambar-specific Markdown file
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} commitId
 * @param  {String} path
 * @param  {String} defaultLanguageCode
 *
 * @return {Promise<Object>}
 */
function parseDescriptorFile(server, repo, commitId, path, defaultLanguageCode) {
    return retrieveFile(server, repo, commitId, path).then((file) => {
        var text = getFileContents(file, 'utf-8');
        var parser = new MarkGor.Parser;
        var tokens = parser.parse(text);

        var languageTokens = {};
        var defaultLanguageTokens = [];
        var currentLanguageTokens = defaultLanguageTokens;
        var fileMatchDefinitions = [];
        var icon = null;
        _.each(tokens, (token) => {
            if (token.type === 'heading') {
                var cap = _.trim(token.captured);
                var m = /^#\s*([a-z]{2})\b/.exec(cap);
                if (m) {
                    var code = m[1];
                    languageTokens[code] = currentLanguageTokens = [];
                    return;
                }
            } else if (token.type === 'code') {
                if (token.lang === 'fnmatch' || token.lang === 'match') {
                    fileMatchDefinitions.push(token.text);
                    return;
                }
            } else if (token.type === 'def') {
                if (token.name === 'icon') {
                    icon = token.href;
                    return;
                }
            }
            currentLanguageTokens.push(token);
        });
        if (!languageTokens[defaultLanguageCode]) {
            languageTokens[defaultLanguageCode] = defaultLanguageTokens;
        }
        var descriptions = _.mapValues(languageTokens, (tokens) => {
            var fragments = _.map(tokens, 'captured');
            var text = fragments.join('');
            return _.trim(text);
        });
        var rules = null;
        if (!_.isEmpty(fileMatchDefinitions)) {
            rules = _.flatten(_.map(fileMatchDefinitions, (patterns) => {
                return _.filter(_.split(patterns, /[\r\n]+/));
            }));
        }
        return { descriptions, rules, icon };
    });
}

var folderCache = {};

/**
 * Return cache entry for repo
 *
 * @param  {Server} server
 * @param  {Repo} repo
 *
 * @return {Object}
 */
function getFolderCache(server, repo) {
    var path = [ server.id, repo.id ];
    var cache = _.get(folderCache, path);
    if (!cache) {
        cache = {};
        _.set(folderCache, path, cache);
    }
    return cache;
}

/**
 * Clear cached file lists
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} path
 *
 * @return {Boolean}
 */
function clearFolderCache(server, repo, path) {
    var cache = getFolderCache(server, repo);
    if (cache[path]) {
        delete cache[path];
        return true;
    }
    return false;
}

/**
 * Scan git tree for list of objects
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} commitId
 * @param  {String} folderPath
 *
 * @return {Promise<Array<Object>>}
 */
function scanFolder(server, repo, commitId, folderPath) {
    var cache = getFolderCache(server, repo);
    var listing = cache[folderPath];
    if (listing) {
        return Promise.resolve(listing);
    }
    return Promise.try(() => {
        console.log(`Scanning ${folderPath || '[ROOT]'}`);
        var repoLink = ExternalDataUtils.findLink(repo, server);
        var projectId = repoLink.project.id;
        var url = `projects/${projectId}/repository/tree`;
        var query = {
            path: folderPath,
            ref: commitId,
        };
        return Transport.fetchAll(server, url, query).catch((err) => {
            if (err instanceof HTTPError) {
                if (err.statusCode === 404) {
                    return [];
                }
            }
            throw err;
        }).then((listing) => {
            cache[folderPath] = listing;
            return listing;
        });
    });
}

/**
 * Retrieve a file from Gitlab
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} commitId
 * @param  {String} filePath
 *
 * @return {Promise<Object>}
 */
function retrieveFile(server, repo, commitId, filePath) {
    return Promise.try(() => {
        if (!/(^|\/).trambar\//.test(filePath)) {
            throw new Error(`Not in .trambar folder: ${filePath}`);
        }
        console.log(`Retrieving file: ${filePath}`);
        var repoLink = ExternalDataUtils.findLink(repo, server);
        var projectId = repoLink.project.id;
        var pathEncoded = encodeURIComponent(filePath);
        var url = `/projects/${projectId}/repository/files/${pathEncoded}`;
        var query = { ref: commitId };
        return Transport.fetch(server, url, query);
    });
}

/**
 * Decode the contents of a file
 *
 * @param  {Object} file
 *
 * @return {Buffer|String}
 */
function getFileContents(file, encoding) {
    var buffer = Buffer.from(file.content, 'base64');
    if (encoding) {
        return buffer.toString(encoding);
    } else {
        return buffer;
    }
}

/**
 * Upload file to media server
 *
 * @param  {Object} file
 *
 * @return {Promise<Object|undefined>}
 */
function importImage(file) {
    return new Promise((resolve, reject) => {
        var buffer = getFileContents(file);
        var options = {
            json: true,
            url: 'http://media_server/srv/internal/import',
            formData: {
                file: {
                    value: buffer,
                    options: {
                        filename: file.file_name,
                    }
                },
            },
        };
        Request.post(options, (err, resp, body) => {
            if (!err && resp && resp.statusCode >= 400) {
                err = new HTTPError(resp.statusCode);
            }
            if (!err) {
                resolve(body);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Parse rules for matching filename against patterns
 *
 * @param  {Array<String>} rules
 *
 * @return {Function|null}
 */
function parseFnmatchRules(rules) {
    // use engine for handling .gitignore files to match
    if (_.isEmpty(rules)) {
        return null;
    }
    var ignoreEngine = Ignore().add(rules);
    return (path) => {
        return ignoreEngine.ignores(path);
    };
}

function Descriptor(name, folderPath, rules, component) {
    this.name = name;
    this.folderPath = folderPath;
    this.component = component;
    this.rules = rules;

    var hierarchicalRules = [];
    var relativeRules = [];
    var trambarRules = [];
    var isRelative = /^\s*\.\.\//;
    var isTrambar = /\/.trambar\//;
    _.each(rules, (rule) => {
        if (!rule) {
            return;
        }
        if (isTrambar.test(rule)) {
            trambarRules.push(rule);
        } else if (isRelative.test(rule)) {
            // a rule that requires a relative path
            relativeRules.push(rule);
        } else {
            // a normal rule
            hierarchicalRules.push(rule);
        }
    });
    this.matching = parseFnmatchRules(hierarchicalRules);
    this.matchingRelative = parseFnmatchRules(relativeRules);
    this.matchingTrambar = parseFnmatchRules(trambarRules);
}

function Component(id, text, url) {
    this.id = id;
    this.text = text;
    if (/^fa:\/\//.test(url)) {
        // special Font-Awesome URL fa://
        var parts = _.split(url.substr(5), '/');
        this.icon = {
            class: parts[0],
            backgroundColor: parts[1] || null,
            color: parts[2] || null,
        };
    } else if (url) {
        this.image = { url };
    }
}
