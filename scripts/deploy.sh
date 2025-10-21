sudo rm -r nginx-cache
docker compose -f docker-compose.prod.yaml build
docker compose -f docker-compose.prod.yaml down
docker compose -f docker-compose.prod.yaml up -d --build
echo "Deployed successfully!"
