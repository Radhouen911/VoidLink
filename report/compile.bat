@echo off
echo Compiling LaTeX document...
pdflatex main.tex
if exist main.pdf (
    echo Compilation successful! Opening PDF...
    start main.pdf
) else (
    echo Compilation failed. Check main.log for errors.
    pause
)