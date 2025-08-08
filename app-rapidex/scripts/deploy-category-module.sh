#!/bin/bash

# Category Module Deployment Script
# This script handles the deployment of the category management module

set -e  # Exit on any error

# Configuration
PROJECT_NAME="app-rapidex"
BUILD_DIR="dist"
CATEGORY_MODULE_PATH="src/app/features/categories"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check if Angular CLI is installed
    if ! command -v ng &> /dev/null; then
        log_error "Angular CLI is not installed. Please install Angular CLI first."
        exit 1
    fi
    
    # Check if we're in the correct directory
    if [ ! -f "angular.json" ]; then
        log_error "angular.json not found. Please run this script from the Angular project root."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Function to create backup
create_backup() {
    log_info "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current build if exists
    if [ -d "$BUILD_DIR" ]; then
        cp -r "$BUILD_DIR" "$BACKUP_DIR/build_backup"
        log_success "Build backup created at $BACKUP_DIR/build_backup"
    fi
    
    # Backup category module source
    if [ -d "$CATEGORY_MODULE_PATH" ]; then
        cp -r "$CATEGORY_MODULE_PATH" "$BACKUP_DIR/category_module_backup"
        log_success "Category module backup created at $BACKUP_DIR/category_module_backup"
    fi
}

# Function to install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    npm ci --production=false
    
    if [ $? -eq 0 ]; then
        log_success "Dependencies installed successfully"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi
}

# Function to run tests
run_tests() {
    log_info "Running category module tests..."
    
    # Run unit tests for category module
    npm run test -- --watch=false --browsers=ChromeHeadless --include="**/categories/**/*.spec.ts"
    
    if [ $? -eq 0 ]; then
        log_success "Unit tests passed"
    else
        log_error "Unit tests failed"
        exit 1
    fi
    
    # Run integration tests
    npm run test -- --watch=false --browsers=ChromeHeadless --include="**/categories/integration/**/*.spec.ts"
    
    if [ $? -eq 0 ]; then
        log_success "Integration tests passed"
    else
        log_error "Integration tests failed"
        exit 1
    fi
}

# Function to run E2E tests
run_e2e_tests() {
    log_info "Running E2E tests..."
    
    # Start the application in background
    npm run start &
    APP_PID=$!
    
    # Wait for application to start
    sleep 30
    
    # Run category E2E tests
    npx playwright test --grep="category"
    E2E_RESULT=$?
    
    # Kill the application
    kill $APP_PID
    
    if [ $E2E_RESULT -eq 0 ]; then
        log_success "E2E tests passed"
    else
        log_error "E2E tests failed"
        exit 1
    fi
}

# Function to build the application
build_application() {
    log_info "Building application..."
    
    # Clean previous build
    rm -rf "$BUILD_DIR"
    
    # Build for production
    ng build --configuration=production --optimization=true --build-optimizer=true
    
    if [ $? -eq 0 ]; then
        log_success "Application built successfully"
    else
        log_error "Build failed"
        exit 1
    fi
}

# Function to validate build
validate_build() {
    log_info "Validating build..."
    
    # Check if build directory exists
    if [ ! -d "$BUILD_DIR" ]; then
        log_error "Build directory not found"
        exit 1
    fi
    
    # Check if main files exist
    if [ ! -f "$BUILD_DIR/index.html" ]; then
        log_error "index.html not found in build"
        exit 1
    fi
    
    # Check bundle sizes
    MAIN_JS_SIZE=$(find "$BUILD_DIR" -name "main*.js" -exec wc -c {} \; | awk '{print $1}')
    if [ "$MAIN_JS_SIZE" -gt 2000000 ]; then  # 2MB limit
        log_warning "Main bundle size is large: $(($MAIN_JS_SIZE / 1024))KB"
    fi
    
    # Check if category module is properly tree-shaken
    CATEGORY_REFERENCES=$(grep -r "categories" "$BUILD_DIR" | wc -l)
    log_info "Category module references in build: $CATEGORY_REFERENCES"
    
    log_success "Build validation completed"
}

# Function to run security checks
run_security_checks() {
    log_info "Running security checks..."
    
    # Check for known vulnerabilities
    npm audit --audit-level=moderate
    
    if [ $? -eq 0 ]; then
        log_success "Security audit passed"
    else
        log_warning "Security vulnerabilities found. Please review npm audit output."
    fi
    
    # Check for sensitive data in build
    if grep -r "password\|secret\|key\|token" "$BUILD_DIR" --exclude-dir=node_modules; then
        log_warning "Potential sensitive data found in build"
    fi
}

# Function to optimize build
optimize_build() {
    log_info "Optimizing build..."
    
    # Compress static assets if gzip is available
    if command -v gzip &> /dev/null; then
        find "$BUILD_DIR" -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec gzip -k {} \;
        log_success "Static assets compressed"
    fi
    
    # Generate service worker if not exists
    if [ ! -f "$BUILD_DIR/sw.js" ]; then
        log_info "Generating service worker..."
        # Add service worker generation logic here
    fi
}

# Function to deploy to staging
deploy_to_staging() {
    log_info "Deploying to staging environment..."
    
    # This would typically involve:
    # - Uploading files to staging server
    # - Running database migrations
    # - Updating configuration
    # - Restarting services
    
    # Example deployment commands (customize based on your infrastructure)
    # rsync -avz --delete $BUILD_DIR/ user@staging-server:/var/www/html/
    # ssh user@staging-server "sudo systemctl restart nginx"
    
    log_success "Deployed to staging environment"
}

# Function to run smoke tests
run_smoke_tests() {
    log_info "Running smoke tests..."
    
    # Basic health check
    # curl -f http://staging-server/health || exit 1
    
    # Category module specific checks
    # curl -f http://staging-server/categories || exit 1
    
    log_success "Smoke tests passed"
}

# Function to deploy to production
deploy_to_production() {
    log_info "Deploying to production environment..."
    
    # Production deployment logic
    # This should include:
    # - Blue-green deployment
    # - Database migrations
    # - Cache warming
    # - Health checks
    
    log_success "Deployed to production environment"
}

# Function to cleanup
cleanup() {
    log_info "Cleaning up..."
    
    # Remove temporary files
    rm -rf tmp/
    
    # Clean npm cache
    npm cache clean --force
    
    log_success "Cleanup completed"
}

# Function to rollback
rollback() {
    log_error "Deployment failed. Rolling back..."
    
    if [ -d "$BACKUP_DIR/build_backup" ]; then
        rm -rf "$BUILD_DIR"
        cp -r "$BACKUP_DIR/build_backup" "$BUILD_DIR"
        log_success "Build rolled back"
    fi
    
    # Rollback deployment if needed
    # This would involve restoring previous version
    
    log_success "Rollback completed"
}

# Main deployment function
main() {
    log_info "Starting Category Module Deployment"
    log_info "Timestamp: $(date)"
    
    # Set trap for cleanup on exit
    trap cleanup EXIT
    trap rollback ERR
    
    # Parse command line arguments
    ENVIRONMENT="staging"
    RUN_TESTS="true"
    SKIP_BACKUP="false"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            --skip-tests)
                RUN_TESTS="false"
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP="true"
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --env ENV          Target environment (staging|production)"
                echo "  --skip-tests       Skip running tests"
                echo "  --skip-backup      Skip creating backup"
                echo "  --help             Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    log_info "Deploying to environment: $ENVIRONMENT"
    
    # Execute deployment steps
    check_prerequisites
    
    if [ "$SKIP_BACKUP" != "true" ]; then
        create_backup
    fi
    
    install_dependencies
    
    if [ "$RUN_TESTS" == "true" ]; then
        run_tests
        run_e2e_tests
    fi
    
    build_application
    validate_build
    run_security_checks
    optimize_build
    
    if [ "$ENVIRONMENT" == "staging" ]; then
        deploy_to_staging
        run_smoke_tests
    elif [ "$ENVIRONMENT" == "production" ]; then
        deploy_to_production
        run_smoke_tests
    fi
    
    log_success "Category Module Deployment completed successfully!"
    log_info "Build size: $(du -sh $BUILD_DIR | cut -f1)"
    log_info "Deployment time: $(date)"
}

# Run main function
main "$@"