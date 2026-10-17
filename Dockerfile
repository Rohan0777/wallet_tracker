FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8088
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8088} --workers ${WEB_CONCURRENCY:-2} --proxy-headers"]
