@echo off
echo Building VoidLink Demo for GitHub Pages...

REM Copy demo environment
copy .env.demo .env

REM Build with GitHub Pages config
npx vite build --config vite.config.gh-pages.ts

REM Restore original environment
if exist .env.example (
    copy .env.example .env
) else (
    del .env
)

echo Demo build complete! Files are in dist/ folder.
pause