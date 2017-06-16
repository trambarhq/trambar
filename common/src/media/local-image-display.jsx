var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var JpegAnalyser = require('media/jpeg-analyser');

var Database = require('data/database');

module.exports = React.createClass({
    displayName: 'RouteManager',
    propTypes: {
        file: PropTypes.instanceOf(Blob),
        onLoad: PropTypes.func,
    },

    getInitialState: function() {
        return {
            orientation: undefined,
            url: undefined,
            width: undefined,
            height: undefined
        };
    },

    componentWillMount: function() {
        if (this.props.file) {
            this.load(this.props.file);
        }
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.props.file !== nextProps.file) {
            this.load(nextProps.file);
        }
    },

    render: function() {
        var containerProps = {
            className: `local-image-display orientation-${this.state.orientation}`,
            style: {
                width: this.state.width,
                height: this.state.height,
            }
        };
        var imageProps = {
            src: this.state.url,
            onLoad: this.props.onLoad,
        }
        return (
            <div {...containerProps}>
                <img {...imageProps} />
            </div>
        );
    },

    load: function(file) {
        var url = URL.createObjectURL(file);
        this.setState({
            url,
            orientation: undefined,
            width: undefined,
            height: undefined,
        });

        var reader = new FileReader();
        reader.onload = () => {
            var bytes = new Uint8Array(reader.result);
            var dimensions = JpegAnalyser.getDimensions(bytes);
            var orientation = JpegAnalyser.getOrientation(bytes);
            var width, height;
            if (dimensions && orientation) {
                switch (orientation) {
                    case 5:
                    case 6:
                    case 7:
                    case 8:
                        width = dimensions.height;
                        height = dimensions.width;
                        break;
                    default:
                        width = dimensions.width;
                        height = dimensions.height;
                }
            } else {
                orientation = 1;
            }
            this.setState({ width, height, orientation });
        };
        reader.readAsArrayBuffer(this.props.file);
    },
});
