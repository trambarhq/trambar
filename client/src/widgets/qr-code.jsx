import React, { useRef, useEffect } from 'react';

/**
 * Component for generating and displaying a QR code.
 */
function QRCode(props) {
  const { text, scale } = props;
  const canvasRef = useRef();

  useEffect(() => {
    async function draw() {
      const module = await import('qrcode' /* webpackChunkName: "qrcode" */);
      const { toCanvas } = module;
      const canvas = canvasRef.current;
      const options = { scale };
      toCanvas(canvas, text, options, (err) => {});
    }
    if (text) {
      draw();
    }
  }, [ text, scale ]);

  const style = { width: 270, height: 270 };
  return <canvas ref={canvasRef} className="qr-code" style={style} />;
}

QRCode.defaultProps = {
  scale: 4
};

export {
  QRCode as default,
  QRCode,
};
