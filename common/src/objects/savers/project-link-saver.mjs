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

export {
    removeLink,
    removeLinks,
};
