var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');

module.exports = React.createClass({
    displayName: 'ThemeManager',
    propTypes: {
        database: PropTypes.instanceOf(Database),
        modes: PropTypes.object,
        onChange: PropTypes.func,
    },

    getInitialState: function() {
        return {
            mode: this.selectMode(),
            details: null
        };
    },

    getMode: function() {
        return this.state.mode;
    },

    getDetails: function() {
        return this.state.details;
    },

    /**
     * Return a mode suitable for the current viewport width
     *
     * @return {String}
     */
    selectMode: function() {
        var viewPortWidth = document.body.clientWidth;
        var selected = '';
        for (var mode in this.props.modes) {
            var minWidth = this.props.modes[mode];
            if (viewPortWidth >= minWidth) {
                selected = mode;
            }
        }
        return selected;
    },

    change: function(details) {
        if (_.isEqual(this.state.details, details)) {
            return Promise.resolve(true);
        }
        this.setState({ details }, () => {
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

    componentWillMount: function() {
        window.addEventListener('resize', this.handleWindowResize);
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

    componentWillUnmount: function() {
        window.removeEventListener('resize', this.handleWindowResize);
    },

    handleWindowResize: function(evt) {
        var mode = this.selectMode();
        if (this.state.mode !== mode) {
            this.setState({ mode }, () => {
                this.triggerChangeEvent();
            });
        }
    },
});

var defaultTheme = {};
