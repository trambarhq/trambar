import _ from 'lodash';
import React from 'react';

// widgets
import { ResourceView } from 'common/widgets/resource-view.jsx';
import Icon from 'octicons/build/svg/person.svg';

import './profile-image.scss';

/**
 * Stateless component that renders a user's profile image.
 */
export function ProfileImage(props) {
  const { env, user, size } = props;
  const classNames = [ 'profile-image', size ];
  if (user) {
    const image = _.find(user?.details?.resources, { type: 'image' });
    if (image) {
      const imageResolutions = {
        small: 24,
        large: 96,
      };
      const width = imageResolutions[size];
      const props = {
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

ProfileImage.defaultProps = {
  size: 'small'
};
