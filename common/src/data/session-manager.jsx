var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Diagnostics = require('widgets/diagnostics');
var DiagnosticsSection = require('widgets/diagnostics-section');

module.exports = React.createClass({
    displayName: 'SessionManager',
    mixins: [ UpdateCheck ],
    propTypes: {
        database: PropTypes.instanceOf(Database),
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.removalQueue = [];
        return {
            loaded: [],
            removed: [],
            saved: [],
        };
    },

    /**
     * Load user credentials (authorization token, user_id, etc.) from local cache
     *
     * @param  {String} address
     *
     * @return {Promise<Object|null>}
     */
    loadFromCache: function(address) {
        // don't load a session that's being removed
        if (_.some(this.removalQueue, { address })) {
            return Promise.resolve(null);
        }
        var db = this.props.database.use({ schema: 'local', by: this });
        var criteria = { key: address };
        return db.findOne({ table: 'session', criteria }).then((record) => {
            if (!record) {
                return null;
            }
            this.setState({
                loaded: _.union(this.state.loaded, [ address ])
            });
            return {
                address: record.key,
                handle: record.handle,
                token: record.token,
                user_id: record.user_id,
                etime: record.etime,
            };
        });
    },

    /**
     * Save session handle, authorization token, and user id to local cache
     *
     * @param  {Object} session
     *
     * @return {Promise<Object>}
     */
    saveToCache: function(session) {
        // save the credentials
        var db = this.props.database.use({ schema: 'local', by: this });
        var record = {
            key: session.address,
            handle: session.handle,
            token: session.token,
            user_id: session.user_id,
            etime: session.etime,
        };
        return db.saveOne({ table: 'session' }, record).then((record) => {
            this.setState({
                saved: _.union(this.state.loaded, [ session.address ])
            });
            return record;
        });
    },

    /**
     * Remove user credentials from local cache
     *
     * @param  {Object} session
     *
     * @return {Promise<Object>}
     */
    removeFromCache: function(session) {
        // add the session to the queue so we won't fetch it prior to its removal
        this.removalQueue.push(session);

        // remove the cached credentials
        var db = this.props.database.use({ schema: 'local', by: this });
        var record = { key: session.address };
        return db.removeOne({ table: 'session' }, record).then((record) => {
            _.pull(this.removalQueue, session);

            this.setState({
                removed: _.union(this.state.loaded, [ session.address ])
            });
        });
    },

    /**
     * Render diagnostics
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <Diagnostics type="session-manager">
                <DiagnosticsSection label="Session Handling">
                    <div>Loaded from cache: {_.join(this.state.loaded, ' ')}</div>
                    <div>Saved to cache: {_.join(this.state.saved, ' ')}</div>
                    <div>Removed from cache: {_.join(this.state.removed, ' ')}</div>
                </DiagnosticsSection>
            </Diagnostics>
        );
    },
});
