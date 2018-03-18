var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var MarkGor = require('mark-gor/react');

var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var CollapsibleContainer = require('widgets/collapsible-container');

require('./instruction-block.scss');

module.exports = React.createClass({
    displayName: 'InstructionBlock',
    mixins: [ UpdateCheck ],
    propTypes: {
        folder: PropTypes.string.isRequired,
        topic: PropTypes.string.isRequired,
        hidden: PropTypes.bool,

        locale: PropTypes.instanceOf(Locale).isRequired,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            hidden: false,
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            contents: null,
        };
    },

    /**
     * Load instruction text on mount
     */
    componentWillMount: function() {
        if (this.props.topic) {
            var folder = this.props.folder;
            var topic = this.props.topic;
            var lang = this.props.locale.languageCode;
            loadMarkdown(folder, topic, lang).then((contents) => {
                this.setState({ contents });
            });
        }
    },

    /**
     * Reload text if topic or language changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.topic !== nextProps.topic || this.props.locale !== nextProps.locale) {
            var folder = nextProps.folder;
            var topic = nextProps.topic;
            var lang = nextProps.locale.languageCode;
            loadMarkdown(folder, topic, lang).then((contents) => {
                this.setState({ contents });
            });
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement|null}
     */
    render: function() {
        if (!this.state.contents) {
            return null;
        }
        var classNames = [ 'instruction-block' ];
        if (this.props.hidden) {
            classNames.push('hidden')
        }
        return (
            <div className={classNames.join(' ')}>
                <CollapsibleContainer open={!this.props.hidden}>
                    <div className="contents">{this.state.contents}</div>
                </CollapsibleContainer>
            </div>
        );
    },
});

/**
 * Load and parse instruction text
 *
 * @param  {String} folder
 * @param  {String} topic
 * @param  {String} lang
 *
 * @return {Promise}
 */
function loadMarkdown(folder, topic, lang) {
    return loadText(folder, topic, lang).then((text) => {
        var contents = MarkGor.parse(text);
        return loadImages(contents, folder);
    });
}

/**
 * Load instruction text
 *
 * @param  {String} folder
 * @param  {String} topic
 * @param  {String} lang
 *
 * @return {Promise}
 */
function loadText(folder, topic, lang) {
    return import(`instructions/${folder}/${topic}.${lang}.md`).catch(() => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`Missing instructions for topic "${topic}" in language "${lang}"`);
        }
        return import(`instructions/${folder}/${topic}.en.md`);
    });
}

/**
 * Load images used by img tags
 *
 * @param  {ReactElement} element
 * @param  {String} folder
 *
 * @return {ReactElement}
 */
function loadImages(element, folder) {
    if (typeof(element) === 'string') {
        return element;
    } else if (element instanceof Array) {
        return Promise.map(element, (element) => {
            return loadImages(element, folder);
        });
    } else if (element.type === 'img') {
        var url = element.props.src;
        if (url && !/^\w+:/.test(url)) {
            return import(`instructions/${folder}/${url}`).then((url) => {
                return React.cloneElement(element, { src: url });
            }).catch((err) => {
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`Unable to find image: ${url}`);
                }
                return element;
            });
        } else {
            return element;
        }
    } else if (element.type === 'a') {
        var url = element.props.href;
        if (url && !/^\w+:/.test(url)) {
            return import(`instructions/${folder}/${url}`).then((url) => {
                var props = { href: url };
                if (/\.html$/.test(url)) {
                    props.target = '_blank';
                } else {
                    props.download = url;
                }
                return React.cloneElement(element, props);
            }).catch((err) => {
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`Unable to find link: ${url}`);
                }
                return element;
            });
        }
    } else if (element.props && !_.isEmpty(element.props.children)) {
        return Promise.map(element.props.children, (element) => {
            return loadImages(element, folder);
        }).then((children) => {
            return React.cloneElement(element, {}, children);
        });
    } else {
        return element;
    }
}
