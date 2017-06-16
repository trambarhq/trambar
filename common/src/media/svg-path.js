exports.create = function(path, w, h) {
	var commands = [];
	for(var j = 0; j < path.length; j++) {
		var s = path[j];
        var x0 = Math.round(s[0].x * w);
        var y0 = Math.round(s[0].y * h);
		commands.push('M' + x0 + ',' + y0);
		for(var i = 1; i + 2 < s.length; i += 3) {
            var x1 = Math.round(s[i].x * w);
            var y1 = Math.round(s[i].y * h);
            var x2 = Math.round(s[i+1].x * w);
            var y2 = Math.round(s[i+1].y * h);
            var x3 = Math.round(s[i+2].x * w);
            var y3 = Math.round(s[i+2].y * h);
			commands.push('C' + x1 + ',' + y1 + ' ' + x2 + ',' + y2 + ' ' + x3 + ',' + y3);
		}
	}
	return commands.join(' ');
};
