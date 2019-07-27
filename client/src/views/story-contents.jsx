import _ from 'lodash';
import Moment from 'moment';
import React, { useState, useMemo, useRef } from 'react';
import { useListener, useSaveBuffer, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as Markdown from 'common/utils/markdown.mjs';
import * as PlainText from 'common/utils/plain-text.mjs';
import * as ProjectUtils from 'common/objects/utils/project-utils.mjs';
import * as ReactionSaver from 'common/objects/savers/reaction-saver.mjs';
import * as RepoUtils from 'common/objects/utils/repo-utils.mjs';
import * as ResourceUtils from 'common/objects/utils/resource-utils.mjs';
import * as StorySaver from 'common/objects/savers/story-saver.mjs';
import * as StoryUtils from 'common/objects/utils/story-utils.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';
import Payload from 'common/transport/payload.mjs';

// widgets
import { MediaView } from '../views/media-view.jsx';
import { MediaDialogBox } from '../dialogs/media-dialog-box';
import { AppComponent } from '../views/app-component.jsx';
import { AppComponentDialogBox } from '../dialogs/app-component-dialog-box';
import { Scrollable } from '../widgets/scrollable.jsx';
import { PushButton } from '../widgets/push-button.jsx';

// custom hooks
import {
    useMarkdownResources,
    useDraftBuffer,
} from '../hooks.mjs';

import './story-contents.scss';

/**
 * Component that renders a story's contents. Used by StoryView.
 */
function StoryContents(props) {
    const { story, authors, reactions, repo, project, currentUser } = props;
    const { database, env, access } = props;
    const { t, p, g, f } = env.locale;
    const audioPlayerRef = useRef();
    const [ selectedComponent, setSelectedComponent ] = useState('');
    const [ error, run ] = useErrorCatcher();
    const originalAnswers = useMemo(() => {
        return StoryUtils.extractUserAnswers(story, env.locale);
    }, [ story, env.locale ]);
    const userAnswers = useDraftBuffer({
        original: originalAnswers,
    });
    const resources = story.details.resources;
    const markdownResources = useMarkdownResources(resources, env);

    const handleTaskListItemChange = useListener((evt) => {
        run(async () => {
            const target = evt.currentTarget;
            const { name, value, checked } = target;
            userAnswers.set([ name, value ], checked);

            const storyUpdated = StoryUtils.insertUserAnswers(story, userAnswers.current);
            const storyAfter = await StorySaver.saveStory(database, storyUpdated);
            await ReactionSaver.updateTaskStatuses(database, reactions, storyAfter, currentUser, userAnswers.current);
        });
    });
    const handleSurveyItemChange = useListener((evt) => {
        const target = evt.currentTarget;
        const { name, value, checked } = target;
        userAnswers.set(name, value);
    });
    const handleVoteSubmitClick = useListener((evt) => {
        run(async () => {
            await ReactionSaver.saveSurveyResults(database, story, currentUser, userAnswers.current);
        });
    });
    const handleComponentSelect = useListener((evt) => {
        setSelectedComponent(evt.component);
    });
    const handleComponentDialogClose = useListener((evt) => {
        setSelectedComponent(null);
    });

    const authorName = UserUtils.getDisplayName(authors ? authors[0] : null, env);
    const authorGender = UserUtils.getGender(authors ? authors[0] : null);
    g(authorName, authorGender);
    const repoName = RepoUtils.getDisplayName(repo, env);
    const repoAccess = UserUtils.canAccessRepo(currentUser, repo);

    const userCanVote = (story.type === 'survey') && (access === 'read-write');
    const userVoted = (reactions) ? getUserVote(reactions, currentUser) : undefined;

    return (
        <div className="story-contents">
            {renderText()}
            {renderAudioPlayer()}
            {renderMedia()}
            {renderReferencedMediaDialog()}
            {renderAppComponents()}
            {renderButtons()}
        </div>
    );

    function renderText() {
        const { exported } = story.details;
        switch (story.type) {
            case 'post':
                return renderStoryText();
            case 'task-list':
                return renderTaskListText();
            case 'survey':
                return renderSurveyText();
            case 'repo':
                return renderRepoText();
            case 'member':
                return renderMemberText();
            case 'push':
            case 'merge':
                return renderPushText();
            case 'branch':
            case 'tag':
                return renderBranchText();
            case 'snapshot':
                return renderSnapshotText();
            case 'issue':
                if (exported) {
                    return renderStoryText();
                } else {
                    return renderIssueText();
                }
            case 'merge-request':
                return renderMergeRequestText();
            case 'milestone':
                return renderMilestoneText();
            case 'wiki':
                return renderWikiText();
            case 'website-traffic':
                return renderWebsiteTrafficText();
        }
    }

    function renderStoryText() {
        const { text, markdown, labels } = story.details;
        const langText = _.trimEnd(p(text));
        let tags;
        if (labels) {
            tags = renderLabels();
        }
        if (!langText && !tags) {
            return null;
        }
        const classNames = [ 'text', 'story' ];
        let contents, onClick;
        if (markdown) {
            classNames.push('markdown');
            contents = Markdown.render(langText, markdownResources.onReference);
            onClick = handleMarkdownClick;
        } else {
            classNames.push('plain-text');

            // if all we have are emojis, make them bigger depending on
            // how many there are
            const emoji = PlainText.findEmoji(langText);
            const chars = _.replace(langText, /\s+/g, '');
            if (emoji) {
                if (_.join(emoji, '') === chars) {
                    className.join('emoji-${emoji.length}');
                }
            }
            contents = <p>{PlainText.renderEmoji(langText)}</p>;
        }
        return (
            <div className={classNames.join(' ')} onClick={onClick}>
                {contents}{tags}
            </div>
        );
    }

    function renderTaskListText() {
        const { text, markdown } = story.details;
        const answers = userAnswers.current;
        let langText = _.trimEnd(p(text));
        if (!langText) {
            return null;
        }
        const classNames = [ 'text', 'task-list' ];
        let contents, onClick, onChange;
        if (_.includes(story.user_ids, currentUser.id)) {
            onChange = handleTaskListItemChange;
        }
        if (markdown) {
            classNames.push('markdown');
            contents = Markdown.renderTaskList(langText, answers, onChange, markdownResources.onReference);
            onClick = markdownResources.onClick;
        } else {
            classNames.push('plain-text');
            contents = <p>{PlainText.renderTaskList(langText, answers, onChange)}</p>;
        }
        return (
            <div className={classNames.join(' ')} onClick={onClick}>
                {contents}
            </div>
        );
    }

    function renderSurveyText() {
        const { text, markdown } = story.details;
        const answers = userAnswers.current;
        const langText = _.trimEnd(p(text));
        if (!langText) {
            return null;
        }
        const showingResult = userVoted || !userCanVote;
        const voteCounts = (showingResult) ? countVotes(reactions) || {} : undefined;
        const classNames = [ 'text', 'survey' ];
        let contents, onClick;
        if (markdown) {
            classNames.push('markdown');
            if (showingResult) {
                contents = Markdown.renderSurveyResults(langText, voteCounts, markdownResources.onReference);
            } else {
                contents = Markdown.renderSurvey(langText, answers, handleSurveyItemChange, markdownResources.onReference);
            }
            onClick = handleMarkdownClick;
        } else {
            classNames.push('plain-text');
            if (showingResult) {
                contents = PlainText.renderSurveyResults(langText, voteCounts);
            } else {
                contents = PlainText.renderSurvey(langText, answers, handleSurveyItemChange);
            }
            contents = <p>{contents}</p>;
        }
        return (
            <div className={classNames.join(' ')} onClick={onClick}>
                {contents}
            </div>
        );
    }

    function renderRepoText() {
        const { action } = story.details;
        const url = (repoAccess) ? RepoUtils.getURL(repo) : undefined;
        const target = (repoAccess) ? repo.type : undefined;
        return (
            <div className="text repo">
                <p>
                    <a href={url} target={target}>
                        {t(`story-$name-${action}-$repo`, authorName, repoName)}
                    </a>
                </p>
            </div>
        );
    }

    function renderMemberText() {
        const url = (repoAccess) ? RepoUtils.getMembershipPageURL(repo) : undefined
        const target = (repoAccess) ? repo.type : undefined;
        return (
            <div className="text member">
                <p>
                    <a href={url} target={target}>
                        {t(`story-$name-${action}-$repo`, authorName, repoName)}
                    </a>
                </p>
            </div>
        );
    }

    function renderIssueText() {
        const { title } = story.details;
        const number = RepoUtils.getIssueNumber(repo, story);
        const url = (repoAccess) ? RepoUtils.getIssueURL(repo, story) : undefined;
        const target = (repoAccess) ? repo.type : undefined;
        return (
            <div className="text issue">
                <p>
                    <a href={url} target={target}>
                        {t(`story-$name-opened-issue-$number-$title`, authorName, number, p(title))}
                    </a>
                </p>
                {renderStatus()}
                {renderLabels()}
            </div>
        );
    }

    function renderMilestoneText() {
        const { title } = story.details;
        const url = (repoAccess) ? RepoUtils.getMilestoneURL(repo, story) : undefined;
        const target = (repoAccess) ? repo.type : undefined;
        return (
            <div className="text milestone">
                <p>
                    <a href={url} target={target}>
                        {t(`story-$name-created-$milestone`, authorName, p(title))}
                    </a>
                </p>
            </div>
        );
    }

    function renderMergeRequestText() {
        const {
            source_branch: branch1,
            branch: branch2
        } = story.details;
        const url = (repoAccess) ? RepoUtils.getMergeRequestURL(repo, story) : undefined;
        const target = (repoAccess) ? repo.type : undefined;
        return (
            <div className="text merge-request">
                <p>
                    <a href={url} target={target}>
                        {t(`story-$name-requested-merge-$branch1-into-$branch2`, authorName, branch1, branch2)}
                    </a>
                </p>
                {renderStatus()}
                {renderLabels()}
            </div>
        );
    }

    function renderWikiText() {
        const { action, title, url: wikiURL } = story.details;
        const deleted = (action === 'delete');
        const url = (repoAccess && !deleted) ? wikiURL : undefined;
        const target = (repoAccess && !deleted) ? repo.type : undefined;
        return (
            <div className="text wiki">
                <p>
                    <a href={url} target={target}>
                        {t(`story-$name-${action}d-$page`, authorName, _.capitalize(title))}
                    </a>
                </p>
            </div>
        );
    }

    function renderPushText() {
        const {
            branch,
            from_branches: sourceBranches
        } = story.details;
        const url = (repoAccess) ? RepoUtils.getPushURL(repo, story) : undefined;
        const target = (repoAccess) ? repo.type : undefined;
        let text;
        if (story.type === 'push') {
            text = t(`story-$name-pushed-to-$branch-of-$repo`, authorName, branch, repoName);
        } else if (story.type === 'merge') {
            text = t(`story-$name-merged-$branches-into-$branch-of-$repo`, authorName, sourceBranches, branch, repoName);
        }
        return (
            <div className="text push">
                <p>
                    <a href={url} target={target}>{text}</a>
                </p>
                {renderChanges()}
            </div>
        );
    }

    function renderBranchText() {
        const { branch } = story.details;
        const url = (repoAccess) ? RepoUtils.getBranchURL(repo, story) : undefined;
        const target = (repoAccess) ? repo.type : undefined;
        let text;
        if (story.type === 'branch') {
            text = t(`story-$name-created-$branch-in-$repo`, name, branch, repoName);
        } else if (story.type === 'tag') {
            text = t(`story-$name-created-$tag-in-$repo`, name, branch, repoName);
        }
        return (
            <div className="text push">
                <p>
                    <a href={url} target={target}>{text}</a>
                </p>
                {renderChanges()}
            </div>
        );
    }

    function renderSnapshotText() {
        const {
            branch,
            commit_after: commitID,
        } = story.details;
        let url = ProjectUtils.getWebsiteAddress(project)
        let text;
        if (branch === 'master') {
            text = t(`story-$name-changed-production-website`, authorName);
        } else {
            text = t(`story-$name-created-website-version-in-$branch`, authorName, branch);
            if (url) {
                url += `(${commitID})/`;
            }
        }
        return (
            <div className="text push">
                <p>
                    <a href={url} target="_blank">{text}</a>
                </p>
            </div>
        );
    }

    function renderWebsiteTrafficText() {
        const total = story.details.total;
        const date = f(story.details.date);
        return (
            <div className="text website-traffic">
                <p>
                    {t('story-website-traffic-$count-on-$date', total, date)}
                </p>
                <p>{renderWebsiteTrafficChart()}</p>
            </div>
        );
    }

    function renderWebsiteTrafficChart() {
        const total = story.details.total;
        const countries = [];
        for (let [ code, count ] of _.entries(story.details.by_country)) {
            countries.push({ code, count });
        }
        const topCountries = _.orderBy(countries, 'count', 'desc');
        if (topCountries.length > 5) {
            const otherCountries = topCountries.splice(4);
            const otherTotal = _.sum(_.map(otherCountries, 'count'));
            const otherCodes = _.map(otherCountries, 'code');
            topCountries.push({ code: 'zz', count: otherTotal, others: otherCodes });
        }
        return _.map(topCountries, (country, key) => {
            const classNames = [ 'by-country' ];
            const percentNum = _.round(country.count / total * 100);
            if (percentNum === 0) {
                return;
            } else if (percentNum >= 99) {
                classNames.push('vast-majority');
            }
            const percent = percentNum + '%';
            const color = `color-${key + 1}`;
            let title;
            if (country.code === 'zz') {
                const others = _.map(country.others, (code) => {
                    return t(`country-name-${code}`);
                });
                title = others.join(', ');
            }
            return (
                <span className={classNames.join(' ')} title={title} key={key}>
                    <span className="label">{t(`country-name-${country.code}`)}</span>
                    <span className="bar">
                        <span className={`filled ${color}`} style={{ width: percent }} />
                        <span className="percent">{percent}</span>
                        <span className="count">{country.count}</span>
                    </span>
                </span>
            );
        });


    }

    function renderChanges() {
        const files = story.details.files;
        if (_.isEmpty(files)) {
            return null;
        }
        const fileChangeTypes = [ 'added', 'deleted', 'modified', 'renamed' ];
        const fileChanges = _.transform(fileChangeTypes, (elements, type, i) => {
            const count = files[type];
            if (count > 0) {
                elements.push(
                    <li key={i} className={type}>
                        {t(`story-push-${type}-$count-files`, count)}
                    </li>
                );
            }
        }, []);
        const lines = story.details.lines;
        const lineChangeTypes = [ 'added', 'deleted', 'modified' ];
        const lineChanges = _.transform(lineChangeTypes, (elements, type, i) => {
            const count = lines[type];
            if (count > 0) {
                elements.push(
                    <li key={i} className={type}>
                        {t(`story-push-${type}-$count-lines`, count)}
                    </li>
                );
            }
        }, []);
        return (
            <div>
                <ul className="files">{fileChanges}</ul>
                <ul className="lines">{lineChanges}</ul>
            </div>
        );
    }

    function renderStatus() {
        const { state } = story.details;
        if (!state) {
            return null;
        }
        return (
            <p className={`status-${state}`}>
                <span>{t('story-issue-current-status')}</span>
                {' '}
                <span>{t(`story-issue-status-${state}`)}</span>
            </p>
        );
    }

    function renderLabels() {
        const { labels } = story.details;
        if (_.isEmpty(labels)) {
            return null;
        }
        const tags = _.map(labels, renderLabel);
        // inserting actual spaces between the tags for the sake of copy-and-pasting
        for (let i = 1; i < tags.length; i += 2) {
            tags.splice(i, 0, ' ');
        }
        return <p className="tags">{tags}</p>;
    }

    function renderLabel(label, i) {
        const style = RepoUtils.getLabelStyle(repo, label);
        return <span key={i} className="tag" style={style}>{label}</span>;
    }

    function renderButtons() {
        if (!userCanVote || userVoted) {
            return null;
        }
        const allAnswered = _.every(userAnswers.current);
        const submitProps = {
            label: t('story-vote-submit'),
            emphasized: allAnswered,
            disabled: !allAnswered,
            onClick: handleVoteSubmitClick,
        };
        return (
            <div className="buttons">
                <PushButton {...submitProps} />
            </div>
        );
    }

    function renderAudioPlayer() {
        const { audioURL, onAudioEnded } = markdownResources;
        if (!audioURL) {
            return null;
        }
        const audioProps = {
            src: audioURL,
            autoPlay: true,
            controls: true,
            onEnded: onAudioEnded,
        };
        return <audio ref={audioPlayerRef} {...audioProps} />;
    }

    function renderMedia() {
        const remaining = markdownResources.unreferenced;
        if (_.isEmpty(remaining)) {
            return null;
        }
        const props = {
            resources: remaining,
            width: Math.min(512, env.viewportWidth),
            env,
        };
        return <MediaView {...props} />
    }

    function renderReferencedMediaDialog() {
        const { zoomed, zoomable, selected, onClose } = markdownResources;
        const selectedIndex = _.indexOf(zoomable, selected);
        const dialogProps = {
            show: zoomed,
            resources: zoomable,
            selectedIndex,
            env,
            onClose,
        };
        return <MediaDialogBox {...dialogProps} />;
    }

    function renderAppComponents() {
        const components = story.details.components;
        if (_.isEmpty(components)) {
            return null;
        }
        const sorted = sortComponents(components, env);
        return (
            <div className="impact">
                <p className="message">{t('story-push-components-changed')}</p>
                <Scrollable>
                    {_.map(sorted, renderAppComponent)}
                </Scrollable>
                {renderAppComponentDialog()}
            </div>
        );
    }

    function renderAppComponent(component, i) {
        const componentProps = {
            component,
            env,
            onSelect: handleComponentSelect,
        };
        return <AppComponent key={i} {...componentProps} />
    }

    function renderAppComponentDialog() {
        let dialogProps = {
            show: !!selectedComponent,
            component: selectedComponent,
            env,
            onClose: handleComponentDialogClose,
        };
        return <AppComponentDialogBox {...dialogProps} />;
    }
}

const countVotes = memoizeWeak(null, function(reactions) {
    let tallies = {};
    _.each(reactions, (reaction) => {
        if (reaction.type === 'vote' ) {
            _.forIn(reaction.details.answers, (value, name) => {
                let totalPath = [ name, 'total' ];
                let newTotal = _.get(tallies, totalPath, 0) + 1;
                _.set(tallies, totalPath, newTotal);
                let countPath = [ name, 'answers', value ];
                let newCount = _.get(tallies, countPath, 0) + 1;
                _.set(tallies, countPath, newCount);
            });
        }
    });
    return tallies;
});

const getUserVote = memoizeWeak(null, function(reactions, user) {
    if (user) {
        return _.find(reactions, { type: 'vote', user_id: user.id })
    }
});

const sortComponents = memoizeWeak(null, function(components, env) {
    let { p } = env.locale;
    return _.sortBy(components, (component) => {
        return _.toLower(p(component.text));
    });
});

export {
    StoryContents as default,
    StoryContents,
};
