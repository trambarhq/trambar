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
            text: null,
        };
    },

    /**
     * Load instruction text on mount
     */
    componentWillMount: function() {
        if (this.props.topic) {
            this.loadText(this.props.topic, this.props.locale.languageCode);
        }
    },

    /**
     * Reload text if topic or language changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.topic !== nextProps.topic || this.props.locale !== nextProps.locale) {
            this.loadText(nextProps.topic, nextProps.locale.languageCode);
        }
    },

    /**
     * Load instruction text
     *
     * @param  {String} topic
     * @param  {String} lang
     */
    loadText: function(topic, lang) {
        import(`instructions/${topic}.${lang}.md`).then((text) => {
            this.setState({ text });
        }).catch(() => {
            if (process.env.NODE_ENV !== 'production') {
                console.log(`Missing instructions for topic "${topic}" in language "${lang}"`);
            }
            return import(`instructions/${topic}.en.md`).then((text) => {
                this.setState({ text });
            });
        });
    },

    /**
     * Render component
     *
     * @return {ReactElement|null}
     */
    render: function() {
        if (!this.state.text) {
            return null;
        }
        var contents = MarkGor.parse(this.state.text);
        var classNames = [ 'instruction-block' ];
        if (this.props.hidden) {
            classNames.push('hidden')
        }
        return (
            <div className={classNames.join(' ')}>
                <CollapsibleContainer open={!this.props.hidden}>
                    <div className="contents">{contents}</div>
                </CollapsibleContainer>
            </div>
        );
    },
});
