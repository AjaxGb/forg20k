from PIL import Image
from io import BytesIO

def make_image(text, max_width=4096):
	payload = text.encode("utf-8")[::-1]
	
	width = len(payload)
	
	imagebuffer = BytesIO()
	Image.frombytes("L", (width, 1), payload).save(imagebuffer, "png", optimize=True)
	return imagebuffer, width

if __name__ == '__main__':
	import sys
	with open(sys.argv[1]) as ifile:
		txtimage, width = make_image(ifile.read())
	
	imbuf = txtimage.getbuffer()
	assert(imbuf[37:41] == b"IDAT")
	
	loader = f"<br>Loading...<canvas id=q><img onload=for(i=q.width={width},(H=q.getContext('2d')).drawImage(this,0,e='');i;)e+=String.fromCharCode(H.getImageData(--i,0,1,1).data[0]);with(document)open(),write(e),close() sr".encode()
	
	with open(sys.argv[2], "wb") as ofile:
		ofile.write(imbuf[:33])
		
		ofile.write(len(loader).to_bytes(4, "big"))
		ofile.write(b"foRg")
		ofile.write(loader)
		ofile.write(b"c=#>")
		
		ofile.write(imbuf[33:])