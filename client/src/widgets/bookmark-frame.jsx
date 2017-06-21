var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');

require('./bookmark-frame.scss');

module.exports = React.createClass({
    displayName: 'BookmarkFrame',
    propTypes: {
        bookmark: PropTypes.object,
        bookmarkers: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,

        locale: PropTypes.instanceOf(Locale).isRequired,

        onClose: PropTypes.func,
    },

    render: function() {
        return (
            <div className="bookmark-frame">
                <div className="title">
                    {this.renderName()}
                    {this.renderCloseButton()}
                </div>
                <div className="contents">
                    {this.props.children}
                </div>
            </div>
        );
    },

    renderName: function() {
        var names = _.map(this.props.bookmarkers, 'details.name');
        return (
            <span className="name">
                {names.join(', ')}
            </span>
        );
    },

    renderCloseButton: function() {
        return (
            <div className="close-btn">
                <i className="fa fa-close" />
            </div>
        );
    },
});
