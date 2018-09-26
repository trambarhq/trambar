import _ from 'lodash';
import Promise from 'bluebird';
import React from 'react';
import { expect } from 'chai';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

Enzyme.configure({ adapter: new Adapter() });

import ComponentRefs from 'utils/component-refs';

describe('ComponentRefs', function() {
    it('should capture references of sub-components', function() {
        let components = ComponentRefs({
            dog: HTMLElement,
            cat: HTMLElement,
        });
        let setters = components.setters;
        let wrapper = Enzyme.mount(
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
