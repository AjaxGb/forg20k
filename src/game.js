png = "image/png";
doc = document;
sa = new Uint8Array(s.length*7/8);
for (i = j = 0; i < s.length; ++i, ++j) {
	let c = s.charCodeAt(i), r = i % 8;
	sa[j-1] |= c >> 7 - r;
	sa[j]    = c << r + 1;
	if (r == 7) --j;
}
createImageBitmap(new Blob([sa],{type: png})).then(s=>{
	g = c.getContext('2d');
	g.drawImage(s,0,0);
});
cEl = doc.createElement.bind(doc);
makeCanvas = (w,h)=>(c=cEl("canvas"),c.width=w,c.height=h,c.getContext('2d'));