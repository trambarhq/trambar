var React = require('react'), PropTypes = React.PropTypes;
var QRCode = require('qrcode');

module.exports = React.createClass({
    displayName: 'QRCode',
    propTypes: {
        text: PropTypes.string,
        scale: PropTypes.number,
    },

    getDefaultProps: function() {
        return {
            scale: 4
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return <canvas ref="canvas" className="qr-code" />
    },

    /**
     * Draw QR code on mount
     */
    componentDidMount: function() {
        this.redraw();
    },

    /**
     * Redraw QR code on update
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        this.redraw();
    },

    /**
     * Draw QR code into canvas
     */
    redraw: function() {
        var canvas = this.refs.canvas;
        var options = {
            scale: this.props.scale
        };
        QRCode.toCanvas(canvas, this.props.text, options, (err) => {});
    }
});
