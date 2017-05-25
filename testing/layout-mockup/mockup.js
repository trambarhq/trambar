
function el(id) {
    return document.getElementById(id);
}

var open = false;

el('top-nav-bar').addEventListener('click', function(evt) {
    open = !open;
    if (open) {
        console.log('open');
        el('top-nav-dropdown').style.height = el('date-selector').offsetHeight + 'px';
    } else {
        console.log('close');
        el('top-nav-dropdown').style.height = 0;
    }
});
