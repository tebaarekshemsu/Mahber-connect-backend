#!/bin/bash

echo "🚀 MahberConnect Hybrid Deployment Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}This script will help you set up your deployment.${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
fi

echo ""
echo -e "${BLUE}Step 1: Database (Neon)${NC}"
echo "1. Go to https://neon.tech"
echo "2. Create a new project"
echo "3. Copy your connection string"
echo ""
read -p "Enter your Neon DATABASE_URL: " DATABASE_URL

echo ""
echo -e "${BLUE}Step 2: Redis (Upstash)${NC}"
echo "1. Go to https://upstash.com"
echo "2. Create a new Redis database"
echo "3. Get your connection details"
echo ""
read -p "Enter REDIS_HOST: " REDIS_HOST
read -p "Enter REDIS_PORT (default 6379): " REDIS_PORT
REDIS_PORT=${REDIS_PORT:-6379}
read -p "Enter REDIS_PASSWORD: " REDIS_PASSWORD

echo ""
echo -e "${BLUE}Step 3: JWT Secret${NC}"
echo "Generating a secure JWT secret..."
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
echo -e "${GREEN}✓ Generated JWT_SECRET${NC}"

echo ""
echo -e "${BLUE}Step 4: Update .env file${NC}"

# Update .env file
sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" .env
sed -i.bak "s|REDIS_HOST=.*|REDIS_HOST=$REDIS_HOST|" .env
sed -i.bak "s|REDIS_PORT=.*|REDIS_PORT=$REDIS_PORT|" .env
sed -i.bak "s|REDIS_PASSWORD=.*|REDIS_PASSWORD=$REDIS_PASSWORD|" .env
sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env

echo -e "${GREEN}✓ Updated .env file${NC}"

echo ""
echo -e "${BLUE}Step 5: Test local setup${NC}"
echo "Running: pnpm install && pnpm prisma generate && pnpm prisma migrate deploy"
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Deploy API to Vercel:"
echo "   - Go to https://vercel.com"
echo "   - Import your GitHub repository"
echo "   - Add environment variables from .env"
echo ""
echo "2. Deploy Worker to Render:"
echo "   - Go to https://render.com"
echo "   - Create a Background Worker"
echo "   - Use Dockerfile.worker"
echo "   - Add environment variables from .env"
echo ""
echo "3. Read DEPLOYMENT_HYBRID.md for detailed instructions"
echo ""
