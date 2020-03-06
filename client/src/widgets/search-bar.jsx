import _ from 'lodash';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useProgress, useListener } from 'relaks';
import { findTags } from 'common/utils/tag-scanner.js';
import { findStatistics } from 'common/objects/finders/statistics-finder.js';
import { findUser } from 'common/objects/finders/user-finder.js';

import './search-bar.scss';

/**
 * Asynchronous component that retrieves data needed by the search bar, namely
 * project statistics, which include information concerning tag usage.
 */
export async function SearchBar(props) {
  const { database, route, env, settings } = props;
  const [ show ] = useProgress();

  render();
  const currentUserID = await database.start();
  const currentUser = await findUser(database, currentUserID);
  const params = { ...settings.statistics };
  if (params.user_id === 'current') {
    params.user_id = currentUser.id;
  }
  if (params.public === 'guest') {
    params.public = (currentUser.type === 'guest');
  }
  const dailyActivities = await findStatistics(database, params);
  render();

  function render() {
    const sprops = {
      dailyActivities,
      settings,
      route,
      env,
    };
    // don't let the component be empty initially
    show(<SearchBarSync {...sprops} />, 'initial') ;
  }
}

/**
 * Synchronous component that actually renders the search bar.
 */
function SearchBarSync(props) {
  const { env, route, dailyActivities, settings } = props;
  const { t } = env.locale;
  const tagsRef = useRef();
  const hashTags = useMemo(() => {
    return extractTags(dailyActivities, env);
  }, [ dailyActivities, env ]);
  const [ selectedHashTags ] = useMemo(() => {
    const tags = findTags(route.params.search);
    return _.map(tags, _.toLower);
  }, [ route ]);
  const [ search, setSearch ] = useState(null);

  const handleTextChange = useListener((evt) => {
    const keywords = _.trim(evt.target.value);
    setSearch({ keywords, delay: 800 });
  });
  const handleKeyDown = useListener((evt) => {
    if (evt.keyCode === 13) {
      if (search) {
        setSearch({ keywords: search.keywords, delay: 0 });
      }
    }
  });
  const handleFocus = useListener((evt) => {
    const target = evt.target;
    target.selectionStart = 0;
    target.selectionEnd = target.value.length;
  });
  const handleWindowResize = useListener((evt) => {
    hideUnpopularTags();
  });

  useEffect(() => {
    if (search) {
      const timeout = setTimeout(() => {
        const params = { search: search.keywords, ...settings.route };
        route.push(route.name, params);
      }, search.delay);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [ search, route ]);
  useEffect(() => {
    window.addEventListener('resize', handleWindowResize);
    return () => {
      window.addEventListener('resize', handleWindowResize);
    };
  }, []);
  useEffect(() => {
    hideUnpopularTags();
  }, [ hashTags ]);

  function hideUnpopularTags() {
    let container = tagsRef.current;
    if (container) {
      // first, make all node visible
      const nodes = {};
      for (let node of container.children) {
        if (node.style.display === 'none') {
          node.style.display = '';
        }
        const tag = node.getAttribute('data-tag');
        nodes[tag] = node;
      }
      const tagsByPopularity = _.sortBy(hashTags, 'score');
      // hide tags until container has only a single line
      while (isWrapping(nodes)) {
        const tag = tagsByPopularity.shift();
        if (tag) {
          const node = nodes[tag.name];
          node.style.display = 'none';
        } else {
          break;
        }
      }
    }
  }

  return (
    <div className="search-bar">
      {renderTextInput()}
      {renderHashTags()}
    </div>
  );

  function renderTextInput() {
    let keywords;
    if (search) {
      keywords = search.keywords;
    } else {
      keywords = route.params.search || '';
    }
    const inputProps = {
      type: 'text',
      value: keywords,
      placeholder: t('search-bar-keywords'),
      onChange: handleTextChange,
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
    };
    return (
      <div className="text-input">
        <input {...inputProps} />
      </div>
    );
  }

  function renderHashTags() {
    return (
      <div ref={tagsRef} className="tags">
        {_.map(hashTags, renderHashTag)}
      </div>
    );
  }

  function renderHashTag(tag, index) {
    const params = { search: tag.name, ...settings.route };
    const url = route.find(route.name, params);
    const classNames = [ 'tag' ];
    if (_.includes(selectedHashTags, _.toLower(tag.name))) {
      classNames.push('selected');
    }
    const props = {
      className: classNames.join(' '),
      'data-tag': name,
      href: url
    };
    return <a key={index} {...props}>{tag.name}</a>;
  }
}

function normalize(s) {
  s = _.replace(s, /\+/g, '');
  s = _.replace(s, /\s+/g, ' ')
  let words = _.split(s);
  return words.join(' ');
}

function isWrapping(nodes) {
  let top;
  return _.some(nodes, (node) => {
    if (top === undefined) {
      top = node.offsetTop;
    } else if (node.offsetTop > top) {
      return true;
    }
  });
}

function extractTags(dailyActivities, env) {
  if (!dailyActivities) {
    return [];
  }
  // score the tags based on how often they are used
  let scores = {}, frequency = {};
  _.each(dailyActivities.daily, (activities, date) => {
    _.each(activities, (count, key) => {
      // more recent usage count for more
      let multiplier;
      if (date === env.date) {
        multiplier = 4;
      } else if (date === env.getRelativeDate(-1, 'day')) {
        multiplier = 2;
      } else if (date >= env.getRelativeDate(-7, 'day')) {
        multiplier = 1;
      } else if (date >= env.getRelativeDate(-14, 'day')) {
        multiplier = 0.5;
      } else {
        multiplier = 0.25;
      }
      if (/^#/.test(key)) {
        let score = count * multiplier;
        scores[key] = (scores[key] || 0) + score;
        frequency[key] = (frequency[key] || 0) + count;
      }
    });
  });
  // compare tags that only differ in case
  let nameLists = {};
  let scoresLC = {};
  _.each(scores, (score, name) => {
    let nameLC = _.toLower(name);
    let names = nameLists[nameLC];
    if (!names) {
      names = nameLists[nameLC] = [];
    }
    names.push(name);
    scoresLC[nameLC] = (scoresLC[nameLC] || 0) + score;
  });
  let scoresMC = {};
  _.each(scoresLC, (score, nameLC) => {
    let names = nameLists[nameLC];
    if (names.length > 1) {
      // choice the more frequently used name
      names = _.orderBy(names, (name) => {
        return frequency[name];
      }, 'desc');
    }
    let name = names[0];
    scoresMC[name] = score;
  });

  let hashTags = _.transform(scoresMC, (list, score, name) => {
    list.push({ name, score });
  }, []);
  // sort in case-sensitive manner, as it's done in Gitlab
  return _.sortBy(hashTags, 'name');
}
