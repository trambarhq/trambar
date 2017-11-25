var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');

require('./sign-out-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'SignOutDialogBox',
    propTypes: {
        show: PropTypes.bool,
        number: PropTypes.string,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,

        onClose: PropTypes.func,
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.props.onClose,
        };
        return (
            <Overlay {...overlayProps}>
                <div className="sign-out-dialog-box">
                    {this.renderMessage()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    },

    /**
     * Render QR-code and number
     *
     * @return {ReactElement}
     */
    renderMessage: function() {
        var t = this.props.locale.translate;
        return (
            <div className="message">
                {t('sign-out-are-you-sure')}
            </div>
        );
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var cancelProps = {
            label: t('sign-out-cancel'),
            onClick: this.props.onClose,
        };
        var confirmProps = {
            label: t('sign-out-confirm'),
            onClick: this.handleConfirmClick,
            emphasized: true,
        };
        return (
            <div className="buttons">
                <PushButton {...cancelProps} />
                <PushButton {...confirmProps} />
            </div>
        );
    },

    /**
     * Called when user confirms his intention to sign out
     */
    handleConfirmClick: function(evt) {
        var db = this.props.database.use({ by: this });
        db.endAuthorization().then(() => {
            return this.props.route.replace(require('pages/start-page'));
        });
    },
});
