var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ComponentRefs = require('utils/component-refs');

var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var ActionConfirmation = require('widgets/action-confirmation');

module.exports = React.createClass({
    displayName: 'DataLossWarning',
    mixins: [ UpdateCheck ],
    propTypes: {
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        changes: PropTypes.bool,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        return {};
    },

    /**
     * Put a hook on the current route when there're changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.changes !== nextProps.changes) {
            if (nextProps.changes) {
                nextProps.route.keep(this.confirmRouteChange);
            } else {
                nextProps.route.free(this.confirmRouteChange);
            }
        }
    },

    /**
     * Render component
     *
     * @return  {ReactElement|null}
     */
    render: function() {
        var setters = this.components.setters;
        var props = {
            ref: setters.confirmation,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <ActionConfirmation {...props} />
    },

    /**
     * Called just before a route change occurs
     *
     * @return {Promise<Boolean>}
     */
    confirmRouteChange: function() {
        var t = this.props.locale.translate;
        var message = t('confirmation-data-loss');
        return this.components.confirmation.ask(message);
    },
});
