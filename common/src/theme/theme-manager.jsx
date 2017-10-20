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
            protocol: window.location.protocol,
        };
    },

    getBaseUrl: function() {
        return `${this.state.protocol}//${this.state.server}`;
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
     * Return URL of image file
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {String|undefined}
     */
    getImageUrl: function(res, params) {
        if (!params) {
            params = {};
        }
        var resUrl;
        switch(res.type) {
            case 'video':
            case 'audio':
            case 'website':
                resUrl = res.poster_url;
                break;
            default:
                resUrl = res.url;
        }
        if (!resUrl) {
            return;
        }

        var filters = [];
        // apply clipping rect
        if (res.clip && !params.noClipping) {
            var rect = [
                res.clip.left,
                res.clip.top,
                res.clip.width,
                res.clip.height,
            ];
            filters.push(`cr${rect.join('-')}`)
        }
        // resize image (if dimensions are specified)
        var width = decodeLength(params.width);
        var height = decodeLength(params.height);
        if (this.state.devicePixelRatio !== 1) {
            // request higher resolution image when pixel density is higher
            width = Math.round(width * this.state.devicePixelRatio);
            height = Math.round(height * this.state.devicePixelRatio);
        }
        if (width && height) {
            filters.push(`re${width}-${height}`);
        } else if (!width && height) {
            filters.push(`h${height}`);
        } else if (height && !width) {
            filters.push(`w${width}`);
        }
        // set quality
        if (params.quality !== undefined) {
            filters.push(`q${params.quality}`);
        }

        var path = '';
        if (filters.length > 0) {
            path = `/${filters.join('+')}`;
        }
        var baseUrl = this.getBaseUrl();
        return `${baseUrl}${resUrl}${path}`;
    },

    getImageFile: function() {
        switch(res.type) {
            case 'video':
            case 'audio':
            case 'website':
                return res.poster_file;
                break;
            default:
                return res.file;
        }
    },

    getVideoUrl: function(res, options) {
        // TODO: select video based on bandwidth/resolution
        var baseUrl = this.getBaseUrl();
        var filters = [];
        var baseUrl = video.url;
        var path = '';
        return `${protocol}://${server}${baseUrl}${path}`;
    },

    getAudioUrl: function(res, options) {
        // TODO: select video based on bandwidth/resolution
        var baseUrl = this.getBaseUrl();
        var filters = [];
        var baseUrl = video.url;
        var path = '';
        return `${protocol}://${server}${baseUrl}${path}`;
    },

    /**
     * Get URL of resource
     *
     * @param  {Object} res
     *
     * @return {Object}
     */
    getUrl(res) {
        switch (res.type) {
            case 'image':
                url = this.getImageUrl(res, options);
                break;
            case 'video':
                url = this.getVideoUrl(res, options);
                break;
            case 'website':
                url = res.url;
                break;
            case 'audio':
                url = theme.getAudioUrl(res, options);
                return;
        }
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
    if (typeof(s) === 'number') {
        return s;
    } else if (m = /^(\d+)\s*vw/.exec(s)) {
        var n = parseInt(m[1]);
        return Math.round(n * document.body.offsetWidth / 100);
    } else if (m = /^(\d+)\s*vh/.exec(s)) {
        var n = parseInt(m[1]);
        return Math.round(n * document.body.offsetHeight / 100);
    }
}

function getProtocol(server) {
    return (server === 'localhost') ? 'http' : 'http'
}
