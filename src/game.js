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

for (n of "min,max,round,abs,random,sin".split(",")) window[n] = Math[n];
clamp = (x, a, b) => max(min(x, b), a);
avg = (a, b) => (a + b) / 2;
lerp = (a, b, t) => a + (b - a) * t;
rnd = (l, h) => random() * (h - l + 1) + l |0;

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

expTargs = (r, f) => e => {
	let i, t, a, b, s = {};
	for (i of e.p.iRing(r)) {
		for (i of Hex.line(e.p, i)) {
			if (i.eq(e.p) || !(t = getT(cM.t, i)) || !t.p)
				continue;
			[a, b] = f(i, cM.ep[i]);
			if (a) s[i] = i;
			if (b) break
		}
	}
	return s
};
moves = {
	jump: {
		n: "Hop",
		l: expTargs(5, (i, e) => [!e, e && e.i.T]),
		d: e => {
			let [x, y] = hexToCan(e.p),
			    [a, b] = hexToCan(mH);
			y -= e.i.t;
			bStr(g, "red", 2, a, b);
			
			if (sT[mH])
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
		r: (e, t) => moveEnt(cM, e, t)
	},
	tongue: {
		n: "Tongue Shot",
		l: expTargs(3, (i, e) => [e && e.h, e]),
		d: e => {
			let [x, y] = hexToCan(e.p),
				[a, b] = hexToCan(mH);
			bStr(g, "red", 2, a, b);
			
			if (sT[mH])
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
			t = cM.ep[t],
			e.i.dam(t, rnd(5, 8)) && t.i.e && e.i.heal(e, rnd(...t.i.e))
		)
	},
	mosq: {
		n: "Make Buzz Bug",
		l: expTargs(1, (i, e) => [!e, 0]),
		r: (e, t) => {
			addEnt(e.m, ent.mosq, e.t, t);
			[x, y] = hexToWor(t);
			cM.p.push(txtP(x, y - e.i.t, "HATCH", "#fff"));
		}
	}
};
for (n in moves)
	m = moves[n],
	m.s = m.s || n;

ent = {
	forgB: {
		n: "BASIC FORG",
		m: ["jump", "tongue"],
		h: 20
	},
	mosq: {
		n: "BUZZ BUGG",
		h: 5, e: [5, 6]
	},
	mosqegg: {
		n: "BUZZ BUGG NEST",
		h: 15, e: [2, 4],
		m: ["mosq"]
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
	e.d = e.d || ((e, p) => {
		p = hexToCan(e.p);
		if (e.k) g.globalAlpha = 0.5;
		drawSprite(g, e.i.s, ...p);
		if (e.k)
			g.globalAlpha = 1,
			drawTxt(g, ...p, "DEAD", "#900", fnt, 1, 1);
	}),
	e.de = e.de || (e => {
		if (sM)
			for (let p in sT)
				drawSelect(sT[p]);
		else
			drawSelect(e.p);
	}),
	e.dam = e.dam || ((e, d, k,x,y) => (
		d = (k = d >= e.h) ? e.h : d,
		[x, y] = hexToWor(e.p),
		cM.p.push(txtP(x, y - e.i.t,
			k ? e.i.e ? "~NOM~" : "DEAD" : "-"+d, "red",
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

maps = {
	test: {
		w: 20, h: 30,
		d: 0,
		x: [
			{t: 1, p: [7, 8], r: 1},
			{t: 1, p: [11, 12], r: 3},
			{t: 2, p: [15, 4], r: 5}
		],
		t: [
			{
				e: {
					tree: [
						{p: [10,10]},
						{p: [ 8,11]},
						{p: [12,12]}
					]
				}
			},
			{
				n: "Player 1",
				p: 1,
				e: {
					forgB: [
						{p: [ 9, 9]},
						{p: [ 8, 9]}
					]
				}
			},
			{
				n: "Buggs",
				ai: 1,
				e: {
					mosq: [
						{p: [13, 6]}
					],
					mosqegg: [
						{p: [14, 6]}
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
			p: x.p,
			ai: x.ai,
			e: []
		});
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

vp = new DOMRect(-9e9, -9e9, c.width, c.height);
sE = sM = sMB = 0;

selE = (e, m) => {
	sE = e;
	sM = 0;
	sT = {};
	f.innerHTML = "";
	e && f.append(scaleCanvas(genTxt(e.i.n+"\n"+e.h+"/"+e.mh+" hp"), 4));
	if (e && e.m) {
		f.append(mov = cEl("p"))
		for (m of e.m)
			mov.append(makeMoveB(m));
		mov.children[0].click()
	}
	onresize();
};

compHexY = (a, b) => a.p.y + a.p.x/2 - b.p.y - b.p.x/2;
addEnt = (m, i, p, t, d) => (
	i = {
		i: i, p: p, m: m, t: t,
		h: d.h || i.h,
		mh: d.mh || i.h,
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
	m.e.splice(m.e.indexOf(e), 1);
	e.t.e.splice(e.t.e.indexOf(e), 1);
};

clampVP = (v, b) => {
	v.x = clamp(v.x, b.xn, b.xx - v.width);
	v.y = clamp(v.y, b.yn, b.yx - v.height);
};

cM = loadMap(maps.test);
clampVP(vp, cM.cb);

makeButton = (s, n, e, c) => (
	c = makeCanvas(16, 16, g => drawSprite(g, s)),
	c.onclick = e,
	c.className = "b",
	c.title = n,
	c);
makeMoveB = m => makeButton(m.s, m.n, e => {
	sMB.className = "b";
	sT = m.l(sE);
	sM = m;
	(sMB = e.target).className = "b s";
});

// VECTOR CONVERSIONS
scrToCan = (x, y, r) => (
	r = c.getBoundingClientRect(),
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
drawSelect = p =>
	drawSprite(g, "highlight", ...hexToCan(p));
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
	t = t.split("\n"),
	[t.reduce((a, s) => max(a, s.length), 0) * f.w, t.length * f.h]
);
genTxt = (t, c, f=fnt, b) => (
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
	if(e.d)
		e.sort(compHexY),
		e.d = 0;
	sE && sE.de();
	for (i of e) i.d();
	for (i of e) if (i.mh && !i.k)
		[x, y] = hexToCan(i.p),
		s = mH.eq(i.p),
		h = s ? 3 : 1,
		g.fillStyle = "#000",
		g.fillRect(x - 12, y + 5, 23, h + 2),
		g.fillStyle = s ? "#b00" : "#e00",
		g.fillRect(x - 11, y + 6, 21, h),
		g.fillStyle = s ? "#080" : "#0d0",
		g.fillRect(x - 11, y + 6, (21 * i.h / i.mh)|0, h),
		s && drawTxt(g, x, y + 5, i.h+"/"+i.mh, 0, snum, 1);
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
	
	drawTxt(g, 1, 0, ""+mH);
	
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
	clear = _ => g.clearRect(0, 0, c.width, c.height);
	
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
	
	// Draw favicon
	g = drawSprite(c.getContext('2d'), "favicon");
	ic.href = c.toDataURL();
	
	onresize();
	g.imageSmoothingEnabled = 0;
	g.font = "7px consolas";
	
	drawSprite(g, "logo", c.width / 2, c.height / 2, 2);
	
	setTimeout(() => {
		oldT = performance.now();
		requestAnimationFrame(render);
	}, %%STARTUP_DELAY%%);
});


MOUSE_NONE = 0;
MOUSE_VIEW_DRAG = 1;
MOUSE_SEL_ENT = 2;
mSt = 0;

c.onmousedown = (e, t) => {
	if (mSt == MOUSE_NONE && e.button == 0) {
		if (cM.tm[cM.ct].p && (t = cM.ep[mH]) && t.t == cM.tm[cM.ct] && !t.k)
			mSt = MOUSE_SEL_ENT;
		else
			mSt = MOUSE_VIEW_DRAG;
		drStMX = e.pageX;
		drStMY = e.pageY;
		drStCX = vp.x;
		drStCY = vp.y;
	}
	
	if (sE && e.button == 2 && sT[mH])
		sM.r(sE, mH),
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
		clampVP(vp, cM.cb);
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
c.oncontextmenu = e => !1;
onresize = e => {
	c.style.width = c.style.height = "100%";
	c.offsetWidth; // Trigger reflow
	let b = c.getBoundingClientRect();
	vp.width  = c.width  = b.width  / 4 |0;
	vp.height = c.height = b.height / 4 |0;
	c.style.width  = c.width  * 4;
	c.style.height = "";
	clampVP(vp, cM.cb)
}
onwheel = e => {
	if (sE) {
		let d = e.deltaY,
		    t = sMB[(d < 0 ? "next" : "previous") + "Sibling"];
		if (!t) t = mov[(d < 0 ? "first" : "last") + "Child"];
		t.click()
	}
}