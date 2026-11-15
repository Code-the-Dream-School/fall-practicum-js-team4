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
	@trap 'kill 0' EXIT; \
	(cd backend && npm run dev) & \
	(cd frontend && npm run dev) & \
	wait

test:
	cd backend && npm test
	cd frontend && npm test
