var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Memoize = require('utils/memoize');
var Merger = require('data/merger');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var OnDemand = require('widgets/on-demand');
var CommentView = require('views/comment-view');
var CommentEditor = require('editors/comment-editor');

require('./comment-list.scss');

module.exports = React.createClass({
    displayName: 'CommentList',
    mixins: [ UpdateCheck ],
    propTypes: {
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        var reactions = sortReactions(this.props.reactions);
        return (
            <div className="comment-list">
                {_.map(reactions, this.renderReaction)}
            </div>
        );
    },

    renderReaction: function(reaction) {
        var respondent = findRespondent(this.props.respondents, reaction);
        var props = {
            reaction,
            respondent,
            currentUser: this.props.currentUser,
            locale: this.props.locale,
            theme: this.props.theme,
            key: reaction.id,
        };
        return <CommentView {...props} />;
    },
});

var sortReactions = Memoize(function(reactions) {
    return _.orderBy(reactions, [ 'ptime' ], [ 'desc' ]);
});

var findRespondent = Memoize(function(users, reaction) {
    if (reaction) {
        return _.find(users, { id: reaction.user_id });
    } else {
        return null;
    }
});
