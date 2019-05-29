import Environment from 'common/env/environment.mjs';
import Payloads from 'common/transport/payloads.mjs';


AudioEditor.propTypes = ImageEditor.propTypes;
VideoEditor.propTypes = ImageEditor.propTypes;

ImageEditor.propTypes = {
    resource: PropTypes.object,
    previewWidth: PropTypes.number,
    previewHeight: PropTypes.number,
    disabled: PropTypes.bool,
    env: PropTypes.instanceOf(Environment).isRequired,
    onChange: PropTypes.func,
};

MediaEditor.propTypes = {
    allowEmbedding: PropTypes.bool,
    allowShifting: PropTypes.bool,
    resources: PropTypes.arrayOf(PropTypes.object),
    resourceIndex: PropTypes.number,

    payloads: PropTypes.instanceOf(Payloads).isRequired,
    env: PropTypes.instanceOf(Environment).isRequired,

    onChange: PropTypes.func.isRequired,
    onEmbed: PropTypes.func,
};
