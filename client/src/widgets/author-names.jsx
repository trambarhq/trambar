import _ from 'lodash';
import React from 'react';
import UserUtils from 'objects/utils/user-utils';

// widgets
import MultipleUserNames from 'widgets/multiple-user-names';

import './author-names.scss';

function AuthorNames(props) {
    var t = props.locale.translate;
    var authors = props.authors;
    var names = _.map(authors, (author) => {
        return UserUtils.getDisplayName(author, props.locale);
    });
    var contents;
    switch (_.size(authors)) {
        // the list can be empty during loading
        case 0:
            contents = '\u00a0';
            break;
        case 1:
            contents = <span key={1} className="sole author">{names[0]}</span>;
            break;
        case 2:
            var name1 = <span key={1} className="lead author">{names[0]}</span>;
            var name2 = <span key={3} className="co author">{names[1]}</span>
            contents = t('story-author-$name1-and-$name2', name1, name2);
            break;
        default:
            var name1 = <span key={1} className="lead author">{names[0]}</span>;
            var coauthors = _.slice(authors, 1);
            var props = {
                users: coauthors,
                label: t('story-author-$count-others', coauthors.length),
                title: t('story-coauthors'),
                locale: props.locale,
                theme: props.theme,
            };
            var others = <MultipleUserNames key={3} {...props} />
            contents = t('story-author-$name1-and-$name2', name1, others);
    }
    return <span className="author-names selectable">{contents}</span>;
}

export {
    AuthorNames as default,
    AuthorNames,
};

import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    AuthorNames.propTypes = {
        authors: PropTypes.arrayOf(PropTypes.object),
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    };
}
