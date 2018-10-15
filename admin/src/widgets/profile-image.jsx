import _ from 'lodash';
import React from 'react';

// widgets
import ResourceView from 'widgets/resource-view';
import Icon from 'octicons/build/svg/person.svg';

import './profile-image.scss';

/**
 * Stateless component that renders a user's profile image.
 */
function ProfileImage(props) {
    let { env, user, size } = props;
    let classNames = [ 'profile-image', size ];
    if (user) {
        let resources = _.get(user, 'details.resources');
        let image = _.find(resources, { type: 'image' });
        if (image) {
            let width = imageResolutions[size];
            let props = {
                className: classNames.join(' '),
                resource: image,
                width: width,
                height: width,
                env,
            };
            return <ResourceView {...props} />;
        }
    }
    return <Icon className={classNames.join(' ')} />;
}

const imageResolutions = {
    small: 24,
    large: 96,
};

ProfileImage.defaultProps = {
    size: 'small'
};

export {
    ProfileImage as default,
    ProfileImage,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ProfileImage.propTypes = {
        user: PropTypes.object,
        size: PropTypes.oneOf([ 'small', 'large' ]),
        env: PropTypes.instanceOf(Environment),
    };
}
