import _ from 'lodash';
import Promise from 'bluebird';
import Path from 'path';
import Request from 'request';
import Ignore from 'ignore';
import MarkGor from 'mark-gor';
import HTTPError from 'errors/http-error';
import * as ExternalDataUtils from 'objects/utils/external-data-utils';

import * as Transport from 'gitlab-adapter/transport';

var isRelative = /^\s*\.\.\//;
var isTrambar = /(^|\/).trambar\//;

/**
 * Retrieve component descriptions about a push
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Push} push
 * @param  {String} defLang
 *
 * @return {Promise<Array<Object>>}
 */
function retrieveDescriptions(server, repo, push, defLang) {
    return createDescriptionContext(server, repo, push, defLang).then((cxt) => {
        return findMatchingComponents(cxt, push);
    }).then((components) => {
        return _.map(components, (component) => {
            return _.pick(component, 'text', 'image', 'icon')
        });
    }).catch((err) => {
        console.log(`Unable to retrieve descriptions: ${err.message}`);
        return [];
    });
}

var descriptionContextCache = {};

/**
 * Create a description context, retrieving descriptions from server if
 * necessary
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Push} push
 * @param  {String} defLang
 *
 * @return {Promise<Context>}
 */
function createDescriptionContext(server, repo, push, defLang) {
    var cachePath = [ defLang, server.id, repo.id, push.headId ];
    var cxt = _.get(descriptionContextCache, cachePath);
    if (cxt) {
        return Promise.resolve(cxt);
    }
    cxt = new Context(server, repo, push.headId, defLang);
    inheritPreviousContext(cxt, push);
    return loadDescriptors(cxt, '').then(() => {
        _.set(descriptionContextCache, cachePath, cxt);
        return cxt;
    });
}

/**
 * Copy information from context of the previous push
 *
 * @param  {Context} cxt
 * @param  {Push} push
 */
function inheritPreviousContext(cxt, push) {
    var prevPath = [ cxt.defaultLanguageCode, cxt.server.id, cxt.repo.id, push.tailId ];
    var prev = _.get(descriptionContextCache, prevPath);
    if (!prev) {
        return;
    }

    // copy descriptors from previous context unless files has changed
    var fileChanges = _.filter(_.concat(
        push.files.deleted,
        push.files.modified,
        _.map(push.files.renamed, 'before')
    ));
    for (var filePath in prev.descriptors) {
        if (!_.includes(fileChanges, filePath)) {
            cxt.descriptors[filePath] = prev.descriptors[filePath];
        }
    }

    // copy folder listing from previous context unless files in them have
    // been added, removed, or renamed
    var fileMovements = _.filter(_.concat(
        push.files.added,
        push.files.deleted,
        _.map(push.files.renamed, 'before'),
        _.map(push.files.renamed, 'after')
    ));
    var folderChanges = _.uniq(_.map(fileMovements, (path) => {
        var dir = Path.dirname(path);
        if (dir === '.') {
            dir = '';
        }
        return dir;
    }));
    for (var folderPath in prev.folders) {
        if (!_.includes(folderChanges, folderPath)) {
            cxt.folders[folderPath] = prev.folders[folderPath];
        }
    }

    // once a context has been reuse, there's little chance it'll be needed
    // again; get rid of it after a while
    clearTimeout(prev.removalTimeout);
    prev.removalTimeout = setTimeout(() => {
        _.unset(descriptionContextCache, prevPath);
    }, 10 * 60 * 1000);
}

/**
 * Find component definition in a .trambar folder matching files in a push
 *
 * @param  {Context} cxt
 * @param  {Push} push
 *
 * @return {Array<Component>}
 */
function findMatchingComponents(cxt, push) {
    var fileChanges = _.filter(_.concat(
        push.files.added,
        push.files.deleted,
        push.files.modified,
        _.map(push.files.renamed, 'before'),
        _.map(push.files.renamed, 'after')
    ));
    var matching = [];
    _.each(fileChanges, (path) => {
        _.each(cxt.descriptors, (descriptor) => {
            if (!_.includes(matching, descriptor)) {
                if (matchDescriptor(path, descriptor)) {
                    matching.push(descriptor);
                }
            }
        });
    });
    return _.map(matching, 'component');
}

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
 * Load Trambar descriptor from repo
 *
 * @param  {Context} cxt
 * @param  {String} folderPath
 * @param  {String} filePath
 *
 * @return {Promise}
 */
function loadDescriptor(cxt, folderPath, filePath) {
    var descriptor = cxt.descriptors[filePath];
    if (descriptor) {
        return Promise.resolve();
    }
    return parseDescriptorFile(cxt, filePath).then((info) => {
        var rules = info.rules;
        var name = _.replace(Path.basename(filePath), /\.\w+$/, '');
        if (!rules) {
            // implict rule: match <filename>.*
            rules = [ `${name}.*` ];
        }
        var id = `${folderPath}/${name}`;
        return importImage(cxt, folderPath, info.icon).then((image) => {
            var component = new Component(id, info.descriptions, image);
            var descriptor = new Descriptor(name, folderPath, rules, component);
            cxt.descriptors[filePath] = descriptor;
        });
    });
}

/**
 * Load Trambar descriptors from repo recursively
 *
 * @param  {Context} cxt
 * @param  {String} folderPath
 *
 * @return {Promise}
 */
function loadDescriptors(cxt, folderPath) {
    // scan .trambar folder
    var tfPath = (folderPath) ? `${folderPath}/.trambar` : '.trambar';
    return scanFolder(cxt, tfPath).filter((fileRecord) => {
        if (fileRecord.type === 'blob') {
            return /\.md$/.test(fileRecord.name);
        } else {
            return false;
        }
    }).mapSeries((fileRecord) => {
        return loadDescriptor(cxt, folderPath, fileRecord.path);
    }).then((descriptors) => {
        // recurse into subfolders
        return scanFolder(cxt, folderPath).filter((fileRecord) => {
            if (fileRecord.type === 'tree') {
                // .trambar folder cannot be nested
                if (fileRecord.name !== '.trambar') {
                    return true;
                }
            }
        }).each((subfolderRecord) => {
            return loadDescriptors(cxt, subfolderRecord.path);
        });
    });
}

/**
 * Parse a Trambar-specific Markdown file
 *
 * @param  {Context} cxt
 * @param  {String} path
 * @param  {String} defaultLanguageCode
 *
 * @return {Promise<Object>}
 */
function parseDescriptorFile(cxt, path) {
    return retrieveFile(cxt, path).then((file) => {
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
        if (!languageTokens[cxt.defaultLanguageCode]) {
            languageTokens[cxt.defaultLanguageCode] = defaultLanguageTokens;
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

/**
 * Scan git tree for list of objects
 *
 * @param  {Context} cxt
 * @param  {String} folderPath
 *
 * @return {Promise<Array<Object>>}
 */
function scanFolder(cxt, folderPath) {
    var listing = cxt.folders[folderPath];
    if (listing) {
        return Promise.resolve(listing);
    }
    return Promise.try(() => {
        console.log(`Scanning ${folderPath || '[ROOT]'}`);
        var repoLink = ExternalDataUtils.findLink(cxt.repo, cxt.server);
        var projectId = repoLink.project.id;
        var url = `projects/${projectId}/repository/tree`;
        var query = {
            path: folderPath,
            ref: cxt.headId,
        };
        return Transport.fetchAll(cxt.server, url, query).catch((err) => {
            if (err instanceof HTTPError) {
                if (err.statusCode === 404) {
                    return [];
                }
            }
            throw err;
        }).then((listing) => {
            cxt.folders[folderPath] = listing;
            return listing;
        });
    });
}

/**
 * Retrieve a file from Gitlab
 *
 * @param  {Context} cxt
 * @param  {String} filePath
 *
 * @return {Promise<Object>}
 */
function retrieveFile(cxt, filePath) {
    return Promise.try(() => {
        // only files in a .trambar folder is ever retrieved
        if (!isTrambar.test(filePath)) {
            throw new Error(`Not in .trambar folder: ${filePath}`);
        }
        console.log(`Retrieving file: ${filePath}`);
        var repoLink = ExternalDataUtils.findLink(cxt.repo, cxt.server);
        var projectId = repoLink.project.id;
        var pathEncoded = encodeURIComponent(filePath);
        var url = `/projects/${projectId}/repository/files/${pathEncoded}`;
        var query = { ref: cxt.headId };
        return Transport.fetch(cxt.server, url, query);
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
        var text = buffer.toString(encoding);
        if (text.indexOf('<<<<<<<') !== -1) {
            // fix conflicts accidentally checked in
            text = text.replace(gitConflicts, '$2');
        }
        return text;
    } else {
        return buffer;
    }
}

var gitConflicts = /<{7}\s\w+\r?\n([\s\S]*?\r?\n)={7}\r?\n([\s\S]*?\r?\n)>{7}\s\w+\r?\n/g;

/**
 * Upload file to media server
 *
 * @param  {Context} cxt
 * @param  {String} folderPath
 * @param  {String} url
 *
 * @return {Promise<Object|undefined>}
 */
function importImage(cxt, folderPath, url) {
    if (/^\w+:/.test(url)) {
        // absolute URL
        return Promise.resolve(url);
    }
    var tfPath = (folderPath) ? `${folderPath}/.trambar` : '.trambar';
    var imageName = url;
    if (/^\.\//.test(imageName)) {
        imageName = imageName.substr(2);
    }
    var imagePath = `${tfPath}/${imageName}`;
    return retrieveFile(cxt, imagePath).then((file) => {
        return updateImage(file);
    }).catch((err) => {
        return;
    });
}

/**
 * Upload file to media server
 *
 * @param  {Object} file
 *
 * @return {Promise<Object|undefined>}
 */
function updateImage(file) {
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

function Component(id, text, image) {
    this.id = id;
    this.text = text;
    if (typeof(image) === 'object') {
        this.image = image;
    } else if (typeof(image) === 'string' && image) {
        if (/^fa:\/\//.test(image)) {
            // special Font-Awesome URL fa://
            var parts = _.split(image.substr(5), '/');
            this.icon = {
                class: parts[0],
                backgroundColor: parts[1] || null,
                color: parts[2] || null,
            };
        } else {
            this.image = {
                url: image
            };
        }
    }
}

function Context(server, repo, headId, defaultLanguageCode) {
    this.server = server;
    this.repo = repo;
    this.headId = headId;
    this.defaultLanguageCode = defaultLanguageCode;
    this.folders = {};
    this.descriptors = {};
    this.removalTimeout = 0;
}

export {
    retrieveDescriptions,
};
