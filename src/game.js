png = "image/png";
doc = document;
cEl = doc.createElement.bind(doc);
makeCanvas = (w,h) => (
	c = cEl("canvas"),
	c.width = w,
	c.height = h,
	c.getContext("2d"));

sa = new Uint8Array(s.length*7/8);
for (i = j = 0; i < s.length; ++i, ++j) {
	let c = s.charCodeAt(i) % 65533, r = i % 8;
	sa[j-1] |= c >> 7 - r;
	sa[j]    = c << r + 1;
	r == 7 && --j;
}

tiles = [
	{
		b: "32_grass",
		s: "16_grass"
	},
	{
		b: "32_dirt",
		s: "16_dirt"
	}
]
maps = {
	test: {
		w: 20, h: 30,
		d: 0,
		r: [
			{t:1,x:1,y:5,w:3,h:3}
		]
	}
};

getT = (m,x,y,r) => r = (m[y], r[x - r[0] + 1]);
setT = (m,x,y,t,r) => r = (m[y], r[x - r[0] + 1] = t);

/*
 * Y
 * |   (Z)
 * |\  /
 * | \/
 * |  \
 * |   \
 * |    X
 */

loadMap = (m) => {
	currMap = {t:[]};
	let x, y, r;
	for (y = 0; y < m.h; ++y) {
		currMap.t[y] = [];
		for (x = 0; x < m.w; ++x) {
			currMap.t[y].push(tiles[m.d]);
		}
	}
	for (r of m.r) {
		for (y = 0; y < r.h; ++y) {
			for (x = 0; x < r.w; ++x) {
				currMap.t[r.y + y][r.x + x] = tiles[r.t];
			}
		}
	}
};
loadMap(maps.test);

hexToOff = (x, y) => [x, -x-y+(x-(x&1))/2];
hexToPix = (x, y) => [24 * x, 16 * (y + x/2)];

drawMap = (m) => {
	let x, y, c, r;
	for (y = m.t.length - 1; y >= 0; --y) {
		for (x = m.t[y].length - 1; x >= 0; --x) {
			[c, r] = hexToOff(x,y);
			drawSprite(g, m.t[y][x].b, ...hexToPix(x, y));
		}
	}
};

createImageBitmap(new Blob([sa],{type: png})).then(s=>{
	drawSprite = (g,n,x,y,c,b) => (
		b = sb[n],
		c = c || 1,
		g.drawImage(s, ...b, x|0, y|0, b[2]*c, b[3]*c),
		g);
	
	// Draw favicon
	g = drawSprite(c.getContext('2d'), "small_logo");
	ic.href = c.toDataURL();
	c.width = 225;
	c.height = 153;
	g.imageSmoothingEnabled = 0;
	
	drawSprite(g, "logo", 0, 0, 2);
	
	// for (let y = 0; y < 20; y++) {
	// 	for (let x = 0; x < 10; x++) {
	// 		drawSprite(g, "32_grass", x*48 + (y%2 ? 0 : 24), y*8);
	// 	}
	// }
	drawMap(currMap)
});
