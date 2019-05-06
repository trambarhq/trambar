import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import HeaderButton from '../widgets/header-button.jsx';
import OptionButton from '../widgets/option-button.jsx';
import UserSelectionDialogBox from '../dialogs/user-selection-dialog-box';
import IssueDialogBox from '../dialogs/issue-dialog-box';

import './story-editor-options.scss';

/**
 * Component responsible for the handling of story options. Used by StoryEditor.
 *
 * @extends PureComponent
 */
class StoryEditorOptions extends PureComponent {
    static displayName = 'StoryEditorOptions';

    constructor(props) {
        super(props);
        this.state = {
            selectingRecipients: false,
            enteringIssueDetails: false,
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { section } = this.props;
        if (section === 'both') {
            return (
                <div className="story-editor-options">
                    {this.renderButtons('main')}
                    <div className="border" />
                    {this.renderButtons('preview')}
                </div>
            );
        } else {
            return (
                <div className="story-editor-options">
                    {this.renderButtons(section)}
                </div>
            );
        }
    }

    /**
     * Render list of buttons belonging to specified section
     *
     * @param  {String} section
     *
     * @return {ReactElement}
     */
    renderButtons(section) {
        let { env, options, currentUser, story, repos } = this.props;
        let { t } = env.locale;
        if (section === 'main') {
            let access = 'read-write';
            let bookmarking = (currentUser) ? _.includes(options.bookmarkRecipients, currentUser.id) : false;
            let otherRecipients = (currentUser) ? _.without(options.bookmarkRecipients, currentUser.id) : [];
            let bookmarkProps = {
                label: t('option-add-bookmark'),
                selected: bookmarking,
                onClick: this.handleBookmarkClick,
            };
            let sendBookmarkProps = {
                label: _.isEmpty(otherRecipients)
                    ? t('option-send-bookmarks')
                    : t('option-send-bookmarks-to-$count-users', _.size(otherRecipients)),
                hidden: !UserUtils.canSendBookmarks(currentUser, story, access),
                selected: !_.isEmpty(otherRecipients),
                onClick: this.handleSendBookmarkClick,
            };
            let addIssueProps = {
                label: t('option-add-issue'),
                selected: !!options.issueDetails,
                hidden: !UserUtils.canAddIssue(currentUser, story, repos, access),
                onClick: this.handleAddIssueClick,
            };
            let hidePostProps = {
                label: t('option-hide-story'),
                selected: options.hidePost,
                hidden: !UserUtils.canHideStory(currentUser, story, access),
                onClick: this.handleHidePostClick,
            };
            return (
                <div className={section}>
                    <OptionButton {...bookmarkProps} />
                    <OptionButton {...sendBookmarkProps} />
                    <OptionButton {...addIssueProps} />
                    <OptionButton {...hidePostProps} />
                    {this.renderRecipientDialogBox()}
                    {this.renderIssueDialogBox()}
                </div>
            );
        } else if (section === 'preview') {
            let mediaProps = {
                label: t('option-show-media-preview'),
                selected: options.preview === 'media' || !options.preview,
                onClick: this.handleShowMediaPreviewClick,
            };
            let textProps = {
                label: t('option-show-text-preview'),
                selected: options.preview === 'text',
                onClick: this.handleShowTextPreviewClick,
            };
            return (
                <div className={section}>
                    <OptionButton {...mediaProps} />
                    <OptionButton {...textProps} />
                </div>
            );
        }
    }

    /**
     * Render dialog for selecting users
     *
     * @return {ReactElement}
     */
    renderRecipientDialogBox() {
        let { database, route, env, options } = this.props;
        let { selectingRecipients } = this.state;
        let props = {
            show: selectingRecipients,
            selection: options.bookmarkRecipients,

            database,
            route,
            env,

            onSelect: this.handleRecipientsSelect,
            onCancel: this.handleRecipientsCancel,
        };
        return <UserSelectionDialogBox {...props} />;
    }

    /**
     * Render dialog for entering issue details
     *
     * @return {ReactElement}
     */
    renderIssueDialogBox() {
        let { env, options, currentUser, story, repos } = this.props;
        let { enteringIssueDetails } = this.state;
        let props = {
            show: enteringIssueDetails,
            allowDeletion: true,
            currentUser,
            story,
            issue: options.issueDetails,
            repos,
            env,
            onConfirm: this.handleIssueConfirm,
            onCancel: this.handleIssueCancel,
        };
        return <IssueDialogBox {...props} />;
    }

    /**
     * Inform parent component that options have been changed
     *
     * @param  {Object} options
     */
    triggerChangeEvent(options) {
        let { onChange } = this.props;
        if (onChange) {
            onChange({
                type: 'change',
                target: this,
                options,
            });
        }
    }

    /**
     * Inform parent component the action requested is either done or canceled
     */
    triggerCompleteEvent() {
        let { onComplete } = this.props;
        if (onComplete) {
            onComplete({
                type: 'complete',
                target: this,
            });
        }
    }

    /**
     * Open dialog box for selecting user
     *
     * @param  {Event} evt
     */
    openSelectionDialogBox(evt) {
        let { selectingRecipients } = this.state;
        if (!selectingRecipients) {
            this.setState({ selectingRecipients: true });
        }
    }

    /**
     * Close dialog box
     */
    closeSelectionDialogBox() {
        let { selectingRecipients } = this.state;
        if (selectingRecipients) {
            this.setState({ selectingRecipients: false });
        }
    }

    /**
     * Open dialog box for entering issue details
     *
     * @param  {Event} evt
     */
    openIssueDialogBox(evt) {
        let { enteringIssueDetails } = this.state;
        if (!enteringIssueDetails) {
            this.setState({ enteringIssueDetails: true });
        }
    }

    /**
     * Close dialog box
     */
    closeIssueDialogBox() {
        let { enteringIssueDetails } = this.state;
        if (enteringIssueDetails) {
            this.setState({ enteringIssueDetails: false });
        }
    }

    /**
     * Called when user clicks on bookmark post button
     *
     * @param  {Event} evt
     */
    handleBookmarkClick = (evt) => {
        let { options, currentUser } = this.props;
        options = _.clone(options);
        let userID = currentUser.id;
        if (_.includes(options.bookmarkRecipients, userID)) {
            options.bookmarkRecipients = _.difference(options.bookmarkRecipients, [ userID ]);
        } else {
            options.bookmarkRecipients = _.union(options.bookmarkRecipients, [ userID ]);
        }
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    }

    /**
     * Called when user clicks on send bookmark button
     *
     * @param  {Event} evt
     */
    handleSendBookmarkClick = (evt) => {
        this.openSelectionDialogBox(evt);
    }

    /**
     * Called when user clicks on add issue to tracker button
     *
     * @param  {Event} evt
     */
    handleAddIssueClick = (evt) => {
        this.openIssueDialogBox(evt);
    }

    /**
     * Called when user clicks on hide post button
     *
     * @param  {Event} evt
     */
    handleHidePostClick = (evt) => {
        let { options } = this.props;
        options = _.clone(options);
        options.hidePost = !options.hidePost;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    }

    /**
     * Called when user finishes selecting user
     *
     * @param  {Object} evt
     */
    handleRecipientsSelect = (evt) => {
        let { options } = this.props;
        options = _.clone(options);
        options.bookmarkRecipients = evt.selection;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
        this.closeSelectionDialogBox();
    }

    /**
     * Called when user cancel user selection
     *
     * @param  {Object} evt
     */
    handleRecipientsCancel = (evt) => {
        this.triggerCompleteEvent();
        this.closeSelectionDialogBox();
    }

    /**
     * Called when user finishes entering issue details
     *
     * @param  {Object} evt
     */
    handleIssueConfirm = (evt) => {
        let { options } = this.props;
        options = _.clone(options);
        options.issueDetails = evt.issue;
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
        this.closeIssueDialogBox();
    }

    /**
     * Called when user cancel editing of issue details
     *
     * @param  {Object} evt
     */
    handleIssueCancel = (evt) => {
        this.triggerCompleteEvent();
        this.closeIssueDialogBox();
    }

    /**
     * Called when user clicks show media button
     *
     * @param  {Event} evt
     */
    handleShowMediaPreviewClick = (evt) => {
        let { options } = this.props;
        options = _.clone(options);
        options.preview = 'media';
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    }

    /**
     * Called when user clicks show preview button
     *
     * @param  {Event} evt
     */
    handleShowTextPreviewClick = (evt) => {
        let { options } = this.props;
        options = _.clone(options);
        options.preview = 'text';
        this.triggerChangeEvent(options);
        this.triggerCompleteEvent();
    }
}

StoryEditorOptions.defaultProps = {
    section: 'both',
};

export {
    StoryEditorOptions as default,
    StoryEditorOptions,
};

import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    StoryEditorOptions.propTypes = {
        section: PropTypes.oneOf([ 'main', 'preview', 'both' ]),
        story: PropTypes.object.isRequired,
        repos: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        options: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onChange: PropTypes.func,
        onComplete: PropTypes.func,
    };
}
