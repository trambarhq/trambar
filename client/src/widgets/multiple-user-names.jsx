var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');
var Scrollable = require('widgets/scrollable');
var ProfileImage = require('widgets/profile-image');

require('./multiple-user-names.scss');

module.exports = React.createClass({
    displayName: 'MultipleUserNames',
    propTypes: {
        label: PropTypes.string,
        title: PropTypes.string,
        users: PropTypes.arrayOf(PropTypes.object).isRequired,
        popupLimit: PropTypes.number,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getDefaultProps: function() {
        return {
            popupLimit: 8
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            showingPopUp: false,
            showingDialogBox: false,
            renderingDialogBox: false,
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var className = 'multiple-user-names';
        if (this.props.className) {
            className += ` ${this.props.className}`;
        }
        var containerProps = {
            className: className,
            onMouseEnter: this.handleMouseEnter,
            onMouseLeave: this.handleMouseLeave,
        };
        var labelProps = {
            className: 'label',
            onClick: this.handleClick,
        };
        return (
            <span {...containerProps}>
                <span {...labelProps}>{this.props.label}</span>
                {this.renderPopUp()}
                {this.renderDialogBox()}
            </span>
        )
    },

    /**
     * Render mouse rollover popup
     *
     * @return {ReactElement|null}
     */
    renderPopUp: function() {
        if (!this.state.showingPopUp) {
            return null;
        }
        return (
            <div className="popup-container">
                <div className="popup">
                    {this.renderUserList(this.props.popupLimit)}
                </div>
            </div>
        );
    },

    /**
     * Render overlay that appears when user clicks on the label
     *
     * @return {ReactElement|null}
     */
    renderDialogBox: function() {
        if (!this.state.renderingDialogBox) {
            return null;
        }
        var overlayProps = {
            show: this.state.showingDialogBox,
            onBackgroundClick: this.handleDialogBoxClose,
        };
        var buttonProps = {
            label: 'OK',
            emphasized: true,
            onClick: this.handleDialogBoxClose,
        };
        return (
            <Overlay {...overlayProps}>
                <div className="multiple-user-names-dialog-box">
                    <Scrollable>
                        <div className="list">
                            {this.renderUserList()}
                        </div>
                    </Scrollable>
                    <div className="buttons">
                        <PushButton {...buttonProps} />
                    </div>
                </div>
            </Overlay>
        );
    },

    /**
     * Render user list
     *
     * @param  {Number} limit
     *
     * @return {Array<ReactElement>}
     */
    renderUserList: function(limit) {
        var p = this.props.locale.pick;
        var users = _.sortBy(this.props.users, (user) => {
            return p(user.details.name);
        });
        if (users.length > limit) {
            var t = this.props.locale.translate;
            var chunk = _.slice(users, limit);
            var elements = _.map(chunk, this.renderUser);
            elements.push(
                <div key={0} className="more">
                    {t('list-$count-more', users.length - chunk.length)}
                </div>
            );
            return elements;
        } else {
            return _.map(users, this.renderUser);
        }
    },

    /**
     * Render user profile image and name
     *
     * @param  {User} user
     * @param  {Number} index
     *
     * @return {ReactELement}
     */
    renderUser: function(user, index) {
        var userProps = {
            user,
            theme: this.props.theme,
            locale: this.props.locale,
        };
        return <User key={user.id} {...userProps} />;
    },

    /**
     * Called when mouse cursor enters the label
     *
     * @param  {Event} evt
     */
    handleMouseEnter: function(evt) {
        this.setState({ showingPopUp: true });
    },

    /**
     * Called when mouse cursor exits the label
     *
     * @param  {Event} evt
     */
    handleMouseLeave: function(evt) {
        this.setState({ showingPopUp: false });
    },

    /**
     * Called when user clicks on label
     *
     * @param  {Event} evt
     */
    handleClick: function(evt) {
        this.setState({
            showingPopUp: false,
            showingDialogBox: true,
            renderingDialogBox: true
        });
    },

    /**
     * Called when user clicks the OK button or outside the dialog box
     *
     * @param  {Event} evt
     */
    handleDialogBoxClose: function(evt) {
        this.setState({ showingDialogBox: false }, () => {
            setTimeout(() => {
                this.setState({ renderingDialogBox: false });
            }, 1000)
        });
    },
});

function User(props) {
    var classNames = [ 'user' ];
    var imageProps = {
        user: props.user,
        theme: props.theme,
        size: 'small',
    };
    var p = props.locale.pick;
    var name = p(props.user.details.name);
    return (
        <div className={classNames.join(' ')}>
            <ProfileImage {...imageProps} />
            <span className="name">{name}</span>
        </div>
    );
}
