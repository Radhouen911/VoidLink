# VoidLink Technical Report

This directory contains the complete LaTeX source for the VoidLink technical project report.

## Structure

```
report/
├── main.tex                 # Main LaTeX document
├── chapters/                # Chapter files
│   ├── 00-resume.tex       # Résumé (French summary)
│   ├── 00-abstract.tex     # Abstract (English summary)
│   ├── 00-acronyms.tex     # List of acronyms
│   ├── 00-introduction.tex # Introduction (unnumbered)
│   ├── 01-context.tex      # Chapter 1: General Context
│   ├── 02-architecture.tex # Chapter 2: System Architecture
│   ├── 03-implementation.tex # Chapter 3: Implementation
│   ├── 04-tests.tex        # Chapter 4: Tests and Results
│   └── 05-conclusion.tex   # Conclusion (unnumbered)
├── references.bib          # Bibliography database
├── compile.sh              # Compilation script (Linux/Mac)
├── compile.bat             # Compilation script (Windows)
└── README.md               # This file
```

## Compilation

### Prerequisites

You need a LaTeX distribution installed:

- **Linux**: TeX Live (`sudo apt-get install texlive-full`)
- **macOS**: MacTeX (`brew install --cask mactex`)
- **Windows**: MiKTeX or TeX Live

### Compiling the Report

**Linux/macOS:**

```bash
cd report
chmod +x compile.sh
./compile.sh
```

**Windows:**

```cmd
cd report
compile.bat
```

**Manual Compilation:**

```bash
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

The compiled PDF will be `main.pdf`.

## Diagrams

The report references diagrams from the `../diagram/` directory:

- `component diagram.png` - System component architecture
- `sequence_diagram_account_creation_backup.png` - Account creation flow
- `sequence_diagram_login_auth.png` - Authentication flow
- `sequence_diagram_secure_messageex.png` - Message exchange flow
- `sequence_diagram_key_rotation.png` - Key rotation flow
- `Activity_diagram_user_flow.png` - User activity flow

Ensure these diagrams exist before compiling the report.

## Report Structure

The report follows the exact structure specified:

**Front Matter (Roman numerals):**

- Résumé (French summary)
- Abstract (English summary)
- Table of Contents
- List of Figures
- List of Acronyms

**Main Content (Arabic numerals):**

- Introduction (unnumbered)
- Chapter 1: General Context and Existing Study
- Chapter 2: System Analysis and Architecture
- Chapter 3: Implementation and Security
- Chapter 4: Tests, Results, and Limitations
- Conclusion (unnumbered)
- Bibliography

## Language

The entire report is written in **English** with an academic tone, as specified in the requirements.

## Content Guidelines

The report:

- ✅ Describes the ACTUAL implementation (no invented components)
- ✅ Explains design decisions and architecture
- ✅ Includes updated diagrams reflecting real system
- ✅ States limitations explicitly
- ✅ Uses proper academic references
- ❌ Does NOT include code dumps
- ❌ Does NOT include screenshots
- ❌ Does NOT include placeholder text

## Customization

To customize the report:

1. Edit chapter files in `chapters/` directory
2. Update bibliography in `references.bib`
3. Modify formatting in `main.tex`
4. Add/update diagrams in `../diagram/` directory

## Notes

- The report is approximately 80-100 pages when compiled
- All diagrams must be in PNG format
- Bibliography uses IEEE style
- Page margins: 3cm left, 2.5cm right/top/bottom
- Font size: 12pt
- Paper size: A4

## Contact

For questions about the report content, contact:

- Mohamed Radhouen Boufateh
- Abdelkader Ben Nejma

Supervisor: Basma K'hil
