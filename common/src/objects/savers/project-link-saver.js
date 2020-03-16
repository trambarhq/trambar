import { findProjectByName } from '../finders/project-finder.js';
import { findLinksToServer, findDefunctLinks } from '../finders/project-link-finder.js';

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

async function createLink(db, address, projectName) {
  const project = await findProjectByName(db, projectName);
  const name = project.details.title;
  const atime = (new Date).toISOString();
  const key = `${address}/${projectName}`;
  const link = { key, address, schema: projectName, name, atime };
  const linkAfter = await db.saveOne({ schema, table }, link);
  return linkAfter;
}

async function removeLinksToServer(db, address) {
  const links = await findLinksToServer(db, address);
  return removeLinks(db, links);
}

async function removeDefunctLinks(db, address) {
  const links = await findDefunctLinks(db, address);
  return removeLinks(db, links);
}

export {
  createLink,
  removeLink,
  removeLinks,
  removeLinksToServer,
  removeDefunctLinks,
};
