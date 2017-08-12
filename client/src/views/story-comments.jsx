var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var StorySection = require('widgets/story-section');
var HeaderButton = require('widgets/header-button');
var CommentList = require('lists/comment-list');

require('./story-comments.scss');

module.exports = React.createClass({
    displayName: 'StoryComments',
    mixins: [ UpdateCheck ],
    propTypes: {
        story: PropTypes.object.isRequired,
        currentUser: PropTypes.object.isRequired,
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        repo: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getInitialState: function() {
        return {
            expanded: this.shouldExpandAutomatically(this.props),
            editing: _.some(this.props.reactions, {
                user_id: this.props.currentUserId,
                published: false
            }),
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
            <StorySection className="comments">
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
            highlighted: this.getCurrentUserComments().length > 0 || this.state.editing,
            onClick: this.handleCommentClick,
        };
        var showButtonProps = {
            className: 'show-btn',
            hidden: true,
            label: t('story-$count-user-reacted-to-story', _.size(this.props.respondents)),
            onClick: this.handleShowClick,
        };
        if (this.props.theme.mode === 'columns-1' && !this.state.expanded) {
            if (!_.isEmpty(this.props.reactions)) {
                showButtonProps.hidden = false;
            }
        }
        return (
            <div>
                <HeaderButton {...likeButtonProps} />
                <HeaderButton {...commentButtonProps} />
                <HeaderButton {...showButtonProps} />
            </div>
        );
    },

    renderReactions: function() {
        if (this.props.theme.mode === 'columns-1' && !this.state.expanded) {
            return null;
        }
        var listProps = {
            showEditor: this.state.editing,
            story: this.props.story,
            reactions: this.props.reactions,
            respondents: this.props.respondents,
            repo: this.props.repo,
            currentUser: this.props.currentUser,
            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            onFinish: this.handleCommentFinish,
            ref: 'list'
        };
        return <CommentList {...listProps} />
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
                published: true,
            };
            db.saveOne({ table: 'reaction' }, like);
        }
    },

    handleCommentClick: function(evt) {
        this.setState({ expanded: true, editing: true }, () => {
            var list = this.refs.list;
            if (list) {
                setTimeout(() => {
                    list.focus();
                }, 50);
            }
        });
    },

    handleShowClick: function(evt) {
        this.setState({ expanded: true });
    },

    handleCommentFinish: function(evt) {
        var hasDraft = _.some(this.props.reactions, (r) => {
            if (!r.published) {
                if (r.user_id === this.props.currentUser.id) {
                    return true;
                }
            }
        });
        if (!hasDraft) {
            this.setState({ editing: false });
        }
    },
});
