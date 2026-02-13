#!/bin/bash

# ============================================================================
# BEAM for Individuals - Setup Script
# ============================================================================
# This script automates steps 1-4 of the setup process:
# 1. Install dependencies
# 2. Configure environment
# 3. Initialize database
# 4. Start server
#
# Usage: bash SETUP.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_header() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC} $1"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

# ============================================================================
# STEP 1: INSTALL DEPENDENCIES
# ============================================================================

step_install_dependencies() {
  print_header "Step 1: Installing Dependencies"

  # Check if Node.js is installed
  if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
  fi
  print_success "Node.js $(node --version) found"

  # Check if npm is installed
  if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
  fi
  print_success "npm $(npm --version) found"

  # Navigate to server directory
  cd server

  # Install dependencies
  print_info "Installing npm packages..."
  npm install

  if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
  else
    print_error "Failed to install dependencies"
    exit 1
  fi

  cd ..
}

# ============================================================================
# STEP 2: CONFIGURE ENVIRONMENT
# ============================================================================

step_configure_environment() {
  print_header "Step 2: Configuring Environment"

  ENV_FILE="server/.env"

  # Check if .env already exists
  if [ -f "$ENV_FILE" ]; then
    print_warning ".env file already exists"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      print_info "Using existing .env file"
      return
    fi
  fi

  # Copy .env.example to .env
  if [ -f "server/.env.example" ]; then
    cp server/.env.example "$ENV_FILE"
    print_success ".env file created from template"
  else
    print_error ".env.example not found"
    exit 1
  fi

  # Prompt for configuration
  print_info "Please configure the following values in $ENV_FILE:"
  echo ""
  echo "  Database:"
  echo "    DB_HOST: localhost"
  echo "    DB_USER: beam_user"
  echo "    DB_PASSWORD: (create a secure password)"
  echo ""
  echo "  Email:"
  echo "    EMAIL_USER: your-email@gmail.com"
  echo "    EMAIL_PASSWORD: your-app-password"
  echo ""
  echo "  Stripe:"
  echo "    STRIPE_SECRET_KEY: sk_test_..."
  echo "    STRIPE_PUBLISHABLE_KEY: pk_test_..."
  echo "    STRIPE_WEBHOOK_SECRET: whsec_..."
  echo ""
  echo "  APIs:"
  echo "    TAVILY_API_KEY: tvly_..."
  echo "    LLM_API_KEY: sk_..."
  echo ""

  read -p "Press Enter after configuring .env file..."
}

# ============================================================================
# STEP 3: INITIALIZE DATABASE
# ============================================================================

step_initialize_database() {
  print_header "Step 3: Initializing Database"

  # Check if MySQL is installed
  if ! command -v mysql &> /dev/null; then
    print_warning "MySQL client is not installed"
    echo "Please install MySQL client:"
    echo "  Ubuntu/Debian: sudo apt install mysql-client"
    echo "  macOS: brew install mysql-client"
    exit 1
  fi
  print_success "MySQL client found"

  # Check database connection
  print_info "Testing database connection..."
  
  cd server
  
  # Run database initialization
  if [ -f "db-init.js" ]; then
    print_info "Running database initialization..."
    node db-init.js
    
    if [ $? -eq 0 ]; then
      print_success "Database initialized successfully"
    else
      print_error "Failed to initialize database"
      print_warning "Make sure MySQL is running and .env credentials are correct"
      exit 1
    fi
  else
    print_error "db-init.js not found"
    exit 1
  fi

  cd ..
}

# ============================================================================
# STEP 4: TEST EMAIL SERVICE
# ============================================================================

step_test_email() {
  print_header "Step 4: Testing Email Service"

  cd server

  print_info "Testing email configuration..."
  
  node -e "
    const emailService = require('./services/emailService.js');
    emailService.initializeTransporter();
    emailService.testConfiguration().then(result => {
      if (result) {
        console.log('✓ Email service configured correctly');
        process.exit(0);
      } else {
        console.log('✗ Email service configuration failed');
        process.exit(1);
      }
    }).catch(err => {
      console.log('✗ Email service error:', err.message);
      process.exit(1);
    });
  "

  if [ $? -eq 0 ]; then
    print_success "Email service is working"
  else
    print_warning "Email service test failed"
    print_info "You can still start the server, but email features will not work"
    print_info "Check your email credentials in .env file"
  fi

  cd ..
}

# ============================================================================
# STEP 5: START SERVER
# ============================================================================

step_start_server() {
  print_header "Step 5: Starting Server"

  cd server

  print_info "Starting BEAM API server..."
  print_info "Press Ctrl+C to stop the server"
  echo ""

  npm start

  cd ..
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  print_header "BEAM for Individuals - Setup Wizard"

  print_info "This script will:"
  echo "  1. Install dependencies"
  echo "  2. Configure environment variables"
  echo "  3. Initialize database"
  echo "  4. Test email service"
  echo "  5. Start the server"
  echo ""

  read -p "Continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Setup cancelled"
    exit 0
  fi

  # Run setup steps
  step_install_dependencies
  step_configure_environment
  step_initialize_database
  step_test_email
  step_start_server
}

# Run main function
main
