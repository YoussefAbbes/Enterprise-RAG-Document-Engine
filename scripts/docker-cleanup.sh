#!/bin/bash

# =============================================================================
# Docker Disk Space Cleanup Script
# =============================================================================
# Efficiently cleans up unused Docker resources to reclaim disk space
# =============================================================================

set -e  # Exit on error

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}=== Docker Disk Space Management Tool ===${NC}\n"

# Get initial disk usage
echo -e "${BOLD}📊 Current Docker Disk Usage:${NC}"
docker system df

echo -e "\n${BOLD}${YELLOW}🧹 Starting cleanup...${NC}\n"

# Remove dangling images
echo -e "${BLUE}1. Removing dangling images...${NC}"
REMOVED_IMAGES=$(docker image prune -f --filter "dangling=true" 2>&1 | tail -1)
echo -e "${GREEN}✓ ${REMOVED_IMAGES}${NC}"

# Remove dangling build cache
echo -e "\n${BLUE}2. Removing unused build cache...${NC}"
docker builder prune -f --filter "unused-for=168h" 2>&1 | tail -1 || echo "No unused cache"
echo -e "${GREEN}✓ Cache cleaned${NC}"

# Remove dangling volumes (ask confirmation for this)
echo -e "\n${BLUE}3. Checking for dangling volumes...${NC}"
DANGLING_VOLS=$(docker volume ls -f dangling=true -q)
if [ -z "$DANGLING_VOLS" ]; then
    echo -e "${GREEN}✓ No dangling volumes found${NC}"
else
    echo -e "${YELLOW}Found dangling volumes (not removing - they may contain data):${NC}"
    docker volume ls -f dangling=true
    echo -e "${YELLOW}To remove them manually, run: docker volume prune -f${NC}"
fi

# Summary
echo -e "\n${BOLD}=== Cleanup Complete ===${NC}"
echo -e "${BOLD}📊 New Docker Disk Usage:${NC}"
docker system df

# Calculate efficiency
OLD_TOTAL=$(docker system df | grep -A 5 "TYPE" | tail -4 | head -1)
echo -e "\n${GREEN}✓ Cleanup completed successfully!${NC}"
echo -e "${BLUE}Tip: Run this script weekly to maintain optimal disk usage${NC}\n"

# Optional: Show total system Docker path size
if command -v du &> /dev/null; then
    DOCKER_SIZE=$(du -sh ~/.docker 2>/dev/null || echo "N/A")
    echo -e "~/.docker directory size: ${DOCKER_SIZE}"
fi
