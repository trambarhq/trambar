import _ from 'lodash';
import React from 'react';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import MultipleUserNames from './multiple-user-names.jsx';

import './author-names.scss';

/**
 * Stateless component that displays the names of a story's author and
 * co-authors. When more there are more than two names, only the first
 * will appear while the rests are given in a pop-up (MultipleUserNames).
 */
function AuthorNames(props) {
    let { env, authors } = props;
    let { t } = env.locale;
    let names = _.map(authors, (author) => {
        return UserUtils.getDisplayName(author, env);
    });
    let contents;
    if (!authors || authors.length === 0) {
        contents = '\u00a0';
    } else if (authors.length === 1) {
        contents = <span key={1} className="sole author">{names[0]}</span>;
    } else if (authors.length === 2) {
        let name1 = <span key={1} className="lead author">{names[0]}</span>;
        let name2 = <span key={3} className="co author">{names[1]}</span>
        contents = t('story-author-$name1-and-$name2', name1, name2);
    } else {
        let name1 = <span key={1} className="lead author">{names[0]}</span>;
        let coauthors = _.slice(authors, 1);
        let props = {
            users: coauthors,
            label: t('story-author-$count-others', coauthors.length),
            title: t('story-coauthors'),
            env,
        };
        let others = <MultipleUserNames key={3} {...props} />
        contents = t('story-author-$name1-and-$name2', name1, others);
    }
    return <span className="author-names selectable">{contents}</span>;
}

export {
    AuthorNames as default,
    AuthorNames,
};

import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    AuthorNames.propTypes = {
        authors: PropTypes.arrayOf(PropTypes.object),
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
