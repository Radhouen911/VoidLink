#!/bin/bash

# VoidLink Report Compilation Script
# This script compiles the LaTeX report with proper bibliography handling

echo "========================================="
echo "VoidLink Technical Report Compilation"
echo "========================================="
echo ""

# Check if pdflatex is installed
if ! command -v pdflatex &> /dev/null; then
    echo "Error: pdflatex not found. Please install a LaTeX distribution."
    echo "  - Ubuntu/Debian: sudo apt-get install texlive-full"
    echo "  - macOS: brew install --cask mactex"
    exit 1
fi

# Check if bibtex is installed
if ! command -v bibtex &> /dev/null; then
    echo "Error: bibtex not found. Please install a LaTeX distribution."
    exit 1
fi

# Clean previous build artifacts
echo "Cleaning previous build artifacts..."
rm -f main.pdf main.aux main.log main.toc main.lof main.bbl main.blg main.out
rm -f chapters/*.aux

# First pass: Generate auxiliary files
echo ""
echo "First pass: Generating auxiliary files..."
pdflatex -interaction=nonstopmode main.tex > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Error: First pdflatex pass failed. Check main.log for details."
    pdflatex main.tex
    exit 1
fi

# Process bibliography
echo "Processing bibliography..."
bibtex main > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Warning: bibtex encountered issues. Check main.blg for details."
fi

# Second pass: Resolve references
echo "Second pass: Resolving references..."
pdflatex -interaction=nonstopmode main.tex > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Error: Second pdflatex pass failed. Check main.log for details."
    pdflatex main.tex
    exit 1
fi

# Third pass: Final compilation
echo "Third pass: Final compilation..."
pdflatex -interaction=nonstopmode main.tex > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Error: Third pdflatex pass failed. Check main.log for details."
    pdflatex main.tex
    exit 1
fi

# Check if PDF was generated
if [ -f main.pdf ]; then
    echo ""
    echo "========================================="
    echo "✓ Compilation successful!"
    echo "========================================="
    echo ""
    echo "Output: main.pdf"
    echo "Size: $(du -h main.pdf | cut -f1)"
    echo "Pages: $(pdfinfo main.pdf 2>/dev/null | grep Pages | awk '{print $2}')"
    echo ""
    echo "To view the report:"
    echo "  - Linux: xdg-open main.pdf"
    echo "  - macOS: open main.pdf"
    echo ""
else
    echo ""
    echo "========================================="
    echo "✗ Compilation failed!"
    echo "========================================="
    echo ""
    echo "Check main.log for error details."
    exit 1
fi

# Optional: Clean auxiliary files
read -p "Clean auxiliary files? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleaning auxiliary files..."
    rm -f main.aux main.log main.toc main.lof main.bbl main.blg main.out
    rm -f chapters/*.aux
    echo "Done!"
fi
