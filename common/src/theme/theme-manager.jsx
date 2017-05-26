var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');

module.exports = React.createClass({
    displayName: 'ThemeManager',
    propTypes: {
        database: PropTypes.instanceOf(Database),
        onChange: PropTypes.func,
    },

    getInitialState: function() {
        return {
            theme: null
        };
    },

    change: function(theme) {
        if (_.isEqual(this.state.theme, theme)) {
            return Promise.resolve(true);
        }
        this.setState({ theme }, () => {
            this.triggerChangeEvent();
        });
        return Promise.resolve(true);
    },

    triggerChangeEvent: function() {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
            });
        }
    },

    render: function() {
        return null;
    },

    componentDidMount: function() {
        this.change(defaultTheme);
    },

    /**
     * Get the theme object that was last used
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (!prevProps.database && this.props.database) {
            var db = this.props.database.use({ by: this, schema: 'local' });
            db.start().then(() => {
                return db.findOne({
                    table: 'settings',
                    key: 'theme'
                });
            }).then((settings) => {
                if (settings && settings.theme) {
                    this.change(settings.theme);
                }
            })
        }
    },
});

var defaultTheme = {};
