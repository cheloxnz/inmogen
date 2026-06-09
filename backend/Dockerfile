FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libcairo2 libcairo2-dev pkg-config python3-dev gcc \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8003

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
