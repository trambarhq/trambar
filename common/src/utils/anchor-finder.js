exports.scrollTo = scrollTo;

var interval;
var target;
var position;
var successCount;
var failureCount;

function scrollTo(name) {
    if (interval) {
        clearInterval(interval);
    }
    interval = null;
    target = name || null;
    position = undefined;
    successCount = 0;
    failureCount = 0;
    if (target) {
        checkTarget();
        interval = setInterval(checkTarget, 50);
    }
}

function checkTarget() {
    var node = document.getElementById(target);
    if (node) {
        var rect = node.getBoundingClientRect();
        if (rect.top !== position) {
            // scroll the element into view if position is different
            node.scrollIntoView();
            position = rect.top;
            successCount = 0;
            failureCount = 0;
        } else {
            // if the position is unchanged after a second, we're done
            successCount++;
            if (successCount >= 10) {
                clearInterval(interval);
                interval = null;
            }
        }
    } else {
        // quit trying if we can't find the element after five seconds
        failureCount++;
        if (failureCount >= 50) {
            clearInterval(interval);
            interval = null;
        }
    }
}
