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
            loadMarkdown(this.props.topic, this.props.locale.languageCode).then((contents) => {
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
            loadMarkdown(nextProps.topic, nextProps.locale.languageCode).then((contents) => {
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
 * @param  {String} topic
 * @param  {String} lang
 *
 * @return {Promise}
 */
function loadMarkdown(topic, lang) {
    return loadText(topic, lang).then((text) => {
        var contents = MarkGor.parse(text);
        return loadImages(contents);
    });
}

/**
 * Load instruction text
 *
 * @param  {String} topic
 * @param  {String} lang
 *
 * @return {Promise}
 */
function loadText(topic, lang) {
    return import(`instructions/${topic}.${lang}.md`).catch(() => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`Missing instructions for topic "${topic}" in language "${lang}"`);
        }
        return import(`instructions/${topic}.en.md`);
    });
}

/**
 * Load images used by img tags
 *
 * @param  {ReactElement} element
 *
 * @return {ReactElement}
 */
function loadImages(element) {
    if (typeof(element) === 'string') {
        return element;
    } else if (element instanceof Array) {
        return Promise.map(element, loadImages);
    } else if (element.type === 'img') {
        var url = element.props.src;
        if (url && !/^\w+:/.test(url)) {
            return import(`instructions/${url}`).then((url) => {
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
    } else if (element.props && !_.isEmpty(element.props.children)) {
        return Promise.map(element.props.children, loadImages).then((children) => {
            return React.cloneElement(element, {}, children);
        });
    } else {
        return element;
    }
}
