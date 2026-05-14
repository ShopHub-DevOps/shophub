.PHONY: test test-unit test-e2e test-int up down

# Run every backend test suite in one command.
test:
	cd backend && npm run test:all

test-unit:
	cd backend && npm test

test-e2e:
	cd backend && npm run test:e2e

test-int:
	cd backend && npm run test:int

# Local stack helpers.
up:
	docker compose up -d --build

down:
	docker compose down
