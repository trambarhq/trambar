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
        var n = this.props.locale.name;
        var userId = _.get(this.props.currentUser, 'id');
        var isOwner = _.some(this.props.senders, { id: userId });
        var others = _.filter(this.props.senders, (s) => {
            return s.id !== userId;
        });
        var contents;
        if (isOwner) {
            switch(others.length) {
                case 0:
                    contents = t('bookmark-you-bookmarked-it');
                    break;
                case 1:
                    var name = n(others[0].details.name, others[0].details.gender);
                    contents = t('bookmark-you-bookmarked-it-and-$name-recommends-it', name);
                    break;
                default:
                    var props = {
                        users: others,
                        label: t('bookmark-$count-users', others.length),
                        title: t('bookmark-recommendations'),
                        locale: this.props.locale,
                        theme: this.props.theme,
                        key: 1,
                    };
                    var users = <MultipleUserNames {...props} />;
                    contents = t('bookmark-you-bookmarked-it-and-$users-recommends-it', users, others.length);
            }
        } else {
            switch (others.length) {
                case 1:
                    var name = n(others[0].details.name, others[0].details.gender);
                    contents = t('bookmark-$name-recommends-this', name);
                    break;
                case 2:
                    var name1 = n(others[0].details.name, others[0].details.gender);
                    var name2 = n(others[1].details.name, others[1].details.gender);
                    contents = t('bookmark-$name1-and-$name2-recommend-this', name1);
                    break;
                default:
                    var name = n(others[0].details.name, others[0].details.gender);
                    var additional = _.slice(others, 1);
                    var props = {
                        users: additional,
                        label: t('bookmark-$count-other-users', additional.length),
                        title: t('bookmark-recommendations'),
                        locale: this.props.locale,
                        theme: this.props.theme,
                        key: 1,
                    };
                    var users = <MultipleUserNames {...props} />;
                    contents = t('bookmark-$name-and-$users-recommend-this', name, users, additional.length);
            }
        }
        return <span className="name">{contents}</span>
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
