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
