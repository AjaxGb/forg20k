@echo off
mkdir gen 2> nul

echo **GENERATING SPRITE SHEET
python _sheetbuilder.py sprites gen/sprites.png gen/sprites_meta.js 256 256
echo **CONVERTING SPRITE SHEET TO TEXT
python _binary_to_string.py gen/sprites.png gen/sprites_ascii.js s
echo **BUILDING HTML FILE
python _insert_scripts.py gen/index.html index_template.txt gen/sprites_ascii.js gen/sprites_meta.js game.js
echo **ALL DONE
pause