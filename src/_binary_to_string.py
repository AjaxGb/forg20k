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

if __name__ == '__main__':
	import sys
	with open(sys.argv[2], "w") as file:
		print(sys.argv[3], "=", read_to_string(sys.argv[1]), ";",
			file=file, sep="", end="")