@echo off
echo Building VoidLink Demo for GitHub Pages...

REM Copy demo environment
copy .env.demo .env

REM Build with GitHub Pages config (outputs to repo root)
npx vite build --config vite.config.gh-pages.ts

REM Restore original environment
if exist .env.example (
    copy .env.example .env
) else (
    del .env
)

echo Demo build complete! Files are in repository root.
echo Remember to commit and push the updated index.html and assets/
pause