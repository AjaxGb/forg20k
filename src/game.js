doc = document
cEl = doc.createElement.bind(doc)
makeCanvas = (w,h)=>(c=cEl("canvas"),c.width=w,c.height=h,c.getContext('2d'))
g = c.getContext('2d')