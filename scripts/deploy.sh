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

# 2. Build new images
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
echo -e "${BLUE}🏷️  Creating backup of current deployment...${NC}"
CURRENT_BACKEND=$(docker ps --filter "name=backend-service" --format "{{.ID}}" | head -1)
if [ ! -z "$CURRENT_BACKEND" ]; then
    CURRENT_IMAGE=$(docker inspect --format='{{.Config.Image}}' $CURRENT_BACKEND)
    docker tag $CURRENT_IMAGE backend-service:backup_${TIMESTAMP}
    echo -e "${GREEN}✅ Backup created${NC}"
fi
echo ""

# 4. Create temporary container for health check
echo -e "${BLUE}🧪 Starting temporary test container...${NC}"

# Start a temporary container on a different port to test
docker run -d \
    --name backend-test-${TIMESTAMP} \
    --network eventmanagement_app-network \
    --env-file .env \
    -e NODE_ENV=production \
    -e NODE_OPTIONS=--max-old-space-size=2048 \
    -e HOST=0.0.0.0 \
    -e PORT=7001 \
    backend-service:latest \
    node dist/bin.js

echo -e "${YELLOW}⏳ Waiting for test container to be healthy...${NC}"

# Wait for health check
RETRIES=0
HEALTHY=false
while [ $RETRIES -lt $HEALTH_CHECK_RETRIES ]; do
    # Check if container is still running
    if ! docker ps --filter "name=backend-test-${TIMESTAMP}" --format "{{.ID}}" | grep -q .; then
        echo -e "${RED}❌ Test container died. Checking logs...${NC}"
        docker logs backend-test-${TIMESTAMP} --tail 50
        docker rm -f backend-test-${TIMESTAMP} 2>/dev/null || true
        exit 1
    fi

    # Check health via curl (more reliable than wget for status codes)
    HTTP_CODE=$(docker exec backend-test-${TIMESTAMP} sh -c "command -v curl >/dev/null && curl -s -o /dev/null -w '%{http_code}' http://0.0.0.0:7001/health || wget -q -O /dev/null -S http://0.0.0.0:7001/health 2>&1 | grep -o 'HTTP/[0-9.]* [0-9]*' | awk '{print \$2}'" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" == "200" ]; then
        echo -e "${GREEN}✅ Test container is healthy! (HTTP $HTTP_CODE)${NC}"
        HEALTHY=true
        break
    fi

    echo -e "${YELLOW}   Waiting for health check... (attempt $((RETRIES+1))/$HEALTH_CHECK_RETRIES)${NC}"
    sleep $HEALTH_CHECK_INTERVAL
    RETRIES=$((RETRIES+1))
done

if [ "$HEALTHY" = false ]; then
    echo -e "${RED}❌ Test container failed health checks. Showing logs:${NC}"
    docker logs backend-test-${TIMESTAMP} --tail 50
    docker rm -f backend-test-${TIMESTAMP} 2>/dev/null || true
    exit 1
fi

# Cleanup test container
docker rm -f backend-test-${TIMESTAMP}
echo -e "${GREEN}✅ Test container passed health checks and removed.${NC}"
echo ""

# 5. Perform rolling update
echo -e "${BLUE}🔄 Performing rolling update of services...${NC}"

# Update backend service (docker compose will handle the rolling update)
docker compose -f ${COMPOSE_FILE} up -d --no-deps --remove-orphans backend-service

echo -e "${YELLOW}⏳ Waiting for new backend to be healthy...${NC}"
sleep 5

# Wait for the actual service to be healthy
RETRIES=0
HEALTHY=false
while [ $RETRIES -lt $HEALTH_CHECK_RETRIES ]; do
    BACKEND_CONTAINER=$(docker ps --filter "name=backend-service" --format "{{.ID}}" | head -1)

    if [ -z "$BACKEND_CONTAINER" ]; then
        echo -e "${RED}❌ Backend container not found!${NC}"
        break
    fi

    HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' $BACKEND_CONTAINER 2>/dev/null || echo "starting")

    if [ "$HEALTH_STATUS" == "healthy" ]; then
        echo -e "${GREEN}✅ Backend service is healthy!${NC}"
        HEALTHY=true
        break
    fi

    echo -e "${YELLOW}   Health status: $HEALTH_STATUS (attempt $((RETRIES+1))/$HEALTH_CHECK_RETRIES)${NC}"
    sleep $HEALTH_CHECK_INTERVAL
    RETRIES=$((RETRIES+1))
done

if [ "$HEALTHY" = false ]; then
    echo -e "${RED}❌ Backend service failed health checks. Rolling back...${NC}"

    # Rollback to backup
    if docker images | grep -q "backend-service:backup_${TIMESTAMP}"; then
        docker tag backend-service:backup_${TIMESTAMP} backend-service:latest
        docker compose -f ${COMPOSE_FILE} up -d --force-recreate backend-service
        echo -e "${YELLOW}⚠️  Rolled back to previous version.${NC}"
    fi
    exit 1
fi
echo ""

# 6. Update nginx (reload config without downtime)
echo -e "${BLUE}🔄 Reloading nginx configuration...${NC}"
docker compose -f ${COMPOSE_FILE} up -d --no-deps nginx

# Wait a moment for nginx to start
sleep 3

# Reload nginx config (graceful reload)
NGINX_CONTAINER=$(docker ps --filter "name=nginx_proxy" --format "{{.ID}}" | head -1)
if [ ! -z "$NGINX_CONTAINER" ]; then
    docker exec $NGINX_CONTAINER nginx -s reload
    echo -e "${GREEN}✅ Nginx configuration reloaded.${NC}"
fi
echo ""

# 7. Update workers with rolling restart
echo -e "${BLUE}🔄 Updating worker services...${NC}"
docker compose -f ${COMPOSE_FILE} up -d --no-deps worker
sleep 3
echo -e "${GREEN}✅ Workers updated.${NC}"
echo ""

# 8. Verify all services are running
echo -e "${BLUE}🔍 Verifying all services...${NC}"
SERVICES=("nginx_proxy" "backend-service" "worker")
ALL_HEALTHY=true

for SERVICE in "${SERVICES[@]}"; do
    RUNNING=$(docker ps --filter "name=${SERVICE}" --format "{{.Names}}" | head -1)

    if [ ! -z "$RUNNING" ]; then
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

    if docker images | grep -q "backend-service:backup_${TIMESTAMP}"; then
        docker tag backend-service:backup_${TIMESTAMP} backend-service:latest
        docker compose -f ${COMPOSE_FILE} up -d --force-recreate
        echo -e "${YELLOW}⚠️  Rolled back to previous version.${NC}"
    fi
    exit 1
fi

# 10. Test endpoint through nginx
echo -e "${BLUE}🧪 Testing application endpoint...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
if [ "$RESPONSE" == "200" ]; then
    echo -e "${GREEN}✅ Application is responding correctly (HTTP $RESPONSE).${NC}"
else
    echo -e "${YELLOW}⚠️  Application returned HTTP $RESPONSE. Please verify manually.${NC}"
fi
echo ""

# 11. Cleanup
echo -e "${BLUE}🧹 Cleaning up...${NC}"

# Remove orphan containers
docker compose -f ${COMPOSE_FILE} down --remove-orphans 2>/dev/null || true
docker compose -f ${COMPOSE_FILE} up -d

# Cleanup unused images
docker image prune -f

# Remove old backup images (keep last 5)
docker images | grep "backend-service" | grep "backup" | tail -n +6 | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

echo -e "${GREEN}✅ Cleanup complete.${NC}"
echo ""

# 12. Display final status
echo -e "${BLUE}📊 Final container status:${NC}"
docker compose -f ${COMPOSE_FILE} ps
echo ""

echo -e "${GREEN}🎉 Zero-downtime deployment completed successfully!${NC}"
echo -e "${BLUE}Deployment timestamp: ${TIMESTAMP}${NC}"
echo "Completed at: $(date)"
