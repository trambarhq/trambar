import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as UserUtils from 'objects/utils/user-utils';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import ResourceView from 'widgets/resource-view';
import Scrollable from 'widgets/scrollable';
import CollapsibleContainer from 'widgets/collapsible-container';

import './membership-request-dialog-box.scss';

/**
 * Dialog box for requesting membership to a project. 
 *
 * @extends PureComponent
 */
class MembershipRequestDialogBox extends PureComponent {
    static displayName = 'MembershipRequestDialogBox';

    constructor(props) {
        super(props);
        this.state = {
            userJustJoined: false
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { show } = this.props;
        let overlayProps = { show, onBackgroundClick: this.handleCloseClick };
        let classNames = [ 'membership-request-dialog-box' ];
        return (
            <Overlay {...overlayProps}>
                <div className={classNames.join(' ')}>
                    {this.renderText()}
                    {this.renderMessage()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    }

    /**
     * Render description of project
     *
     * @return {ReactElement}
     */
    renderText() {
        let { env, project } = this.props;
        let { p } = env.locale;
        let { name } = project;
        let { title, description, resources } = project.details;
        let image = _.find(resources, { type: 'image' });
        return (
            <Scrollable>
                <div className="title">{p(title) || name}</div>
                <div className="description">
                    <div className="image">
                        <ResourceView resource={image} width={160} env={env} />
                    </div>
                    {p(description)}
                </div>
            </Scrollable>
        );
    }

    /**
     * Render message about member status
     *
     * @return {ReactElement|null}
     */
    renderMessage() {
        let { env, project, currentUser } = this.props;
        let { userJustJoined } = this.state;
        let { t, g } = env.locale;
        let you = UserUtils.getDisplayName(currentUser, env);
        let gender = UserUtils.getGender(currentUser);
        g(you, gender);
        let className = '', icon = '', message = '';
        if (UserUtils.isMember(currentUser, project)) {
            className = 'accepted';
            icon = 'user-circle-o';
            if (userJustJoined) {
                message = t('membership-request-$you-are-now-member', you);
            } else {
                message = t('membership-request-$you-are-member', you);
            }
        } else if (UserUtils.isPendingMember(currentUser, project)) {
            className = 'requested';
            icon = 'clock-o';
            message = t('membership-request-$you-have-requested-membership', you);
        }
        return (
            <CollapsibleContainer open={!!icon}>
                <div className={`message ${className}`}>
                    <i className={`fa fa-${icon}`} />
                    {' '}
                    {message}
                </div>
            </CollapsibleContainer>
        );
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env, project, currentUser } = this.props;
        let { t } = env.locale;
        if (UserUtils.isMember(currentUser, project)) {
            let cancelButtonProps = {
                label: t('membership-request-cancel'),
                onClick: this.handleCloseClick,
            };
            let proceedButtonProps = {
                label: t('membership-request-proceed'),
                onClick: this.handleProceedClick,
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...cancelButtonProps} />
                    <PushButton {...proceedButtonProps} />
                </div>
            );
        } else if (UserUtils.isPendingMember(currentUser, project)) {
            let cancelButtonProps = {
                label: t('membership-request-cancel'),
                onClick: this.handleCloseClick,
            };
            let withdrawButtonProps = {
                label: t('membership-request-withdraw'),
                onClick: this.handleWithdrawClick,
            };
            let browseButtonProps = {
                label: t('membership-request-browse'),
                onClick: this.handleProceedClick,
                hidden: !UserUtils.canViewProject(currentUser, project),
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...cancelButtonProps} />
                    <PushButton {...withdrawButtonProps} />
                    <PushButton {...browseButtonProps} />
                </div>
            );
        } else {
            let cancelButtonProps = {
                label: t('membership-request-cancel'),
                onClick: this.handleCloseClick,
            };
            let browseButtonProps = {
                label: t('membership-request-browse'),
                onClick: this.handleProceedClick,
                hidden: !UserUtils.canViewProject(currentUser, project),
                emphasized: !UserUtils.canJoinProject(currentUser, project),
            };
            let joinButtonProps = {
                label: t('membership-request-join'),
                onClick: this.handleJoinClick,
                hidden: !UserUtils.canJoinProject(currentUser, project),
                emphasized: true,
            };
            return (
                <div className="buttons">
                    <PushButton {...cancelButtonProps} />
                    <PushButton {...browseButtonProps} />
                    <PushButton {...joinButtonProps} />
                </div>
            );
        }
    }

    /**
     * Called when user click join button
     *
     * @param  {Event} evt
     */
    handleJoinClick = (evt) => {
        let { onConfirm } = this.props;
        this.setState({ userJustJoined: true });
        if (onConfirm) {
            onConfirm({ type: 'confirm', target: this });
        }
    }

    /**
     * Called when user click withdraw button
     *
     * @param  {Event} evt
     */
    handleWithdrawClick = (evt) => {
        let { onRevoke } = this.props;
        if (onRevoke) {
            onRevoke({ type: 'revoke', target: this });
        }
    }

    /**
     * Called when user click cancel or ok button or outside the dialog box
     *
     * @param  {Event} evt
     */
    handleCloseClick = (evt) => {
        let { onClose } = this.props;
        if (onClose) {
            onClose({ type: 'cancel', target: this });
        }
    }

    /**
     * Called when user click proceed button
     *
     * @param  {Event} evt
     */
    handleProceedClick = (evt) => {
        let { onProceed } = this.props;
        if (onProceed) {
            onProceed({ type: 'proceed', target: this });
        }
    }
}

export {
    MembershipRequestDialogBox as default,
    MembershipRequestDialogBox,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MembershipRequestDialogBox.propTypes = {
        show: PropTypes.bool,
        currentUser: PropTypes.object.isRequired,
        project: PropTypes.object.isRequired,

        env: PropTypes.instanceOf(Environment).isRequired,

        onConfirm: PropTypes.func,
        onRevoke: PropTypes.func,
        onClose: PropTypes.func,
        onProceed: PropTypes.func,
    };
}
