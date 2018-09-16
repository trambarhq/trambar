import React, { PureComponent } from 'react';
import QRCodeGenerator from 'qrcode';

class QRCode extends PureComponent {
    static displayName = 'QRCode';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return <canvas ref="canvas" className="qr-code" />
    }

    /**
     * Draw QR code on mount
     */
    componentDidMount() {
        this.redraw();
    }

    /**
     * Redraw QR code on update
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        this.redraw();
    }

    /**
     * Draw QR code into canvas
     */
    redraw() {
        let canvas = this.refs.canvas;
        let options = {
            scale: this.props.scale
        };
        QRCodeGenerator.toCanvas(canvas, this.props.text, options, (err) => {});
    }
}

QRCode.defaultProps = {
    scale: 4
};

export {
    QRCode as default,
    QRCode,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    QRCode.propTypes = {
        text: PropTypes.string,
        scale: PropTypes.number,
    };
}
