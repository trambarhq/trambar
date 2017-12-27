var React = require('react'), PropTypes = React.PropTypes;

var Theme = require('theme/theme');

module.exports = ProfileImage;

require('./profile-image.scss');

function ProfileImage(props) {
    var classNames = [ 'profile-image', props.size ];
    var imageURL;
    if (props.user) {
        var resources = _.get(props.user, 'details.resources');
        var profileImage = _.find(resources, { type: 'image' });
        if (profileImage) {
            var width = imageResolutions[props.size];
            imageURL = props.theme.getImageURL(profileImage, { width: width, height: width });
        }
    }
    if (imageURL) {
        return <img className={classNames.join(' ')} src={imageURL} />;
    } else {
        var Icon = require('octicons/build/svg/person.svg');
        return <Icon className={classNames.join(' ')} />;
    }
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
