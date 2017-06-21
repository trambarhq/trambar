var React = require('react'), PropTypes = React.PropTypes;
var MemoizeWeak = require('memoizee/weak');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var CommentView = require('views/comment-view');

require('./story-comments.scss');

module.exports = React.createClass({
    displayName: 'StoryComments',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,
        currentUser: PropTypes.object.isRequired,
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getInitialState: function() {
        return {
            expanded: this.shouldExpandAutomatically(this.props)
        };
    },

    shouldExpandAutomatically: function(props) {
        if (!props.reactions || !props.respondents) {
            return;
        }
        // expand automatically when it's the current user's story
        var currentUserId = _.get(this.props.currentUser, 'id');
        if (_.includes(props.story.user_ids, currentUserId)) {
            return true;
        }
        // expand automatically when the current user has reacted to story
        if (_.some(props.reactions, { user_id: currentUserId })) {
            return true;
        }
        return false;
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.state.expanded === undefined) {
            // see if we have enough props to determine whether reactions
            // should be shown initially
            var expanded = this.shouldExpandAutomatically(nextProps);
            if (expanded !== undefined) {
                this.setState({ expanded });
            }
        }
    },

    render: function() {
        return (
            <StorySection>
                <header>
                    {this.renderButtons()}
                </header>
                <body>
                    {this.renderReactions()}
                </body>
            </StorySection>
        );
    },

    renderButtons: function() {
        var t = this.props.locale.translate;
        var likeButtonProps = {
            icon: 'thumbs-up',
            label: t('story-like'),
            highlighted: !!this.getCurrentUserLike(),
            onClick: this.handleLikeClick,
        };
        var commentButtonProps = {
            icon: 'comment',
            label: t('story-comment'),
            highlighted: this.getCurrentUserComments().length > 0,
            onClick: this.handleCommentClick,
        };
        var showButtonProps = {
            className: 'show-btn',
            hidden: true,
            label: t('story-$1-user-reacted-to-story', _.size(this.props.respondents)),
            onClick: this.handleShowClick,
        };
        if (this.props.theme.mode === 'columns-1' && !this.state.expanded) {
            if (!_.isEmpty(this.props.reactions)) {
                showButtonProps.hidden = false;
            }
        }
        return (
            <div>
                <Button {...likeButtonProps} />
                <Button {...commentButtonProps} />
                <Button {...showButtonProps} />
            </div>
        );
    },

    renderReactions: function() {
        if (this.props.theme.mode === 'columns-1' && !this.state.expanded) {
            return null;
        }
        var reactions = this.props.reactions ? sortReactions(this.props.reactions) : null;
        return _.map(reactions, this.renderReaction)
    },

    renderReaction: function(reaction) {
        var props = {
            reaction,
            respondent: findUser(this.props.respondents, reaction.user_id),
            currentUser: this.props.currentUser,
            locale: this.props.locale,
            theme: this.props.theme,
            key: reaction.id,
        };
        return <CommentView {...props} />;
    },

    getCurrentUserLike: function() {
        return _.find(this.props.reactions, {
            type: 'like',
            user_id: _.get(this.props.currentUser, 'id'),
        });
    },

    getCurrentUserComments: function() {
        return _.filter(this.props.reactions, {
            type: 'comment',
            user_id: _.get(this.props.currentUser, 'id'),
        });
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
                target_user_ids: _.get(this.props.story, 'user_ids'),
            };
            db.saveOne({ table: 'reaction' }, like);
        }
    },

    handleCommentClick: function(evt) {

    },

    handleShowClick: function(evt) {
        this.setState({ expanded: true });
    },
});

var sortReactions = MemoizeWeak(function(reactions) {
    return _.orderBy(reactions, [ 'ptime' ], [ 'desc' ]);
});

var findUser = MemoizeWeak(function(users, id) {
    return _.find(users, { id });
});

function Button(props) {
    if (props.hidden) {
        return null;
    }
    var classNames = [ 'button' ];
    if (props.className) {
        classNames.push(props.className);
    }
    if (props.highlighted) {
        classNames.push('highlighted');
    }
    return (
        <div className={classNames.join(' ')} onClick={props.onClick}>
            <i className={props.icon ? `fa fa-${props.icon}` : null}/>
            <span className="label">{props.label}</span>
        </div>
    );
}
