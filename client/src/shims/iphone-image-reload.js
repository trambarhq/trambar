if (process.env.PLATFORM === 'cordova') {
    if (/iPad|iPhone|iPod/.test(navigator.platform)) {
        document.addEventListener('resume', () => {
            var images = document.getElementsByTagName('IMG');
            for (var i = 0; i < images.length; i++) {
                var image = images[i];
                if (image.naturalWidth === 0 && !!image.src) {
                    image.src = image.src;
                }
            }
        });
    }
}
