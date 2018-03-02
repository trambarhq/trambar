var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

module.exports = ResourceView;

var Payload = require('transport/payload');
var Theme = require('theme/theme');
var BitmapView = require('media/bitmap-view');
var VectorView = require('media/vector-view');

function ResourceView(props) {
    var url;
    if (props.resource) {
        var params = {};
        if (props.animation && props.resource.format === 'gif') {
            // use the original file when it's a gif and we wish to show animation
            params.original = true;
        } else {
            if (!props.clip) {
                // don't apply clip rectangle
                params.clip = null;
            }
            if (props.width) {
                // resize source image
                params.width = props.width;
            }
            if (props.height) {
                // ditto
                params.height = props.height;
            }
        }
        url = props.theme.getImageURL(props.resource, params);
    } else {
        url = props.url;
    }
    var className = props.className;
    var handlers = _.pick(props, 'onLoad', 'onError');
    if (!url) {
        return props.children || null;
    }
    if (/^https?:/.test(url)) {
        var width = props.width;
        var height = props.height;
        if (width === undefined || height === undefined) {
            if (props.resource) {
                var dims = props.theme.getImageDimensions(props.resource);
                if (width) {
                    height = Math.round(width * dims.height / dims.width);
                } else if (height) {
                    width = Math.round(height * dims.width / dims.height);
                } else {
                    width = dims.width;
                    height = dims.height;
                }
            }
        }
        return <img className={className} src={url} width={width} height={height} {...handlers} />;
    } else {
        var hashIndex = url.indexOf('#');
        var clip, format;
        var hash = parseQueryString(url.substr(hashIndex + 1));
        url = url.substr(0, hashIndex);
        if (hash.left && hash.top && hash.width && hash.height) {
            clip = {
                left: parseInt(hash.left),
                top: parseInt(hash.top),
                width: parseInt(hash.width),
                height: parseInt(hash.height),
            };
        }
        var View = BitmapView;
        if (hash.format === 'svg') {
            View = VectorView;
        }
        return <View className={className} url={url} clippingRect={clip} {...handlers} />
    }
}

ResourceView.propTypes = {
    clip: PropTypes.bool,
    animation: PropTypes.bool,
    resource: PropTypes.object,
    url: PropTypes.string,
    width: PropTypes.number,
    height: PropTypes.number,
    theme: PropTypes.instanceOf(Theme),
    onLoad: PropTypes.func,
    onError: PropTypes.func,
};
ResourceView.defaultProps = {
    clip: true,
};

function parseQueryString(queryString) {
    var values = {};
    var pairs = _.filter(_.split(queryString, '&'));
    _.each(pairs, (pair) => {
        var parts = _.split(pair, '=');
        var name = decodeURIComponent(parts[0]);
        var value = decodeURIComponent(parts[1] || '');
        value = _.replace(value, /\+/g, ' ');
        values[name] = value;
    });
    return values;
}
