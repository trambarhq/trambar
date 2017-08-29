var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');

// widgets
var AutosizeTextArea = require('widgets/autosize-text-area');

require('./multilingual-text-field.scss');

module.exports = React.createClass({
    displayName: 'MultilingualTextField',
    propTypes: {
        type: PropTypes.string,
        value: PropTypes.object,
        availableLanguageCodes: PropTypes.arrayOf(PropTypes.string),

        locale: PropTypes.instanceOf(Locale),

        onChange: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            type: 'text',
            value: {},
            availableLanguageCodes: [],
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        // choose initial language
        var existing = _.keys(this.props.value);
        var available = this.props.availableLanguageCodes;
        var current = this.props.locale.lang;
        var selected;
        if (_.includes(existing, current)) {
            // if there's existing text of the current language, use it
            selected = current;
        } else if (!_.isEmpty(existing)) {
            // otherwise choose the first language of any existing text
            selected = existing[0];
        } else if (_.includes(available, current)) {
            // if there's no text, use the current language if it's in the list
            // of available languages
            selected = current;
        } else if (!_.isEmpty(available)) {
            // otherwise use the first language on that list
            selected = available[0];
        } else {
            // if all else failed, use current language
            selected = current;
        }
        return {
            selectedLanguageCode: selected,
            hoverLanguageCode: null,
            expandedByMouseOver: false,
            expandedByTouch: false,
            arrowPosition: 0,
        };
    },

    /**
     * Return languages available
     *
     * @return {Array<String>}
     */
    getLanguages: function() {
        var existing = _.keys(this.props.value);
        var available = this.props.availableLanguageCodes;
        var codes = _.union(available, existing);
        if (codes.length === 0) {
            codes.push(this.props.locale.lang);
        }
        var hash = _.keyBy(this.props.locale.directory, 'code');
        return _.filter(_.map(codes, (code) => {
            return hash[code];
        }));
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var classNames = [ 'multilingual-text-field' ];
        if (this.props.readOnly) {
            classNames.push('readonly');
            if (!(this.state.expandedByMouseOver || this.state.expandedByTouch)) {
                classNames.push('collapsed');
            }
        }
        var languages = this.getLanguages();
        if (languages.length > 1) {
            classNames.push('multiple-languages');
        }
        var Input = 'input';
        var inputProps = _.omit(this.props, 'children', 'availableLanguageCodes', 'locale');
        if (this.props.type === 'textarea') {
            Input = AutosizeTextArea;
            inputProps = _.omit(inputProps, 'type');
        }
        inputProps.value = this.props.value[this.state.selectedLanguageCode] || '';
        inputProps.lang = this.state.selectedLangaugeCode;
        inputProps.onChange = this.handleTextChange;
        return (
            <div className={classNames.join(' ')}>
                <label htmlFor={this.props.id}>{this.props.children}</label>
                <Input {...inputProps} />
                {this.renderTabs()}
            </div>
        );
    },

    /**
     * Render language tabs
     *
     * @return {ReactElement|null}
     */
    renderTabs: function() {
        var languages = this.getLanguages();
        if (languages.length <= 1) {
            return null;
        }
        return (
            <div className="tabs">
                {_.map(languages, this.renderTab)}
                {this.renderPopup()}
            </div>
        );
    },

    /**
     * Render language tab
     *
     * @return {ReactElement}
     */
    renderTab: function(language, i) {
        var props = {
            key: i,
            className: 'tab',
            lang: language.code,
            onClick: this.handleLanguageClick,
            onMouseOver: this.handleLanguageMouseOver,
            onMouseOut: this.handleLanguageMouseOut,
        };
        if (language.code === this.state.selectedLanguageCode) {
            props.className += ' selected';
            props.onClick = props.onMouseOver = props.onMouseOut = null;
        }
        return (
            <div {...props}>
                {language.name}
            </div>
        );
    },

    /**
     * Render mouseover popup bubble
     *
     * @return {ReactElement|null}
     */
    renderPopup: function() {
        if (!this.state.hoverLanguageCode || this.props.readOnly) {
            return null;
        }
        var contents = this.props.value[this.state.hoverLanguageCode];
        if (!_.trim(contents)) {
            return null;
        }
        return (
            <div className="bubble">
                <div className="arrow" style={{ left: this.state.arrowPosition }} />
                <div className="box">
                    {contents}
                </div>
            </div>
        );
    },

    /**
     * Called when user edits the text
     *
     * @param  {Event} evt
     */
    handleTextChange: function(evt) {
        var text = evt.target.value;
        if (text) {
            this.value = _.clone(this.props.value);
            this.value[this.state.selectedLanguageCode] = text;
        } else {
            this.value = _.omit(this.props.value, this.state.selectedLanguageCode);
        }
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
            });
        }
    },

    /**
     * Called when user clicks on a language tab
     *
     * @param  {Event} evt
     */
    handleLanguageClick: function(evt) {
        var lang = evt.currentTarget.lang;
        this.setState({ selectedLanguageCode: lang, hoverLanguageCode: null });
    },

    /**
     * Called when user moves mouse cursor over a language tab
     *
     * @param  {Event} evt
     */
    handleLanguageMouseOver: function(evt) {
        var tab = evt.currentTarget;
        var tabs = tab.parentNode;
        var tabsRect = tabs.getBoundingClientRect();
        var tabRect = tab.getBoundingClientRect();
        var pos = tabRect.left + (tabRect.width / 2) - tabsRect.left;
        var lang = tab.lang;
        this.setState({ hoverLanguageCode: lang, arrowPosition: pos });
    },

    /**
     * Called when user moves mouse cursor out of a language tab
     *
     * @param  {Event} evt
     */
    handleLanguageMouseOut: function(evt) {
        var tab = evt.currentTarget;
        var lang = tab.lang;
        if (lang === this.state.hoverLanguageCode) {
            this.setState({ hoverLanguageCode: null });
        }
    },
});
