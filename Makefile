SHELL := /bin/bash

.PHONY: help install dev test

help:
	@echo "make install  - install backend and frontend dependencies"
	@echo "make dev      - run backend (:8080) and frontend (:5173) together; Ctrl+C stops both"
	@echo "make test     - run backend and frontend tests"

install:
	cd backend && npm install
	cd frontend && npm install

dev:
	@# set -m puts each server in its own process group, so Ctrl+C reaches
	@# only this shell and the trap stops both servers (and their children).
	@set -m; \
	(cd backend && exec npm run dev) </dev/null & api=$$!; \
	(cd frontend && exec npm run dev) </dev/null & web=$$!; \
	trap '{ kill -TERM -- -$$api -$$web; wait; } 2>/dev/null; echo; echo "dev servers stopped"; exit 0' INT TERM; \
	wait

test:
	cd backend && npm test
	cd frontend && npm test
