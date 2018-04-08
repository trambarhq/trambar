var _ = require('lodash');
var Chai = require('chai'), expect = Chai.expect;

var PlainText = require('utils/plain-text');

describe('PlainText', function() {
    describe('#hasEmojiSupport()', function() {
        it ('should execute without throwing', function() {
            var result = PlainText.hasEmojiSupport();
            expect(result).to.be.a('boolean');
        })
    })
    describe('#parseEmoji', function() {
        it ('should return a list containing strings and ReactElement', function() {
            var text = 'Hello 😀😃😉😍😚 🤩😑😣😁😄😊😘☺ 🤔😶😥😂😅😋😗🙂 🤨🙄😮 🤣😆😎😙 🤗😐😏 🤐🍔🍕🍿🍳 🥖🥪🍖 🥟🍘 🥓🍞 🧀🌮🍗 🥠🍙🍚 🥡🥩🌯 🥗🥐🥚🌭 🥞🥨🥙🥫🍠🍱🍛🚛🛵🚄🚝💓💘 world';
            var result = PlainText.parseEmoji(text);
            var stringCount = _.size(_.filter(result, (t) => {
                if (typeof(t) === 'string') {
                    return true;
                }
            }));
            var elementCount = _.size(_.filter(result, (t) => {
                if (typeof(t) === 'object') {
                    return true;
                }
            }));
            expect(stringCount).to.be.above(0);
            expect(elementCount).to.be.above(0);
        })
    })
})
