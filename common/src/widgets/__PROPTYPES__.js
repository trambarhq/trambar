import PropTypes from 'prop-types';
import Environment from '../env/environment.js';
import Payloads from '../transport/payloads.js';

import { BitmapView } from './bitmap-view.jsx';
import { Chartist } from './chartist.jsx';
import { CollapsibleContainer } from './collapsible-container.jsx';
import { Diagnostics } from './diagnostics.jsx';
import { ErrorBoundary } from './error-boundary.jsx';
import { ImageCropper } from './image-cropper.jsx';
import { Overlay } from './overlay.jsx';
import { ResourceView } from './resource-view.jsx';
import { UploadProgress } from './upload-progress.jsx';
import { VectorView } from './vector-view.jsx';

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
  clippingRect: PropTypes.object.isRequired,
  vector: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  onLoad: PropTypes.func,
};
Overlay.propTypes = {
  className: PropTypes.string,
  show: PropTypes.bool,
  onBackgroundClick: PropTypes.func,
};
ResourceView.propTypes = {
  resource: PropTypes.object.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
  clip: PropTypes.bool,
  showAnimation: PropTypes.bool,
  showMosaic: PropTypes.bool,
  env: PropTypes.instanceOf(Environment),
};
SmartList.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object),
  behind: PropTypes.number,
  ahead: PropTypes.number,
  anchor: PropTypes.string,
  offset: PropTypes.number,
  inverted: PropTypes.bool,
  transitioning: PropTypes.number,
  noReset: PropTypes.bool,

  onIdentity: PropTypes.func.isRequired,
  onTransition: PropTypes.func,
  onRender: PropTypes.func.isRequired,
  onAnchorChange: PropTypes.func,
  onBeforeAnchor: PropTypes.func,
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
