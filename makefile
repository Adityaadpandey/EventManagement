.PHONY: all
all: setup

.PHONY: setup
setup:
	docker compose up -d
	pnpm install
	pnpm build:packages
	cd packages/database && npx prisma db push

.PHONY: production_up
production_up:
	docker compose -f docker-compose.prod.yaml up -d --build

.PHONY: production_down
production_down:
	docker compose -f docker-compose.prod.yaml down

.PHONY: production_logs
production_logs:
	docker compose -f docker-compose.prod.yaml logs -f
