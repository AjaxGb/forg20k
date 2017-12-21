// CONSTANTS
SCREEN_WIDTH = 225;
SCREEN_HEIGHT = 152;

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
];

ent = {
	forgB: {}
};
for (let n in ent)
	ent[n].s = ent[n].s || n;

maps = {
	test: {
		w: 20, h: 30,
		d: 0,
		r: [
			{t:1,x:1,y:5,w:3,h:3}
		],
		e: {
			forgB: [
				{
					p: [9, 9]
				},
				{
					p: [8, 9]
				}
			]
		}
	}
};

getT = (m,x,y,r) => r = (m[y], r[x - r[0] + 1]);
setT = (m,x,y,t,r) => r = (m[y], r[x - r[0] + 1] = t);

strP = (x, y) => x + "," + y;

/*
 * Y
 * |   (Z)
 * |\  /
 * | \/
 * |  \
 * |   \
 * |    X
 */

vp = new DOMRect(-9e9, -9e9, SCREEN_WIDTH, SCREEN_HEIGHT);
loadMap = (m) => {
	let ay = (m.w - 1)/2 |0,
	c = {
		f: m,
		t: [],
		ay: ay,
		camb: new DOMRect(
			-TILE_HALF_WIDTH,
			-TILE_HALF_HEIGHT + ay * TILE_HEIGHT,
			m.w * TILE_SPREAD - TILE_CAP_WIDTH,
			m.h * TILE_HEIGHT),
		ep: {}, e: []
	}, x, y, r, z;
	for (y = 0; y < m.h + 2 * ay; ++y) {
		c.t[y] = [2 * max(ay - y, 0)];
		for (x = m.w - c.t[y][0]; x > 2 * max(y - 2 * ay - 2, 0); --x)
			c.t[y].push(tiles[m.d]);
	}
	// Place "rectangles" (might remove)
	for (r of m.r)
		for (y = 0; y < r.h; ++y)
			for (x = 0; x < r.w; ++x)
				z = c.t[r.y + y],
				z[r.x + x + z[0]] = tiles[r.t];
	// Place entities
	for (x in m.e)
		for (y of m.e[x])
			r = {
				i: ent[x],
				p: y.p
			},
			c.ep[strP(...y.p)] = r,
			c.e.push(r);
	return c;
};

sortEnt = (e) => e.sort(compHexY);

drawTiles = (t, x,y) => {
	for (y = t.length - 1; y >= 0; --y)
		for (x = t[y].length - 1; x > 0; --x)
			drawSprite(g, t[y][x].s, ...hexToCan(x + t[y][0] - 1, y,
				vp.x + TILE_HALF_WIDTH, vp.y + TILE_HALF_HEIGHT));
};
drawEnt = (e, i) => {
	sortEnt(e); // TODO! Move elsewhere
	for (i of e)
		drawSprite(g, i.i.s, ...hexToCan(...i.p, vp.x, vp.y));
};
drawMap = (m) => {
	clear();
	drawTiles(m.t);
	drawEnt(m.e);
};

clampVP = (v, b) => {
	v.x = clamp(v.x, b.x, b.width - v.width);
	v.y = clamp(v.y, b.y, b.height - v.height);
};

currMap = loadMap(maps.test);
clampVP(vp, currMap.camb);

// VECTOR CONVERSIONS
scrToCan = (x, y, r) => (
	r = c.getBoundingClientRect(),
	[(x - r.x) / 4, (y - r.y) / 4]);
eToCan = (e) => scrToCan(e.screenX, e.screenY);
compHexY = (a, b) => a[1] + a[0]/2 - b[1] - b[0]/2;
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

createImageBitmap(new Blob([sa],{type: png})).then(s=>{
	drawSprite = (g,n,x,y,c,b,o) => (
		b = sb[n].b,
		o = sb[n].o || [0,0],
		c = c || 1,
		g.drawImage(s, ...b,
			x - o[0] * c |0,
			y - o[1] * c |0,
			b[2] * c, b[3] * c),
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
		vp.x = drStCX + (drStMX - e.screenX)/4 |0;
		vp.y = drStCY + (drStMY - e.screenY)/4 |0;
		clampVP(vp, currMap.camb);
		drawMap(currMap);
		break;
	}
	
	// drawSprite(g, "highlight", ...offVec(rCan, -TILE_HALF_WIDTH, -TILE_HALF_HEIGHT));
	
	p.innerHTML = roundHex(...eToHex(e, vp.x, vp.y));
};
onmouseup = (e) => {
	mSt = MOUSE_NONE;
};