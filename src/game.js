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
lerp = (a, b, t) => a + (b - a) * t;

H = (x, y) => new Hex(x, y);
class Hex {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	get z() {
		return -this.x - this.y
	}
	get [0]() {
		throw 1;
		return this.x
	}
	get [1]() {
		throw 2;
		return this.y
	}
	get [2]() {
		throw 3;
		return this.z;
	}
	map(f) {
		return H(f(this.x), f(this.y))
	}
	map2(f, b) {
		return H(f(this.x, b.x), f(this.y, b.y))
	}
	eq(b) {
		return this.x == b.x && this.y == b.y
	}
	addc(x, y) {
		return H(this.x + x, this.y + y)
	}
	add(b) {
		return this.addc(b.x, b.y)
	}
	sub(b) {
		return this.addc(-b.x, -b.y)
	}
	scalei(x, y) {
		return H(this.x * x, this.y * y)
	}
	scale(s) {
		return this.scalei(s, s)
	}
	gmag() {
		return (abs(this.x) + abs(this.y) + abs(this.z)) / 2
	}
	adj(d) {
		return Hex.dirs[d].add(this)
	}
	*aAdj() {
		yield* Hex.dirs.map(d => this.add(d))
	}
	*aRad(r, x,y) {
		for (x = -r; x <= r; ++x)
			for (y = max(-r, -x-r); y <= min(r, -x+r); ++y)
				yield this.addc(x, y)
	}
	*aRing(r, c,d,i) {
		c = this.add(Hex.dirs[4].scale(r));
		for (d = 0; d < 6; ++d)
			for (i = r; i--;)
				yield c, c = c.adj(d)
	}
	round() {
		let rx = round(this.x),
		    ry = round(this.y),
		    rz = round(this.z),
		    dx = abs(rx - this.x),
		    dy = abs(ry - this.y),
		    dz = abs(rz - this.z);
		return dx > dy && dx > dz
			? H(-ry-rz, ry)
			: dy > dz
				? H(rx, -rx-rz)
				: H(rx, ry)
	}
	static gdist(a, b) {
		return a.sub(b).gmag()
	}
	static lerp(a, b, t) {
		return H(lerp(a.x, b.x, t), lerp(a.y, b.y, t))
	}
	static *line(a, b, d,i) {
		d = Hex.gdist(a, b);
		i = d + 1;
		while (i--)
			yield Hex.lerp(b, a, i/d).round()
	}
	toString() {
		return this.x + "," + this.y
	}
}
Hex.dirs = [
	H( 1,-1), H( 1,0), H(0, 1),
	H(-1, 1), H(-1,0), H(0,-1)
];

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
	e.d = e.d || (e =>
		drawSprite(g, e.i.s, ...hexToCan(e.p, vp.x, vp.y))),
	e.de = e.de || (e => {
		drawSelect(e.p);
		for (let r of e.p.aRing(3)) {
			for (let i of Hex.line(e.p, r)) {
				if (i.eq(e.p)) continue;
				if (cM.ep[i]) break;
				drawSelect(i)
			}
		}
	}),
	e.dl = e.dl || ((e, x,y,f,c,d) => {
		if (!mH.eq(e.p)) {
			[x, y] = hexToCan(e.p, vp.x, vp.y);
			y -= e.i.h;
			f = hexToCan(mH, vp.x, vp.y);
			
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
				line(g, x, b, a, y)
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
loadMap = m => {
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
				p: H(...y.p)
			},
			r.d = r.i.d.bind(0, r),
			r.de = r.i.de.bind(0, r),
			r.dl = r.i.dl.bind(0, r),
			c.ep[y.p] = r,
			c.e.push(r);
	c.e.d = 1;
	return c;
};

compHexY = (a, b) => a.y + a.x/2 - b.y - b.x/2;
moveEnt = (m, e, {x, y}) => {
	delete m.ep[e.p];
	e.p = H(x, y);
	m.ep[e.p] = e;
};

drawTiles = (t, x,y) => {
	for (y = t.length - 1; y >= 0; --y)
		for (x = t[y].length - 1; x > 0; --x)
			drawSprite(g, t[y][x].s, ...hexToCan(H(x + t[y][0] - 1, y),
				vp.x + TILE_HALF_WIDTH, vp.y + TILE_HALF_HEIGHT));
};
drawSelect = p =>
	drawSprite(g, "highlight", ...hexToCan(p,
		vp.x + TILE_HALF_WIDTH, vp.y + TILE_HALF_HEIGHT));
drawEnt = (e, i) => {
	if(e.d)
		e.sort(compHexY),
		e.d = 0;
	sE && sE.de();
	for (i of e) i.d();
	sE && sE.dl();
};
drawMap = m => {
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
eToCan = e => scrToCan(e.pageX, e.pageY);
hexToCan = ({x, y}, ox, oy) => [TILE_SPREAD * x - ox |0, TILE_HEIGHT * (y + x/2) - oy |0];
canToHex = (x, y, ox, oy, t) => (t = (x + ox) / TILE_SPREAD, H(t, (y + oy) / TILE_HEIGHT - t/2));
eToHex = (e, ox, oy) => canToHex(...eToCan(e), ox, oy);

render = s => {
	t = s;
	dt = t - oldT;
	drawMap(cM);
	oldT = t;
	requestAnimationFrame(render);
};
createImageBitmap(new Blob([sa], {type: png})).then(s => {
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
		if (t = cM.ep[eToHex(e, vp.x, vp.y).round()])
			sE = (sE == t) ? 0 : t;
		else
			mSt = MOUSE_VIEW_DRAG,
			drStMX = e.pageX,
			drStMY = e.pageY,
			drStCX = vp.x,
			drStCY = vp.y;
	}
	
	if (sE && e.button == 2 && !cM.ep[mH])
		moveEnt(cM, sE, mH),
		sE = 0,
		cM.e.d = 1;
};
onmousemove = (e, h) => {
	mP = [e.pageX, e.pageY];
	mH = eToHex(e, vp.x, vp.y).round();
	
	switch (mSt) {
	case MOUSE_VIEW_DRAG:
		vp.x = drStCX + (drStMX - e.pageX)/4 |0;
		vp.y = drStCY + (drStMY - e.pageY)/4 |0;
		clampVP(vp, cM.camb);
		break;
	}
	
	p.innerHTML = mH + "<br>" + mP;
};
onmouseup = e => {
	switch (mSt) {
	case MOUSE_VIEW_DRAG:
		if (e.button == 0) mSt = MOUSE_NONE;
		break;
	}
};
c.oncontextmenu = e => !1;