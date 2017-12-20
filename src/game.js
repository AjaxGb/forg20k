// CONSTANTS
SCREEN_WIDTH = 225;
SCREEN_HEIGHT = 153;

MOUSE_NONE = 0;
MOUSE_VIEW_DRAG = 1;

TILE_HEIGHT = 16;
TILE_HALF_HEIGHT = 8;
TILE_HALF_HEIGHT_P1 = TILE_HALF_HEIGHT + 1;
TILE_SPREAD = 24;
TILE_CAP_WIDTH = 8;
TILE_WIDTH = 32;
TILE_HALF_WIDTH = 16;

SCREEN_WIDTH_PCAP = SCREEN_WIDTH + TILE_CAP_WIDTH;

png = "image/png";
doc = document;
cEl = doc.createElement.bind(doc);

for (n of ["min","max","round","abs"]) window[n] = Math[n];
clamp = (x, a, b) => min(max(x, a), b);

makeCanvas = (w, h, c) => (
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
		s: "grass"
	},
	{
		s: "dirt"
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
	currMap = {
		f: m,
		t: [],
		w: m.w * TILE_SPREAD - TILE_CAP_WIDTH,
		h: m.h * TILE_HEIGHT + (m.w - 2) * TILE_HALF_HEIGHT
	};
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
vp = new DOMRect(-TILE_HALF_WIDTH, -TILE_HALF_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT);

scrToCan = (x, y, r) => (
	r = c.getBoundingClientRect(),
	[(x - r.x) / 4, (y - r.y) / 4]);
eToCan = (e) => scrToCan(e.screenX, e.screenY);
hexToCan = (x, y, ox, oy) => [TILE_SPREAD * x - ox |0, TILE_HEIGHT * (y + x/2) - oy |0];
canToHex = (x, y, ox, oy, t) => (t = (x + ox) / TILE_SPREAD, [t, (y + oy) / TILE_HEIGHT - t/2 - 1]);
eToHex = (e, ox, oy) => canToHex(...eToCan(e), ox, oy);
offVec = (v, ox, oy) => [v[0] + ox, v[1] + oy];
roundHex = (x, y, z,rx,ry,rz,dx,dy,dz) => (
	z = -x-y,
	rx = round(x), ry = round(y), rz = round(z),
	dx = abs(rx-x), dy = abs(ry-y), dz = abs(rz-z),
	dx > dy && dx > dz
		? [-ry-rz, ry]
		: dy > dz
			? [rx, -rx-rz]
			: [rx, ry]
);

drawMap = (m) => {
	let x, y;
	clear();
	for (y = m.t.length - 1; y >= 0; --y)
		for (x = m.t[y].length - 1; x >= 0; --x)
			drawSprite(g, m.t[y][x].s, ...hexToCan(x, y,
				vp.x + TILE_HALF_WIDTH, vp.y + TILE_HALF_HEIGHT));
};

createImageBitmap(new Blob([sa],{type: png})).then(s=>{
	drawSprite = (g,n,x,y,c,b) => (
		b = sb[n],
		c = c || 1,
		g.drawImage(s, ...b, x|0, y|0, b[2]*c, b[3]*c),
		g);
	clear = () => g.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
	
	// Draw favicon
	g = drawSprite(c.getContext('2d'), "favicon");
	ic.href = c.toDataURL();
	
	c.width = SCREEN_WIDTH;
	c.height = SCREEN_HEIGHT;
	g.imageSmoothingEnabled = 0;
	g.font = "7px consolas";
	
	drawSprite(g, "logo", 0, 0, 2);
	
	drawMap(currMap)
});

/* Mouse state:
 * 0 - Up
 * 1 - View drag
 */
mSt = 0;

c.onmousedown = (e) => {
	if (mSt === MOUSE_NONE && e.button === 0) { // Start drag view
		mSt = MOUSE_VIEW_DRAG;
		drStMX = e.screenX;
		drStMY = e.screenY;
		drStCX = vp.x;
		drStCY = vp.y;
	}
};
onmousemove = (e) => {
	switch (mSt) {
	case MOUSE_VIEW_DRAG:
		vp.x = clamp(drStCX + (drStMX - e.screenX)/4 |0,
			-TILE_HALF_WIDTH, currMap.w - vp.width);
		vp.y = clamp(drStCY + (drStMY - e.screenY)/4 |0,
			-TILE_HALF_HEIGHT, currMap.h - vp.height);
		drawMap(currMap);
		break;
	}
	
	drawMap(currMap);
	
	let hex = eToHex(e, vp.x, vp.y);
	
	g.beginPath();
	g.moveTo(...hexToCan(...hex, vp.x, vp.y));
	
	let rHex = roundHex(...hex);
	let rCan = hexToCan(...rHex, vp.x, vp.y);
	g.lineTo(...rCan);
	g.stroke();
	
	drawSprite(g, "highlight", ...offVec(rCan, -TILE_HALF_WIDTH, -TILE_HALF_HEIGHT));
	
	p.innerHTML = hex + "->" + rHex;
};
onmouseup = (e) => {
	mSt = MOUSE_NONE;
};