.PHONY: build run stop clean venv solve

build:
	docker compose build

run:
	docker compose up -d --build
	@echo "Running at http://localhost:3000"

stop:
	docker compose down

clean:
	docker compose down --rmi all

venv:
	python3 -m venv .venv
	.venv/bin/pip install chess python-dotenv

solve: venv
	.venv/bin/python polgar.py > problems.json
	node scripts/split-problems.js
	@echo "Generated problems.json and chunks in public/puzzles/"
