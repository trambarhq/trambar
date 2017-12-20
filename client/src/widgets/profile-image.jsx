var React = require('react'), PropTypes = React.PropTypes;

var Theme = require('theme/theme');

module.exports = ProfileImage;

require('./profile-image.scss');

function ProfileImage(props) {
    var className = `profile-image ${props.size}`;
    var imageUrl;
    if (props.user) {
        var resources = _.get(props.user, 'details.resources');
        var profileImage = _.find(resources, { type: 'image' });
        if (profileImage) {
            var width = imageResolutions[props.size];
            imageUrl = props.theme.getImageUrl(profileImage, { width: width, height: width });
        }
    }
    var contents
    if (imageUrl) {
        contents = <img src={imageUrl} />;
    } else {
        var Icon = require('octicons/build/svg/person.svg');
        contents = <Icon />;
    }
    return <a className={className} href={props.href}>{contents}</a>;
}

ProfileImage.propTypes = {
    user: PropTypes.object,
    size: PropTypes.oneOf([ 'small', 'medium', 'large' ]),
    theme: PropTypes.instanceOf(Theme),
};

ProfileImage.defaultProps = {
    size: 'small'
};

var imageResolutions = {
    small: 24,
    medium: 48,
    large: 96,
};
