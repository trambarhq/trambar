var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');

module.exports = EmptyMessage;

require('./empty-message.scss');

function EmptyMessage(props) {
    var t = props.locale.translate;
    var phrase = props.phrase;
    if (!props.online) {
        phrase = 'empty-currently-offline';
    }
    return (
        <div className="empty-message">
            <div className="text">{t(phrase)}</div>
        </div>
    );
}

EmptyMessage.propTypes = {
    locale: PropTypes.instanceOf(Locale).isRequired,
    online: PropTypes.bool,
    phrase: PropTypes.string.isRequired,
};

EmptyMessage.defaultProps = {
    online: true
};
