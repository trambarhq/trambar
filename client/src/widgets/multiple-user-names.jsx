import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as UserUtils from 'objects/utils/user-utils';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import Scrollable from 'widgets/scrollable';
import ProfileImage from 'widgets/profile-image';

import './multiple-user-names.scss';

/**
 * Component that renders a small pop-up window showing a list of users when
 * the mouse pointer goes over a label. The list is truncated when it's long.
 * Clicking on the label brings up the full list in a dialog box.
 *
 * @extends PureComponent
 */
class MultipleUserNames extends PureComponent {
    static displayName = 'MultipleUserNames';

    constructor(props) {
        super(props);
        this.state = {
            showingPopUp: false,
            showingDialogBox: false,
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { label, className } = this.props;
        className = 'multiple-user-names' + ((className) ? ` ${className}` : '');
        let containerProps = {
            className,
            onMouseEnter: this.handleMouseEnter,
            onMouseLeave: this.handleMouseLeave,
        };
        let labelProps = {
            className: 'label',
            onClick: this.handleClick,
        };
        return (
            <span {...containerProps}>
                <span {...labelProps}>{label}</span>
                {this.renderPopUp()}
                {this.renderDialogBox()}
            </span>
        )
    }

    /**
     * Render mouse rollover popup
     *
     * @return {ReactElement|null}
     */
    renderPopUp() {
        let { showingPopUp, popupLimit } = this.state;
        if (!showingPopUp) {
            return null;
        }
        return (
            <div className="popup-container">
                <div className="popup">
                    {this.renderUserList(popupLimit)}
                </div>
            </div>
        );
    }

    /**
     * Render overlay that appears when user clicks on the label
     *
     * @return {ReactElement|null}
     */
    renderDialogBox() {
        let { showingDialogBox } = this.state;
        let overlayProps = {
            show: showingDialogBox,
            onBackgroundClick: this.handleDialogBoxClose,
        };
        let buttonProps = {
            label: 'OK',
            emphasized: true,
            onClick: this.handleDialogBoxClose,
        };
        return (
            <Overlay {...overlayProps}>
                <div className="multiple-user-names-dialog-box">
                    <Scrollable>
                        <div className="list">
                            {this.renderUserList()}
                        </div>
                    </Scrollable>
                    <div className="buttons">
                        <PushButton {...buttonProps} />
                    </div>
                </div>
            </Overlay>
        );
    }

    /**
     * Render user list
     *
     * @param  {Number} limit
     *
     * @return {Array<ReactElement>}
     */
    renderUserList(limit) {
        let { env, users } = this.props;
        let { t, p } = env.locale;
        users = _.sortBy(users, (user) => {
            return p(user.details.name);
        });
        if (users.length > limit) {
            let chunk = _.slice(users, limit);
            let elements = _.map(chunk, (user) => {
                return this.renderUser(user);
            });
            elements.push(
                <div key={0} className="more">
                    {t('list-$count-more', users.length - chunk.length)}
                </div>
            );
            return elements;
        } else {
            return _.map(users, (user) => {
                return this.renderUser(user);
            });
        }
    }

    /**
     * Render user profile image and name
     *
     * @param  {User} user
     *
     * @return {ReactElement}
     */
    renderUser(user) {
        let { env } = this.props;
        let userProps = { user, env };
        return <User key={user.id} {...userProps} />;
    }

    /**
     * Called when mouse cursor enters the label
     *
     * @param  {Event} evt
     */
    handleMouseEnter = (evt) => {
        this.setState({ showingPopUp: true });
    }

    /**
     * Called when mouse cursor exits the label
     *
     * @param  {Event} evt
     */
    handleMouseLeave = (evt) => {
        this.setState({ showingPopUp: false });
    }

    /**
     * Called when user clicks on label
     *
     * @param  {Event} evt
     */
    handleClick = (evt) => {
        this.setState({ showingPopUp: false, showingDialogBox: true });
    }

    /**
     * Called when user clicks the OK button or outside the dialog box
     *
     * @param  {Event} evt
     */
    handleDialogBoxClose = (evt) => {
        this.setState({ showingDialogBox: false });
    }
}

/**
 * Stateless component that renders a user's profile image and name.
 */
function User(props) {
    let { env, user } = props;
    let classNames = [ 'user' ];
    let imageProps = {
        user,
        env,
        size: 'small',
    };
    let name = UserUtils.getDisplayName(user, env);
    return (
        <div className={classNames.join(' ')}>
            <ProfileImage {...imageProps} />
            <span className="name">{name}</span>
        </div>
    );
}

MultipleUserNames.defaultProps = {
    popupLimit: 8
};

export {
    MultipleUserNames as default,
    MultipleUserNames,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MultipleUserNames.propTypes = {
        label: PropTypes.string,
        title: PropTypes.string,
        users: PropTypes.arrayOf(PropTypes.object).isRequired,
        popupLimit: PropTypes.number,

        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
