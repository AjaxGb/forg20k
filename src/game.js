png = "image/png";
doc = document;
cEl = doc.createElement.bind(doc);
makeCanvas = (w,h) => (
	c = cEl("canvas"),
	c.width = w,
	c.height = h,
	c.getContext("2d"));
scrToCan = (x, y, r) => (
	r = c.getBoundingClientRect(),
	[(x - r.x) / 4, (y - r.x) / 4]);

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
vX = vY = 0;

hexToPix = (x, y, ox, oy) => [24 * x - ox, 16 * (y + x/2) - oy];

drawMap = (m) => {
	let x, y;
	clear();
	for (y = m.t.length - 1; y >= 0; --y) {
		for (x = m.t[y].length - 1; x >= 0; --x) {
			drawSprite(g, m.t[y][x].b, ...hexToPix(x, y, vX, vY));
		}
	}
};

createImageBitmap(new Blob([sa],{type: png})).then(s=>{
	drawSprite = (g,n,x,y,c,b) => (
		b = sb[n],
		c = c || 1,
		g.drawImage(s, ...b, x|0, y|0, b[2]*c, b[3]*c),
		g);
	clear = () => g.clearRect(0, 0, 225, 153);
	
	// Draw favicon
	g = drawSprite(c.getContext('2d'), "small_logo");
	ic.href = c.toDataURL();
	c.width = 225;
	c.height = 153;
	g.imageSmoothingEnabled = 0;
	
	drawSprite(g, "logo", 0, 0, 2);
	
	drawMap(currMap)
});

/* Mouse state:
 * 0 - Up
 * 1 - View drag
 */
mSt = 0;
MOUSE_NONE = 0;
MOUSE_VIEW_DRAG = 1;

eToCan = (e) => scrToCan(e.screenX, e.screenY);
c.onmousedown = (e) => {
	if (mSt === MOUSE_NONE && e.button === 0) { // Start drag view
		mSt = MOUSE_VIEW_DRAG;
		drStMX = e.screenX;
		drStMY = e.screenY;
		drStCX = vX;
		drStCY = vY;
	}
};
onmousemove = (e) => {
	switch (mSt) {
	case MOUSE_VIEW_DRAG:
		vX = drStCX + (drStMX - e.screenX)/4 |0;
		vY = drStCY + (drStMY - e.screenY)/4 |0;
		drawMap(currMap);
		break;
	}
};
onmouseup = (e) => {
	mSt = MOUSE_NONE;
};