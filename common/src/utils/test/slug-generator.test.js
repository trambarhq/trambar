import { expect } from 'chai';

import {
  fromTitle,
  fromPersonalName,
} from '../slug-generator.js';

describe('SlugGenerator', function() {
  describe('#fromTitle()', function() {
    it('should convert string to lowercase and replace spaces with dashes', function() {
      const result = fromTitle('Hello World');
      expect(result).to.equal('hello-world');
    })
    it('should remove diacritics', function() {
      const result = fromTitle('Cześć! Jak się masz?');
      expect(result).to.equal('czesc-jak-sie-masz');
    })
    it('should return empty string when text is non-latin', function() {
      const result = fromTitle('Мёртвые души');
      expect(result).to.equal('');
    })
    it('should return first result from multilingual text', function() {
      const mlText = {
        ru: 'Мёртвые души',
        zh: '死魂靈',
        en: 'Dead Souls',
        pl: 'Martwe dusze',
      };
      const result = fromTitle(mlText);
      expect(result).to.equal('dead-souls');
    })
  })
  describe('#fromPersonalName()', function() {
    it('should return one name when there\'s just one', function() {
      const result = fromPersonalName('Tadeusz');
      expect(result).to.equal('tadeusz');
    })
    it('should use last name and initial of first name', function() {
      const result = fromPersonalName('Tadeusz Kościuszko');
      expect(result).to.equal('tkosciuszko');
    })
    it('should include middle initial', function() {
      const result = fromPersonalName('Tadeusz Bonawentura Kościuszko');
      expect(result).to.equal('tbkosciuszko');
    })
    it('should use latin text when name is available in multiple script', function() {
      const mlText = {
        ru: 'Бэтмен',
        zh: '蝙蝠俠',
        jp: 'バットマン',
        en: 'Batman',
      };
      const result = fromPersonalName(mlText);
      expect(result).to.equal('batman');
    })
  });
})
