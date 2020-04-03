import { expect } from 'chai';

import LocaleManager from '../locale-manager.js';

describe('LocaleManager', function() {
  return;
  const directory = [
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
  const options = {
    defaultLocale: 'pl-PL',
    directory,
  };
  const manager = new LocaleManager(options);
  before(() => {
    return manager.start('en-US');
  })
  it('should default to Polish as English is not supported', async function() {
    expect(manager.localeCode).to.equal('pl-pl');
  })
  describe('#change()', function() {
    it('should be able to switch to Russian', async function() {
      await manager.change('ru-ua');
      expect(manager.localeCode).to.equal('ru-ua');
    })
    it('should be able to switch back to Polish', async function() {
      await manager.change('pl-pl');
      expect(manager.localeCode).to.equal('pl-pl');
    })
    it('should be able to switch country code only', async function() {
      await manager.change('pl-ua');
      expect(manager.localeCode).to.equal('pl-ua');
    })
    it('should trigger onChange', async function() {
      let triggered = false;
      manager.addEventListener('change', () => {
        triggered = true;
      });
      await manager.change('pl-pl');
      expect(triggered).to.be.true;
    })
  });
  describe('#translate()', function() {
    it('should produce the test phrase in Polish', async function() {
      expect(manager.translate('hello')).to.equal('cześć');
    })
    it('should produce test phrases with a numeric argument in Polish', async function() {
      await manager.change('pl-pl');
      expect(manager.translate('$num beers', 1)).to.equal('1 piwo');
      expect(manager.translate('$num beers', 21)).to.equal('21 piw');
      expect(manager.translate('$num beers', 24)).to.equal('24 piwa');
      expect(manager.translate('$num beers', 25)).to.equal('25 piw');
      expect(manager.translate('$num beers', 124)).to.equal('124 piw');
    })
    it('should correct detect that common Polish first names are feminine', async function() {
      await manager.change('pl-pl');
      const names = [ 'Ewa', 'Maria', 'Agnieszka' ];
      for (const name of names) {
        const phrase = manager.translate('$name drank too much and died', name);
        expect(phrase).to.equal(`${name} wypiła za dużo i umarła`);
      }
    })
    it('should realize that Kuba is a dude', async function() {
      await manager.change('pl-pl');
      const phrase = manager.translate('$name drank too much and died', 'Kuba');
      expect(phrase).to.equal(`Kuba wypił za dużo i umarł`);
    })
    it('should produce the test phrase in Russian', async function() {
      await manager.change('ru-ua');
      expect(manager.translate('hello')).to.equal('привет');
    })
    it('should produce test phrases with a numeric argument in Russian', async function() {
      await manager.change('ru-ua');
      expect(manager.translate('$num beers', 1)).to.equal('1 пиво');
      expect(manager.translate('$num beers', 4)).to.equal('4 пива');
      expect(manager.translate('$num beers', 25)).to.equal('25 пив');
    })
    it('should correct detect that common Russian first names are feminine', async function() {
      await manager.change('ru-ru');
      const names = [ 'Анна', 'Ольга', 'Светлана' ];
      for (let name of names) {
        const phrase = manager.translate('$name drank too much and died', name);
        expect(phrase).to.equal(`${name} выпила слишком много и умерла`);
      }
    })
    it('should correct detect that transliterated Russian names as feminine', async function() {
      await manager.change('ru-ru');
      const names = [ 'Anna', 'Olga', 'Svetlana' ];
      for (let name of names) {
        const phrase = manager.translate('$name drank too much and died', name);
        expect(phrase).to.equal(`${name} выпила слишком много и умерла`);
      }
    })
    it('should assume that Sasha is a dude', async function() {
      await manager.change('ru-ru');
      const phrase1 = manager.translate('$name drank too much and died', 'Sasha');
      const phrase2 = manager.translate('$name drank too much and died', 'Саша');
      expect(phrase1).to.equal(`Sasha выпил слишком много и умер`);
      expect(phrase2).to.equal(`Саша выпил слишком много и умер`);
    })
    it('should use patronymic to determine that a name is feminine', async function() {
      await manager.change('ru-ka');
      const name = 'Ani Ivanovna Sparsiashvili';
      const phrase = manager.translate('$name drank too much and died', name);
      expect(phrase).to.equal(`${name} выпила слишком много и умерла`);
    })
  });
  describe('#pick()', function() {
    it('should pick the Polish version when the language is set to Polish', async function() {
      const phrase = {
        en: 'I love the smell of napalm in the morning',
        pl: 'Kobieta mnie bije. Poddaję się!',
      };
      await manager.change('pl-pl');
      expect(manager.pick(phrase)).to.contain('Kobieta');
    })
    it('should pick the Polish version when the language is set to Russian', async function() {
      const phrase = {
        en: 'I love the smell of napalm in the morning',
        pl: 'Kobieta mnie bije. Poddaję się!',
      };
      await manager.change('ru-ua');
      expect(manager.pick(phrase)).to.contain('Kobieta');
    })
    it('should pick the English version when the language is set to Polish', async function() {
      const phrase = {
        en: 'I love the smell of napalm in the morning',
        ru: 'Доброе утро последний герой',
      };
      await manager.change('pl-pl');
      expect(manager.pick(phrase)).to.contain('napalm');
    })
  })
  describe('#genderize()', function() {
    it('should permit generation of grammatically correct sentence', async function() {
      await manager.change('pl-pl');
      const name = 'Cleo';
      const phrase1 = manager.translate('$name drank too much and died', name);
      manager.genderize(name, 'female');
      const phrase2 = manager.translate('$name drank too much and died', name);
      expect(phrase1).to.equal('Cleo wypił za dużo i umarł');
      expect(phrase2).to.equal('Cleo wypiła za dużo i umarła');
    })
  })
  after(() => {
    return manager.deactivate();
  })
})
