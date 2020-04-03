import { externalIdStrings } from './runtime.mjs';

/**
 * Convert strings in an array to lower case
 *
 * @param  {Array<String>} strings
 *
 * @return {Array<String>}
 */
function lowerCase(strings) {
  const results = [];
  for (let string of strings) {
    results.push(strings.toLowerCase());
  }
  return results;
}
lowerCase.args = 'strings text[]';
lowerCase.ret = 'text[]';
lowerCase.flags = 'IMMUTABLE';

function matchAny(filters, objects) {
  for (let object of objects) {
    if (matchObject(filters, object)) {
      return true;
    }
  }
  return false;
}
matchAny.args = 'filters jsonb, objects jsonb[]';
matchAny.ret = 'boolean';
matchAny.flags = 'IMMUTABLE';

function hasFalse(details) {
  for (let name in details) {
    if (!details[name]) {
      return true;
    }
  }
  return false;
}
hasFalse.args = 'details jsonb';
hasFalse.ret = 'boolean';
hasFalse.flags = 'IMMUTABLE';

function hasCandidates(details, ids) {
  const { candidates } = details;
  if (candidates instanceof Array) {
    for (let candidate of candidates) {
      if (ids.includes(candidate.id)) {
        return true;
      }
    }
  }
  return false;
}
hasCandidates.args = 'details jsonb, ids int[]';
hasCandidates.ret = 'boolean';
hasCandidates.flags = 'IMMUTABLE';

/**
 * Return a list of payload ids contained in the object
 *
 * @param  {Object} details
 *
 * @return {Array<String>|null}
 */
function payloadTokens(details) {
  const tokens = [];
  const resources = details.resources;
  if (resources instanceof Array) {
    for (let res of resources) {
      if (res.payload_token) {
        tokens.push(res.payload_token);
      }
    }
  } else {
    if (details.payload_token) {
      tokens.push(details.payload_token);
    }
  }
  return (tokens.length > 0) ? tokens : null;
}
payloadTokens.args = 'details jsonb';
payloadTokens.ret = 'text[]';
payloadTokens.flags = 'IMMUTABLE';

/**
 * Copy properties of payload into matching resource
 *
 * @param  {Object} details
 * @param  {Object} payload
 *
 * @return {Object}
 */
function updatePayload(details, payload) {
  // use etime to determine if resource is ready, since progress can get
  // rounded to 100 before the final step
  const ready = (payload.completion === 100 && payload.etime !== null);
  const resources = details.resources;
  if (resources instanceof Array) {
    for (let res of resources) {
      if (res.payload_token === payload.token) {
        transferProps(payload.details, res);
      }
    }
  } else {
    // info is perhaps stored in the details object itself
    const res = details;
    if (res.payload_token === payload.token) {
      transferProps(payload.details, res);
    }
  }
  return details;
}
updatePayload.args = 'details jsonb, payload jsonb';
updatePayload.ret = 'jsonb';
updatePayload.flags = 'IMMUTABLE';

/**
 * Return user id associated with authorization token--if it's still valid
 *
 * NOTE: Runs as root
 *
 * @param  {String} token
 * @param  {String} area
 *
 * @return {Number}
 */
function checkAuthorization(token, area) {
  const sql = `
    SELECT user_id, area FROM "global"."session"
    WHERE token = $1
    AND (area = $2 OR $2 IS NULL)
    AND etime >= NOW()
    AND deleted = false
    AND activated = true
    LIMIT 1`;
  const row = plv8.execute(sql, [ token, area ])[0];
  return (row) ? row.user_id : null;
}
checkAuthorization.args = 'token text, area text';
checkAuthorization.ret = 'int';
checkAuthorization.flags = 'SECURITY DEFINER';

/**
 * Extend the expiration time by given number of days
 *
 * NOTE: Runs as root
 *
 * @param  {String} token
 * @param  {Number} days
 */
function extendAuthorization(token, days) {
  const etime = new Date;
  etime.setMilliseconds(0);
  etime.setSeconds(0);
  etime.setMinutes(0);
  etime.setHours(etime.getHours() + days * 24);
  if (days > 2) {
    etime.setHours(0);
  }
  const sql = `
    UPDATE "global"."session"
    SET etime = $2
    WHERE token = $1
    AND deleted = false`;
  plv8.execute(sql, [ token, etime.toISOString() ]);
}
extendAuthorization.args = 'token text, days int';
extendAuthorization.ret = 'void';
extendAuthorization.flags = 'SECURITY DEFINER';

externalIdStrings.args = 'external jsonb[], type text, names text[]';
externalIdStrings.ret = 'text[]';
externalIdStrings.flags = 'IMMUTABLE';

/**
 * Extract text from details column
 *
 * @param  {Object} details
 * @param  {String} lang
 *
 * @return {String}
 */
function extractText(details, lang) {
  const list = [];
  if (details.text && details.text[lang]) {
    list.push(details.text[lang]);
  }
  return list.join(' ');
}
extractText.args = 'details jsonb, lang text';
extractText.ret = 'text';
extractText.flags = 'IMMUTABLE';

/**
 * Extract text from story
 *
 * @param  {String} type
 * @param  {Object} details
 * @param  {Array<Object>} external
 * @param  {String} lang
 *
 * @return {String}
 */
function extractStoryText(type, details, external, lang) {
  const list = [];
  if (details.text && details.text[lang]) {
    list.push(details.text[lang]);
  }
  if (details.title) {
    list.push(details.title);
  }
  switch (type) {
    case 'issue':
      if (details.milestone) {
        list.push(details.milestone);
      }
      if (external instanceof Array) {
        external.forEach((link) => {
          if (link.issue && link.issue.number) {
            list.push(link.issue.number);
          }
        });
      }
      break;
    case 'merge-request':
      if (details.milestone) {
        list.push(details.milestone);
      }
      if (details.branch) {
        list.push(details.branch);
      }
      if (details.source_branch) {
        list.push(details.source_branch);
      }
      break;
    case 'push':
    case 'merge':
      if (details.branch) {
        list.push(details.branch);
      }
      if (details.from_branches instanceof Array) {
        details.from_branches.forEach((branch) => {
          list.push(branch);
        });
      }
      if (details.components instanceof Array) {
        details.components.forEach((component) => {
          if (component && component.text && component.text[lang]) {
            list.push(component.text[lang]);
          }
        });
      }
      break;
    case 'branch':
    case 'tag':
      if (details.branch) {
        list.push(details.branch);
      }
      break;
  }
  return list.join(' ');
}
extractStoryText.args = 'type text, details jsonb, external jsonb[], lang text';
extractStoryText.ret = 'text';
extractStoryText.flags = 'IMMUTABLE';

/**
 * Extract text from wiki
 *
 * @param  {Object} details
 * @param  {String} lang
 *
 * @return {String}
 */
function extractWikiText(details, lang) {
  const list = [];
  if (details.content) {
    list.push(details.content);
  }
  if (details.title) {
    list.push(details.title);
  }
  return list.join(' ');
}
extractWikiText.args = 'details jsonb, lang text';
extractWikiText.ret = 'text';
extractWikiText.flags = 'IMMUTABLE';

/**
 * Extract text from spreadsheet
 *
 * @param  {Object} details
 * @param  {String} lang
 *
 * @return {String}
 */
function extractSpreadsheetText(details, lang) {
  const list = [];
  if (details.title) {
    list.push(details.title);
  }
  if (details.description) {
    list.push(details.description);
  }
  if (details.subject) {
    list.push(details.subject);
  }
  if (details.keywords instanceof Array) {
    for (let keyword of details.keywords) {
      list.push(keyword);
    }
  }
  if (details.sheets instanceof Array) {
    for (let sheet of details.sheets) {
      for (let row of sheet.rows) {
        for (let cell of row) {
          if (typeof(cell) === 'string') {
            list.push(cell);
          } else if (typeof(cell) === 'object') {
            if (cell.richText instanceof Array) {
              const fragments = [];
              for (let token of cell.richText) {
                fragments.push(token.text);
              }
              list.push(fragments.join(''));
            }
          }
        }
      }
    }
  }
  return list.join(' ');
}
extractSpreadsheetText.args = 'details jsonb, lang text';
extractSpreadsheetText.ret = 'text';
extractSpreadsheetText.flags = 'IMMUTABLE';

export {
  lowerCase,
  matchAny,
  hasFalse,
  hasCandidates,
  payloadTokens,
  updatePayload,
  checkAuthorization,
  extendAuthorization,
  externalIdStrings,
  extractText,
  extractStoryText,
  extractWikiText,
  extractSpreadsheetText,
};
