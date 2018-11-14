import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import AutosizeTextArea from 'widgets/autosize-text-area';

import './multilingual-text-field.scss';

/**
 * A text field that accepts text in multiple languages.
 *
 * @extends PureComponent
 */
class MultilingualTextField extends PureComponent {
    static displayName = 'MultilingualTextField';

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    constructor(props) {
        super(props);
        let { env, value, availableLanguageCodes } = props;
        let { languageCode } = env.locale;
        // choose initial language
        let existingLanguageCodes = _.keys(value);
        let selected;
        if (_.includes(existingLanguageCodes, languageCode)) {
            // if there's existing text of the current language, use it
            selected = languageCode;
        } else if (!_.isEmpty(existingLanguageCodes)) {
            // otherwise choose the first language of any existing text
            selected = existingLanguageCodes[0];
        } else if (_.includes(availableLanguageCodes, languageCode)) {
            // if there's no text, use the current language if it's in the list
            // of available languages
            selected = languageCode;
        } else if (!_.isEmpty(availableLanguageCodes)) {
            // otherwise use the first language on that list
            selected = availableLanguageCodes[0];
        } else {
            // if all else failed, use current language
            selected = languageCode;
        }
        this.state = {
            selectedLanguageCode: selected,
            hoverLanguageCode: null,
            expandedByMouseOver: false,
            expandedByTouch: false,
            arrowPosition: 0,
        };
    }

    /**
     * Return languages available
     *
     * @return {Array<String>}
     */
    getLanguages() {
        let { env, value, availableLanguageCodes } = this.props;
        let { languageCode, directory } = env.locale;
        let existingLanguageCodes = _.keys(value);
        let codes = _.union(availableLanguageCodes, existingLanguageCodes);
        if (codes.length === 0) {
            codes.push(languageCode);
        }
        // include only codes of support languages
        let hash = _.keyBy(directory, 'code');
        return _.filter(_.map(codes, (code) => {
            return hash[code];
        }));
    }

    /**
     * Check for locale changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { env, availableLanguageCodes } = this.props;
        if (nextProps.env.locale !== env.locale) {
            // switch to the language of the new locale if it's
            // one of the available languages
            let languageCode = nextProps.env.locale.languageCode;
            if (_.includes(availableLanguageCodes, languageCode)) {
                this.setState({ selectedLanguageCode: languageCode });
            }
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env, value, type, id, children, readOnly } = this.props;
        let { selectedLanguageCode, expandedByMouseOver, expandedByTouch } = this.state;
        let { t } = env.locale;
        let classNames = [ 'multilingual-text-field' ];
        let Input = 'input';
        let inputProps = _.omit(this.props, 'children', 'availableLanguageCodes', 'env');
        if (type === 'textarea') {
            Input = AutosizeTextArea;
            inputProps = _.omit(inputProps, 'type');
        }
        if (readOnly) {
            classNames.push('readonly');
            if (!(expandedByMouseOver || expandedByTouch)) {
                classNames.push('collapsed');
            }
            inputProps.placeholder = t('text-field-placeholder-none');
            inputProps.spellCheck = false;
        }
        let languages = this.getLanguages();
        if (languages.length > 1) {
            classNames.push('multiple-languages');
        }
        if (value instanceof Object) {
            inputProps.value = value[selectedLanguageCode] || '';
        } else if (typeof(value) === 'string') {
            inputProps.value = value;
        } else {
            inputProps.value = '';
        }
        inputProps.lang = selectedLanguageCode;
        inputProps.onChange = this.handleTextChange;
        return (
            <div className={classNames.join(' ')}>
                <label htmlFor={id}>{children}</label>
                <Input {...inputProps} />
                {this.renderTabs()}
            </div>
        );
    }

    /**
     * Render language tabs
     *
     * @return {ReactElement|null}
     */
    renderTabs() {
        let languages = this.getLanguages();
        if (languages.length <= 1) {
            return null;
        }
        return (
            <div className="tabs">
                {
                    _.map(languages, (language, i) => {
                        return this.renderTab(language, i);
                    })
                }
                {this.renderPopup()}
            </div>
        );
    }

    /**
     * Render language tab
     *
     * @return {ReactElement}
     */
    renderTab(language, i) {
        let { selectedLanguageCode } = this.state;
        let props = {
            className: 'tab',
            lang: language.code,
            onClick: this.handleLanguageClick,
            onMouseOver: this.handleLanguageMouseOver,
            onMouseOut: this.handleLanguageMouseOut,
        };
        if (language.code === selectedLanguageCode) {
            props.className += ' selected';
            props.onClick = props.onMouseOver = props.onMouseOut = null;
        }
        return (
            <div key={i} {...props}>
                {language.name}
            </div>
        );
    }

    /**
     * Render mouseover popup bubble
     *
     * @return {ReactElement|null}
     */
    renderPopup() {
        let { value, readOnly } = this.props;
        let { hoverLanguageCode, arrowPosition } = this.state;
        if (!hoverLanguageCode || readOnly) {
            return null;
        }
        let contents = value[hoverLanguageCode];
        if (!_.trim(contents)) {
            return null;
        }
        return (
            <div className="bubble">
                <div className="arrow" style={{ left: arrowPosition }} />
                <div className="box">
                    {contents}
                </div>
            </div>
        );
    }

    /**
     * Called when user edits the text
     *
     * @param  {Event} evt
     */
    handleTextChange = (evt) => {
        let { value, availableLanguageCodes, onChange } = this.props;
        let { selectedLanguageCode } = this.state;
        let text = evt.target.value;
        if (text) {
            if (value instanceof Object) {
                value = _.clone(value);
            } else if (typeof(value) === 'string') {
                // convert a string to a multi-lingual object
                value = _.transform(availableLanguageCodes, (text, code) => {
                    text[code] = value;
                }, {});
            } else {
                value = {};
            }
            value[selectedLanguageCode] = text;
        } else {
            if (value instanceof Object) {
                value = _.omit(value, selectedLanguageCode);
                if (!_.includes(availableLanguageCodes, selectedLanguageCode)) {
                    // choose a new language when text of a no-longer-available
                    // language is removed
                    let language = _.first(this.getLanguages());
                    if (language) {
                        this.setState({ selectedLanguageCode: language.code });
                    }
                }
            } else {
                value = {};
            }
        }
        this.value = value;
        if (onChange) {
            onChange({
                type: 'change',
                target: this,
            });
        }
    }

    /**
     * Called when user clicks on a language tab
     *
     * @param  {Event} evt
     */
    handleLanguageClick = (evt) => {
        let lang = evt.currentTarget.lang;
        this.setState({ selectedLanguageCode: lang, hoverLanguageCode: null });
    }

    /**
     * Called when user moves mouse cursor over a language tab
     *
     * @param  {Event} evt
     */
    handleLanguageMouseOver = (evt) => {
        let tab = evt.currentTarget;
        let tabs = tab.parentNode;
        let tabsRect = tabs.getBoundingClientRect();
        let tabRect = tab.getBoundingClientRect();
        let pos = tabRect.left + (tabRect.width / 2) - tabsRect.left;
        let lang = tab.lang;
        this.setState({ hoverLanguageCode: lang, arrowPosition: pos });
    }

    /**
     * Called when user moves mouse cursor out of a language tab
     *
     * @param  {Event} evt
     */
    handleLanguageMouseOut = (evt) => {
        let { hoverLanguageCode } = this.state;
        let tab = evt.currentTarget;
        let lang = tab.lang;
        if (lang === hoverLanguageCode) {
            this.setState({ hoverLanguageCode: null });
        }
    }
}

MultilingualTextField.defaultProps = {
    type: 'text',
    value: {},
    availableLanguageCodes: [],
};

export {
    MultilingualTextField as default,
    MultilingualTextField,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MultilingualTextField.propTypes = {
        type: PropTypes.string,
        value: PropTypes.oneOfType([ PropTypes.object, PropTypes.string ]),
        availableLanguageCodes: PropTypes.arrayOf(PropTypes.string),
        env: PropTypes.instanceOf(Environment).isRequired,
        onChange: PropTypes.func,
    };
}
