import PropTypes from 'prop-types';
import Environment from '../env/environment.mjs';
import Payloads from '../transport/payloads.mjs';

import { BitmapView } from './bitmap-view.jsx';
import { Chartist } from './chartist.jsx';
import { CollapsibleContainer } from './collapsible-container.jsx';
import { Diagnostics } from './diagnostics.jsx';
import { ErrorBoundary } from './error-boundary.jsx';
import { ImageCropper } from '.image-cropper.jsx';

import { UploadProgress } from './upload-progress.jsx';
import { VectorView } from './vector-view';

BitmapView.propTypes = {
    url: PropTypes.string,
    clippingRect: PropTypes.object,
    onLoad: PropTypes.func,
    onError: PropTypes.func,
};
Chartist.propTypes = {
    type: PropTypes.oneOf(['line', 'bar', 'pie']).isRequired,
    data: PropTypes.object.isRequired,
    className: PropTypes.string,
    options: PropTypes.object,
    responsiveOptions: PropTypes.array,
    style: PropTypes.object,
    onDraw: PropTypes.func,
    onClick: PropTypes.func,
};
CollapsibleContainer.propTypes = {
    open: PropTypes.bool,
};
Diagnostics.propTypes = {
    type: PropTypes.string.isRequired,
};
ErrorBoundary.propTypes = {
    env: PropTypes.instanceOf(Environment).isRequired,
    showError: PropTypes.bool,
};
ImageCropper.propTypes = {
    url: PropTypes.string.isRequired,
    clippingRect: PropTypes.object,
    vector: PropTypes.bool,
    disabled: PropTypes.bool,
    onChange: PropTypes.func,
    onLoad: PropTypes.func,
};

UploadProgress.propTypes = {
    payloads: PropTypes.instanceOf(Payloads).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
};
VectorView.propTypes = {
    url: PropTypes.string,
    clippingRect: PropTypes.object,
    title: PropTypes.string,
    onLoad: PropTypes.func,
    onError: PropTypes.func,
};
