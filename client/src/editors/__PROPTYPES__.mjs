import Database from 'common/data/database.mjs';
import Payloads from 'common/transport/payloads.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

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
MediaImporter.propTypes = {
  resources: PropTypes.arrayOf(PropTypes.object).isRequired,
  types: PropTypes.arrayOf(PropTypes.oneOf(ResourceTypes)),
  cameraDirection: PropTypes.oneOf([ 'front', 'back' ]),
  limit: PropTypes.oneOf([ 1, Infinity ]),

  env: PropTypes.instanceOf(Environment).isRequired,
  payloads: PropTypes.instanceOf(Payloads).isRequired,

  onCaptureStart: PropTypes.func,
  onCaptureEnd: PropTypes.func,
  onChange: PropTypes.func.isRequired,
};
ReactionEditor.propTypes = {
  reaction: PropTypes.object,
  story: PropTypes.object.isRequired,
  currentUser: PropTypes.object,

  database: PropTypes.instanceOf(Database).isRequired,
  payloads: PropTypes.instanceOf(Payloads).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,

  onFinish: PropTypes.func,
};
StoryEditorOptions.propTypes = {
  section: PropTypes.oneOf([ 'main', 'preview', 'both' ]),
  story: PropTypes.object.isRequired,
  repos: PropTypes.arrayOf(PropTypes.object),
  currentUser: PropTypes.object,
  options: PropTypes.object.isRequired,

  database: PropTypes.instanceOf(Database).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,

  onChange: PropTypes.func,
  onComplete: PropTypes.func,
};
StoryEditor.propTypes = {
  isStationary: PropTypes.bool,
  highlighting: PropTypes.bool,
  story: PropTypes.object,
  authors: PropTypes.arrayOf(PropTypes.object),
  bookmarks: PropTypes.arrayOf(PropTypes.object),
  recipients: PropTypes.arrayOf(PropTypes.object),
  currentUser: PropTypes.object,
  repos: PropTypes.arrayOf(PropTypes.object),

  database: PropTypes.instanceOf(Database).isRequired,
  payloads: PropTypes.instanceOf(Payloads).isRequired,
  route: PropTypes.instanceOf(Route).isRequired,
  env: PropTypes.instanceOf(Environment).isRequired,
};

AudioEditor.propTypes = ImageEditor.propTypes;
VideoEditor.propTypes = ImageEditor.propTypes;
