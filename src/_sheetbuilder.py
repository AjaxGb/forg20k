import os
import sys
import json
import re
from PIL import Image
import rpack
import numpy as np

sprites_path = sys.argv[1]
gen_imagename, gen_metaname = sys.argv[2], sys.argv[3]

class SubSprite:
	def __init__(self, bounds, origin=(0, 0)):
		self.bounds = bounds
		self.origin = origin
	
	def offset(self, dx, dy):
		x, y, w, h = self.bounds
		return SubSprite((x + dx, y + dy, w, h), self.origin)

class Sprite:
	def __init__(self, name, imagefile, *, origin=(0, 0), subsprites={}):
		self.name = name
		self.imagefile = imagefile
		self.width, self.height = imagefile.size
		self.subsprites = {subname: SubSprite(subbounds)
			for subname, subbounds in subsprites.items()}
		self.subsprites[name] = SubSprite(
			(0, 0, self.width, self.height), origin)
	
	def __repr__(self):
		return "<Sprite '{}' file={} w={} h={}>".format(
			self.name, self.imagefile.filename, self.width, self.height)

print("Compiling sprites in", sprites_path)
print()

#################################
## LOAD ALL IMAGES, META FILES ##
#################################

all_images = []

for path, dirs, files in os.walk(sprites_path):
	dir_images = {}
	dir_metas = {}
	for filename in files:
		if filename.endswith(".png") and filename != gen_imagename:
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
			subsprites = metadata.get("subsprites", {})
			origin = metadata.get("origin", (0, 0))
			
			print("Found meta for", "'{}'".format(spritename), "containing",
				len(subsprites), "subsprites.")
		else:
			subsprites = {}
			origin = (0, 0)
		
		all_images.append(
			Sprite(spritename, image, origin=origin, subsprites=subsprites))

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
		if color[3] == 0:
			transparent_count += count
		else:
			if color[3] != 255:
				print("WARN! Sprite", sprite, "contains partial transparency!")
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

# For best result, sort the sprites by height, highest first
all_images.sort(key=lambda s: s.height, reverse=True)

positions = rpack.pack([(s.width, s.height) for s in all_images])

width, height = 0, 0
for i, (x, y) in enumerate(positions):
	sprite = all_images[i]
	
	width = max(width, x + sprite.width)
	height = max(height, y + sprite.height)

print("Sheet size:", width, "x", height)

sheet = Image.new("P", (width, height))
sheet.putpalette(palette_list)
		
all_subsprites = {}
for i, (x, y) in enumerate(positions):
	sprite = all_images[i]
	
	# Palettise	
	sprite_arr = np.array(sprite.imagefile, dtype=np.uint8)
	sprite_arr = np.apply_along_axis(palettise, 2, sprite_arr)
	sprite_im = Image.fromarray(sprite_arr, "P")
	sprite_im.putpalette(palette_list)
	sheet.paste(sprite_im, (x, y))
	
	all_subsprites.update(sprite.subsprites)
	for spritename, subsprite in sprite.subsprites.items():
		all_subsprites[spritename] = subsprite.offset(x, y)

sheet.save(gen_imagename, optimize=True, transparency=0)

print("Sheet saved")

##########################
## WRITE JS WITH BOUNDS ##
##########################
with open(gen_metaname, "w") as metafile:
	print("sb={", ",".join([
		(name if re.match("^[a-zA-Z_]\\w*$", name) else '"{}"'.format(name))
		+ ":{"
			+ (("o:[" + ",".join(str(o) for o in subsprite.origin) + "],")
				if subsprite.origin != (0, 0) else "")
			+ "b:[" + ",".join(str(b) for b in subsprite.bounds)
		+ "]}"
		for name, subsprite in all_subsprites.items()
	]), "};", file=metafile, sep="", end="")

print("Meta file saved")