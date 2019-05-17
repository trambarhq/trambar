import _ from 'lodash';
import React from 'react';
import * as BlobManager from 'common/transport/blob-manager.mjs';
import { ResourceView }  from 'common/widgets/resource-view.jsx';

import Icon from 'octicons/build/svg/person.svg';

import './profile-image.scss';

/**
 * Stateless component that renders a user's profile image. If there's none,
 * it renders a placeholder graphic.
 */
function ProfileImage(props) {
    const { env, href, user, size } = props;
    const className = `profile-image ${size}`;
    const resources = _.get(user, 'details.resources');
    const profileImage = _.find(resources, { type: 'image' });
    let image;
    if (profileImage) {
        const width = imageResolutions[size];
        const props = {
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

const imageResolutions = {
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
