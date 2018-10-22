import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import ComponentRefs from 'utils/component-refs';
import * as TagScanner from 'utils/tag-scanner';
import * as StatisticsFinder from 'objects/finders/statistics-finder';
import * as UserFinder from 'objects/finders/user-finder';

import './search-bar.scss';

/**
 * Asynchronous component that retrieves data needed by the search bar, namely
 * project statistics, which include information concerning tag usage.
 *
 * @extends AsyncComponent
 */
class SearchBar extends AsyncComponent {
    static displayName = 'SearchBar';

    /**
     * Render component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, route, env, settings } = this.props;
        let db = database.use({ by: this });
        let props = {
            dailyActivities: null,

            settings,
            route,
            env,
        };
        // don't let the component be empty initially
        meanwhile.show(<SearchBarSync {...props} />, 'initial');
        return db.start().then((currentUserID) => {
            return UserFinder.findUser(db, currentUserID);
        }).then((user) => {
            let params = _.clone(settings.statistics);
            if (params.user_id === 'current') {
                params.user_id = user.id;
            }
            if (params.public === 'guest') {
                params.public = (user.type === 'guest');
            }
            return StatisticsFinder.find(db, params);
        }).then((statistics) => {
            props.dailyActivities = statistics;
            return <SearchBarSync {...props} />;
        });
    }
}

/**
 * Synchronous component that actually renders the search bar.
 *
 * @extends PureComponent
 */
class SearchBarSync extends PureComponent {
    static displayName = 'SearchBar.Sync';

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    constructor(props) {
        super(props);
        let { env, route, dailyActivities } = props;
        this.components = ComponentRefs({
            tags: HTMLDivElement,
        });
        // TODO: shouldn't have properties derived from props in state
        this.state = {
            keywords: route.params.search || '',
            hashTags: extractTags(dailyActivities, env),
            selectedHashTags: findTags(route.params.search),
        };
    }

    /**
     * Update keywords if necessary
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { env, route, dailyActivities } = this.props;
        let { keywords } = this.state;
        if (nextProps.route !== route) {
            let route = nextProps.route;
            let keywordsAfter = route.query.search || '';
            if (!_.isEqual(normalize(keywords), normalize(keywordsAfter))) {
                this.setState({
                    keywords: keywordsAfter,
                    selectedHashTags: findTags(keywordsAfter),
                });
            }
        }
        if (nextProps.dailyActivities !== dailyActivities) {
            let hashTags = extractTags(nextProps.dailyActivities, env);
            this.setState({ hashTags });
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return (
            <div className="search-bar">
                {this.renderTextInput()}
                {this.renderHashTags()}
            </div>
        );
    }

    renderTextInput() {
        let { env } = this.props;
        let { keywords } = this.state;
        let { t } = env.locale;
        let inputProps = {
            type: 'text',
            value: keywords,
            placeholder: t('search-bar-keywords'),
            onChange: this.handleTextChange,
            onKeyDown: this.handleKeyDown,
            onFocus: this.handleFocus,
        };
        return (
            <div className="text-input">
                <input {...inputProps} />
            </div>
        );
    }

    /**
     * Render list of hash tags
     *
     * @return {ReactElement}
     */
    renderHashTags() {
        let { setters } = this.components;
        let { hashTags } = this.state;
        return (
            <div ref={setters.tags} className="tags">
            {
                _.map(hashTags, (tag, index) => {
                    return this.renderHashTag(tag, index);
                })
            }
            </div>
        );
    }

    /**
     * Render a hash tag
     *
     * @param  {Object} tag
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderHashTag(tag, index) {
        let { route, settings } = this.props;
        let { selectedHashTags } = this.state;
        let params = _.assign({ search: tag.name }, settings.route);
        let url = route.find(route.name, params);
        let props = {
            className: 'tag',
            onClick: this.handleHashTagClick,
            'data-tag': tag.name,
            href: url
        };
        if (_.includes(selectedHashTags, _.toLower(tag.name))) {
            props.className += ' selected'
        }
        return <a key={index} {...props}>{tag.name}</a>;
    }

    /**
     * Attach handler for resize
     */
    componentDidMount() {
        window.addEventListener('resize', this.handleWindowResize);
    }

    /**
     * Adjust tags visibility based on popularity upon redraw
     */
    componentDidUpdate() {
        this.hideUnpopularTags();
    }

    /**
     * Remove resize handler
     */
    componentDidMount() {
        window.addEventListener('resize', this.handleWindowResize);
    }

    /**
     * Hide less popular tags until the remaining fit on one line
     */
    hideUnpopularTags() {
        let { hashTags } = this.state;
        let { container } = this.components;
        if (container) {
            // first, make all node visible
            let nodes = {};
            _.each(container.children, (node) => {
                if (node.style.display === 'none') {
                    node.style.display = '';
                }
                let tag = node.getAttribute('data-tag');
                nodes[tag] = node;
            });
            let tagsByPopularity = _.sortBy(hashTags, 'score');
            while (isWrapping(nodes)) {
                let tag = tagsByPopularity.shift();
                if (tag) {
                    let node = nodes[tag.name];
                    delete nodes[tag.name];
                    node.style.display = 'none';
                } else {
                    break;
                }
            }
        }
    }

    /**
     * Perform search by inserting search terms into URL
     */
    performSearch() {
        let { route, settings } = this.props;
        let { keywords } = this.state;
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        let params = _.assign({ search: keywords }, settings.route);
        route.push(route.name, params);
    }

    /**
     * Called when user changes search string
     *
     * @param  {Event} evt
     */
    handleTextChange = (evt) => {
        let text = evt.target.value;
        let tags = findTags(text);
        this.setState({
            keywords: text,
            selectedHashTags: tags
        });
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(() => {
            this.performSearch();
        }, 800);
    }

    /**
     * Called when user press a key
     *
     * @param  {Evt} evt
     */
    handleKeyDown = (evt) => {
        if (evt.keyCode === 13) {
            this.performSearch();
        }
    }

    /**
     * Called when input field received focus
     *
     * @param  {Event} evt
     */
    handleFocus = (evt) => {
        let target = evt.target;
        target.selectionStart = 0;
        target.selectionEnd = target.value.length;
    }

    /**
     * Called when user clicks on a tag
     *
     * @param  {Event} evt
     */
    handleHashTagClick = (evt) => {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    /**
     * Called when user resizes the browser window
     *
     * @param  {Event} evt
     */
    handleWindowResize = (evt) => {
        this.hideUnpopularTags();
    }
}

function normalize(s) {
    s = _.replace(s, /\+/g, '');
    s = _.replace(s, /\s+/g, ' ')
    let words = _.split(s);
    return words.join(' ');
}

function findTags(s) {
    return _.map(TagScanner.findTags(s), _.toLower);
}

function isWrapping(nodes) {
    let top;
    return _.some(nodes, (node) => {
        if (top === undefined) {
            top = node.offsetTop;
        } else if (node.offsetTop > top) {
            return true;
        }
    });
}

function extractTags(dailyActivities, env) {
    if (!dailyActivities) {
        return [];
    }
    // score the tags based on how often they are used
    let scores = {}, frequency = {};
    _.each(dailyActivities.daily, (activities, date) => {
        _.each(activities, (count, key) => {
            // more recent usage count for more
            let multiplier;
            if (date === env.date) {
                multiplier = 4;
            } else if (date === env.getRelativeDate(-1, 'day')) {
                multiplier = 2;
            } else if (date >= env.getRelativeDate(-7, 'day')) {
                multiplier = 1;
            } else if (date >= env.getRelativeDate(-14, 'day')) {
                multiplier = 0.5;
            } else {
                multiplier = 0.25;
            }
            if (/^#/.test(key)) {
                let score = count * multiplier;
                scores[key] = (scores[key] || 0) + score;
                frequency[key] = (frequency[key] || 0) + count;
            }
        });
    });
    // compare tags that only differ in case
    let nameLists = {};
    let scoresLC = {};
    _.each(scores, (score, name) => {
        let nameLC = _.toLower(name);
        let names = nameLists[nameLC];
        if (!names) {
            names = nameLists[nameLC] = [];
        }
        names.push(name);
        scoresLC[nameLC] = (scoresLC[nameLC] || 0) + score;
    });
    let scoresMC = {};
    _.each(scoresLC, (score, nameLC) => {
        let names = nameLists[nameLC];
        if (names.length > 1) {
            // choice the more frequently used name
            names = _.orderBy(names, (name) => {
                return frequency[name];
            }, 'desc');
        }
        let name = names[0];
        scoresMC[name] = score;
    });

    let hashTags = _.transform(scoresMC, (list, score, name) => {
        list.push({ name, score });
    }, []);
    // sort in case-sensitive manner, as it's done in Gitlab
    return _.sortBy(hashTags, 'name');
}

export {
    SearchBar as default,
    SearchBar,
    SearchBarSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    SearchBar.propTypes = {
        settings: PropTypes.object.isRequired,
        database: PropTypes.instanceOf(Database),
        route: PropTypes.instanceOf(Route),
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    SearchBarSync.propTypes = {
        settings: PropTypes.object.isRequired,
        dailyActivities: PropTypes.object,
        route: PropTypes.instanceOf(Route),
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}
