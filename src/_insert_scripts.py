import sys

with open(sys.argv[2]) as template:
	template = template.read()

scripts = []
for scr in sys.argv[3:]:
	with open(scr) as scr:
		scripts.append(scr.read())

with open(sys.argv[1], "w") as out:
	out.write(template.replace("$$", "".join(scripts)))