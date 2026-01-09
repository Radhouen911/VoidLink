@echo off
REM VoidLink Report Compilation Script for Windows
REM This script compiles the LaTeX report with proper bibliography handling

echo =========================================
echo VoidLink Technical Report Compilation
echo =========================================
echo.

REM Check if pdflatex is installed
where pdflatex >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: pdflatex not found. Please install MiKTeX or TeX Live.
    echo   Download from: https://miktex.org/ or https://www.tug.org/texlive/
    pause
    exit /b 1
)

REM Check if bibtex is installed
where bibtex >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: bibtex not found. Please install a LaTeX distribution.
    pause
    exit /b 1
)

REM Clean previous build artifacts
echo Cleaning previous build artifacts...
del /Q main.pdf main.aux main.log main.toc main.lof main.bbl main.blg main.out 2>nul
del /Q chapters\*.aux 2>nul

REM First pass: Generate auxiliary files
echo.
echo First pass: Generating auxiliary files...
pdflatex -interaction=nonstopmode main.tex >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: First pdflatex pass failed. Check main.log for details.
    pdflatex main.tex
    pause
    exit /b 1
)

REM Process bibliography
echo Processing bibliography...
bibtex main >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Warning: bibtex encountered issues. Check main.blg for details.
)

REM Second pass: Resolve references
echo Second pass: Resolving references...
pdflatex -interaction=nonstopmode main.tex >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Second pdflatex pass failed. Check main.log for details.
    pdflatex main.tex
    pause
    exit /b 1
)

REM Third pass: Final compilation
echo Third pass: Final compilation...
pdflatex -interaction=nonstopmode main.tex >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Third pdflatex pass failed. Check main.log for details.
    pdflatex main.tex
    pause
    exit /b 1
)

REM Check if PDF was generated
if exist main.pdf (
    echo.
    echo =========================================
    echo Success! Compilation successful!
    echo =========================================
    echo.
    echo Output: main.pdf
    for %%A in (main.pdf) do echo Size: %%~zA bytes
    echo.
    echo To view the report, open main.pdf
    echo.
) else (
    echo.
    echo =========================================
    echo Error! Compilation failed!
    echo =========================================
    echo.
    echo Check main.log for error details.
    pause
    exit /b 1
)

REM Optional: Clean auxiliary files
set /p CLEAN="Clean auxiliary files? (y/n) "
if /i "%CLEAN%"=="y" (
    echo Cleaning auxiliary files...
    del /Q main.aux main.log main.toc main.lof main.bbl main.blg main.out 2>nul
    del /Q chapters\*.aux 2>nul
    echo Done!
)

pause
