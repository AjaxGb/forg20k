def read_to_string(filename):
	chars = ['"']
	with open(filename, "rb") as file:
		while True:
			data = file.read(7)
			if not data:
				break
			if len(data) < 7:
				data = data + b"\0" * (7 - len(data))
			i = int.from_bytes(data, "big")
			
			# print("i:", *("{:08b}".format(d) for d in data))
			
			sevens = []
			for _ in range(8):
				sevens.append(i & 127)
				i >>= 7
			sevens.reverse()
			
			# print("s:", *("{:07b}".format(s) for s in sevens))
			
			char_chunk = ("".join(chr(s) for s in sevens)
				.replace("\\", "\\\\")
				.replace("\n", "\\n")
				.replace("\r", "\\r")
				.replace('"', '\\"'))
			chars.append(char_chunk)
	chars.append('"')
	return "".join(chars)

with open("imtxt.js", "w") as file:
	print("s=",read_to_string("sprites/_gen_sheet.png"),
		file=file, sep="", end="")