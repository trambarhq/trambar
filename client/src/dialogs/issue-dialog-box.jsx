import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';
import * as TagScanner from 'utils/tag-scanner';
import * as RepoUtils from 'objects/utils/repo-utils';


// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import TextField from 'widgets/text-field';

import './issue-dialog-box.scss';

class IssueDialogBox extends PureComponent {
    static displayName = 'IssueDialogBox';

    constructor(props) {
        let { issue } = props;
        super(props);
        this.components = ComponentRefs({
            textField: TextField
        });
        this.state = {
            newIssue: issue ? null : this.getDefaultIssue(),
        };
    }

    /**
     * Return the current issue details
     *
     * @param  {String} path
     *
     * @return {*}
     */
    getIssueProperty(path) {
        let { issue } = this.props;
        let { newIssue } = this.state;
        return _.get(newIssue || issue, path);
    }

    /**
     * Set a property of the issue object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setIssueProperty(path, value) {
        let { issue } = this.props;
        let { newIssue } = this.state;
        let newIssueAfter = _.decoupleSet(newIssue || issue, path, value);
        if (path === 'repo_id') {
            lastSelectedRepoID = value;
            window.localStorage.last_selected_repo_id = value;
        }
        this.setState({ newIssue: newIssueAfter });
    }

    /**
     * Derive issue details from story
     *
     * @return {Object|null}
     */
    getDefaultIssue() {
        let { env, story, repos } = this.props;
        let { p } = env.locale;
        let { text } = story.details;
        let langText = p(text);
        // look for a title in the text
        let paragraphs = _.split(_.trim(langText), /[\r\n]+/);
        let first = TagScanner.removeTags(paragraphs[0]);
        // use first paragraph as title only if it isn't very long
        let title = '';
        if (first.length < 100) {
            title = first;
        }

        // look for tags that match labels
        let allLabels = _.uniq(_.flatten(_.map(repos, 'details.labels')));
        let labels = _.filter(allLabels, (label) => {
            let tag = `#${_.replace(label, /\s+/g, '-')}`;
            return _.includes(story.tags, tag);
        });

        if (!title && _.isEmpty(labels)) {
            return null;
        }
        return { title, labels };
    }

    /**
     * Return the selected repo
     *
     * @return {Repo}
     */
    getSelectedRepo() {
        let repoID = this.getIssueProperty('repo_id');
        let repos = this.getAvailableRepos();
        let repo = _.find(repos, { id: repoID });
        if (!repo) {
            repo = _.find(repos, { id: lastSelectedRepoID });
        }
        if (!repo) {
            // find one with labels--if a repo has no labels, then its
            // issue tracker probably isn't being used
            repo = _.last(_.sortBy(repos, (repo) => {
                return _.size(repo.details.labels);
            }));
        }
        if (!repo) {
            repo = _.first(repos);
        }
        return repo || null;
    }

    /**
     * Return repos that have issue-trackers
     *
     * @return {Array<Object>}
     */
    getAvailableRepos() {
        let { env, repos } = this.props;
        let { p } = env.locale;
        repos = _.filter(repos, (repo) => {
            return repo.details.issues_enabled;
        });
        repos = _.sortBy(repos, (repo) => {
            return _.toLower(p(repo.details.title) || repo.name);
        });
        return repos;
    }

    /**
     * Update start when props change
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { show } = this.props;
        if (nextProps.show !== show) {
            if (nextProps.show) {
                let issue;
                if (!nextProps.issue) {
                    issue = this.getDefaultIssue();
                }
                this.setState({ issue });
            }
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { show, onClose } = this.props;
        let overlayProps = { show, onBackgroundClick: onClose };
        return (
            <Overlay {...overlayProps}>
                <div className="issue-dialog-box">
                    {this.renderForm()}
                    <div className="controls">
                        {this.renderButtons()}
                    </div>
                </div>
            </Overlay>
        );
    }

    /**
     * Render issue form
     *
     * @return {ReactElement}
     */
    renderForm() {
        return (
            <div className="container">
                <div className="top">
                    {this.renderTitleInput()}
                    {this.renderRepoSelector()}
                </div>
                {this.renderLabelSelector()}
            </div>
        );
    }

    /**
     * Render input for issue title
     *
     * @return {ReactElement}
     */
    renderTitleInput() {
        let { env } = this.props;
        let { t } = env.locale;
        let { setters } = this.components;
        let props = {
            id: 'title',
            ref: setters.textField,
            value: this.getIssueProperty('title'),
            env,
            onChange: this.handleTitleChange,
        };
        return <TextField {...props}>{t('issue-title')}</TextField>;
    }

    /**
     * Render select control for repo if there're more than one
     *
     * @return {[type]}
     */
    renderRepoSelector() {
        let { env } = this.props;
        let { t, p } = env.locale;
        let repos = this.getAvailableRepos();
        if (repos.length <= 1) {
            return null;
        }
        let repo = this.getSelectedRepo();
        let options = _.map(repos, (repo, index) => {
            let title = RepoUtils.getDisplayName(repo, env);
            return <option key={index} value={repo.id}>{title}</option>;
        });
        return (
            <div className="select-field">
                <label>{t('issue-repo')}</label>
                <select value={repo.id} onChange={this.handleRepoChange}>
                    {options}
                </select>
            </div>
        );
    }

    /**
     * Render tag selector
     *
     * @return {ReactElement}
     */
    renderLabelSelector() {
        let repo = this.getSelectedRepo();
        if (!repo) {
            return null;
        }
        let selectedLabels = this.getIssueProperty('labels') || [];
        let { labels } = repo.details;
        let tags = _.map(labels, (label, index) => {
            let props = {
                className: 'tag',
                style: RepoUtils.getLabelStyle(repo, label),
                'data-label': label,
                onClick: this.handleTagClick,
            };
            if (_.includes(selectedLabels, label)) {
                props.className += ' selected';
            }
            return <span key={index} {...props}>{label}</span>;
        });
        for (let i = 1; i < tags.length; i += 2) {
            tags.splice(i, 0, ' ');
        }
        return  <div className="tags">{tags}</div>;
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env, issue, allowDeletion } = this.props;
        let { newIssue } = this.state;
        let { t } = env.locale;
        let repo = this.getSelectedRepo();
        let text = this.getIssueProperty('title');
        let changed = !!_.trim(text);
        let canDelete = false;
        if (issue) {
            if (newIssue) {
                changed = !_.isEqual(newIssue, issue);
            } else {
                changed = false;
            }
            if (issue && issue.id) {
                canDelete = true;
            }
        }
        if (!allowDeletion) {
            canDelete = false;
        }
        let deleteProps = {
            label: t('issue-delete'),
            emphasized: false,
            hidden: !canDelete,
            onClick: this.handleDeleteClick,
        };
        let cancelProps = {
            label: t('issue-cancel'),
            emphasized: false,
            onClick: this.handleCancelClick,
        };
        let confirmProps = {
            label: t('issue-ok'),
            emphasized: true,
            disabled: !changed || !repo,
            onClick: this.handleOKClick,
        };
        return (
            <div className="buttons">
                <div className="left">
                    <PushButton {...deleteProps} />
                </div>
                <div className="right">
                    <PushButton {...cancelProps} />
                    <PushButton {...confirmProps} />
                </div>
            </div>
        );
    }

    /**
     * Focus text field on mount
     */
    componentDidMount() {
        let { textField } = this.components;
        // only if the title is currently empty
        if (!this.getIssueProperty('title')) {
            textField.focus();
        }
    }

    /**
     * Called when user clicks the delete button
     *
     * @param  {Event} evt
     */
    handleDeleteClick = (evt) => {
        let { onConfirm } = this.props;
        if (onConfirm) {
            onConfirm({
                type: 'confirm',
                target: this,
                issue: null,
            });
        }
    }

    /**
     * Called when user clicks the cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        let { onCancel } = this.props;
        if (onCancel) {
            onCancel({
                type: 'cancel',
                target: this,
            });
        }
    }

    /**
     * Called when user clicks the open button
     *
     * @param  {Event} evt
     */
    handleOKClick = (evt) => {
        let { story, onConfirm } = this.props;
        let { newIssue } = this.state;
        newIssue = _.clone(newIssue);
        let repo = this.getSelectedRepo();
        // make sure id is set
        newIssue.repo_id = repo.id;
        // make use the selected labels exist in the selected repo only
        newIssue.labels = _.intersection(newIssue.labels, repo.details.labels);
        if (onConfirm) {
            onConfirm({
                type: 'close',
                target: this,
                issue: newIssue
            });
        }
    }

    /**
     * Called when user changes the title
     *
     * @param  {Event} evt
     */
    handleTitleChange = (evt) => {
        let text = evt.target.value;
        this.setIssueProperty('title', text);
    }

    /**
     * Called when user selects a repo
     *
     * @param  {Event} evt
     */
    handleRepoChange = (evt) => {
        let repoID = parseInt(evt.target.value);
        this.setIssueProperty('repo_id', repoID);
    }

    /**
     * Called when user clicks a tag
     *
     * @param  {[type]} evt
     *
     * @return {[type]}
     */
    handleTagClick = (evt) => {
        let label = evt.target.getAttribute('data-label');
        let labels = this.getIssueProperty('labels') || [];
        if (_.includes(labels, label)) {
            labels = _.difference(labels, [ label ]);
        } else {
            labels = _.union(labels, [ label ]);
        }
        this.setIssueProperty('labels', labels);
    }
}

let lastSelectedRepoID = parseInt(window.localStorage.last_selected_repo_id) || undefined;

export {
    IssueDialogBox as default,
    IssueDialogBox,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    IssueDialogBox.propTypes = {
        show: PropTypes.bool,
        allowDeletion: PropTypes.bool.isRequired,
        story: PropTypes.object.isRequired,
        repos: PropTypes.arrayOf(PropTypes.object),
        issue: PropTypes.object,

        env: PropTypes.instanceOf(Environment).isRequired,

        onConfirm: PropTypes.func,
        onClose: PropTypes.func,
    };
}
