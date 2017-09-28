var _ = require('lodash');
var Promsie = require('bluebird');
var Request = require('request');
var HttpError = require('errors/http-error');
var Async = require('utils/async-do-while');

var Transport = require('gitlab-adapter/transport');

export.retrieveComponents = retrieveComponents;

/**
 * Retrieve component descriptions about a push
 *
 * @param  {Server} server
 * @param  {Repo} repo
 * @param  {Push} push
 *
 * @return {[type]}
 */
function retrieveDescriptions(server, repo, push) {
    // list of files affect, whether they were add, modified or deleted
    var paths = _.flattenDeep(_.values(push.files));
    //
    clearAffectedCacheEntries(server, repo, paths);
}

var trambarFolderCache;

/**
 * Load descriptions in a .trambar folder
 *
 * @param  {String} parentPath
 *
 * @return {Promise<TrambarFolder|null>}
 */
function loadTrambarFolder(server, repo, commitId, parentPath) {
    var cache = getTrambarFolderCache(server, repo);
    var promise = cache[parentPath];
    if (promise) {
        return promise;
    }
    promise = scanFolder(server, repo, commitId, `${parentPath}/.trambar`).then((filePaths) => {
        // group the contents based on the names of the files
        var components = [];
        _.each(filePaths, (filePath) => {
            var fileName = Path.basename(filePath);
            var name;
            var textFile, iconFile, imageFile, matchFile;
            var match;
            if (match = /(.*?)(\.([a-z]{2}))?\.md$/.exec(fileName)) {
                name = match[1];
                textFile = _.set({}, match[3] || languageCode, filePath);
            } else if (match = /(.*)\.(jpeg|jpg|png|gif)$/.exec(fileName)) {
                name = match[1];
                imageFile = filePath;
            } else if (match = /(.*)\.fa$/.exec(fileName)) {
                name = match[1];
                iconFile = filePath;
            } else if (match = /(.*)\.match$/.exec(fileName)) {
                name = match[1];
                matchFile = filePath;
                component = { name, matchFile };
            }
            if (name) {
                var component = _.find(components, { name });
                if (!component) {
                    var id = Path.relative(selectedRootPath, `${parentPath}/${name}`);
                    component = new Component(name, id);
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
            matchRules: Promise.resolve(component.matchFile).then((path) => {
                if (!path) {
                    return null;
                }
                // load file with fn patterns
                return FS.readFileAsync(path, 'utf8').then((text) => {
                    var patterns = _.split(text, /[\r\n]+/);
                    // use engine for handling .gitignore files to match
                    var matchRules = Ignore().add(patterns);
                    matchRules.match = matchRules.ignores;
                    return matchRules;
                });
            }),
            icon: Promise.resolve(component.iconFile).then((path) => {
                if (!path) {
                    return null;
                }
                // load file with font-awesome class name
                return FS.readFileAsync(path, 'utf8').then((text) => {
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
                });
            }),
            text: Promise.resolve(component.textFile).then((paths) => {
                // load each language version
                return Promise.props(_.mapValues(paths, (path, lang) => {
                    return FS.readFileAsync(path, 'utf8');
                }));
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
    trambarFolderCache[parentPath] = promise;
    return promise;
}

function clearAffectedCacheEntries(server, repo, paths) {
    var tfCache = getTrambarFolderCache(server, repo)
    _.each(paths, (path) => {
        var m = /(.*)\/\.trambar\//.exec(path);
        if (m) {
            var target = m[1];
            if (tfCache[target]) {
                tfCache[target] = undefined;
            }
        }
    });

}

var trambarFolderCache = {};

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
 * @param  {String} targetFolderPath
 *
 * @return {Promise<Array<TrambarFolder>>}
 */
function loadTrambarFolders(server, repo, targetFolderPath) {
    var paths = getFolderPaths(targetFolderPath);
    return Promise.map(paths, (path) => {
        return loadTrambarFolder(path);
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
    var relPath = Path.relative(folder.path, path);
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
 * Return absolute path to folder and paths of its parent folders, up
 * to root of git working folder
 *
 * @param  {String} folderPath
 *
 * @return {Array<String>}
 */
function getFolderPaths(folderPath) {
    var path = folderPath;
    var paths = [];
    do {
        paths.push(path);
        var parentPath = Path.dirname(path);
        if (path !== parentPath && path !== selectedRootPath) {
            path = parentPath;
        } else {
            path = null;
        }
    } while (path);
    return paths;
}

function scanFolder(server, repo, commitId, folderPath) {
    var url = `/projects/${repo.external_id}/repository/tree`;
    var query = {
        path: folderPath,
        ref: commitId,
    };
    return Transport.fetchAll(server, url, query);
}

function retrieveFile(server, repo, commitId, filePath) {
    var url = `/projects/${repo.external_id}/repository/files/${encodeURI(filePath)}`;
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

var imageFileCache = {};

/**
 * Upload file to media server
 *
 * @param  {Object} file
 *
 * @return {Promise<Object>}
 */
function importImage(file) {
    var promise = imageFileCache[file.blob_id];
    if (promise) {
        return promise;
    }
    var promise = new Promise((resolve, reject) => {
        var options = {
            json: true,
            url: 'http://media_server/internal/import',
            formData: {
                file: {
                    value: getFileContents(file),
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
                resolve(null);
            }
        });
    });
    imageFileCache[file.blob_id] = promise;
    return promise;
}
