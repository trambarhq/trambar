var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var MultipleUserNames = require('widgets/multiple-user-names');

require('./bookmark-view.scss');

module.exports = React.createClass({
    displayName: 'BookmarkView',
    propTypes: {
        bookmark: PropTypes.object,
        senders: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        return (
            <div className="bookmark-view">
                <div className="title">
                    {this.renderSenderNames()}
                    {this.renderCloseButton()}
                </div>
                <div className="contents">
                    {this.props.children}
                </div>
            </div>
        );
    },

    renderSenderNames: function() {
        var t = this.props.locale.translate;
        var userId = _.get(this.props.currentUser, 'id');
        var isOwner = !!_.find(this.props.senders, { id: userId });
        var others = _.filter(this.props.senders, (s) => {
            return s.id !== userId;
        });
        var contents;
        if (isOwner) {
            contents = [ t('bookmark-you-bookmarked-it') ];
            var users;
            if (others.length === 1) {
                users = _.map(others, 'details.name');
            } else if (others.length > 1) {
                var props = {
                    users: others,
                    label: t('bookmark-$count-users', others.length),
                    title: t('bookmark-recommendations'),
                    locale: this.props.locale,
                    theme: this.props.theme,
                    key: 1,
                };
                users = <MultipleUserNames {...props} />;
            }
            if (users) {
                contents.push(' (', t('bookmark-$users-recommend-it', users), ')');
            }
        } else {
            var users;
            if (others.length === 1 || others.length === 2) {
                users = _.map(others, 'details.name');
            } else if (others.length > 2) {
                var first = others.shift(others);
                var props = {
                    users: others,
                    label: t('bookmark-$count-other-users', others.length),
                    title: t('bookmark-recommendations'),
                    locale: this.props.locale,
                    theme: this.props.theme,
                    key: 1,
                };
                users = [
                    _.get(first, 'details.name'),
                    <MultipleUserNames {...props} />,
                ];
            }
            if (users) {
                contents = t('bookmark-$users-recommend-this', users);
            }
        }
        return (
            <span className="name">
                {contents}
            </span>
        );
    },

    renderCloseButton: function() {
        return (
            <div className="close-btn" onClick={this.handleCloseClick}>
                <i className="fa fa-close" />
            </div>
        );
    },

    /**
     * Remove bookmark from remote database
     *
     * @param  {Bookmark} bookmark
     *
     * @return {Promise<Bookmark>}
     */
    removeBookmark: function(bookmark) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = route.parameters.schema;
        var db = this.props.database.use({ server, schema, by: this });
        return db.removeOne({ table: 'bookmark' }, bookmark);
    },

    /**
     * Called when user clicks close button
     *
     * @param  {Event} evt
     */
    handleCloseClick: function(evt) {
        this.removeBookmark(this.props.bookmark);
    }
});
