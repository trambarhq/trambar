import PropTypes from 'prop-types';
import Environment from '../env/environment.mjs';
import Payloads from '../transport/payloads.mjs';

import { BitmapView } from './bitmap-view.jsx';

import { ErrorBoundary } from './error-boundary.jsx';

import { UploadProgress } from './upload-progress.jsx';
import { VectorView } from './vector-view';

BitmapView.propTypes = {
    url: PropTypes.string,
    clippingRect: PropTypes.object,
    onLoad: PropTypes.func,
    onError: PropTypes.func,
};

ErrorBoundary.propTypes = {
    env: PropTypes.instanceOf(Environment).isRequired,
    showError: PropTypes.bool,
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
