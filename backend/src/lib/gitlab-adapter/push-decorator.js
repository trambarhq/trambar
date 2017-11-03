var _ = require('lodash');
var Promise = require('bluebird');
var Request = require('request');
var Ignore = require('ignore');
var HttpError = require('errors/http-error');
var Async = require('async-do-while');

var Transport = require('gitlab-adapter/transport');

var languageCode = (process.env.LANG || 'en').substr(0, 2).toLowerCase();

exports.retrieveDescriptions = retrieveDescriptions;

/**
 * Retrieve component descriptions about a push
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Push} push
 *
 * @return {Promise<Array<Object>>}
 */
function retrieveDescriptions(server, repo, push) {
    // list of files affect, whether they were add, modified or deleted
    var paths = _.concat(
        push.files.added,
        push.files.removed,
        push.files.modified,
        _.map(push.files.renamed, 'before')
    );
    clearAffectedCacheEntries(server, repo, paths);
    var commitId = push.headId;
    var components = [];
    return Promise.each(paths, (path) => {
        return loadTrambarFolders(server, repo, commitId, path).each((trambarFolder) => {
            var matchingComponents = findMatchingComponents(trambarFolder, path);
            _.each(matchingComponents, (component) => {
                if (!_.includes(components, component)) {
                    components.push(component);
                }
            });
        });
    }).catch((err) => {
        console.error(err);
    }).then(() => {
        return _.map(components, (component) => {
            return _.pick(component, 'text', 'image', 'icon')
        });
    });
}

/**
 * Load descriptions in a .trambar folder
 *
 * @param  {String} parentPath
 *
 * @return {Promise<TrambarFolder|null>}
 */
function loadTrambarFolder(server, repo, commitId, parentPath) {
    // we're assuming here that pushes are retrieved in order
    // if an entry hasn't been invalidated previously, then it's valid for
    // that the latest commit id
    var cache = getTrambarFolderCache(server, repo);
    var promise = cache[parentPath];
    if (promise) {
        return promise;
    }
    var trambarFolderPath = (parentPath) ? `${parentPath}/.trambar` : `.trambar`;
    promise = scanFolder(server, repo, commitId, trambarFolderPath).then((records) => {
        var fileRecords = _.filter(records, { type: 'blob' });
        // group the contents based on the names of the files
        var components = [];
        _.each(fileRecords, (fileRecord) => {
            var name;
            var textFile, iconFile, imageFile, matchFile;
            var match;
            if (match = /(.*?)(\.([a-z]{2}))?\.md$/.exec(fileRecord.name)) {
                name = match[1];
                textFile = _.set({}, match[3] || languageCode, fileRecord);
            } else if (match = /(.*)\.(jpeg|jpg|png|gif)$/.exec(fileRecord.name)) {
                name = match[1];
                imageFile = fileRecord;
            } else if (match = /(.*)\.fa$/.exec(fileRecord.name)) {
                name = match[1];
                iconFile = fileRecord;
            } else if (match = /(.*)\.match$/.exec(fileRecord.name)) {
                name = match[1];
                matchFile = fileRecord;
                component = { name, matchFile };
            }
            if (name) {
                var component = _.find(components, { name });
                if (!component) {
                    component = new Component(name);
                    components.push(component);
                }
                if (textFile) {
                    _.assign(component.textFile, textFile);
                } else if(imageFile) {
                    component.imageFile = imageFile;
                } else if (iconFile) {
                    component.iconFile = iconFile;
                } else if (matchFile) {
                    component.matchFile = matchFile;
                }
            }
        });
        return components;
    }).mapSeries((component) => {
        // load text files
        var promises = {
            // load file with fn patterns
            matchRules: retrieveFile(server, repo, commitId, component.matchFile).then((file) => {
                if (!file) {
                    return;
                }
                var text = getFileContents(file, 'utf8');
                var patterns = _.split(text, /[\r\n]+/);
                // use engine for handling .gitignore files to match
                var matchRules = Ignore().add(patterns);
                matchRules.match = matchRules.ignores;
                return matchRules;
            }),
            // load file with font-awesome class name
            icon: retrieveFile(server, repo, commitId, component.iconFile).then((file) => {
                if (!file) {
                    return;
                }
                var text = getFileContents(file, 'utf8');
                var lines = _.split(text, /[\r\n]+/);
                var props = {};
                _.each(lines, (line) => {
                    if (!/^\s*#/.test(line)) {
                        var match = /^\s*([a-z\-]+)\s*\:\s*(\S*)/.exec(line);
                        if (match) {
                            props[match[1]] = match[2].replace(/\;$/, '');
                        }
                    }
                });
                return _.pick(props, 'class', 'color', 'background-color');
            }),
            // load each language version
            text: Promise.props(_.mapValues(component.textFile, (fileRecord) => {
                return retrieveFile(server, repo, commitId, fileRecord).then((file) => {
                    return getFileContents(file, 'utf8');
                });
            })),
            image: retrieveFile(server, repo, commitId, component.imageFile).then((file) => {
                if (!file) {
                    return;
                }
                return importImage(file);
            }),
        };
        // wait for promises to resolve then set properties
        return Promise.props(promises).then((props) => {
            _.assign(component, props);
            return component;
        });
    }).then((components) => {
        if (!_.isEmpty(components)) {
            return new TrambarFolder(parentPath, components);
        } else {
            return null;
        }
    });
    cache[parentPath] = promise;
    return promise;
}

/**
 * Clear cache entries affected by changes
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Array<String>} paths
 */
function clearAffectedCacheEntries(server, repo, paths) {
    var tfCache = getTrambarFolderCache(server, repo);
    _.each(paths, (path) => {
        var m = /(^|(.*)\/)\.trambar\//.exec(path);
        if (m) {
            var targetFolder = m[2] || '';
            if (tfCache[targetFolder]) {
                console.log(`Invalidating ${targetFolder}/.trambar`);
                tfCache[targetFolder] = undefined;
            }
        }
    });
}

var trambarFolderCache = {};

/**
 * Return cache entry for repo
 *
 * @param  {Server} server
 * @param  {Repo} repo
 *
 * @return {Object}
 */
function getTrambarFolderCache(server, repo) {
    var path = [ server.id, repo.id ];
    var tfCache = _.get(trambarFolderCache, path);
    if (!tfCache) {
        tfCache = {};
        _.set(trambarFolderCache, path, tfCache);
    }
    return tfCache;
}

/**
 * Load descriptions in .trambar folders
 *
 * @param  {String} targetPath
 *
 * @return {Promise<Array<TrambarFolder>>}
 */
function loadTrambarFolders(server, repo, commitId, targetPath) {
    var paths = getFolderPaths(targetPath);
    return Promise.map(paths, (path) => {
        return loadTrambarFolder(server, repo, commitId, path);
    }).then((folders) => {
        return _.filter(folders);
    });
}

/**
 * Find component definition in a .trambar folder matching
 * a file
 *
 * @param  {TrambarFolder} folder
 * @param  {String} path
 *
 * @return {Array<Component>}
 */
function findMatchingComponents(folder, path) {
    // relative to folder holding .trambar
    var relPath = getRelativePath(folder.path, path);
    var relPathNoExt = relPath.replace(/\.\w*$/, '');
    var components = _.filter(folder.components, (component) => {
        if (component.matchRules) {
            // match based on patterns in .match
            if (component.matchRules.match(relPath)) {
                return true;
            }
        } else {
            // match by name (without extension)
            if (component.name === relPathNoExt) {
                return true;
            }
        }
    });
    return components;
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
    console.log(`Scanning ${folderPath}`);
    var link = _.find(repo.external, { type: 'gitlab' });
    var url = `projects/${link.project.id}/repository/tree`;
    var query = {
        path: folderPath,
        ref: commitId,
    };
    return Transport.fetchAll(server, url, query).catch((err) => {
        if (err instanceof HttpError) {
            if (err.statusCode === 404) {
                return [];
            }
        }
        throw err;
    });
}

/**
 * Retrieve a file from Gitlab
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {String} commitId
 * @param  {Object} fileRecord
 *
 * @return {Promise<Object>}
 */
function retrieveFile(server, repo, commitId, fileRecord) {
    if (!fileRecord) {
        return Promise.resolve(null);
    }
    console.log(`Retrieving file: ${fileRecord.path}`);
    var link = _.find(repo.external, { type: 'gitlab' });
    var url = `/projects/${link.project.id}/repository/files/${encodeURIComponent(fileRecord.path)}`;
    var query = {
        ref: commitId,
    };
    return Transport.fetch(server, url, query);
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
            url: 'http://media_server/internal/import',
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
                err = new HttpError(resp.statusCode);
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
 * Return name part of file
 *
 * @param  {String} path
 *
 * @return {String}
 */
function getBaseName(path) {
    var slashIndex = _.indexOf(path, '/');
    if (slashIndex !== -1) {
        return path.substr(slashIndex + 1);
    } else {
        return path;
    }
}

/**
 * Return path of folder holding the file/subfolder
 *
 * @param  {String} path
 *
 * @return {String|null}
 */
function getFolderPath(path) {
    var slashIndex = _.lastIndexOf(path, '/');
    if (slashIndex !== -1) {
        return path.substr(0, slashIndex);
    } else {
        return (path) ? '' : null;
    }
}

/**
 * Return paths of all ancestor folders, up to the root of git working folder
 *
 * @param  {String} path
 *
 * @return {String}
 */
function getFolderPaths(path) {
    var paths = [];
    var parentPath = getFolderPath(path);
    while (parentPath !== null) {
        paths.push(parentPath);
        parentPath = getFolderPath(parentPath);
    }
    return paths;
}

/**
 * Return relative path of file
 *
 * @param  {String} toFolder
 * @param  {String} path
 *
 * @return {String}
 */
function getRelativePath(toFolder, path) {
    if (!toFolder) {
        return path;
    }
    var matchingPart = path.substr(0, toFolder.length);
    if (matchingPart !== toFolder && path.charAt(toFolder.length) !== '/') {
        return path;
    }
    return path.substr(toFolder.length + 1);
}

function TrambarFolder(path, components) {
    this.path = path;
    this.components = components;
}

function Component(name) {
    this.name = name;
    this.textFile = {};
    this.text = {};
    this.imageFile = null;
    this.image = null;
    this.iconFile = null;
    this.icon = null;
    this.matchFile = null;
    this.matchRules = null;
}
