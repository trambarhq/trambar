import _ from 'lodash';
import React from 'react';
import * as BlobManager from 'transport/blob-manager';
import ResourceView from 'widgets/resource-view';

import Icon from 'octicons/build/svg/person.svg';

import './profile-image.scss';

/**
 * Stateless component that renders a user's profile image. If there's none,
 * it renders a placeholder graphic.
 */
function ProfileImage(props) {
    let { env, href, user, size } = props;
    let className = `profile-image ${size}`;
    let resources = _.get(user, 'details.resources');
    let profileImage = _.find(resources, { type: 'image' });
    let image;
    if (profileImage) {
        let width = imageResolutions[size];
        let props = {
            resource: profileImage,
            showMosaic: true,
            width: width,
            height: width,
            env,
        };
        image = <ResourceView {...props} />;
    } else {
        image = <div className="placeholder"><Icon /></div>;
    }
    if (href) {
        return <a className={className} href={href}>{image}</a>;
    } else {
        return <span className={className}>{image}</span>;
    }
}

let imageResolutions = {
    small: 24,
    medium: 48,
    large: 96,
};

ProfileImage.defaultProps = {
    size: 'small'
};

export {
    ProfileImage as default,
    ProfileImage,
};


if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ProfileImage.propTypes = {
        user: PropTypes.object,
        size: PropTypes.oneOf([ 'small', 'medium', 'large' ]),
    };
}
