function createSVGPath(path, w, h) {
	let commands = [];
	for(let j = 0; j < path.length; j++) {
		let s = path[j];
    let x0 = Math.round(s[0].x * w);
    let y0 = Math.round(s[0].y * h);
		commands.push('M' + x0 + ',' + y0);
		for(let i = 1; i + 2 < s.length; i += 3) {
      let x1 = Math.round(s[i].x * w);
      let y1 = Math.round(s[i].y * h);
      let x2 = Math.round(s[i+1].x * w);
      let y2 = Math.round(s[i+1].y * h);
      let x3 = Math.round(s[i+2].x * w);
      let y3 = Math.round(s[i+2].y * h);
			commands.push('C' + x1 + ',' + y1 + ' ' + x2 + ',' + y2 + ' ' + x3 + ',' + y3);
		}
	}
	return commands.join(' ');
};

export {
	createSVGPath,
};
