# Default target
.PHONY: all
all: setup

# Step 1: Setup Docker and install dependencies
.PHONY: setup
setup:
	docker compose up -d
	pnpm install
	pnpm build:packages
	cd packages/database && npx prisma db push


production_up:
	docker compose -f docker-compose.prod.yaml up -d --build
production_down:
	docker compose -f docker-compose.prod.yaml down
production_logs:
	docker compose -f docker-compose.prod.yaml logs -f
