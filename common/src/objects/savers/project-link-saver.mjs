import * as ProjectFinder from '../finders/project-finder.mjs';
import * as ProjectLinkFinder from '../finders/project-link-finder.mjs';

const schema = 'local';
const table = 'project_link';

async function removeLinks(db, links) {
    const linksAfter = await db.remove({ schema, table }, links);
    return linksAfter;
}

async function removeLink(db, link) {
    const [ linkAfter ] = await removeLinks(db, [ link ]);
    return linkAfter;
}

async function createLink(db, address, schema) {
    const project = await ProjectFinder.findProjectByName(db, schema);
    const name = project.details.title;
    const atime = (new Date).toISOString();
    const key = `${address}/${schema}`;
    const link = { key, address, schema, name, atime };
    const linkAfter = await db.saveOne({ schema, table }, link);
    return linkAfter;
}

async function removeLinksToServer(db, address) {
    const links = await ProjectLinkFinder.findLinksToServer(db, address);
    return removeLinks(db, links);
}

async function removeDefunctLinks(db, address) {
    const links = await ProjectLinkFinder.findDefunctLinks(db, address);
    return removeLinks(db, links);
}

export {
    createLink,
    removeLink,
    removeLinks,
    removeLinksToServer,
    removeDefunctLinks,
};
