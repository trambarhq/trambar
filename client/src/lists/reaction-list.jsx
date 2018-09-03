import _ from 'lodash';
import React, { PureComponent } from 'react';
import Memoize from 'utils/memoize';
import Merger from 'data/merger';

// widgets
import ReactionView from 'views/reaction-view';
import ReactionEditor from 'editors/reaction-editor';
import SmartList from 'widgets/smart-list';

import './reaction-list.scss';

class ReactionList extends PureComponent {
    static displayName = 'ReactionList';

    constructor(props) {
        super(props);
        this.state = {
            hiddenReactionIds: [],
        };
    }

    /**
     * Extract id from URL hash
     *
     * @param  {String} hash
     *
     * @return {Object}
     */
    static parseHash(hash) {
        var reaction, highlighting;
        if (reaction = Route.parseId(hash, /R(\d+)/)) {
            highlighting = true;
        } else if (reaction = Route.parseId(hash, /r(\d+)/)) {
            highlighting = false;
        }
        return { reaction, highlighting };
    }

    /**
     * Get URL hash based on given parameters
     *
     * @param  {Object} params
     *
     * @return {String}
     */
    static getHash(params) {
        if (params.reaction != undefined) {
            if (params.highlighting) {
                return `R${params.reaction}`;
            } else {
                return `r${params.reaction}`;
            }
        }
        return '';
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        var reactions = sortReactions(this.props.reactions, this.props.currentUser);
        var anchor;
        var hashParams = ReactionList.parseHash(this.props.route.hash);
        if (hashParams.reaction) {
            anchor = `reaction-${hashParams.reaction}`;
        }
        var props = {
            items: reactions,
            behind: 5,
            ahead: 10,
            anchor: anchor,
            offset: 4,
            inverted: true,
            fresh: false,

            onIdentity: this.handleReactionIdentity,
            onTransition: this.handleReactionTransition,
            onRender: this.handleReactionRender,
            onBeforeAnchor: this.handleReactionBeforeAnchor,
        }
        return (
            <div className="reaction-list">
                <SmartList {...props} />
            </div>
        );
    }

    /**
     * Called when SmartList wants an item's id
     *
     * @param  {Object} evt
     *
     * @return {String|undefined}
     */
    handleReactionIdentity = (evt) => {
        if (evt.alternative) {
            var params = this.props.route.parameters;
            var location = { schema: params.schema, table: 'reaction' };
            var temporaryId = this.props.database.findTemporaryID(location, evt.item.id);
            if (temporaryId) {
                return `reaction-${temporaryId}`;
            }
        } else {
            return `reaction-${evt.item.id}`;
        }
    }

    /**
     * Called when SmartList wants to know if it should use transition effect
     *
     * @param  {Object} evt
     *
     * @return {Boolean}
     */
    handleReactionTransition = (evt) => {
        // don't transition in comment editor with a temporary object
        if (evt.item.id < 1) {
            return false;
        }
        return true;
    }

    /**
     * Called when SmartList wants to render an item
     *
     * @param  {Object} evt
     *
     * @return {ReactElement}
     */
    handleReactionRender = (evt) => {
        var reaction = evt.item;
        var isUserDraft = false;
        var isNewComment = false;
        var highlighting = false;
        if (!reaction) {
            isUserDraft = true;
            isNewComment = true;
        } else {
            if (!reaction.published) {
                if (reaction.user_id === this.props.currentUser.id) {
                    isUserDraft = true;
                    if (!reaction.ptime) {
                        isNewComment = true;
                    }
                }
            }
            var hashParams = ReactionList.parseHash(this.props.route.hash);
            if (reaction.id === hashParams.reaction) {
                highlighting = hashParams.highlighting;
            }
        }
        if (isUserDraft) {
            // always use 0 as the key for new comment by current user, so
            // the keyboard focus isn't taken away when autosave occurs
            // (and the comment gains an id)
            var key = (isNewComment) ? 0 : reaction.id;
            var props = {
                reaction,
                story: this.props.story,
                currentUser: this.props.currentUser,
                database: this.props.database,
                payloads: this.props.payloads,
                route: this.props.route,
                locale: this.props.locale,
                theme: this.props.theme,
                onFinish: this.props.onFinish,
            };
            return <ReactionEditor key={key} {...props} />
        } else {
            var respondent = findRespondent(this.props.respondents, reaction);
            var props = {
                access: this.props.access,
                highlighting,
                reaction,
                respondent,
                story: this.props.story,
                repo: this.props.repo,
                currentUser: this.props.currentUser,
                database: this.props.database,
                route: this.props.route,
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <ReactionView key={reaction.id} {...props} />
        }
    }

    /**
     * Called when SmartList notice new items were rendered off screen
     *
     * @param  {Object} evt
     */
    handleReactionBeforeAnchor = (evt) => {
        var hiddenReactionIds = _.map(evt.items, 'id');
        this.setState({ hiddenReactionIds });
    }
}

var sortReactions = Memoize(function(reactions, currentUser) {
    // reactions are positioned from bottom up
    // place reactions with later ptime at towards the front of the list
    var sortedReactions = _.orderBy(reactions, [ 'ptime', 'id' ], [ 'desc', 'desc' ]);
    var ownUnpublished = _.remove(sortedReactions, { user_id: currentUser, ptime: null });
    // move unpublished comment of current user to beginning, so it shows up
    // at the bottom
    _.each(ownUnpublished, (reaction) => {
        sortedReactions.unshift(reaction);
    });
    return sortedReactions;
});

var findRespondent = Memoize(function(users, reaction) {
    if (reaction) {
        return _.find(users, { id: reaction.user_id });
    } else {
        return null;
    }
});

export {
    ReactionList as default,
    ReactionList,
};

import Database from 'data/database';
import Payloads from 'transport/payloads';
import Route from 'routing/route';
import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ReactionList.propTypes = {
        access: PropTypes.oneOf([ 'read-only', 'read-comment', 'read-write' ]).isRequired,
        story: PropTypes.object.isRequired,
        reactions: PropTypes.arrayOf(PropTypes.object),
        respondents: PropTypes.arrayOf(PropTypes.object),
        repo: PropTypes.object,
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onFinish: PropTypes.func,
    };
}
