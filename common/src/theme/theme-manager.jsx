var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');

module.exports = React.createClass({
    displayName: 'ThemeManager',
    propTypes: {
        modes: PropTypes.object,
        serverAddress: PropTypes.string,
        database: PropTypes.instanceOf(Database),
        onChange: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            mode: this.selectMode(),
            devicePixelRatio: window.devicePixelRatio,
            details: null,
        };
    },

    /**
     * Return the current mode, selected based on screen width
     *
     * @return {String}
     */
    getMode: function() {
        return this.state.mode;
    },

    /**
     * Return possible modes
     *
     * @return {Array<String>}
     */
    getModes: function() {
        // make sure the list is ordered by widths
        var pairs = _.sortBy(_.toPairs(this.props.modes), 1);
        var list = _.map(pairs, 0);
        return _.keys(this.props.modes);
    },

    /**
     * Return details object (unused)
     *
     * @return {Object}
     */
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
    getImageURL: function(res, params) {
        if (!params) {
            params = {};
        }
        var resURL;
        switch(res.type) {
            case 'video':
            case 'audio':
            case 'website':
                resURL = res.poster_url;
                break;
            default:
                resURL = res.url;
        }
        if (!resURL) {
            return;
        }

        var filters = [];
        // apply clipping rect
        var clip = res.clip;
        if (params.hasOwnProperty('clip')) {
            // override the one stored in res
            clip = params.clip;
        }
        if (clip) {
            // run number through Math.round() just in case error elsewhere left fractional pixel dimensions
            var rect = _.map([ clip.left, clip.top, clip.width, clip.height ], Math.round);
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
        } else if (!height && width) {
            filters.push(`w${width}`);
        }
        // set quality
        if (params.quality !== undefined) {
            filters.push(`q${params.quality}`);
        }
        var versionPath = '';
        if (filters.length > 0) {
            versionPath = `/${filters.join('+')}`;
            if (res.format === 'png' || res.format === 'gif') {
                // use PNG to preserve alpha channel
                versionPath += `.png`;
            }
        }
        return `${this.props.serverAddress}${resURL}${versionPath}`;
    },

    /**
     * Return blob URL to local image file. URL might not be valid. Need to call
     * BlobManager.get() to valididate the blob's existence on running system.
     *
     * @param  {Object} res
     * @param  {Object} options
     *
     * @return {String|null}
     */
    getImageFile: function(res) {
        switch(res.type) {
            case 'video':
            case 'audio':
            case 'website':
                return res.poster_file || null;
            default:
                return res.file || null;
        }
    },

    /**
     * Return URL to video resource
     *
     * @param  {Object} res
     * @param  {Object} options
     *
     * @return {String|null}
     */
    getVideoURL: function(res, options) {
        if (!res.url) {
            return null;
        }
        var url = `${this.props.serverAddress}${res.url}`;
        if (options && options.version) {
            var version = res.versions[options.version];
            url += `.${options.version}.${version.format}`;
        }
        return url;
    },

    /**
     * Return URL to audio resource
     *
     * @param  {Object} res
     * @param  {Object} options
     *
     * @return {String|null}
     */
    getAudioURL: function(res, options) {
        return this.getVideoURL(res, options);
    },

    /**
     * Get URL of resource
     *
     * @param  {Object} res
     * @param  {Object} options
     *
     * @return {Object}
     */
    getURL(res, options) {
        switch (res.type) {
            case 'image':
                return this.getImageURL(res, options);
            case 'video':
                return this.getVideoURL(res, options);
            case 'website':
                return res.url;
            case 'audio':
                return this.getAudioURL(res, options);
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

    /**
     * Change certain details about the UI (not used currently)
     *
     * @param  {Object} details
     *
     * @return {Promise<Boolean>}
     */
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
     * Add window resize handler on mount
     */
    componentWillMount: function() {
        window.addEventListener('resize', this.handleWindowResize);
    },

    /**
     * Render function
     *
     * @return {null}
     */
    render: function() {
        return null;
    },

    /**
     * Initialize theme
     */
    componentDidMount: function() {
        this.change(defaultTheme);
    },

    /**
     * Get the theme object that was last used (not being used for now)
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (!prevProps.database && this.props.database) {
            var db = this.props.database.use({ schema: 'local', by: this,  });
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

    /**
     * Remove resize handler on unmount
     */
    componentWillUnmount: function() {
        window.removeEventListener('resize', this.handleWindowResize);
    },

    /**
     * Inform parent component that theme has changed
     */
    triggerChangeEvent: function() {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
            });
        }
    },

    /**
     * Called when user resizes browser window
     *
     * @param  {Event} evt
     */
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
