#!/bin/bash
set -euo pipefail

# This script extracts the NuoDB client files from the Docker image
# to a local directory to be used for building the Node.js driver.

IMAGE_NAME="nuodb/nuodb:latest"
CONTAINER_PATH="/opt/nuodb"
LOCAL_DESTINATION="${PWD}/.nuodb_client_tmp"

echo "Extracting NuoDB client from Docker image: $IMAGE_NAME..."

if [ -d "$LOCAL_DESTINATION" ]; then
  echo "Removing old extraction directory: $LOCAL_DESTINATION"
  rm -rf "$LOCAL_DESTINATION"
fi

mkdir -p "$LOCAL_DESTINATION"

CONTAINER_ID=$(docker create "$IMAGE_NAME")
trap 'docker rm -f "$CONTAINER_ID" >/dev/null 2>&1 || true' EXIT

echo "Copying files from $CONTAINER_PATH to $LOCAL_DESTINATION..."
docker cp "$CONTAINER_ID:$CONTAINER_PATH/." "$LOCAL_DESTINATION"

docker rm "$CONTAINER_ID"
trap - EXIT

echo "Extraction complete. Files are located in: $LOCAL_DESTINATION"
