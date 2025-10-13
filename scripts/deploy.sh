#!/bin/bash

# Zero-Downtime Deployment Script
# Usage: ./scripts/deploy.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_INTERVAL=2
COMPOSE_FILE="docker-compose.prod.yaml"
BACKUP_SUFFIX="_backup"

echo -e "${BLUE}=== Zero-Downtime Deployment Script ===${NC}"
echo "Timestamp: $(date)"
echo ""

# Check if running in Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker not found${NC}"
    exit 1
fi

# Check if docker compose is available
if ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose not found${NC}"
    exit 1
fi

# 1. Pull latest code
echo -e "${BLUE}🚀 Pulling latest Git Branch...${NC}"
git pull origin production
echo -e "${GREEN}✅ Branch updated.${NC}"
echo ""

# 2. Build new images with different tags
echo -e "${BLUE}🔨 Building new Docker images...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
export IMAGE_TAG="deploy_${TIMESTAMP}"

docker compose -f ${COMPOSE_FILE} build --build-arg BUILDKIT_INLINE_CACHE=1
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to build images.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Images built successfully.${NC}"
echo ""

# 3. Tag current running containers as backup
echo -e "${BLUE}🏷️  Creating backup tags for current containers...${NC}"
CURRENT_BACKEND=$(docker ps --filter "name=backend-service" --format "{{.ID}}" | head -1)
if [ ! -z "$CURRENT_BACKEND" ]; then
    docker commit $CURRENT_BACKEND backend-service:backup
    echo -e "${GREEN}✅ Backup created for backend-service${NC}"
fi
echo ""

# 4. Scale up new containers alongside old ones
echo -e "${BLUE}🚀 Starting new containers (blue-green deployment)...${NC}"

# Start new backend service with temporary name
docker compose -f ${COMPOSE_FILE} up -d --no-deps --scale backend-service=2 backend-service
echo -e "${YELLOW}⏳ Waiting for new backend service to be healthy...${NC}"

# Wait for health check
RETRIES=0
HEALTHY=false
while [ $RETRIES -lt $HEALTH_CHECK_RETRIES ]; do
    # Get the newest container
    NEW_BACKEND=$(docker ps --filter "name=backend-service" --format "{{.ID}}" --latest)
    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $NEW_BACKEND 2>/dev/null || echo "starting")

    if [ "$HEALTH_STATUS" == "healthy" ]; then
        echo -e "${GREEN}✅ New backend service is healthy!${NC}"
        HEALTHY=true
        break
    fi

    echo -e "${YELLOW}   Health status: $HEALTH_STATUS (attempt $((RETRIES+1))/$HEALTH_CHECK_RETRIES)${NC}"
    sleep $HEALTH_CHECK_INTERVAL
    RETRIES=$((RETRIES+1))
done

if [ "$HEALTHY" = false ]; then
    echo -e "${RED}❌ New backend service failed health checks. Rolling back...${NC}"
    docker compose -f ${COMPOSE_FILE} up -d --no-deps --scale backend-service=1 backend-service
    exit 1
fi
echo ""

# 5. Update nginx to use new backend (if applicable)
echo -e "${BLUE}🔄 Updating nginx proxy...${NC}"
docker compose -f ${COMPOSE_FILE} up -d --no-deps nginx
sleep 3
echo -e "${GREEN}✅ Nginx updated.${NC}"
echo ""

# 6. Scale down old backend containers
echo -e "${BLUE}📉 Scaling down old containers...${NC}"
sleep 5  # Grace period for existing connections
docker compose -f ${COMPOSE_FILE} up -d --no-deps --scale backend-service=1 backend-service
echo -e "${GREEN}✅ Old containers removed.${NC}"
echo ""

# 7. Update workers with rolling restart
echo -e "${BLUE}🔄 Updating worker services...${NC}"
docker compose -f ${COMPOSE_FILE} up -d --no-deps worker
echo -e "${GREEN}✅ Workers updated.${NC}"
echo ""

# 8. Verify all services are running
echo -e "${BLUE}🔍 Verifying services...${NC}"
SERVICES=("nginx_proxy" "backend-service" "worker")
ALL_HEALTHY=true

for SERVICE in "${SERVICES[@]}"; do
    # Check if container is running
    RUNNING=$(docker ps --filter "name=${SERVICE}" --format "{{.Names}}" | head -1)

    if [ ! -z "$RUNNING" ]; then
        # Check health status if available
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $RUNNING 2>/dev/null || echo "no-healthcheck")

        if [ "$HEALTH" == "healthy" ] || [ "$HEALTH" == "no-healthcheck" ]; then
            STATUS=$(docker inspect -f '{{.State.Running}}' "$RUNNING" 2>/dev/null)
            if [ "$STATUS" == "true" ]; then
                echo -e "${GREEN}  ✅ $SERVICE is running and healthy.${NC}"
            else
                echo -e "${RED}  ❌ $SERVICE is NOT running!${NC}"
                ALL_HEALTHY=false
            fi
        else
            echo -e "${YELLOW}  ⚠️  $SERVICE is running but health check shows: $HEALTH${NC}"
        fi
    else
        echo -e "${RED}  ❌ $SERVICE is NOT running!${NC}"
        ALL_HEALTHY=false
    fi
done
echo ""

# 9. Rollback if verification failed
if [ "$ALL_HEALTHY" = false ]; then
    echo -e "${RED}❌ Service verification failed. Rolling back...${NC}"

    # Restore from backup if available
    if docker images | grep -q "backend-service:backup"; then
        docker tag backend-service:backup backend-service:latest
        docker compose -f ${COMPOSE_FILE} up -d --force-recreate
        echo -e "${YELLOW}⚠️  Rolled back to previous version.${NC}"
    fi
    exit 1
fi

# 10. Test endpoint
echo -e "${BLUE}🧪 Testing application endpoint...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health || echo "000")
if [ "$RESPONSE" == "200" ]; then
    echo -e "${GREEN}✅ Application is responding correctly (HTTP $RESPONSE).${NC}"
else
    echo -e "${YELLOW}⚠️  Application returned HTTP $RESPONSE. Please verify manually.${NC}"
fi
echo ""

# 11. Cleanup unused images
echo -e "${BLUE}🧹 Cleaning up unused Docker images...${NC}"
docker image prune -f
# Remove old backup images (keep last 3)
docker images | grep "backend-service" | grep "backup" | tail -n +4 | awk '{print $3}' | xargs -r docker rmi 2>/dev/null || true
echo -e "${GREEN}✅ Cleanup complete.${NC}"
echo ""

# 12. Display container status
echo -e "${BLUE}📊 Current container status:${NC}"
docker compose -f ${COMPOSE_FILE} ps
echo ""

echo -e "${GREEN}🎉 Zero-downtime deployment completed successfully!${NC}"
echo -e "${BLUE}Deployment tag: ${IMAGE_TAG}${NC}"
echo "Timestamp: $(date)"
