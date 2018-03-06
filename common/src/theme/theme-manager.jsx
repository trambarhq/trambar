var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ImageCropping = require('media/image-cropping');
var BlobManager = require('transport/blob-manager');

var Database = require('data/database');

module.exports = React.createClass({
    displayName: 'ThemeManager',
    propTypes: {
        modes: PropTypes.object,
        serverAddress: PropTypes.string,
        networkType: PropTypes.string,
        database: PropTypes.instanceOf(Database),
        useWebP: PropTypes.bool,
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
            webpSupport: isWebpSupported(),
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
     * Return available bandwidth, in bits per second
     *
     * @return {Number}
     */
    getBandwidth: function() {
        return parseInt(getBandwidth(this.props.networkType)) * 1000;
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
        if (!res) {
            return null;
        }
        if (!params) {
            params = {};
        }
        var url = this.getRemoteImageURL(res, params);
        if (!url) {
            if (!params.remote) {
                url = this.getLocalImageURL(res, params);
            }
        }
        return url;
    },

    /**
     * Return URL of a resource's image at that has not been uploaded yet
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {String|undefined}
     */
    getLocalImageURL: function(res, params) {
        if (!res.payload_token) {
            return;
        }
        var name;
        switch (res.type) {
            case 'video':
            case 'audio':
            case 'website':
                name = 'poster';
                break;
            default:
                name = 'main';
                break;
        }
        var url = `payload:${res.payload_token}/${name}`;
        var blob = BlobManager.find(url);
        if (!blob) {
            return null;
        }
        var data = {
            url: BlobManager.url(blob),
            clip: getClippingRect(res, params),
            format: res.format,
        };
        return `json:${JSON.stringify(data)}`;
    },

    /**
     * Return URL of a resource's image at remote server
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {String|undefined}
     */
    getRemoteImageURL: function(res, params) {
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

        var versionPath = '';
        if (!params.original) {
            var filters = [];
            // apply clipping rect
            var clip = getClippingRect(res, params);
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
            var resizing = width || height;
            if (resizing) {
                if (width && height) {
                    filters.push(`re${width}-${height}`);
                } else if (!width && height) {
                    filters.push(`h${height}`);
                } else if (!height && width) {
                    filters.push(`w${width}`);
                }
                if (res.format === 'png' || res.format === 'gif') {
                    // add sharpen filter to reduce blurriness
                    filters.push(`sh`);
                }
            }
            // set quality
            if (params.quality !== undefined) {
                filters.push(`q${params.quality}`);
            }
            // choose format
            var ext;
            if (res.format === 'svg') {
                // stick with SVG
                ext = 'svg';
            } else {
                if ((this.state.webpSupport && this.props.useWebP !== false) || this.props.useWebP === true) {
                    ext = 'webp';
                    if (res.format === 'png' || res.format === 'gif') {
                        if (!resizing) {
                            // use lossless compression (since it'll likely produce a smaller file)
                            filters.push(`l`);
                        }
                    }
                } else {
                    if (res.format === 'png' || res.format === 'gif') {
                        // use PNG to preserve alpha channel
                        ext = `png`;
                    } else {
                        ext = 'jpg';
                    }
                }
            }
            versionPath = `/${filters.join('+')}.${ext}`;
        }
        return `${this.props.serverAddress}${resURL}${versionPath}`;
    },

    /**
     * Return URL to video resource
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {String|null}
     */
    getVideoURL: function(res, params) {
        if (!res.url) {
            return null;
        }
        if (!params) {
            params = {};
        }
        var url = `${this.props.serverAddress}${res.url}`;
        // pick suitable version unless specified otherwise
        if (!params || !params.original) {
            var version = this.pickVideoVersion(res, params);
            if (version) {
                url += `.${version.name}.${version.format}`;
            }
        }
        return url;
    },

    /**
     * Return URL to audio resource
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {String|null}
     */
    getAudioURL: function(res, params) {
        if (!res.url) {
            return null;
        }
        if (!params) {
            params = {};
        }
        var url = `${this.props.serverAddress}${res.url}`;
        if (!params || !params.original) {
            var version = this.pickAudioVersion(res, params);
            if (version) {
                url += `.${version.name}.${version.format}`;
            }
        }
        return url;
    },

    getImageDimensions: function(res, params) {
        if (!params) {
            params = {};
        }
        var clip = getClippingRect(res, params);
        if (clip && !params.original) {
            // return the dimensions of the clipping rect
            return {
                width: clip.width,
                height: clip.height,
            }
        } else {
            return {
                width: res.width,
                height: res.height,
            };
        }
    },

    /**
     * Return a resource's dimensions
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {Object}
     */
    getDimensions: function(res, params) {
        if (res.type === 'video') {
            if (!params.original) {
                var version = this.pickVideoVersion(res, params);
                if (version && version.width && version.height) {
                    return {
                        width: version.width,
                        height: version.height,
                    };
                }
            }
            return {
                width: res.width,
                height: res.height,
            };
        }
        return this.getImageDimensions(res, params);
    },

    /**
     * Get a version of the video with the highest bitrate that is below
     * the available bandwidth
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {Object}
     */
    pickVideoVersion: function(res, params) {
        if (params.hasOwnProperty('bitrate')) {
            return _.find(res.resources, { bitrates: { video: params.bitrate }}) || null;
        }
        var bandwidth = this.getBandwidth();
        var bitrate = (version) => {
            return parseInt(_.get(version, 'bitrates.video'));
        };
        var below = (version) => {
            var b = bitrate(version);
            return (b <= bandwidth) ? bandwidth - b : Infinity;
        };
        var above = (version) => {
            var b = bitrate(version);
            return (b > bandwidth) ? b - bandwidth : 0;
        };
        var versions = _.sortBy(res.versions, [ below, above ]);
        return _.first(versions) || null;
    },

    /**
     * Get a version of the video with the highest bitrate that is below
     * the available bandwidth
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {Object|null}
     */
    pickAudioVersion: function(res, params) {
        if (params.hasOwnProperty('bitrate')) {
            return _.find(res.resources, { bitrates: { audio: params.bitrate }}) || null;
        }
        var bandwidth = this.getBandwidth();
        var bitrate = (version) => {
            return parseInt(_.get(version, 'bitrates.audio'));
        };
        // find bitrate closest to bandwidth, below it if possible
        var below = (version) => {
            var b = bitrate(version);
            return (b <= bandwidth) ? bandwidth - b : Infinity;
        };
        var above = (version) => {
            var b = bitrate(version);
            return (b > bandwidth) ? b - bandwidth : 0;
        };
        var versions = _.sortBy(res.versions, [ below, above ]);
        return _.first(versions) || null;
    },

    /**
     * Get URL of resource
     *
     * @param  {Object} res
     * @param  {Object} params
     *
     * @return {Object}
     */
    getURL(res, params) {
        switch (res.type) {
            case 'image':
                return this.getImageURL(res, params);
            case 'video':
                return this.getVideoURL(res, params);
            case 'website':
                return res.url;
            case 'audio':
                return this.getAudioURL(res, params);
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

function getBandwidth(networkType) {
    switch (networkType) {
        case 'cellular':
        case '2g':
            return '50kbps';
        case '3g':
            return '400kbps';
        case '4g':
            return '5000kbps';
        case 'ethernet':
        case 'wifi':
        default:
            return '10000kpbs';
    }
}

function getClippingRect(res, params) {
    if (params.original) {
        return null;
    }
    var clip = res.clip;
    if (params.hasOwnProperty('clip')) {
        // override the one stored in res
        clip = params.clip;
    } else {
        if (!clip) {
            clip = ImageCropping.default(res.width, res.height);
        }
    }
    return clip;
}

function isWebpSupported() {
    var canvas = document.createElement('CANVAS');
    canvas.width = canvas.height = 1;
    if (canvas.toDataURL) {
        var url = canvas.toDataURL('image/webp');
        if (url.indexOf('image/webp') === 5) {
            return true;
        }
    }
    return false;
}
