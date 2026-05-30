#!/bin/bash

read -p "Enter commit date (YYYY-MM-DD HH:MM:SS): " DATE
read -p "Enter commit message: " MESSAGE

git add .

GIT_AUTHOR_DATE="$DATE" \
GIT_COMMITTER_DATE="$DATE" \
git commit -m "$MESSAGE"

git log -1 --pretty=fuller
