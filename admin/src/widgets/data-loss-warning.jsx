var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var ConfirmationDialogBox = require('dialogs/confirmation-dialog-box');

module.exports = React.createClass({
    displayName: 'DataLossWarning',
    mixins: [ UpdateCheck ],
    propTypes: {
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        changes: PropTypes.bool,
    },

    getInitialState: function() {
        return {
            showing: false,
            rendering: false,
            resolve: null,
            reject: null
        }
    },

    /**
     * Render component
     *
     * @return  {ReactElement|null}
     */
    render: function() {
        if (!this.state.rendering) {
            return null;
        }
        var t = this.props.locale.translate;
        var dialogProps = {
            show: this.state.showing,
            dangerous: true,
            locale: this.props.locale,
            theme: this.props.theme,
            onConfirm: this.handleConfirm,
            onCancel: this.handleCancel,
        };
        return (
            <ConfirmationDialogBox {...dialogProps}>
                {t('confirmation-data-loss')}
            </ConfirmationDialogBox>
        )
    },

    componentDidMount: function() {
        this.monitorRoute();
    },

    componentDidUpdate: function(prevProps, prevState) {
        if (prevProps.route !== this.props.route) {
            this.monitorRoute();
        }
    },

    monitorRoute: function() {
        this.props.route.keep(this.confirmRouteChange);
    },

    confirmRouteChange: function() {
        if (this.props.changes) {
            return new Promise((resolve, reject) => {
                this.setState({
                    showing: true,
                    rendering: true,
                    resolve,
                    reject,
                });
            });
        } else {
            return false;
        }
    },

    /**
     * Called when user confirms the route change
     *
     * @param  {Object} evt
     */
    handleConfirm: function(evt) {
        var resolve = this.state.resolve;
        this.setState({
            showing: false,
            rendering: false,
            resolve: null,
            reject: null,
        }, () => {
            if (resolve) {
                resolve();
            }
        });
    },

    /**
     * Called when user cancels the route change
     *
     * @param  {Object} evt
     */
    handleCancel: function(evt) {
        var reject = this.state.reject;
        this.setState({
            showing: false,
            resolve: null,
            reject: null,
        }, () => {
            if (reject) {
                reject();
            }
            setTimeout(() => {
                if (!this.state.showing) {
                    this.setState({ rendering: false });
                }
            })
        });
    },
});
