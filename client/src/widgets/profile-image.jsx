var React = require('react'), PropTypes = React.PropTypes;
var BlobManager = require('transport/blob-manager');
var ImageView = require('media/image-view');

var Theme = require('theme/theme');

module.exports = ProfileImage;

require('./profile-image.scss');

function ProfileImage(props) {
    var className = `profile-image ${props.size}`;
    var image;
    if (props.user) {
        var resources = _.get(props.user, 'details.resources');
        var profileImage = _.find(resources, { type: 'image' });
        var imageUrl;
        if (profileImage) {
            var width = imageResolutions[props.size];
            var imageUrl = props.theme.getImageUrl(profileImage, { width: width, height: width });
            if (imageUrl) {
                image = <img src={imageUrl} />;
            } else {
                var fileUrl = profileImage.file;
                var clip = profileImage.clip;
                if (BlobManager.get(fileUrl)) {
                    image = <ImageView url={fileUrl} clippingRect={clip} />;
                }
            }
        }
    }
    if (!image) {
        var Icon = require('octicons/build/svg/person.svg');
        image = (
            <div className="placeholder">
                <Icon />
            </div>
        );
    }
    if (props.href) {
        return <a className={className} href={props.href}>{image}</a>;
    } else {
        return <span className={className}>{image}</span>;
    }
}

ProfileImage.propTypes = {
    user: PropTypes.object,
    size: PropTypes.oneOf([ 'small', 'medium', 'large' ]),
    theme: PropTypes.instanceOf(Theme).isRequired,
};

ProfileImage.defaultProps = {
    size: 'small'
};

var imageResolutions = {
    small: 24,
    medium: 48,
    large: 96,
};
