import argparse
import re

parser = argparse.ArgumentParser()
parser.add_argument("outfile",
	help="the file to output the result to")
parser.add_argument("-i", "--insertion", dest="insertion",
	metavar="IPOINT", default="$$",
	help="the string in template to replace with the contents of scripts (default: %(default)s)")
parser.add_argument("template",
	help="the file to insert the scripts into")
parser.add_argument("scripts", nargs="*",
	help="the files to insert into the template")
parser.add_argument("-r", "--replace", dest="replace",
	metavar=("KEY", "VALUE"), nargs=2, action="append",
	help='''an additional replacement to perform after insertion
`-r IDNUM 42` will convert "The ID is %%%%IDNUM%%%%." to "The ID is 42."''')

args = parser.parse_args()
replace = dict(args.replace or ())

with open(args.template) as template:
	template = template.read()

scripts = []
for scr in args.scripts:
	with open(scr) as scr:
		scripts.append(scr.read())

output = template.replace(args.insertion, "".join(scripts))
output = re.sub(r"%%(.+?)%%",
	lambda m: replace.get(m.group(1), m.group()),
	output)

with open(args.outfile, "w") as out:
	out.write(output)