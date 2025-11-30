# Multi-stage Dockerfile for CyberSec AI Agent System

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Python Backend
FROM python:3.11-slim AS backend

WORKDIR /app/backend

RUN apt-get update && apt-get install -y \
    curl \
    nmap \
    nikto \
    dirb \
    gobuster \
    sqlmap \
    wget \
    git \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml backend/uv.lock* ./
RUN pip install uv && uv sync

COPY backend/ .

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Stage 3: Production Image
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    py3-pip \
    curl \
    nmap \
    bash

COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/package*.json ./
COPY --from=frontend-builder /app/node_modules ./node_modules
COPY --from=frontend-builder /app/next.config.mjs ./

COPY backend ./backend

EXPOSE 5000 8000

COPY run.sh ./
RUN chmod +x run.sh

CMD ["./run.sh"]
