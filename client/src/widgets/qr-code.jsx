import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';

/**
 * Component for generating and displaying a QR code.
 *
 * @extends PureComponent
 */
class QRCode extends PureComponent {
    static displayName = 'QRCode';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            canvas: HTMLCanvasElement,
        });
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { setters } = this.components;
        return <canvas ref={setters.canvas} className="qr-code" />
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
    async redraw() {
        let module = await import('qrcode' /* webpackChunkName: "qrcode" */);
        let { text, scale } = this.props;
        let { canvas } = this.components;
        let options = { scale };
        module.toCanvas(canvas, text, options, (err) => {});
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
