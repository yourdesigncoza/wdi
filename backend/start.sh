#!/bin/bash
set -e

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Seed clause library (idempotent — skips existing clauses)
echo "Seeding clause library..."
python -m scripts.seed_clauses

# Start FastAPI
echo "Starting WillCraft API on port $PORT..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
