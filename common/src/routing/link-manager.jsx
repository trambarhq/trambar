var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Diagnostics = require('widgets/diagnostics');
var DiagnosticsSection = require('widgets/diagnostics-section');

module.exports = React.createClass({
    displayName: 'LinkManager',
    mixins: [ UpdateCheck ],
    propTypes: {
        hasAccess: PropTypes.bool,
        database: PropTypes.instanceOf(Database),
        route: PropTypes.instanceOf(Route),
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            found: [],
            added: [],
        };
    },

    /**
     * Find the most recently accessed project
     *
     * @return {Promise<Object>}
     */
    findRecentLocation: function() {
        var db = this.props.database.use({ by: this });
        var criteria = {};
        return db.find({ schema: 'local', table: 'project_link', criteria }).then((links) => {
            var sorted = _.sortBy(links, 'atime')
            var mostRecent = _.last(sorted);
            this.setState({ found: _.map(sorted, 'key') });
            return mostRecent;
        });
    },

    /**
     * Save a location to cache
     *
     * @param  {String} address
     * @param  {String} schema
     */
    saveLocation: function(address, schema) {
        var key = `${address}/${schema}`;
        this.setState({ added: _.union(_.without(this.state.added, key), [ key ]) });

        // get the project object so we have the project's display name
        var db = this.props.database.use({ by: this });
        var criteria = { name: schema };
        db.findOne({ schema: 'global', table: 'project', criteria }).then((project) => {
            if (!project) {
                return null;
            }
            var name = project.details.title;
            var atime = (new Date).toISOString();
            var record = { key, address, schema, name, atime };
            return db.saveOne({ schema: 'local', table: 'project_link' }, record);
        });
    },

    /**
     * Save project location if route is different
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (prevProps.route !== this.props.route) {
            var prevAddress = _.get(prevProps.route, 'parameters.address');
            var prevSchema = _.get(prevProps.route, 'parameters.schema');
            var currAddress = _.get(this.props.route, 'parameters.address');
            var currSchema = _.get(this.props.route, 'parameters.schema');
            if (prevAddress !== currAddress || prevSchema !== currSchema || prevProps.hasAccess !== this.props.hasAccess) {
                if (this.props.hasAccess) {
                    if (currAddress && currSchema) {
                        this.saveLocation(currAddress, currSchema);
                    }
                }
            }
        }
    },

    /**
     * Render diagnostics
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <Diagnostics type="link-manager">
                <DiagnosticsSection label="Links">
                    <div>Found in cache: {_.join(this.state.found, ' ')}</div>
                    <div>Added to cache: {_.join(this.state.added, ' ')}</div>
                </DiagnosticsSection>
            </Diagnostics>
        );
    },
});
