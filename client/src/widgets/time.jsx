var React = require('react'), PropTypes = React.PropTypes;
var Moment = require('moment');

var Locale = require('locale/locale');

module.exports = Time;

function Time(props) {
    var time = Moment(props.time);
    if (!time.isValid()) {
        return null;
    }
    var elapsed = lastRecordedTime - time;
    if (elapsed > 12 * 60 * 60 * 1000) {
        return <AbsoluteTime time={time} locale={props.locale} />
    } else {
        return <RelativeTime time={time} locale={props.locale} />
    }
}

Time.propTypes = {
    locale: PropTypes.instanceOf(Locale).isRequired,
    time: PropTypes.string,
};

function AbsoluteTime(props) {
    var time = props.time;
    var locale = props.locale;
    var text = time.clone().locale(locale.languageCode).format('ll');
    return <span className="time">{text}</span>
}

var RelativeTime = React.createClass({
    getInitialState: function() {
        return {
            text: this.getText()
        };
    },

    getText: function() {
        var time = this.props.time;
        var locale = this.props.locale;
        return time.clone().locale(locale.languageCode).fromNow();
    },

    update: function() {
        var text = this.getText();
        if (text !== this.state.text) {
            this.setState({ text });
        }
    },

    render: function() {
        return <span className="time">{this.state.text}</span>
    },

    componentDidMount: function() {
        relativeTimeComponents.push(this);
    },

    componentWillUnmount: function() {
        var index = relativeTimeComponents.indexOf(this);
        relativeTimeComponents.splice(index, 1);
    },
})

var lastRecordedTime = Moment();
var relativeTimeComponents = [];

function updateTime() {
    lastRecordedTime = Moment();
    _.each(relativeTimeComponents, (component) => {
        component.update();
    });
}

setInterval(updateTime, 30 * 1000);
