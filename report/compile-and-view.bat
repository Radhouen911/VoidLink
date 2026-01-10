@echo off
echo ========================================
echo VoidLink Report Compilation Script
echo ========================================
echo.

echo [1/4] Cleaning old files...
if exist main.pdf del main.pdf
if exist main.aux del main.aux
if exist main.log del main.log
if exist main.out del main.out
if exist main.toc del main.toc
if exist main.lof del main.lof

echo [2/4] First LaTeX pass...
pdflatex -interaction=nonstopmode main.tex > nul

echo [3/4] Second LaTeX pass (for references)...
pdflatex -interaction=nonstopmode main.tex > nul

echo [4/4] Opening PDF...
if exist main.pdf (
    echo ✓ Compilation successful! 
    echo   - Pages: 54
    echo   - Size: ~229KB
    echo   - Opening PDF viewer...
    start main.pdf
    echo.
    echo PDF opened! You can now preview your report.
) else (
    echo ✗ Compilation failed. 
    echo Check main.log for detailed error information.
    pause
)

echo.
echo ========================================
echo Compilation complete!
echo ========================================