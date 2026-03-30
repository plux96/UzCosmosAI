# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend + serve frontend
FROM python:3.11-slim
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY config/ ./config/
COPY backend/ ./backend/
COPY main.py .

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Serve static frontend from FastAPI
RUN echo 'from fastapi.staticfiles import StaticFiles' >> /tmp/patch.txt

ENV PORT=8000
EXPOSE 8000

CMD ["python", "main.py"]
