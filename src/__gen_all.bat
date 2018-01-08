@echo off
mkdir gen 2> nul

set DEV=1

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
if not defined DEV (
	set STARTUP_DELAY=3e3
) else (
	set STARTUP_DELAY=0
)
python _insert_scripts.py -r STARTUP_DELAY %STARTUP_DELAY% gen/uncompressed.html index_template.txt gen/sprites_ascii.js gen/sprites_meta.js game.js
echo.

if not defined DEV (
	echo **COMPRESSING HTML FILE INTO PNG
	python _html_to_png.py gen/uncompressed.html gen/index.html
	cp gen/index.html ../docs/index.html
	call :getsize gen/index.html
) else (
	echo **COMPRESSING HTML FILE INTO PNG
	python _html_to_png.py gen/uncompressed.html ../docs/index.html
	call :getsize gen/index_c.html
	echo.
	echo **COPYING UNCOMPRESSED FILE FOR TESTING
	cp gen/uncompressed.html gen/index.html
)

echo.
echo **ALL DONE
echo **FINAL SIZE: (( %size% KB ))
pause
goto :eof

:getsize
set size=%~z1
goto :eof