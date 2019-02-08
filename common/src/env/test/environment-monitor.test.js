import { expect } from 'chai';
import ManualPromise from 'utils/manual-promise';

import EnvironmentMonitor from 'env/environment-monitor';

describe('EnvironmentMonitor', function() {
    it ('should correct identify the browser and OS', function() {
        let browser = 'chrome';
        let os = getOS();
        let envMonitor = new EnvironmentMonitor;
        expect(envMonitor.browser).to.equal(browser);
        expect(envMonitor.os).to.equal(os);
    })
    it ('should indicate WebP is supported', function() {
        let envMonitor = new EnvironmentMonitor;
        expect(envMonitor.webpSupport).to.be.a('boolean');
    })
    it ('should have the screen size', function() {
        let envMonitor = new EnvironmentMonitor;
        expect(envMonitor.screenWidth).to.be.a('number').that.equals(screen.width);
        expect(envMonitor.screenHeight).to.be.a('number').that.equals(screen.height);
    })
    it ('should have the device pixel ratio', function() {
        let envMonitor = new EnvironmentMonitor;
        expect(envMonitor.devicePixelRatio).to.be.a('number').that.equals(window.devicePixelRatio);
    })
    it ('should emit change event when the window is resized', async function() {
        this.timeout(250);
        let changeEventPromise = ManualPromise();
        let envMonitor = new EnvironmentMonitor;
        envMonitor.activate();
        envMonitor.addEventListener('change', changeEventPromise.resolve);
        let event = document.createEvent('Event');
        event.initEvent('resize', true, false);
        window.dispatchEvent(event);
        return changeEventPromise;
    })
    it ('should emit change event when visibility state changes', async function() {
        this.timeout(250);
        let changeEventPromise = ManualPromise();
        let envMonitor = new EnvironmentMonitor;
        envMonitor.activate();
        envMonitor.addEventListener('change', changeEventPromise.resolve);
        let event = document.createEvent('Event');
        event.initEvent('visibilitychange', true, false);
        window.dispatchEvent(event);
        await changeEventPromise;
    })
    it ('should indicate a touch screen is the pointing device when a touch event occurs', async function() {
        this.timeout(250);
        let changeEventPromise = ManualPromise();
        let envMonitor = new EnvironmentMonitor;
        envMonitor.activate();
        envMonitor.addEventListener('change', changeEventPromise.resolve);
        expect(envMonitor.pointingDevice).to.equal('mouse');
        let event = document.createEvent('Event');
        event.initEvent('touchstart', true, false);
        window.dispatchEvent(event);
        await changeEventPromise;
        expect(envMonitor.pointingDevice).to.equal('touch');
    })
})

function getOS() {
    if (/win/i.test(navigator.platform)) {
        return 'windows';
    } else if (/linux/i.test(navigator.platform)) {
        return 'linux';
    } else if (/mac/i.test(navigator.platform)) {
        return 'osx';
    }
}
