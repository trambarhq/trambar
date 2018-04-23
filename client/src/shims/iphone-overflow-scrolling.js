// install iOS Safari specific CSS
if (/iPad|iPhone|iPod/.test(navigator.platform)) {
    require('./iphone-overflow-scrolling.scss');
}
