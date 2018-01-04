@echo off
mkdir gen 2> nul

echo **GENERATING SPRITE SHEET
python _sheetbuilder.py sprites gen/sprites.png gen/sprites_meta.js
echo.
echo **OPTIMIZING SPRITE SHEET
pngcrush -brute -reduce -ow -q gen/sprites.png
echo.
echo **CONVERTING SPRITE SHEET TO TEXT
python _binary_to_string.py gen/sprites.png gen/sprites_ascii.js s
echo.
echo **BUILDING HTML FILE
python _insert_scripts.py gen/uncompressed.html index_template.txt gen/sprites_ascii.js gen/sprites_meta.js game.js
echo.
echo **COMPRESSING HTML FILE INTO PNG
python _html_to_png.py gen/uncompressed.html gen/index.html
echo.
echo **ALL DONE
pause