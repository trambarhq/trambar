var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react');
var Chai = require('chai'), expect = Chai.expect;
var Enzyme = require('enzyme');

var ComponentRefs = require('utils/component-refs');

describe('ComponentRefs', function() {
    it('should capture references of sub-components', function() {
        var components = ComponentRefs({
            dog: HTMLElement,
            cat: HTMLElement,
        });
        var setters = components.setters;
        var wrapper = Enzyme.mount(
            <div>
                <span ref={setters.dog}>Dog</span>
                <span ref={setters.cat}>Cat</span>
            </div>
        );
        expect(components.dog).to.be.instanceOf(HTMLElement);
        expect(components.dog).to.have.property('innerHTML', 'Dog');
        expect(components.cat).to.be.instanceOf(HTMLElement);
        expect(components.cat).to.have.property('innerHTML', 'Cat');
    })
})
