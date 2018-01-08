TILE_HEIGHT = 16;
TILE_HALF_HEIGHT = 8;
TILE_SPREAD = 24;
TILE_CAP_WIDTH = 8;
TILE_CAP_WIDTH_P1 = 9;
TILE_WIDTH = 32;
TILE_HALF_WIDTH = 16;

for (n of Object.values(sb)) if (n.f)
	n.d = (n.d == null) ? 20 : n.d, 
	n.a = n.a || [...Array(n.f.length).keys()],
	n.f = n.f.map(p => [...p, ...n.s]);

png = "image/png";
doc = document;
cEl = doc.createElement.bind(doc);

[].__proto__.remove = function(i){
	i = this.indexOf(i);
	return i >= 0 && !!this.splice(i, 1)
};

for (n of "min,max,round,abs,random,sin".split(",")) window[n] = Math[n];
clamp = (x, a, b) => max(min(x, b), a);
avg = (a, b) => (a + b) / 2;
lerp = (a, b, t) => a + (b - a) * t;
rnd = (l, h) => random() * (h - l + 1) + l |0;
choice = a => a[random() * a.length |0];

H = (x, y) => new Hex(x, y);
class Hex {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	get z() {
		return -this.x - this.y
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
	*iAdj() {
		yield* Hex.dirs.map(d => this.add(d))
	}
	*iRad(r, x,y) {
		for (x = -r; x <= r; ++x)
			for (y = max(-r, -x-r); y <= min(r, -x+r); ++y)
				yield this.addc(x, y)
	}
	*iRing(r, c,d,i) {
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
mH = Hex.zero = H(0,0);

makeCanvas = (w, h, d, c) => (
	c = cEl("canvas"),
	c.width = w,
	c.height = h,
	d(c.getContext("2d"), c),
	c);
scaleCanvas = (c, s) => (
	c.style.width = c.width * s,
	c.style.height = c.height * s,
	c);
makeDGrad = (g, y, h) => (
	g = g.createLinearGradient(0, y, 0, y + h),
	g.addColorStop(0, "rgba(0,0,0,1)"),
	g.addColorStop(1, "rgba(0,0,0,0)"),
	g);

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
	n = s.charCodeAt(i) % 65533,
	r = i % 8,
	sa[j-1] |= n >> 7 - r,
	sa[j]    = n << r + 1,
	r == 7 && --j;

tiles = [
	{
		s: "grass",
		p: 1
	},
	{
		s: "dirt",
		p: 1
	},
	{
		s: "water",
		p: 1
	}
];

expTargs = (r, f, x) => e => {
	let i, t, a, b, s = {};
	for (i of e.p.iRing(r)) {
		for (i of Hex.line(e.p, i)) {
			if (i.eq(e.p) || !(t = getT(cM.t, i)) || !t.p)
				continue;
			[a, b, x] = f(e, i, cM.ep[i], Hex.gdist(e.p, i));
			if (a) s[i] = [i, x];
			if (b) break
		}
	}
	return s
};
moves = {
	jump: {
		n: "Hop",
		l: expTargs(5, (a, i, e, d) => [!e, e && e.i.T, max(1, d / 2)|0]),
		d: e => {
			let [x, y] = hexToCan(e.p),
			    [a, b] = hexToCan(mH);
			y -= e.i.t;
			bStr(g, "red", 2, a, b);
			
			if (canDoMov())
				g.setLineDash([15, 5]),
				g.lineDashOffset = t / 50,
				g.quadraticCurveTo(avg(x, a), avg(y, b) - 100, x, y),
				g.stroke(),
				g.setLineDash([]),
				g.beginPath(),
				drawDot(a, b),
				g.fillStyle = "red",
				g.fill();
			else if (!mH.eq(e.p))
				drawX(g, a, b, 7, 3)
		},
		r: (e, t) => moveEnt(e.map, e, t)
	},
	tongue: {
		n: "Tongue Shot",
		l: expTargs(3, (a, i, e, d) => [
			e && e.h && a.t != e.t, e, e && e.i.eat ? 1 : 2]),
		d: e => {
			let [x, y] = hexToCan(e.p),
				[a, b] = hexToCan(mH);
			bStr(g, "red", 2, a, b);
			
			if (canDoMov())
				g.lineTo(x, y),
				g.stroke(),
				g.beginPath(),
				drawDot(a, b),
				g.fillStyle = "red",
				g.fill();
			else if (!mH.eq(e.p))
				drawX(g, a, b, 7, 3)
		},
		r: (e, t) => (
			t = e.map.ep[t],
			e.i.dam(t, rnd(5, 8)) && t.i.eat && e.i.heal(e, t.i.eat(t))
		)
	},
	mosq: {
		n: "Make Buzz Bug",
		l: expTargs(1, (a, i, e) => [!e, 0, 3]),
		r: (e, t) => {
			addEnt(e.map, ent.mosq, t, e.t, {e:0});
			[x, y] = hexToWor(t);
			e.map.p.push(txtP(x, y - e.i.t, "hatch", "#fff", fnt));
		}
	},
	buzz: {
		n: "Buzz",
		l: expTargs(1, (a, i, e) => [!e, 0, 1]),
		r: (e, t) => moveEnt(e.map, e, t)
	}
};
for (n in moves)
	m = moves[n],
	m.s = m.s || n;

ent = {
	forgB: {
		n: "BASIC FORG",
		m: ["jump", "tongue"],
		h: 20,
		e: 3
	},
	mosq: {
		n: "BUZZ BUGG",
		m: ["buzz"],
		h: 5, eat: _ => rnd(5, 6),
		e: 3
	},
	bugegg: {
		n: "BUGG NEST",
		h: 15, eat: _ => rnd(2, 4),
		m: ["mosq"],
		e: 3,
		re: 1
	},
	tree: {
		n: "TREE",
		T: 1
	}
};
for (n in ent)
	e = ent[n],
	e.t = e.t || 7,
	e.s = e.s || n,
	e.re = e.re || e.e,
	e.d = e.d || ((e, x,y) => {
		[x, y] = hexToCan(e.p);
		if (e.e <= 0) g.globalAlpha = .8;
		drawSprite(g, e.i.s, x, y);
		if (e.e <= 0)
			g.globalAlpha = 1,
			//drawTxt(g, ...p, "ZZZ", "#822", fnt, 1, 1);
			drawSprite(g, "zzz", x, y - e.i.t - 3);
	}),
	e.de = e.de || ((e, x,y,h) => {
		if (sM)
			for (let p in sT)
				[x, y] = hexToCan(sT[p][0]),
				drawSelect(x, y);
		else
			drawSelect(...hexToCan(e.p));
	}),
	e.dam = e.dam || ((e, d, k,x,y) => (
		d = (k = d >= e.h) ? e.h : d,
		[x, y] = hexToWor(e.p),
		cM.p.push(txtP(x, y - e.i.t,
			k ? e.i.eat ? "~NOM~" : "DEAD" : "-"+d, "red",
			k ? fnt : snum)),
		e.h -= d,
		(e.h <= 0) ? (
			e.h = 0,
			e.k = 1,
			delEnt(cM, e),
			1
		) : 0
	)),
	e.heal = e.heal || ((e, d, k,x,y) => (
		d = min(e.mh - e.h, d),
		[x, y] = hexToWor(e.p),
		cM.p.push(txtP(x, y - e.i.t, "+"+d, "#073")),
		e.h += d
	));

// PARTICLES

txtP = (x, y, w, c, f=snum, e,i) => (
	e = t + 2e3,
	i = genTxt(w, c, f),
	x -= i.width / 2,
	{
		u: _ => (
			g.drawImage(i, x + sin(t/100) * 2 - vp.x |0, y - vp.y |0),
			y -= .01 * dt,
			t >= e
		)
	}
);

function*doAI(t, e,x,m,l,c) {
	for (e of t.e) if (e.m && e.m.length)
		for (x = 0; x < e.me && e.e > 0; ++x) {
			lookVP(...hexToWor(e.p));
			m = e.m.map(m => [m,
				Object.values(m.l(e)).filter(i => i[1] <= e.e)
			]).filter(i => i[1].length);
			if (!m.length) break;
			[m, l] = choice(m);
			[l, c] = choice(l);
			m.r(e, l);
			e.e -= c;
			yield;
		}
};

maps = {
	test: {
		w: 20, h: 30,
		d: 0,
		x: [
			{t: 1, p: [7,  8], r: 1},
			{t: 1, p: [11,12], r: 3},
			{t: 1, p: [12,22], r: 3},
			{t: 2, p: [15, 4], r: 5},
			{t: 2, p: [15, 8], r: 2},
			{t: 2, p: [ 2,27], r: 4},
			{t: 2, p: [ 6,22], r: 2},
			{t: 0, p: [ 7,22], r: 1}
		],
		t: [
			{
				e: {
					tree: [
						{p: [10,10]},
						{p: [ 8,11]},
						{p: [12,12]},
						{p: [ 3,17]},
						{p: [17,10]},
						{p: [ 7,21]},
						{p: [ 9,17]},
						{p: [14,17]},
						{p: [17,19]}
					]
				}
			},
			{
				n: "Player 1",
				p: 1,
				l: [96, 208],
				c: "#8fe",
				e: {
					forgB: [
						{p: [3,12]},
						{p: [4,10]},
						{p: [1,12]}
					]
				}
			},
			{
				n: "Player 2",
				p: 1,
				l: [384, 432],
				c: "#f9c",
				e: {
					forgB: [
						{p: [13,19]},
						{p: [15,17]},
						{p: [17,14]}
					]
				}
			},
			{
				n: "Buggs",
				ai: doAI,
				c: "#b94",
				e: {
					mosq: [
						{p: [13, 6]},
						{p: [ 5,25]},
						{p: [ 3,22]},
						{p: [11, 5]}
					],
					bugegg: [
						{p: [14, 6]},
						{p: [ 3,24]}
					]
				}
			}
		]
	}
};

loadMap = m => {
	let ay = (m.w - 1)/2 |0,
	c = {
		f: m,
		t: [],
		ay: ay,
		cb: {
			xn: -15 - TILE_HALF_WIDTH,
			yn: -15 - TILE_HALF_HEIGHT + ay * TILE_HEIGHT,
			xx:  15 + m.w * TILE_SPREAD - TILE_CAP_WIDTH_P1,
			yx:  15 + m.h * TILE_HEIGHT
		},
		ep: {},
		e: [],
		tm: [],
		pl: [],
		ct: 0,
		p: []
	}, x, y, z, i;
	for (y = 0; y < m.h + 2 * ay; ++y) {
		c.t[y] = [2 * max(ay - y, 0)];
		for (x = m.w - c.t[y][0]; x > 2 * max(y - 2 * ay - 2, 0); --x)
			c.t[y].push(tiles[m.d]);
	}
	// Place hexagons
	for (i of m.x)
		for (x of H(...i.p).iRad(i.r))
			setT(c.t, x, tiles[i.t]);
	// Add teams, place entities
	for (x of m.t) {
		c.tm.push(z = {
			n: x.n,
			l: x.l,
			c: x.c,
			p: x.p,
			ai: x.ai,
			e: []
		});
		c.pl.push(z);
		for (y in x.e)
			for (i of x.e[y])
				addEnt(c, ent[y], H(...i.p), z, i);
	}
	return c;
};

getT = (m, {x, y}, r) => (r = m[y], r && r[x - r[0] + 1]);
setT = (m, {x, y}, t, r,c) => (
	r = m[y],
	r && (
		c = x - r[0] + 1,
		c > 0 && r[c] && (
			r[c] = t)));

vp = new DOMRect(-9e9, -9e9, C.width, C.height);
sE = sM = sMB = 0;

canSelE = (e, m=cM) => e && m.tm[m.ct].p && e.t == m.tm[m.ct] && !e.k && e.e > 0;
selE = (e, m) => {
	sE = e;
	sM = 0;
	sT = {};
	I.innerHTML = M.innerHTML = "";
	e && I.append(
		scaleCanvas(genTxt(e.i.n), 4),
		scaleCanvas(genTxt(e.h+"/"+e.mh+" hp\n"+e.e+"/"+e.me+" mp"), 3));
	if (e && e.m) {
		for (m of e.m)
			M.append(makeMoveB(m));
		M.children[0].click()
	}
};
canDoMov = (t=mH) => sT[t] && sT[t][1] <= sE.e;
selMov = m => {
	sT = m.l(sE);
	sM = m;
};

compHexY = (a, b) => a.p.y + a.p.x/2 - b.p.y - b.p.x/2;
addEnt = (m, i, p, t, d={}) => (
	i = {
		i: i, p: p, map: m, t: t,
		h: d.h || i.h,
		mh: d.mh || i.h,
		e: d.e == null ? i.e : d.e,
		me: d.me || i.e,
		re: d.re || i.re
	},
	i.d = i.i.d.bind(0, i),
	i.de = i.i.de.bind(0, i),
	i.i.m && (i.m = i.i.m.map(i => moves[i])),
	m.ep[p] = i,
	m.e.push(i),
	m.e.d = 1,
	t.e.push(i),
	i
);
moveEnt = (m, e, p) => {
	delete m.ep[e.p];
	m.ep[e.p = p] = e;
	m.e.d = 1;
};
delEnt = (m, e) => {
	delete m.ep[e.p];
	m.e.remove(e);
	e.t.e.remove(e);
	if (e.t.e.length == 0) {
		alert(e.t.n+" is eliminated!");
		m.pl.remove(e.t);
		if (m.pl.length == 1)
			alert(m.pl.n+" wins!");
	}
};

clampVP = (v=vp, b=cM.cb) => {
	v.x = clamp(v.x, b.xn, b.xx - v.width);
	v.y = clamp(v.y, b.yn, b.yx - v.height);
};
lookVP = (x, y, v=vp, b=cM.cb) => {
	v.x = x - v.width / 2 |0;
	v.y = y - v.height / 2 |0;
	clampVP(v, b);
};

cM = loadMap(maps.test);
clampVP();

makeButton = (s, n, e, c) => (
	c = makeCanvas(16, 16, g => drawSprite(g, s)),
	c.onclick = e,
	c.className = "b",
	c.title = n,
	c);
makeMoveB = m => makeButton(m.s, m.n, e => {
	sMB.className = "b";
	selMov(m);
	(sMB = e.target).className = "b s";
});

// VECTOR CONVERSIONS
scrToCan = (x, y, r) => (
	r = C.getBoundingClientRect(),
	[(x - r.x) / 4, (y - r.y) / 4]);
eToCan = e => scrToCan(e.pageX, e.pageY);
hexToCan = ({x, y}, ox=vp.x, oy=vp.y) => [TILE_SPREAD * x - ox |0, TILE_HEIGHT * (y + x/2) - oy |0];
canToHex = (x, y, ox=vp.x, oy=vp.y, t) => (t = (x + ox) / TILE_SPREAD, H(t, (y + oy) / TILE_HEIGHT - t/2));
hexToWor = h => hexToCan(h, 0, 0);
worToHex = (x, y) => canToHex(x, y, 0, 0);
eToHex = (e, ox=vp.x, oy=vp.y) => canToHex(...eToCan(e), ox, oy);

drawTiles = (t, x,y) => {
	for (y = t.length - 1; y >= 0; --y)
		for (x = t[y].length - 1; x > 0; --x)
			drawSprite(g, t[y][x].s, ...hexToCan(H(x + t[y][0] - 1, y),
				vp.x + TILE_HALF_WIDTH, vp.y + TILE_HALF_HEIGHT));
};
drawSelect = (x, y) =>
	drawSprite(g, "highlight", x, y);
drawDot = (x, y) => {
	g.ellipse(x-.5, y-.5, 4, 2, 0, 0, 7);
};
drawX = (g, x, y, w, h) => {
	let a = x - w,
		b = x + w,
		c = y - h,
		d = y + h;
	line(g, a, c, b, d);
	line(g, b, c, a, d)
};
drawTxt = (g, x, y, t, c, f=fnt, cX, cY, s,i,w,h) => {
	t += "";
	if (cX || cY)
		[w, h] = msrTxt(t, f);
	if (cX) x -= w / 2;
	if (cY) y -= h / 2;
	x = x|0;
	y = y|0;
	if (c)
		return g.drawImage(genTxt(t, c, f), x, y);
	s = x;
	for (i of t)
		if (i == "\n")
			x = s,
			y += f.h;
		else
			g.drawImage(f[i.charCodeAt(0)] || f.u, x, y),
			x += f.w;
};
msrTxt = (t, f=fnt) => (
	t = (t + "").split("\n"),
	[t.reduce((a, s) => max(a, s.length), 0) * f.w, t.length * f.h]
);
genTxt = (t, c, f=fnt, b) => (
	t += "",
	b = msrTxt(t, f),
	makeCanvas(...b, g => {
		drawTxt(g, 0, 0, t, 0, f);
		if (c)
			g.fillStyle = c,
			g.globalCompositeOperation = "source-in",
			g.fillRect(0, 0, ...b)
	})
);
drawEnt = (e, i,x,y,s,h) => {
	if (e.d)
		e.sort(compHexY),
		e.d = 0;
	if (sE)
		sE.de();
	else if (canSelE(cM.ep[mH]))
		drawSelect(...hexToCan(mH));
	for (i of e) i.d();
	for (i of e) if (i.mh && !i.k)
		[x, y] = hexToCan(i.p),
		s = i == sE || mH.eq(i.p),
		h = s ? 3 : 1,
		g.fillStyle = "#000",
		g.fillRect(x - 13, y + 5, 25, h + 2),
		g.fillStyle = s ? "#b00" : "#e00",
		g.fillRect(x - 10, y + 6, 21, h),
		g.fillStyle = s ? "#080" : "#0d0",
		g.fillRect(x - 10, y + 6, (21 * i.h / i.mh)|0, h),
		g.fillStyle = i.t.c,
		g.fillRect(x - 12, y + 6, 1, h),
		s && drawTxt(g, x + 1, y + 5, i.h+"/"+i.mh, 0, snum, 1);
	for (i in sT)
		[x, h] = sT[i],
		[x, y] = hexToCan(x),
		drawTxt(g, x + 5, y + 2, h, h > sE.e ? "#c66" : 0, snum);
	sM && sM.d(sE);
};
doParticles = m => {
	m.p = m.p.filter(i => !i.u())
};
render = d => {
	t = d;
	dt = t - oldT;
	
	clear();
	drawTiles(cM.t);
	drawEnt(cM.e);
	doParticles(cM);
	
	drawTxt(g, 1, 0, mH);
	
	oldT = t;
	requestAnimationFrame(render);
};
getFrame = (a, s=0) => (t - s) / a.d % a.f.length |0;

createImageBitmap(new Blob([sa], {type: png})).then(s => {
	s = makeCanvas(s.width, s.height, (g, n) => {
		g.drawImage(s, 0, 0);
		g.globalCompositeOperation = "destination-out";
		for (n in ent)
			if (ent[n].t) continue;
			n = sb[ent[n].s].b,
			g.fillStyle = makeDGrad(g, n[1], n[3]),
			g.fillRect(...n);
	});
	drawSprite = (g, n, x, y, c, f=-1, b,o) => (
		b = sb[n].b || sb[n].f[f < 0 ? getFrame(sb[n], 0) : f],
		o = sb[n].o || [0,0],
		c = c || 1,
		g.drawImage(s, ...b,
			x - o[0] * c |0,
			y - o[1] * c |0,
			b[2] * c, b[3] * c),
		g);
	clear = _ => g.clearRect(0, 0, C.width, C.height);
	
	fnt = [];
	for (var i = 0, [x, y] = sb.font.b; i < 95; ++i)
		fnt[i + 32] = makeCanvas(5, 8, g =>
			g.drawImage(s, x + i%19*5, y + (i/19|0)*8, 5, 8, 0, 0, 5, 8)
		);
	fnt.w = 6;
	fnt.h = 9;
	fnt.u = fnt[63];
	
	snum = [];
	for (i = 0, [x, y] = sb.snum.b; i < 10; ++i)
		snum[i + 48] = makeCanvas(3, 5, g =>
			g.drawImage(s, x + i*3, y, 3, 5, 0, 0, 3, 5)
		);
	[43, 45, 47].forEach((c, i) => snum[c] = makeCanvas(3, 5,
		g => g.drawImage(s, x + 30 + i * 3, y, 3, 5, 0, 0, 3, 5)));
	snum.w = 4;
	snum.h = 5;
	snum.u = snum[48];
	
	(done = scaleCanvas(makeCanvas(51, 9, g => {
		g.fillStyle = "#0f2";
		g.fillRect(0, 0, 51, 9);
		drawTxt(g, 2, 1, "END TURN", "#ff0");
	}), 4)).onclick = e => cM.tm[cM.ct].p && nextTurn();
	done.style.marginTop = "8px";
	
	// Draw favicon
	g = drawSprite(C.getContext('2d'), "favicon");
	ic.href = C.toDataURL();
	
	onresize();
	g.imageSmoothingEnabled = 0;
	
	drawSprite(g, "logo", C.width / 2, C.height / 2, 2);
	
	setTimeout(_ => {
		oldT = performance.now();
		C.offsetWidth; // Trigger reflow
		nextTurn();
		C.style.background = "#000";
		requestAnimationFrame(render);
	}, %%STARTUP_DELAY%%);
});

nextTurn = (m=cM, i,t) => {
	selE(0);
	t = m.tm[m.ct];
	if (t.l) t.l = [vp.x + vp.width / 2 |0, vp.y + vp.height / 2 |0];
	i = m.ct;
	while(!(t = m.tm[i = ++i % m.tm.length]).p && !t.ai || t.e.length == 0);
	alert(
		(m.tm[m.ct].n ? "End "+m.tm[m.ct].n+" turn.\n\n" : "")
		+"Begin "+t.n+" turn.");
	D.innerHTML = "";
	D.append(scaleCanvas(genTxt(t.n, t.c), 4), cEl("br"), done);
	done.style.opacity = t.p ? 1 : .5;
	m.ct = i;
	for (i of t.e) i.e = min(i.me, i.e + i.re);
	t.l && lookVP(...t.l);
	if (t.ai)
		aiI = setInterval(
			a => a.next().done && (clearInterval(aiI), nextTurn()),
			700, t.ai(t));
};

MOUSE_NONE = 0;
MOUSE_VIEW_DRAG = 1;
MOUSE_SEL_ENT = 2;
mSt = 0;

C.onmousedown = e => {
	if (mSt == MOUSE_NONE && e.button == 0) {
		if (canSelE(cM.ep[mH]))
			mSt = MOUSE_SEL_ENT;
		else
			mSt = MOUSE_VIEW_DRAG;
		drStMX = e.pageX;
		drStMY = e.pageY;
		drStCX = vp.x;
		drStCY = vp.y;
	}
	
	if (sE && e.button == 2 && canDoMov())
		sM.r(sE, mH),
		sE.e -= sT[mH][1],
		selE(0);
};
onmousemove = e => {
	mH = eToHex(e).round();
	
	if (mSt)
		var dx = (drStMX - e.pageX)/4 |0,
		    dy = (drStMY - e.pageY)/4 |0;
	
	switch (mSt) {
	case MOUSE_SEL_ENT:
		if (dx || dy) mSt = MOUSE_VIEW_DRAG;
		// Fall thru
	case MOUSE_VIEW_DRAG:
		vp.x = drStCX + dx;
		vp.y = drStCY + dy;
		clampVP();
		break;
	}
};
onmouseup = (e, t) => {
	switch (mSt) {
	case MOUSE_SEL_ENT:
		if (e.button == 0)
			selE((sE == (t = cM.ep[mH])) ? 0 : t),
			mSt = MOUSE_NONE;
		break;
	case MOUSE_VIEW_DRAG:
		if (e.button == 0)
			mSt = MOUSE_NONE;
		break;
	}
};
C.oncontextmenu = e => !1;
onresize = e => {
	C.style.width = "100%";
	C.style.height = "calc(100% - 96px)";
	C.offsetWidth; // Trigger reflow
	let b = C.getBoundingClientRect();
	vp.width  = C.width  = b.width  / 4 |0;
	vp.height = C.height = b.height / 4 |0;
	C.style.width  = C.width  * 4;
	C.style.height = "";
	clampVP()
}
onwheel = e => {
	if (sE) {
		let d = e.deltaY,
		    t = sMB[(d < 0 ? "next" : "previous") + "Sibling"];
		if (!t) t = M[(d < 0 ? "first" : "last") + "Child"];
		t.click()
	}
}