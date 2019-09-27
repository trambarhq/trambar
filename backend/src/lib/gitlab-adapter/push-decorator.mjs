import _ from 'lodash';
import Path from 'path';
import Ignore from 'ignore';
import MarkGorParser from 'mark-gor/lib/parser.js';
import HTTPError from '../common/errors/http-error.mjs';
import * as TaskLog from '../task-log.mjs';
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
    const cxt = await createDescriptionContext(server, repo, push, defLang);
    const components = findMatchingComponents(cxt, push);
    return _.map(components, (component) => {
        return _.pick(component, 'text', 'image', 'icon')
    });
}

const descriptionContexts = [];

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
    cxt.taskLog = TaskLog.start('gitlab-description-retrieve', {
        clearing: true,
        server_id: server.id,
        server: server.name,
        repo_id: repo.id,
        repo: repo.name,
    });
    try {
        inheritPreviousContext(cxt, push);
        await loadDescriptors(cxt, '');
        await cxt.taskLog.finish();
    } catch (err) {
        await cxt.taskLog.abort(err);
    }
    cxt.taskLog = undefined;
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
    const prev = _.find(descriptionContexts, (prev) => {
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
    const fileChanges = _.filter(_.concat(
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
    const fileMovements = _.filter(_.concat(
        push.files.added,
        push.files.deleted,
        _.map(push.files.renamed, 'before'),
        _.map(push.files.renamed, 'after')
    ));
    const folderChanges = _.uniq(_.map(fileMovements, (path) => {
        const dir = Path.dirname(path);
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
    const fileChanges = _.filter(_.concat(
        push.files.added,
        push.files.deleted,
        push.files.modified,
        _.map(push.files.renamed, 'before'),
        _.map(push.files.renamed, 'after')
    ));
    const matching = [];
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
                const relativePath = Path.relative(descriptor.folderPath, path);
                if (descriptor.matching(relativePath)) {
                    return true;
                }
            }
        }
    }
    if (descriptor.matchingRelative) {
        if (!isTrambar.test(path)) {
            const relativePath = Path.relative(descriptor.folderPath, path);
            if (descriptor.matchingRelative(relativePath)) {
                return true;
            }
        }
    }
    if (descriptor.matchingTrambar) {
        if (isTrambar.test(path)) {
            const relativePath = Path.relative(descriptor.folderPath, path);
            if (descriptor.matchingTrambar(relativePath)) {
                return true;
            }
        }
    }
    return false;
}

function isInFolder(filePath, folderPath) {
    const len = folderPath.length;
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
    const descriptor = cxt.descriptors[filePath];
    if (descriptor) {
        return;
    }
    const info = await parseDescriptorFile(cxt, filePath);
    const name = _.replace(Path.basename(filePath), /\.\w+$/, '');
    const rules = info.rules || [ `${name}.*` ];    // implict rule: match <filename>.*
    const image = await importImage(cxt, folderPath, info.icon);
    const id = `${folderPath}/${name}`;
    const component = new Component(id, info.descriptions, image);
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
    const tfPath = Path.join(folderPath, '.trambar');
    const tfRecords = await scanFolder(cxt, tfPath);
    for (let record of tfRecords) {
        if (record.type === 'blob') {
            if (/\.md$/.test(record.name)) {
                await loadDescriptor(cxt, folderPath, record.path);
            }
        }
    }
    // recurse into subfolders
    const records = await scanFolder(cxt, folderPath);
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
    const file = await retrieveFile(cxt, path);
    const text = getFileContents(file, 'utf-8');
    const parser = new MarkGorParser;
    const tokens = parser.parse(text);

    const languageTokens = {};
    const defaultLanguageTokens = [];
    const currentLanguageTokens = defaultLanguageTokens;
    const fileMatchDefinitions = [];
    let icon = null;

    for (let token of tokens) {
        if (token.type === 'heading') {
            const cap = _.trim(token.captured);
            const m = /^#\s*([a-z]{2})\b/i.exec(cap);
            if (m) {
                const code = m[1];
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
    const descriptions = _.mapValues(languageTokens, (tokens) => {
        const fragments = _.map(tokens, 'captured');
        const text = fragments.join('');
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
        cxt.taskLog.describe(`scanning ${folderPath || '[ROOT]'}`);
        const repoLink = ExternalDataUtils.findLink(cxt.repo, cxt.server);
        const projectID = repoLink.project.id;
        const url = `projects/${projectID}/repository/tree`;
        const query = {
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

    cxt.taskLog.describe(`retrieving file: ${filePath}`);
    const repoLink = ExternalDataUtils.findLink(cxt.repo, cxt.server);
    const projectID = repoLink.project.id;
    const pathEncoded = encodeURIComponent(filePath);
    const url = `/projects/${projectID}/repository/files/${pathEncoded}`;
    const query = { ref: cxt.headID };
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
    const buffer = Buffer.from(file.content, 'base64');
    if (encoding) {
        const text = buffer.toString(encoding);
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
        const tfPath = Path.join(folderPath, '.trambar');
        const imageName = url;
        if (/^\.\//.test(imageName)) {
            imageName = imageName.substr(2);
        }
        const imagePath = `${tfPath}/${imageName}`;
        const file = await retrieveFile(cxt, imagePath);
        return file;
    } catch (err) {
        return;
    }
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
    const ignoreEngine = Ignore().add(rules);
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

        const hierarchicalRules = [];
        const relativeRules = [];
        const trambarRules = [];
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
                const parts = _.split(image.substr(5), '/');
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
