var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Diagnostics = require('widgets/diagnostics');
var DiagnosticsSection = require('widgets/diagnostics-section');

module.exports = React.createClass({
    displayName: 'SubscriptionManager',
    mixins: [ UpdateCheck ],
    propTypes: {
        area: PropTypes.oneOf([ 'client', 'admin' ]).isRequired,
        connection: PropTypes.object,
        schema: PropTypes.string,

        database: PropTypes.instanceOf(Database),
        locale: PropTypes.instanceOf(Locale),
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            subscription: null
        };
    },

    /**
     * Check for server change
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.connection && nextProps.connection) {
            if (this.props.connection.address !== nextProps.connection.address) {
                this.setState({ subscription: null });
            }
        }
    },

    /**
     * Create or update data subscription
     */
    componentDidUpdate: function() {
        if (!this.props.connection || !this.props.database) {
            return;
        }
        var db = this.props.database.use({ schema: 'global', by: this });
        db.start().then((userId) => {
            var subscription = {
                user_id: userId,
                schema: this.props.schema,
                area: this.props.area,
                locale: this.props.locale.localeCode,
                method: this.props.connection.method,
                token: this.props.connection.token,
                relay: this.props.connection.relay,
                details: this.props.connection.details,
            };
            if (_.isMatch(this.state.subscription, subscription)) {
                // subscription is being created or has been created
                return;
            }
            var subscriptionId = _.get(this.state.subscription, 'id');
            this.setState({ subscription });
            if (subscriptionId) {
                // update the subscription instead of creating a new one
                subscription = _.clone(subscription);
                subscription.id = subscriptionId;
            }
            return db.saveOne({ table: 'subscription' }, subscription).then((subscription) => {
                this.setState({ subscription });
                return null;
            }).catch((err) => {
                // TODO retry
                // this.setState({ subscription: null });
                return null;
            });
        });
    },

    /**
     * Render diagnostics
     *
     * @return {ReactElement}
     */
    render: function() {
        var subscription = this.state.subscription || {};
        return (
            <Diagnostics type="subscription-manager">
                <DiagnosticsSection label="Current subscription">
                    <div>ID: {subscription.id}</div>
                    <div>Token: {subscription.token}</div>
                    <div>Method: {subscription.method}</div>
                    <div>Schema: {subscription.schema}</div>
                    <div>Locale: {subscription.locale}</div>
                    <div>Relay: {subscription.relay}</div>
                </DiagnosticsSection>
            </Diagnostics>
        );
    },
});
