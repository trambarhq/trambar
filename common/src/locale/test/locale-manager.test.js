import _ from 'lodash';
import Promise from 'bluebird';
import { expect } from 'chai';

import LocaleManager from 'locale/locale-manager';

describe('LocaleManager', function() {
    var directory = [
        {
            code: 'pl',
            defaultCountry: 'pl',
            module: () => import('./locales/pl'),
        },
        {
            code: 'ru',
            defaultCountry: 'ru',
            module: () => import('./locales/ru'),
        }
    ];
    var options = {
        defaultLocale: 'pl-PL',
        initialLocale: 'en-US',
        directory,
    };
    var manager = new LocaleManager(options);
    before(() => {
        return manager.initialize();
    })
    it('should default to Polish as English is not supported', function() {
        expect(manager.localeCode).to.equal('pl-pl');
        expect(manager.localeCode).to.equal('pl-pl');
        expect(manager.localeCode).to.equal('pl-pl');
    })
    describe('#change()', function() {
        it('should be able to switch to Russian', function() {
            return manager.change('ru-ua').then(() => {
                expect(manager.localeCode).to.equal('ru-ua');
            });
        })
        it('should be able to switch back to Polish', function() {
            return manager.change('pl-pl').then(() => {
                expect(manager.localeCode).to.equal('pl-pl');
            });
        })
        it('should be able to switch country code only', function() {
            return manager.change('pl-ua').then(() => {
                expect(manager.localeCode).to.equal('pl-ua');
            });
        })
        it('should trigger onChange', function() {
            let triggered = false;
            manager.addEventListener('change', () => {
                triggered = true;
            });
            return manager.change('pl-pl').then(() => {
                expect(triggered).to.be.true;
            });
        })
    });
    describe('#translate()', function() {
        it('should produce the test phrase in Polish', function() {
            expect(manager.translate('hello')).to.equal('cześć');
        })
        it('should produce test phrases with a numeric argument in Polish', function() {
            return manager.change('pl-pl').then(() => {
                expect(manager.translate('$num beers', 1)).to.equal('1 piwo');
                expect(manager.translate('$num beers', 21)).to.equal('21 piw');
                expect(manager.translate('$num beers', 24)).to.equal('24 piwa');
                expect(manager.translate('$num beers', 25)).to.equal('25 piw');
                expect(manager.translate('$num beers', 124)).to.equal('124 piw');
            });
        })
        it('should produce the test phrase in Russian', function() {
            return manager.change('ru-ua').then(() => {
                expect(manager.translate('hello')).to.equal('привет');
            });
        })
        it('should produce test phrases with a numeric argument in Russian', function() {
            return manager.change('ru-ua').then(() => {
                expect(manager.translate('$num beers', 1)).to.equal('1 пиво');
                expect(manager.translate('$num beers', 4)).to.equal('4 пива');
                expect(manager.translate('$num beers', 25)).to.equal('25 пив');
            });
        })
    });
    describe('#pick()', function() {
        it('should pick the Polish version when the language is set to Polish', function() {
            var phrase = {
                en: 'I love the smell of napalm in the morning',
                pl: 'Kobieta mnie bije. Poddaję się!',
            };
            return manager.change('pl-pl').then(() => {
                expect(manager.pick(phrase)).to.contain('Kobieta');
            });
        })
        it('should pick the Polish version when the language is set to Russian', function() {
            var phrase = {
                en: 'I love the smell of napalm in the morning',
                pl: 'Kobieta mnie bije. Poddaję się!',
            };
            return manager.change('ru-ua').then(() => {
                expect(manager.pick(phrase)).to.contain('Kobieta');
            });
        })
        it('should pick the English version when the language is set to Polish', function() {
            var phrase = {
                en: 'I love the smell of napalm in the morning',
                ru: 'Доброе утро последний герой',
            };
            return manager.change('pl-pl').then(() => {
                expect(manager.pick(phrase)).to.contain('napalm');
            });
        })
    })
    describe('#genderize()', function() {
        it('should permit generation of grammatically correct sentence', function() {
            return manager.change('pl-pl').then(() => {
                let name = 'Cleo';
                let phrase1 = manager.translate('$name drank too much and died', name);
                manager.genderize(name, 'female');
                let phrase2 = manager.translate('$name drank too much and died', name);
                expect(phrase1).to.equal('Cleo wypił za dużo i umarł');
                expect(phrase2).to.equal('Cleo wypiła za dużo i umarła');
            });
        })
    })
    after(() => {
        return manager.shutdown();
    })
})
