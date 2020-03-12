import { expect } from 'chai';

import {
  translateClass4To5
} from '../fa-compatibility.js';

describe('FontAwesome', function() {
  describe('#translateClass4To5()', function() {
    it('should provide brand icon with correct prefix', function() {
      const className = 'fa-github';
      const result = translateClass4To5(className);
      expect(result).to.equal('fab fa-github');
    })
    it('should new name of icon', function() {
      const className = 'fa-folder-open-o';
      const result = translateClass4To5(className);
      expect(result).to.equal('far fa-folder-open');
    })
  })
})
