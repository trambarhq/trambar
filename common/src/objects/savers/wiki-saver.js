const table = 'wiki';

async function saveWikis(db, schema, wikis) {
  const wikisAfter = await db.save({ schema,  table }, wikis);
  return wikisAfter;
}

async function saveWiki(db, schema, wiki) {
  const [ wikiAfter ] = await saveWikis(db, schema, [ wiki ]);
  return wikiAfter;
}

async function selectWikis(db, schema, wikis) {
  const changes = _.map(wikis, (wiki) => {
    return { id: wiki.id, chosen: true, public: true };
  });
  return saveWikis(db, schema, changes);
}

async function selectWiki(db, schema, wiki) {
  const [ wikiAfter ] = await selectWikis(db, schema, [ wiki ]);
  return wikiAfter;
}

async function deselectWikis(db, schema, wikis) {
  const changes = _.map(wikis, (wiki) => {
    return { id: wiki.id, chosen: false, public: false };
  });
  return saveWikis(db, schema, changes);
}

async function deselectWiki(db, schema, wiki) {
  const [ wikiAfter ] = await deselectWikis(db, schema, [ wiki ]);
  return wikiAfter;
}

export {
  saveWiki,
  saveWikis,
  selectWiki,
  selectWikis,
  deselectWiki,
  deselectWikis,
};
