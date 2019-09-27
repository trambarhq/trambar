import PropTypes from 'prop-types';
import { Database } from 'common/data/database.mjs';
import { Environment } from 'common/env/environment.mjs';
import { Payloads } from 'common/transport/payloads.mjs';

import { ConfirmationDialogBox } from './confirmation-dialog-box.jsx';
import { ImageAlbumDialogBox } from './image-album-dialog-box.jsx';
import { ImageCroppingDialogBox } from './image-cropping-dialog-box.jsx';

ConfirmationDialogBox.propTypes = {
    show: PropTypes.bool,
    dangerous: PropTypes.bool,
    env: PropTypes.instanceOf(Environment).isRequired,
    onConfirm: PropTypes.func,
    onCancel: PropTypes.func,
};
ImageAlbumDialogBox.propTypes = {
    show: PropTypes.bool,
    purpose: PropTypes.string.isRequired,
    image: PropTypes.object,
    database: PropTypes.instanceOf(Database).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,
    payloads: PropTypes.instanceOf(Payloads).isRequired,
    onSelect: PropTypes.func,
    onCancel: PropTypes.func,
};
ImageCroppingDialogBox.propTypes = {
    image: PropTypes.object,
    desiredWidth: PropTypes.number,
    desiredHeight: PropTypes.number,
    env: PropTypes.instanceOf(Environment).isRequired,
    onSelect: PropTypes.func,
    onCancel: PropTypes.func,
};
