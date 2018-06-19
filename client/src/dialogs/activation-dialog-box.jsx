var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');
var TextField = require('widgets/text-field');

require('./activation-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'ActivationDialogBox',
    mixins: [ UpdateCheck ],
    propTypes: {
        show: PropTypes.bool,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onConfirm: PropTypes.func,
        onCancel: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            address: '',
            code: '',
            schema: '',
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.props.onCancel,
        };
        return (
            <Overlay {...overlayProps}>
                <div className="activation-dialog-box">
                    {this.renderForm()}
                    <div className="controls">
                        {this.renderButtons()}
                    </div>
                </div>
            </Overlay>
        );
    },

    /**
     * Render form
     *
     * @return {ReactElement}
     */
    renderForm: function() {
        return (
            <div className="container">
                {this.renderAddressInput()}
                {this.renderCodeInput()}
                {this.renderSchemaInput()}
            </div>
        );
    },

    /**
     * Render input for entering address
     *
     * @return {ReactElement}
     */
    renderAddressInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'address',
            type: 'url',
            value: this.state.address,
            locale: this.props.locale,
            onChange: this.handleAddressChange,
        };
        return <TextField {...props}>{t('activation-address')}</TextField>;
    },

    /**
     * Render input for activation code
     *
     * @return {ReactElement}
     */
    renderCodeInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'code',
            value: this.state.code,
            spellCheck: false,
            locale: this.props.locale,
            onChange: this.handleCodeChange,
        };
        return <TextField {...props}>{t('activation-code')}</TextField>;
    },

    /**
     * Render input for schema
     *
     * @return {ReactElement}
     */
    renderSchemaInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'schema',
            value: this.state.schema,
            spellCheck: false,
            locale: this.props.locale,
            onChange: this.handleSchemaChange,
        };
        return <TextField {...props}>{t('activation-schema')}</TextField>;
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var acceptable = true;
        if (!/^[0-9A-F]{16}$/i.test(_.replace(this.state.code, /\s/g, ''))) {
            acceptable = false;
        }
        if (!/https?:\/\/\w+/.test(this.state.address)) {
            acceptable = false;
        }
        if (!/\w+/.test(this.state.schema)) {
            acceptable = false;
        }
        var cancelProps = {
            label: t('activation-cancel'),
            emphasized: false,
            onClick: this.handleCancelClick,
        };
        var confirmProps = {
            label: t('activation-ok'),
            emphasized: true,
            disabled: !acceptable,
            onClick: this.handleOKClick,
        };
        return (
            <div className="buttons">
                <div className="right">
                    <PushButton {...cancelProps} />
                    <PushButton {...confirmProps} />
                </div>
            </div>
        );
    },

    /**
     * Called when user clicks the cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        if (this.props.onCancel) {
            this.props.onCancel({
                type: 'cancel',
                target: this,
            });
        }
    },

    /**
     * Called when user clicks the open button
     *
     * @param  {Event} evt
     */
    handleOKClick: function(evt) {
        if (this.props.onConfirm) {
            this.props.onConfirm({
                type: 'close',
                target: this,
                address: this.state.address,
                code: _.replace(this.state.code, /\s+/g, ''),
                schema: this.state.schema,
            });
        }
    },

    /**
     * Called when user changes the server address
     *
     * @param  {Event} evt
     */
    handleAddressChange: function(evt) {
        var address = evt.target.value;
        address = _.replace(address, /\s+/g, '');
        this.setState({ address });
    },

    /**
     * Called when user changes the activation code
     *
     * @param  {Event} evt
     */
    handleCodeChange: function(evt) {
        var code = evt.target.value;
        code = _.replace(_.toUpper(code), /[^0-9A-F ]/g, '');
        if (_.replace(code, /\s+/g, '').length <= 16) {
            this.setState({ code });
        }
    },

    /**
     * Called when user changes the schema
     *
     * @param  {Event} evt
     */
    handleSchemaChange: function(evt) {
        var schema = evt.target.value;
        schema = _.replace(schema, /[^\w\-]/g, '');
        this.setState({ schema });
    },
});
