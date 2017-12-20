var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var MultipleUserNames = require('widgets/multiple-user-names');

module.exports = AuthorNames;

require('./author-names.scss');

function AuthorNames(props) {
    var t = props.locale.translate;
    var p = props.locale.pick;
    var authors = props.authors;
    var names = _.map(authors, (author) => {
        return p(author.details.name);
    });
    var contents;
    switch (_.size(authors)) {
        // the list can be empty during loading
        case 0:
            contents = '\u00a0';
            break;
        case 1:
            contents = <span className="sole author">{names[0]}</span>;
            break;
        case 2:
            var name1 = <span className="lead author">{names[0]}</span>;
            var name2 = <span className="co author">{names[1]}</span>
            contents = t('story-author-$name1-and-$name2', name1, name2);
            break;
        default:
            var name1 = <span className="lead author">{names[0]}</span>;
            var coauthors = _.slice(authors, 1);
            var props = {
                users: coauthors,
                label: t('story-author-$count-others', coauthors.length),
                title: t('story-coauthors'),
                locale: props.locale,
                theme: props.theme,
            };
            var others = <MultipleUserNames key={1} {...props} />
            contents = t('story-author-$name1-and-$name2', name1, others);
    }
    return <span className="author-names">{contents}</span>;
}

AuthorNames.propTypes = {
    authors: PropTypes.arrayOf(PropTypes.object),
    locale: PropTypes.instanceOf(Locale).isRequired,
    theme: PropTypes.instanceOf(Theme).isRequired,
};
