var _ = require('lodash');
var Chai = require('chai'), expect = Chai.expect;

var SlugGenerator = require('utils/slug-generator');

describe('SlugGenerator', function() {
    describe('#fromTitle()'), function() {
        it('should convert string to lowercase and replace spaces with dashes', function() {
            var result = SlugGenerator.fromTitle('Hello World');
            expect(result).to.equal('hello-world');
        })
        it('should remove diacritics', function() {
            var result = SlugGenerator.fromTitle('Cześć! Jak się masz?');
            expect(result).to.equal('czesc-jak-sie-masz');
        })
        it('should return empty string when text is non-latin', function() {
            var result = SlugGenerator.fromTitle('Мёртвые души');
            expect(result).to.equal('');
        })
        it('should return first result from multilingual text', function() {
            var mlText = {
                ru: 'Мёртвые души',
                zh: '死魂靈',
                en: 'Dead Souls',
                pl: 'Martwe dusze',
            };
            var result = SlugGenerator.fromTitle(mlText);
            expect(result).to.equal('dead-souls');
        })
    })
    describe('#fromPersonalName()'), function() {
        it('should return one name when there\'s just one', function() {
            var result = SlugGenerator.fromPersonalName('Tadeusz');
            expect(result).to.equal('tadeusz');
        })
        it('should use last name and initial of first name', function() {
            var result = SlugGenerator.fromPersonalName('Tadeusz Kościuszko');
            expect(result).to.equal('tkosciuszko');
        })
        it('should include middle initial', function() {
            var result = SlugGenerator.fromPersonalName('Tadeusz Bonawentura Kościuszko');
            expect(result).to.equal('tbkosciuszko');
        })
        it('should use latin text when name is available in multiple script', function() {
            var mlText = {
                ru: 'Бэтмен',
                zh: '蝙蝠俠',
                jp: 'バットマン',
                en: 'Batman',
            };
            var result = SlugGenerator.fromPersonalName(mlText);
            expect(result).to.equal('batman');
        })
    });
})
