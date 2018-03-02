var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Theme = require('theme/theme');

// widgets
var ResourceView = require('widgets/resource-view');

module.exports = ProfileImage;

require('./profile-image.scss');

function ProfileImage(props) {
    var classNames = [ 'profile-image', props.size ];
    if (props.user) {
        var resources = _.get(props.user, 'details.resources');
        var image = _.find(resources, { type: 'image' });
        if (image) {
            var width = imageResolutions[props.size];
            var props = {
                className: classNames.join(' '),
                resource: image,
                width: width,
                height: width,
                theme: props.theme,
            };
            return <ResourceView {...props} />;
        }
    }
    var Icon = require('octicons/build/svg/person.svg');
    return <Icon className={classNames.join(' ')} />;
}

ProfileImage.propTypes = {
    user: PropTypes.object,
    size: PropTypes.oneOf([ 'small', 'large' ]),
    theme: PropTypes.instanceOf(Theme),
};

ProfileImage.defaultProps = {
    size: 'small'
};

var imageResolutions = {
    small: 24,
    large: 96,
};
