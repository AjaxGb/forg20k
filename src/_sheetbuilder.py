import os
import sys
import json
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
	def __init__(self, name, imagefile, *,
			origin=(0, 0), subsprites={}, anim=None):
		self.name = name
		self.imagefile = imagefile
		self.anim = anim
		self.width, self.height = imagefile.size
		self.subsprites = {subname: SubSprite(subbounds)
			for subname, subbounds in subsprites.items()}
		self.subsprites[name] = SubSprite(
			(0, 0, self.width, self.height), origin)
	
	def __repr__(self):
		return "<Sprite '{}' file={} w={} h={}>".format(
			self.name, self.imagefile.filename, self.width, self.height)

class Animation:
	def __init__(self, name, imagefile, numframes, order=None, *, 
			duration=None, origin=(0, 0)):
		self.name = name
		self.imagefile = imagefile
		self.width, self.imageheight = imagefile.size
		if self.imageheight % numframes != 0:
			raise ValueError(
				"Height of '{}' animation ({}) not a multiple of frame count ({})!"
				.format(name, self.imageheight, numframes))
		self.frameheight = self.imageheight // numframes
		self.frames = [
			Sprite(None, imagefile.crop((
				0, i * self.frameheight,
				self.width, (i + 1) * self.frameheight
			)), anim=self)
			for i in range(numframes) 
		]
		self.order = order
		self.duration = duration
		self.origin = origin

print("Compiling sprites in", sprites_path)
print()

#################################
## LOAD ALL IMAGES, META FILES ##
#################################

all_images = []
all_anims = []

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
			print("Found meta for '{}'".format(spritename))
			with open(metafilepath) as metafile:
				metadata = json.load(metafile)
			
			subsprites = metadata.get("subsprites", {})
			origin = metadata.get("origin", (0, 0))
			
			animmeta = metadata.get("anim", None)
			if animmeta:
				numframes = animmeta.get("numframes")
				order = animmeta.get("order", list(range(numframes)))
				duration = animmeta.get("duration", None)
				
				anim = Animation(spritename, image, numframes, order,
					duration=duration, origin=origin)
				all_anims.append(anim)
				all_images.extend(anim.frames)
				continue
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
	
	if sprite.anim:
		sprite.position = x, y
	else:
		for spritename, subsprite in sprite.subsprites.items():
			all_subsprites[spritename] = subsprite.offset(x, y)

sheet.save(gen_imagename, optimize=True, transparency=0)

print("Sheet saved")

##########################
## WRITE JS WITH BOUNDS ##
##########################

metas = [
	"{}:{{{}}}".format(
		name,
		(("o:[{}],".format(",".join(str(o) for o in subsprite.origin)))
			if subsprite.origin != (0, 0) else "")
		+ "b:[{}]".format(",".join(str(b) for b in subsprite.bounds)))
	for name, subsprite in all_subsprites.items()
] + [
	"{}:{{{}}}".format(
		anim.name,
		(("o:[{}],".format(",".join(str(o) for o in anim.origin)))
			if anim.origin != (0, 0) else "")
		+ (("a:[{}],".format(",".join(str(f) for f in anim.order)))
			if anim.order else "")
		+ (("d:{},".format(anim.duration))
			if anim.duration != None else "")
		+ "s:[{},{}],".format(anim.width, anim.frameheight)
		+ "f:[{}]".format(",".join(
			"[{}]".format(",".join(str(b) for b in frame.position))
			for frame in anim.frames)
		)
	)
	for anim in all_anims
]

with open(gen_metaname, "w") as metafile:
	print("sb={", file=metafile, sep="", end="")
	print(",".join(metas), file=metafile, sep="", end="")
	print("};", file=metafile, sep="", end="")

print("Meta file saved")