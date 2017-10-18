var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');

module.exports = React.createClass({
    displayName: 'ThemeManager',
    propTypes: {
        modes: PropTypes.object,

        database: PropTypes.instanceOf(Database),
        route: PropTypes.instanceOf(Route),

        onChange: PropTypes.func,
    },

    getInitialState: function() {
        return {
            mode: this.selectMode(),
            devicePixelRatio: window.devicePixelRatio,
            details: null,
            server: window.location.hostname,
        };
    },

    getMode: function() {
        return this.state.mode;
    },

    getModes: function() {
        // make sure the list is ordered by widths
        var pairs = _.sortBy(_.toPairs(this.props.modes), 1);
        var list = _.map(pairs, 0);
        return _.keys(this.props.modes);
    },

    getDetails: function() {
        return this.state.details;
    },

    /**
     * Return URL of resized image
     *
     * @param  {String|Object} image
     * @param  {Object} params
     *
     * @return {String|undefined}
     */
    getImageUrl: function(image, params) {
        var server = this.state.server;
        var protocol = (server === 'localhost') ? 'http' : 'https';
        var filters = [];
        var baseUrl;
        var noClipping = (params) ? params.noClipping : undefined;
        var width = (params) ? params.width : undefined;
        var height = (params) ? params.height : undefined;
        var quality = (params) ? params.quality : undefined;
        if (typeof(image) === 'object') {
            baseUrl = image.url;
            if (image.clip && !noClipping) {
                var rect = [
                    image.clip.left,
                    image.clip.top,
                    image.clip.width,
                    image.clip.height,
                ];
                filters.push(`cr${rect.join('-')}`)
            }
        } else if (typeof(image) === 'string') {
            baseUrl = image;
        } else {
            return;
        }
        if (!baseUrl) {
            return;
        }
        if (typeof(width) === 'string') {
            width = decodeLength(width);
        }
        if (typeof(height) === 'string') {
            height = decodeLength(height);
        }
        if (this.state.devicePixelRatio !== 1) {
            width = Math.round(width * this.state.devicePixelRatio);
            height = Math.round(height * this.state.devicePixelRatio);
        }
        if (width !== undefined && height !== undefined) {
            filters.push(`re${width}-${height}`);
        } else if (width === undefined && height !== undefined) {
            filters.push(`h${height}`);
        } else if (height === undefined && width !== undefined) {
            filters.push(`w${width}`);
        }
        if (quality !== undefined) {
            filters.push(`q${quality}`);
        }
        var path = '';
        if (filters.length > 0) {
            path = `/${filters.join('+')}`;
        }
        return `${protocol}://${server}${baseUrl}${path}`;
    },

    getVideoUrl: function(video, bandwidth) {
        var server = this.state.server;
        var protocol = (server === 'localhost') ? 'http' : 'http';
        var filters = [];
        var baseUrl;
        if (typeof(video) === 'object') {
            baseUrl = video.url;
        } else if (typeof(video) === 'string') {
            baseUrl = video;
        } else {
            return;
        }
        var path = '';
        return `${protocol}://${server}${baseUrl}${path}`;
    },

    getPosterUrl: function(video, width, height) {
        var image = {
            url: video.poster_url,
            width: video.width,
            height: video.height,
            clip: video.clip,
        };
        return this.getImageUrl(image, width, height);
    },

    /**
     * Return a mode suitable for the current viewport width
     *
     * @return {String}
     */
    selectMode: function() {
        var viewPortWidth = document.body.parentNode.offsetWidth;
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

    /**
     * Update the server name if it's different
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.route !== nextProps.route) {
            var serverBefore = _.get(this.props.route, 'parameters.server');
            var serverAfter = _.get(nextProps.route, 'parameters.server');
            if (serverAfter === '~') {
                serverAfter = window.location.hostname;
            }
            if (serverBefore !== serverAfter) {
                this.setState({ server: serverAfter }, () => {
                    this.triggerChangeEvent();
                });
            }
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

    triggerChangeEvent: function() {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
            });
        }
    },

    handleWindowResize: function(evt) {
        var nextState = {};
        var mode = this.selectMode();
        if (this.state.mode !== mode) {
            nextState.mode = mode;
        }
        if (this.state.devicePixelRatio !== window.devicePixelRatio) {
            nextState.devicePixelRatio = window.devicePixelRatio;
        }
        if (!_.isEmpty(nextState)) {
            this.setState(nextState, () => {
                this.triggerChangeEvent();
            });
        }
    },
});

var defaultTheme = {};

function decodeLength(s) {
    var m;
    if (m = /^(\d+)\s*vw/.exec(s)) {
        var n = parseInt(m[1]);
        return Math.round(n * document.body.offsetWidth / 100);
    } else if (m = /^(\d+)\s*vh/.exec(s)) {
        var n = parseInt(m[1]);
        return Math.round(n * document.body.offsetHeight / 100);
    }
}
