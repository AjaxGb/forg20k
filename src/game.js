png = "image/png";
doc = document;
cEl = doc.createElement.bind(doc);
makeCanvas = (w,h)=>(c=cEl("canvas"),c.width=w,c.height=h,c.getContext("2d"));

sa = new Uint8Array(s.length*7/8);
for (i = j = 0; i < s.length; ++i, ++j) {
	let c = s.charCodeAt(i), r = i % 8;
	sa[j-1] |= c >> 7 - r;
	sa[j]    = c << r + 1;
	r == 7 && --j;
}

createImageBitmap(new Blob([sa],{type: png})).then(s=>{
	drawSprite = (g,n,x,y,c,b) => (
		b = sb[n],
		c = c || 1,
		g.drawImage(s, ...b, x|0, y|0, b[2]*c, b[3]*c),
		g
	);
	
	// Draw favicon
	g = drawSprite(c.getContext('2d'), "small_logo");
	ic.href = c.toDataURL();
	c.width = 225;
	c.height = 150;
	g.imageSmoothingEnabled = false;
	
	drawSprite(g, "logo", 0, 0, 2);
	
	for (let y = 0; y < 10; y++) {
		for (let x = 0; x < 10; x++) {
			drawSprite(g, "grass_tile", x*48 + (y%2 ? 0 : 24), y*8);
		}
	}
	
});
