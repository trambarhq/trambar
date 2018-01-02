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

    getDefaultProps: function() {
        return {
            hidden: false,
        };
    },

    getText: function(topic, lang) {
        try {
            return require(`instructions/${topic}.${lang}.md`);
        } catch(err) {
            return require(`instructions/${topic}.en.md`);
        }
    },

    render: function() {
        var markdown = this.getText(this.props.topic, this.props.locale.languageCode);
        var contents = MarkGor.parse(markdown);
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
