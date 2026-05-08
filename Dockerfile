FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ .

RUN npm run build

COPY backend/ .

RUN mkdir -p frontend/dist

EXPOSE 8000

CMD ["python", "main.py"]