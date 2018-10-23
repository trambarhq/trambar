if (typeof(cordova) === 'object') {
    if (/iPad|iPhone|iPod/.test(navigator.platform)) {
        document.addEventListener('resume', () => {
            let images = document.getElementsByTagName('IMG');
            for (let i = 0; i < images.length; i++) {
                let image = images[i];
                if (image.naturalWidth === 0 && !!image.src) {
                    image.src = image.src;
                }
            }
        });
    }
}
