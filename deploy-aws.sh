#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${FRONTEND_DIR:-$ROOT_DIR/frontend}"
BACKEND_DIR="${BACKEND_DIR:-$ROOT_DIR/backend}"

AWS_REGION="${AWS_REGION:-us-east-1}"
S3_BUCKET="${S3_BUCKET:-vend-88}"
S3_PREFIX="${S3_PREFIX:-label/}"

EC2_HOST="${EC2_HOST:-54.90.180.79}"
EC2_USER="${EC2_USER:-ec2-user}"
SSH_KEY="${SSH_KEY:-$ROOT_DIR/Clark.pem}"
REMOTE_DIR="${REMOTE_DIR:-/home/ec2-user}"

BACKEND_IMAGE="${BACKEND_IMAGE:-labelprint_backend:latest}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-labelprint_backend}"

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Frontend directory not found: $FRONTEND_DIR" >&2
  exit 1
fi

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Backend directory not found: $BACKEND_DIR" >&2
  exit 1
fi

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found: $SSH_KEY" >&2
  exit 1
fi

tmp_archive="$(mktemp "${TMPDIR:-/tmp}/labelprint-backend.XXXXXX.tar.gz")"
cleanup() {
  rm -f "$tmp_archive"
}
trap cleanup EXIT

echo "[1/4] Building frontend..."
(cd "$FRONTEND_DIR" && npm run build)

echo "[2/4] Uploading frontend to S3..."
(cd "$FRONTEND_DIR" && aws s3 sync dist/ "s3://$S3_BUCKET/$S3_PREFIX" --delete --region "$AWS_REGION")

echo "[3/4] Packaging backend..."
tar -czf "$tmp_archive" \
  --exclude='backend/node_modules' \
  --exclude='backend/.git' \
  --exclude='backend/.DS_Store' \
  -C "$ROOT_DIR" backend

echo "[4/4] Uploading and deploying backend on EC2..."
scp -i "$SSH_KEY" "$tmp_archive" "$EC2_USER@$EC2_HOST:$REMOTE_DIR/backend.tar.gz"

ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "bash -s" <<EOF
set -euo pipefail

cd "$REMOTE_DIR"
tar -xzf backend.tar.gz
cd backend

docker rm -f "$BACKEND_CONTAINER" >/dev/null 2>&1 || true
docker build -t "$BACKEND_IMAGE" .
docker run -d \
  --name "$BACKEND_CONTAINER" \
  -p 3080:3080 \
  --env-file .env \
  --restart unless-stopped \
  "$BACKEND_IMAGE"

sleep 5
docker logs --tail 40 "$BACKEND_CONTAINER"
EOF

echo "Deployment finished successfully."