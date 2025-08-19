# ================================
# Stage 1: Build frontend (React/Vite)
# ================================
FROM node:18 AS frontend-builder

WORKDIR /app/frontend
COPY frontend/ ./
RUN npm install && npm run build

# ================================
# Stage 2: Backend + Final Image
# ================================
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Create app directory
WORKDIR /app

# Install system dependencies (ffmpeg for pydub + fonts)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data (punkt)
RUN python -m nltk.downloader punkt punkt_tab

# Copy backend code
COPY . .

# Copy built frontend into FastAPI frontend_build directory
RUN mkdir -p /app/frontend_build
COPY --from=frontend-builder /app/frontend/dist /app/frontend_build

# Expose port
EXPOSE 8080

# Run FastAPI with Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
