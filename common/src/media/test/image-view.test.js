var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react');
var Chai = require('chai'), expect = Chai.expect;
var Enzyme = require('enzyme');

var ImageView = require('media/image-view');

var imageWithOrientation = require('./images/jpeg-orientation-sample.jpg');

describe('ImageView', function() {
    it ('should extract orientation and dimension from blob', function() {
        return new Promise((resolve, reject) => {
            var blob = new Blob([ imageWithOrientation ], { type: 'image/jpeg' });
            var props = {
                file: blob,
                onLoad: () => {
                    resolve(wrapper);
                }
            };
            var wrapper = Enzyme.mount(<ImageView {...props} />);
        }).then((wrapper) => {
            var comp = wrapper.instance();
            expect(comp).to.have.property('width', 4);
            expect(comp).to.have.property('height', 16);
            expect(comp).to.have.property('orientation', 5);
        });
    })
})
