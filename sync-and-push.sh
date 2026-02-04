#!/bin/bash
rm -f .git/index.lock
git stash
git pull origin main
git stash pop
git add -A
git commit -m "Sync and update dependencies"
git push
