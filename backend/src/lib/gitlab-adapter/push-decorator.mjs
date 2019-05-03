import _ from 'lodash';
import Path from 'path';
import Request from 'request';
import Ignore from 'ignore';
import MarkGor from 'mark-gor/lib/parser.js';
import HTTPError from '../common/errors/http-error.mjs';
import * as ExternalDataUtils from '../common/objects/utils/external-data-utils.mjs';

import * as Transport from './transport.mjs';

const isRelative = /^\s*\.\.\//;
const isTrambar = /(^|\/).trambar\//;

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
async function retrieveDescriptions(server, repo, push, defLang) {
    try {
        let cxt = await createDescriptionContext(server, repo, push, defLang);
        let components = await findMatchingComponents(cxt, push);
        return _.map(components, (component) => {
            return _.pick(component, 'text', 'image', 'icon')
        });
    } catch (err) {
        console.log(`Unable to retrieve descriptions: ${err.message}`);
        return [];
    }
}

let descriptionContexts = [];

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
async function createDescriptionContext(server, repo, push, defLang) {
    let cxt = _.find(descriptionContexts, (cxt) => {
        if (cxt.server.id === server.id) {
            if (cxt.repo.id === repo.id) {
                if (cxt.defaultLanguageCode === defLang) {
                    if (cxt.headID === push.headID) {
                        return true;
                    }
                }
            }
        }
    });
    if (cxt) {
        cxt.server = server;
        cxt.repo = repo;
        return cxt;
    }
    cxt = new Context(server, repo, push.headID, defLang);
    inheritPreviousContext(cxt, push);
    await loadDescriptors(cxt, '');
    descriptionContexts.unshift(cxt);
    if (descriptionContexts.length > 1000) {
        descriptionContexts.splice(1000);
    }
    return cxt;
}

/**
 * Copy information from context of the previous push
 *
 * @param  {Context} cxt
 * @param  {Push} push
 */
function inheritPreviousContext(cxt, push) {
    let prev = _.find(descriptionContexts, (prev) => {
        if (prev.server.id === cxt.server.id) {
            if (prev.repo.id === cxt.repo.id) {
                if (prev.defaultLanguageCode === cxt.defaultLanguageCode) {
                    if (prev.headID === push.tailID) {
                        return true;
                    }
                }
            }
        }
    });
    if (!prev) {
        return;
    }

    // copy descriptors from previous context unless files has changed
    let fileChanges = _.filter(_.concat(
        push.files.deleted,
        push.files.modified,
        _.map(push.files.renamed, 'before')
    ));
    for (let filePath in prev.descriptors) {
        if (!_.includes(fileChanges, filePath)) {
            cxt.descriptors[filePath] = prev.descriptors[filePath];
        }
    }

    // copy folder listing from previous context unless files in them have
    // been added, removed, or renamed
    let fileMovements = _.filter(_.concat(
        push.files.added,
        push.files.deleted,
        _.map(push.files.renamed, 'before'),
        _.map(push.files.renamed, 'after')
    ));
    let folderChanges = _.uniq(_.map(fileMovements, (path) => {
        let dir = Path.dirname(path);
        if (dir === '.') {
            dir = '';
        }
        return dir;
    }));
    for (let folderPath in prev.folders) {
        if (!_.includes(folderChanges, folderPath)) {
            cxt.folders[folderPath] = prev.folders[folderPath];
        }
    }
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
    let fileChanges = _.filter(_.concat(
        push.files.added,
        push.files.deleted,
        push.files.modified,
        _.map(push.files.renamed, 'before'),
        _.map(push.files.renamed, 'after')
    ));
    let matching = [];
    for (let path of fileChanges) {
        for (let descriptor of _.values(cxt.descriptors)) {
            if (!_.includes(matching, descriptor)) {
                if (matchDescriptor(path, descriptor)) {
                    matching.push(descriptor);
                }
            }
        }
    }
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
                let relativePath = Path.relative(descriptor.folderPath, path);
                if (descriptor.matching(relativePath)) {
                    return true;
                }
            }
        }
    }
    if (descriptor.matchingRelative) {
        if (!isTrambar.test(path)) {
            let relativePath = Path.relative(descriptor.folderPath, path);
            if (descriptor.matchingRelative(relativePath)) {
                return true;
            }
        }
    }
    if (descriptor.matchingTrambar) {
        if (isTrambar.test(path)) {
            let relativePath = Path.relative(descriptor.folderPath, path);
            if (descriptor.matchingTrambar(relativePath)) {
                return true;
            }
        }
    }
    return false;
}

function isInFolder(filePath, folderPath) {
    let len = folderPath.length;
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
async function loadDescriptor(cxt, folderPath, filePath) {
    let descriptor = cxt.descriptors[filePath];
    if (descriptor) {
        return;
    }
    let info = await parseDescriptorFile(cxt, filePath);
    let rules = info.rules;
    let name = _.replace(Path.basename(filePath), /\.\w+$/, '');
    if (!rules) {
        // implict rule: match <filename>.*
        rules = [ `${name}.*` ];
    }
    let image = await importImage(cxt, folderPath, info.icon);
    let id = `${folderPath}/${name}`;
    let component = new Component(id, info.descriptions, image);
    cxt.descriptors[filePath] = new Descriptor(name, folderPath, rules, component);
}

/**
 * Load Trambar descriptors from repo recursively
 *
 * @param  {Context} cxt
 * @param  {String} folderPath
 *
 * @return {Promise}
 */
async function loadDescriptors(cxt, folderPath) {
    // scan .trambar folder
    let tfPath = Path.join(folderPath, '.trambar');
    let tfRecords = await scanFolder(cxt, tfPath);
    for (let record of tfRecords) {
        if (record.type === 'blob') {
            if (/\.md$/.test(record.name)) {
                await loadDescriptor(cxt, folderPath, record.path);
            }
        }
    }
    // recurse into subfolders
    let records = await scanFolder(cxt, folderPath);
    for (let record of records) {
        if (record.type === 'tree') {
            // .trambar folder cannot be nested
            if (record.name !== '.trambar') {
                await loadDescriptors(cxt, record.path);
            }
        }
    }
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
async function parseDescriptorFile(cxt, path) {
    let file = await retrieveFile(cxt, path);
    let text = getFileContents(file, 'utf-8');
    let parser = new MarkGorParser;
    let tokens = parser.parse(text);

    let languageTokens = {};
    let defaultLanguageTokens = [];
    let currentLanguageTokens = defaultLanguageTokens;
    let fileMatchDefinitions = [];
    let icon = null;

    for (let token of tokens) {
        if (token.type === 'heading') {
            let cap = _.trim(token.captured);
            let m = /^#\s*([a-z]{2})\b/.exec(cap);
            if (m) {
                let code = m[1];
                languageTokens[code] = currentLanguageTokens = [];
                continue;
            }
        } else if (token.type === 'code') {
            if (token.lang === 'fnmatch' || token.lang === 'match') {
                fileMatchDefinitions.push(token.text);
                continue;
            }
        } else if (token.type === 'def') {
            if (token.name === 'icon') {
                icon = token.href;
                continue;
            }
        }
        currentLanguageTokens.push(token);
    }
    if (!languageTokens[cxt.defaultLanguageCode]) {
        languageTokens[cxt.defaultLanguageCode] = defaultLanguageTokens;
    }
    let descriptions = _.mapValues(languageTokens, (tokens) => {
        let fragments = _.map(tokens, 'captured');
        let text = fragments.join('');
        return _.trim(text);
    });
    let rules = null;
    if (!_.isEmpty(fileMatchDefinitions)) {
        rules = _.flatten(_.map(fileMatchDefinitions, (patterns) => {
            return _.filter(_.split(patterns, /[\r\n]+/));
        }));
    }
    return { descriptions, rules, icon };
}

/**
 * Scan git tree for list of objects
 *
 * @param  {Context} cxt
 * @param  {String} folderPath
 *
 * @return {Promise<Array<Object>>}
 */
async function scanFolder(cxt, folderPath) {
    let listing = cxt.folders[folderPath];
    if (listing) {
        return listing;
    }
    try {
        console.log(`Scanning ${folderPath || '[ROOT]'}`);
        let repoLink = ExternalDataUtils.findLink(cxt.repo, cxt.server);
        let projectID = repoLink.project.id;
        let url = `projects/${projectID}/repository/tree`;
        let query = {
            path: folderPath,
            ref: cxt.headID,
        };
        listing = await Transport.fetchAll(cxt.server, url, query);
    } catch (err) {
        if (err instanceof HTTPError && err.statusCode === 404) {
            listing = [];
        } else {
            throw err;
        }
    }
    cxt.folders[folderPath] = listing;
    return listing;
}

/**
 * Retrieve a file from Gitlab
 *
 * @param  {Context} cxt
 * @param  {String} filePath
 *
 * @return {Promise<Object>}
 */
async function retrieveFile(cxt, filePath) {
    // only files in a .trambar folder is ever retrieved
    if (!isTrambar.test(filePath)) {
        throw new Error(`Not in .trambar folder: ${filePath}`);
    }
    console.log(`Retrieving file: ${filePath}`);
    let repoLink = ExternalDataUtils.findLink(cxt.repo, cxt.server);
    let projectID = repoLink.project.id;
    let pathEncoded = encodeURIComponent(filePath);
    let url = `/projects/${projectID}/repository/files/${pathEncoded}`;
    let query = { ref: cxt.headID };
    return Transport.fetch(cxt.server, url, query);
}

/**
 * Decode the contents of a file
 *
 * @param  {Object} file
 *
 * @return {Buffer|String}
 */
function getFileContents(file, encoding) {
    let buffer = Buffer.from(file.content, 'base64');
    if (encoding) {
        let text = buffer.toString(encoding);
        if (text.indexOf('<<<<<<<') !== -1) {
            // fix accidentally checked-in git conflicts
            text = text.replace(gitConflicts, '$2');
        }
        return text;
    } else {
        return buffer;
    }
}

const gitConflicts = /<{7}\s\w+\r?\n([\s\S]*?\r?\n)={7}\r?\n([\s\S]*?\r?\n)>{7}\s\w+\r?\n/g;

/**
 * Upload file to media server
 *
 * @param  {Context} cxt
 * @param  {String} folderPath
 * @param  {String} url
 *
 * @return {Promise<String|Object|undefined>}
 */
async function importImage(cxt, folderPath, url) {
    try {
        if (!url) {
            return;
        }
        if (/^\w+:/.test(url)) {
            // absolute URL
            return url;
        }
        let tfPath = Path.join(folderPath, '.trambar');
        let imageName = url;
        if (/^\.\//.test(imageName)) {
            imageName = imageName.substr(2);
        }
        let imagePath = `${tfPath}/${imageName}`;
        let file = await retrieveFile(cxt, imagePath);
        return file;
    } catch (err) {
        return;
    }
}

/**
 * Upload file to media server
 *
 * @param  {Object} file
 *
 * @return {Promise<Object|undefined>}
 */
async function updateImage(file) {
    return new Promise((resolve, reject) => {
        let buffer = getFileContents(file);
        let options = {
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
    let ignoreEngine = Ignore().add(rules);
    return (path) => {
        return ignoreEngine.ignores(path);
    };
}

class Descriptor {
    constructor(name, folderPath, rules, component) {
        this.name = name;
        this.folderPath = folderPath;
        this.component = component;
        this.rules = rules;

        let hierarchicalRules = [];
        let relativeRules = [];
        let trambarRules = [];
        for (let rule of rules) {
            if (rule) {
                if (isTrambar.test(rule)) {
                    trambarRules.push(rule);
                } else if (isRelative.test(rule)) {
                    // a rule that requires a relative path
                    relativeRules.push(rule);
                } else {
                    // a normal rule
                    hierarchicalRules.push(rule);
                }
            }
        }

        this.matching = parseFnmatchRules(hierarchicalRules);
        this.matchingRelative = parseFnmatchRules(relativeRules);
        this.matchingTrambar = parseFnmatchRules(trambarRules);
    }
}

class Component {
    constructor(id, text, image) {
        this.id = id;
        this.text = text;
        if (typeof(image) === 'object') {
            this.image = image;
        } else if (typeof(image) === 'string' && image) {
            if (/^fa:\/\//.test(image)) {
                // special Font-Awesome URL fa://
                let parts = _.split(image.substr(5), '/');
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
}

class Context {
    constructor(server, repo, headID, defaultLanguageCode) {
        this.server = server;
        this.repo = repo;
        this.headID = headID;
        this.defaultLanguageCode = defaultLanguageCode;
        this.folders = {};
        this.descriptors = {};
        this.removalTimeout = 0;
    }
}

export {
    retrieveDescriptions,
};
