var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var CommentView = require('widgets/comment-view');

module.exports = React.createClass({
    displayName: 'StoryComments',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <StorySection>
                <header>
                    {this.renderButtons()}
                </header>
                <body>
                    {this.renderComments()}
                </body>
            </StorySection>
        );
    },

    renderButtons: function() {
        var like = this.getCurrentUserLike();
        return (
            <div>
                <div className={'button' + (like ? ' lit' : '')} onClick={this.handleLikeClick}>
                    <i className="fa fa-thumbs-up"/>
                    <span className="label">Like</span>
                </div>
                <div className="button">
                    <i className="fa fa-comment"/>
                    <span className="label">Comment</span>
                </div>
            </div>
        );
    },

    renderComments: function() {

    },

    getCurrentUserLike: function() {
        var criteria = {
            type: 'like',
            user_id: _.get(this.props.currentUser, 'id'),
        };
        return _.find(this.props.reactions, criteria);
    },

    handleLikeClick: function(evt) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        var like = this.getCurrentUserLike();
        if (like) {
            db.removeOne({ table: 'reaction' }, like);
        } else {
            like = {
                type: 'like',
                story_id: _.get(this.props.story, 'id'),
                user_id: _.get(this.props.currentUser, 'id'),
                target_user_id: _.get(this.props.story, 'user_ids.0'),
            };
            db.saveOne({ table: 'reaction' }, like);
        }
    },
});
