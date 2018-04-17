// install Safari specific shim
var bodyStyle = getComputedStyle(document.body);
if (bodyStyle.WebkitOverflowScrolling !== undefined) {
    // need to disable momentum scrolling when textarea has focus
    // to prevent rendering glitch
    var isFromFormField = (evt) => {
        switch (evt.target.tagName) {
            case 'TEXTAREA':
            case 'INPUT':
            case 'BUTTON':
                return true;
            default:
                return false;
        }
    };
    window.addEventListener('focusin', (evt) => {
        if (isFromFormField(evt)) {
            document.body.style.WebkitOverflowScrolling = 'auto';
        }
    });
    window.addEventListener('focusout', (evt) => {
        if (isFromFormField(evt)) {
            document.body.style.WebkitOverflowScrolling = '';
        }
    });
}
