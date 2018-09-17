import _ from 'lodash';
import React from 'react';
import * as UserUtils from 'objects/utils/user-utils';

// widgets
import MultipleUserNames from 'widgets/multiple-user-names';

import './author-names.scss';

function AuthorNames(props) {
    let { env, authors } = props;
    let { t } = env.locale;
    let names = _.map(authors, (author) => {
        return UserUtils.getDisplayName(author, env);
    });
    let contents;
    switch (_.size(authors)) {
        // the list can be empty during loading
        case 0:
            contents = '\u00a0';
            break;
        case 1:
            contents = <span key={1} className="sole author">{names[0]}</span>;
            break;
        case 2:
            let name1 = <span key={1} className="lead author">{names[0]}</span>;
            let name2 = <span key={3} className="co author">{names[1]}</span>
            contents = t('story-author-$name1-and-$name2', name1, name2);
            break;
        default:
            let name1 = <span key={1} className="lead author">{names[0]}</span>;
            let coauthors = _.slice(authors, 1);
            let props = {
                users: coauthors,
                label: t('story-author-$count-others', coauthors.length),
                title: t('story-coauthors'),
                locale: props.locale,
                theme: props.theme,
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

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    AuthorNames.propTypes = {
        authors: PropTypes.arrayOf(PropTypes.object),
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
