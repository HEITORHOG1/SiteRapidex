# Implementation Plan

- [x] 1. Enhance authentication infrastructure and API configuration
  - Update AuthService to support refresh token functionality
  - Create ApiConfigService for flexible endpoint management
  - Implement HTTP interceptors for automatic token handling and error management
  - _Requirements: 1.1, 1.2, 1.5, 2.1, 2.2, 2.3, 2.4, 6.3, 6.4_

- [x] 2. Create enhanced authentication models and interfaces
  - Extend existing auth models with RefreshTokenRequest interface
  - Create AuthState interface with loading states
  - Implement ApiError and ErrorCodes enums for consistent error handling
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 6.1, 6.2_

- [x] 3. Implement refresh token functionality in AuthService
  - Add refreshToken() method to AuthService
  - Implement automatic token refresh logic before expiration
  - Update token storage and state management for refresh tokens
  - Create unit tests for refresh token functionality
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2_

- [x] 4. Create HTTP interceptors for authentication and error handling
  - Implement AuthTokenInterceptor to automatically add Bearer tokens
  - Create ErrorInterceptor for global error handling and token refresh
  - Add retry logic for failed requests due to token expiration
  - Write unit tests for interceptor functionality
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.3, 6.4_

- [x] 5. Enhance EstabelecimentoService with improved error handling
  - Update existing EstabelecimentoService to use new error handling patterns
  - Implement proper loading states and error states
  - Add retry mechanisms for failed API calls
  - Create unit tests for service error scenarios
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2_

- [x] 6. Create shared UI components for loading and error states
  - Implement LoadingSpinnerComponent with different sizes and messages
  - Create ErrorMessageComponent with retry functionality
  - Build NotificationService for toast messages
  - Add SCSS styling following design system tokens
  - _Requirements: 1.5, 3.5, 5.2, 5.3, 5.4, 5.5, 6.6_

- [x] 7. Create EstabelecimentoCardComponent for elegant establishment display
  - Build EstabelecimentoCardComponent as dumb component
  - Implement responsive card design with establishment information
  - Add selection states and hover effects
  - Include loading skeleton states
  - Write component unit tests
  - _Requirements: 3.2, 4.1, 4.5, 5.1, 5.2, 5.3, 6.5_

- [ ] 8. Create EstabelecimentoSelectorComponent for establishment selection
  - Implement EstabelecimentoSelectorComponent as dumb component
  - Create grid/list layout for multiple establishments
  - Add selection logic and visual feedback
  - Implement empty state when no establishments exist
  - Write component unit tests
  - _Requirements: 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 6.5_

- [ ] 9. Enhance LoginComponent with improved UX and error handling
  - Update existing LoginComponent to use new error handling
  - Add loading states and improved form validation
  - Implement elegant error message display
  - Add responsive design improvements
  - Update component tests
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 10. Enhance DashboardComponent with establishment selection UI
  - Update existing DashboardComponent to use new EstabelecimentoSelectorComponent
  - Implement establishment selection flow with visual feedback
  - Add loading states for establishment data
  - Integrate error handling and retry mechanisms
  - Update dashboard stats based on selected establishment
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_

- [ ] 11. Implement design system SCSS architecture
  - Create design tokens SCSS file with colors, typography, and spacing
  - Implement responsive breakpoint mixins
  - Create animation and transition utilities
  - Build component-specific SCSS following BEM methodology
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.6_

- [ ] 12. Add accessibility features and ARIA support
  - Implement keyboard navigation for establishment selection
  - Add ARIA labels and roles to interactive elements
  - Ensure proper focus management and visual indicators
  - Test with screen reader compatibility
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 13. Create comprehensive unit tests for authentication flow
  - Write unit tests for enhanced AuthService methods
  - Test HTTP interceptors with various scenarios
  - Create tests for error handling and retry logic
  - Test token refresh functionality
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3, 6.4_

- [ ] 14. Create comprehensive unit tests for establishment selection
  - Write unit tests for EstabelecimentoService enhancements
  - Test EstabelecimentoCardComponent and EstabelecimentoSelectorComponent
  - Create tests for dashboard integration
  - Test error scenarios and loading states
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2_

- [ ] 15. Implement end-to-end integration testing
  - Create E2E test for complete authentication flow
  - Test establishment selection and dashboard navigation
  - Verify responsive behavior on different screen sizes
  - Test error scenarios and recovery flows
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 5.1_

- [ ] 16. Performance optimization and final polish
  - Implement OnPush change detection strategy where appropriate
  - Add trackBy functions for establishment lists
  - Optimize bundle size and implement lazy loading
  - Add final UI polish and animations
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.5, 6.6_
