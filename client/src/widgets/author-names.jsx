var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');

// widgets
var MultipleUserNames = require('widgets/multiple-user-names');

module.exports = AuthorNames;

require('./author-names.scss');

function AuthorNames(props) {
    var t = props.locale.translate;
    var n = props.locale.name;
    var authors = props.authors;
    var names = _.map(authors, (author) => {
        return n(author.details.name, author.details.gender);
    });
    var contents;
    switch (_.size(authors)) {
        // the list can be empty during loading
        case 0:
            contents = '\u00a0';
            break;
        case 1:
            contents = `${names[0]}`;
            break;
        case 2:
            contents = t('story-author-$name1-and-$name2', names[0], names[1]);
            break;
        default:
            var coauthors = _.slice(authors, 1);
            var props = {
                users: coauthors,
                label: t('story-author-$count-others', coauthors.length),
                title: t('story-coauthors'),
                locale: props.locale,
                theme: props.theme,
            };
            var users = <MultipleUserNames key={1} {...props} />
            contents = t('story-author-$name-and-$users', names[0], users, coauthors.length);
    }
    return <span className="author-names">{contents}</span>;
}

AuthorNames.propTypes = {
    authors: PropTypes.arrayOf(PropTypes.object),
    locale: PropTypes.instanceOf(Locale).isRequired,
};
