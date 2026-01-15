#!/bin/bash
#
# Script to remove "Co-Authored-By: Claude" from git history
# WARNING: This rewrites git history! Only use on unpushed commits or be prepared to force push.
#

set -e

echo "⚠️  WARNING: This script will rewrite git history!"
echo "   Only proceed if you haven't pushed these commits to a shared repository,"
echo "   or if you're prepared to force push."
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Aborted."
    exit 1
fi

# Get the base branch (main or origin/main)
BASE_BRANCH=${1:-origin/main}

echo "Rewriting commits from $BASE_BRANCH to HEAD..."

# Use filter-branch to remove Co-Authored-By lines
git filter-branch -f --msg-filter '
    sed "/^Co-Authored-By:.*Claude.*<noreply@anthropic.com>/d"
' $BASE_BRANCH..HEAD

echo ""
echo "✅ Done! Co-Authored-By: Claude lines have been removed from commits."
echo ""
echo "Next steps:"
echo "  - Check the history: git log"
echo "  - If you need to push: git push --force-with-lease"
echo ""
