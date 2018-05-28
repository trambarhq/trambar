if (process.env.PLATFORM === 'cordova') {
    var _ = require('lodash');

    if (/iPad|iPhone|iPod/.test(navigator.platform)) {
        document.addEventListener('resume', () => {
            var images = document.getElementsByTagName('IMG');
            _.each(images, (image) => {
                if (image.naturalWidth === 0 && image.src) {
                    image.src = image.src;
                }
            });
        });
    }
}
