// ================================
// Environment Configuration
// ================================

// You can modify this file to change the API endpoint
// For development: http://localhost:8000
// For production: https://your-domain.com/api

const ENV_CONFIG = {
    development: {
        API_BASE_URL: 'http://localhost:8000',
        DEBUG: true
    },
    production: {
        API_BASE_URL: 'https://your-production-domain.com/api',
        DEBUG: false
    }
};

// Set current environment (change to 'production' when deploying)
const CURRENT_ENV = 'development';

// Export configuration
window.APP_CONFIG = {
    ...ENV_CONFIG[CURRENT_ENV],
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['application/pdf'],
    MIN_JD_LENGTH: 50,
    LOADING_MESSAGES: [
        'Initializing analysis...',
        'Reading your resume...',
        'Analyzing job requirements...',
        'Comparing skills and experience...',
        'Identifying gaps and opportunities...',
        'Generating recommendations...',
        'Finalizing results...'
    ]
};