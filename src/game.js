// CONSTANTS
SCREEN_WIDTH = 225;
SCREEN_HEIGHT = 152;
SCREEN_HALF_WIDTH = 112.5;
SCREEN_HALF_HEIGHT = 76;

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
avg = (a, b) => (a + b) / 2;

makeCanvas = (w, h, c) => (
	c = cEl("canvas"),
	c.width = w,
	c.height = h,
	c.getContext("2d"));

bStr = (g, c, w, x, y) => {
	g.strokeStyle = c;
	g.lineWidth = w;
	g.beginPath();
	g.moveTo(x, y);
};
line = (g, a, b, c, d) => {
	g.beginPath();
	g.moveTo(a, b);
	g.lineTo(c, d);
	g.stroke();
};

sa = new Uint8Array(s.length*7/8);
for (i = j = 0; i < s.length; ++i, ++j)
	h = s.charCodeAt(i) % 65533,
	r = i % 8,
	sa[j-1] |= h >> 7 - r,
	sa[j]    = h << r + 1,
	r == 7 && --j;

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
for (n in ent)
	e = ent[n],
	e.h = e.h || 7,
	e.s = e.s || n,
	e.d = e.d || ((e) =>
		drawSprite(g, e.i.s, ...hexToCan(...e.p, vp.x, vp.y))),
	e.de = e.de || ((e) => drawSelect(e)),
	e.dl = e.dl || ((e, x,y,f,c,d) => {
		if (e.p[0] != mH[0] || e.p[1] != mH[1]) {
			[x, y] = hexToCan(...e.p, vp.x, vp.y);
			y -= e.i.h;
			f = hexToCan(...mH, vp.x, vp.y);
			
			bStr(g, "red", 2, ...f);
			g.setLineDash([15, 5]);
			g.lineDashOffset = t / 50;
			
			g.quadraticCurveTo(avg(x, f[0]), avg(y, f[1]) - 100, x, y);
			g.stroke();
			
			g.setLineDash([]);
			
			if (cM.ep[mH])
				x = f[0] - 7,
				a = f[0] + 7,
				y = f[1] - 3,
				b = f[1] + 3,
				line(g, x, y, a, b),
				line(g, x, b, a, y);
		}
	});

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
sE = 0;
d = 0;
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
		ep: {},
		e: []
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
			r.d = r.i.d.bind(0, r),
			r.de = r.i.de.bind(0, r),
			r.dl = r.i.dl.bind(0, r),
			c.ep[y.p] = r,
			c.e.push(r);
	c.e.d = 1;
	return c;
};

compHexY = (a, b) => a[1] + a[0]/2 - b[1] - b[0]/2;
moveEnt = (m, e, x, y) => {
	delete m.ep[e.p];
	e.p = [x, y];
	m.ep[e.p] = e;
};

drawTiles = (t, x,y) => {
	for (y = t.length - 1; y >= 0; --y)
		for (x = t[y].length - 1; x > 0; --x)
			drawSprite(g, t[y][x].s, ...hexToCan(x + t[y][0] - 1, y,
				vp.x + TILE_HALF_WIDTH, vp.y + TILE_HALF_HEIGHT));
};
drawSelect = (s) =>
	drawSprite(g, "highlight", ...hexToCan(...s.p,
		vp.x + TILE_HALF_WIDTH, vp.y + TILE_HALF_HEIGHT));
drawEnt = (e, i) => {
	if(e.d)
		e.sort(compHexY),
		e.d = 0;
	sE && sE.de();
	for (i of e) i.d();
	sE && sE.dl();
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

cM = loadMap(maps.test);
clampVP(vp, cM.camb);

// VECTOR CONVERSIONS
scrToCan = (x, y, r) => (
	r = c.getBoundingClientRect(),
	[(x - r.x) / 4, (y - r.y) / 4]);
eToCan = (e) => scrToCan(e.pageX, e.pageY);
hexToCan = (x, y, ox, oy) => [TILE_SPREAD * x - ox |0, TILE_HEIGHT * (y + x/2) - oy |0];
canToHex = (x, y, ox, oy, t) => (t = (x + ox) / TILE_SPREAD, [t, (y + oy) / TILE_HEIGHT - t/2]);
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

render = (s) => {
	t = s;
	dt = t - oldT;
	drawMap(cM);
	oldT = t;
	requestAnimationFrame(render);
};
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
	
	drawSprite(g, "logo", SCREEN_HALF_WIDTH, SCREEN_HALF_HEIGHT, 2);
	
	setTimeout(() => {
		oldT = performance.now();
		requestAnimationFrame(render);
	}, 2e3);
});

/* Mouse state:
 * 0 - Up
 * 1 - View drag
 */
mSt = 0;

c.onmousedown = (e, t) => {
	if (mSt == MOUSE_NONE && e.button == 0) {
		if (t = cM.ep[roundHex(...eToHex(e, vp.x, vp.y))])
			sE = (sE == t) ? 0 : t;
		else
			mSt = MOUSE_VIEW_DRAG,
			drStMX = e.pageX,
			drStMY = e.pageY,
			drStCX = vp.x,
			drStCY = vp.y;
	}
	
	if (sE && e.button == 2 && !cM.ep[mH])
		moveEnt(cM, sE, ...mH),
		sE = 0,
		cM.e.d = 1;
};
onmousemove = (e, h) => {
	mP = [e.pageX, e.pageY];
	mH = roundHex(...eToHex(e, vp.x, vp.y));
	
	switch (mSt) {
	case MOUSE_VIEW_DRAG:
		vp.x = drStCX + (drStMX - e.pageX)/4 |0;
		vp.y = drStCY + (drStMY - e.pageY)/4 |0;
		clampVP(vp, cM.camb);
		break;
	}
	
	p.innerHTML = mH + "<br>" + mP;
};
onmouseup = (e) => {
	switch (mSt) {
	case MOUSE_VIEW_DRAG:
		if (e.button == 0) mSt = MOUSE_NONE;
		break;
	}
};
c.oncontextmenu = (e) => !1;