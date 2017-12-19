python _sheetbuilder.py sprites gen/sprites.png gen/sprites_meta.js 256 256
python _binary_to_string.py gen/sprites.png gen/sprites_ascii.js s
python _insert_scripts.py gen/index.html index_template.txt gen/sprites_ascii.js gen/sprites_meta.js game.js
pause