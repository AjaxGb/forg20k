import os
import sys
import json
from PIL import Image
from rectpack import newPacker
import numpy as np

GEN_IMAGENAME = "_gen_sheet.png"
GEN_METNAME = "_gen_meta.js"
GEN_DIMENSIONS = (256, 256)

class Sprite:
	def __init__(self, name, imagefile, *, subsprites={}):
		self.name = name
		self.imagefile = imagefile
		self.width, self.height = imagefile.size
		self.subsprites = {name: (0, 0, self.width, self.height)}
		self.subsprites.update(subsprites)
	
	def __str__(self):
		return "<Sprite '{}' file={} sub={}>".format(
			self.name, self.imagefile.filename, self.subsprites)

script_path = os.path.dirname(__file__)
print("Compiling sprites in", script_path)
print()

#################################
## LOAD ALL IMAGES, META FILES ##
#################################

all_images = set()

for path, dirs, files in os.walk(script_path):
	dir_images = {}
	dir_metas = {}
	for filename in files:
		if filename.endswith(".png") and filename != GEN_IMAGENAME:
			filepath = os.path.join(path, filename)
			spritename = filename.rsplit(".", 1)[0]
			image = Image.open(filepath)
			if image.mode == "P":
				image = image.convert("RGBA")
			dir_images[spritename] = image
		elif filename.endswith(".json"):
			filepath = os.path.join(path, filename)
			spritename = filename.rsplit(".", 1)[0]
			dir_metas[spritename] = filepath
	
	for spritename, image in dir_images.items():
		metafilepath = dir_metas.get(spritename, None)
		if metafilepath != None:
			with open(metafilepath) as metafile:
				metadata = json.load(metafile)
			subsprites = metadata["subsprites"]
			
			print("Found meta for", "'{}'".format(spritename), "containing",
				len(subsprites), "subsprites.")
		else:
			subsprites = {}
		
		all_images.add(
			Sprite(spritename, image, subsprites=subsprites))

print("Found", len(all_images), "image files.")

################################
## DETERMINE, DISPLAY PALETTE ##
################################

total_pixels = 0
transparent_color = (0, 0, 0, 0)
transparent_count = 0
palette = {}

for sprite in all_images:
	for count, color in sprite.imagefile.getcolors():
		if color == transparent_color:
			transparent_count += count
		else:
			if color[3] != 255:
				print("WARN! Sprite", sprite, "contains non-standard transparency!")
			color = (*color[:3],)
			palette[color] = palette.get(color, 0) + count
		total_pixels += count
print()

palette_freq = [((count * 100) / total_pixels, color)
	for color, count in palette.items()]
palette_freq.sort(reverse=True)

print("{:5.2f}%:".format((transparent_count * 100) / total_pixels),
	"transparent")
for freq, color in palette_freq:
	print("{:5.2f}%:".format(freq), color)
print("Palette size:", len(palette) + 1)

palette_indices = {c : i + 1 for i, c in enumerate(palette.keys())}
palette_list = [0, 0, 0] + [a for c in palette_indices.keys() for a in c]

def palettise(ca):
	return np.uint8(palette_indices[(*ca[:3],)] if ca[3] else 0)

if len(palette) > 255:
	print("ERR! Palette is too large!")
	sys.exit(1)
print()

#############################
## PACK SPRITES INTO SHEET ##
#############################

packer = newPacker()

for s in all_images:
	packer.add_rect(s.width, s.height, s)
packer.add_bin(*GEN_DIMENSIONS)
packer.pack()

sheet = Image.new("P", GEN_DIMENSIONS)
sheet.putpalette(palette_list)

all_subsprites = {}
for _, x, y, w, h, sprite in packer.rect_list():
	all_images.remove(sprite)
	
	# Palettise	
	sprite_arr = np.array(sprite.imagefile, dtype=np.uint8)
	sprite_arr = np.apply_along_axis(palettise, 2, sprite_arr)
	sprite_im = Image.fromarray(sprite_arr, "P")
	sprite_im.putpalette(palette_list)
	sheet.paste(sprite_im, (x, y))
	
	for spritename, bounds in sprite.subsprites.items():
		all_subsprites[spritename] = (
			x + bounds[0], y + bounds[1], bounds[2], bounds[3])

if len(all_images):
	print("ERR!", len(all_images), "sprites could not be fit:")
	for i in all_images:
		print(i)
	sys.exit(1)

sheet.save(GEN_IMAGENAME, optimize=True, transparency=0)

##########################
## WRITE JS WITH BOUNDS ##
##########################

with open(GEN_METNAME, "w") as metafile:
	print("sb={", ",".join([
		name + ":[" + ",".join(str(b) for b in bounds) + "]"
		for name, bounds in all_subsprites.items()
	]), "}", file=metafile, sep="", end="")