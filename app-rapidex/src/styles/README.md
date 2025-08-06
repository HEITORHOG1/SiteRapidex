# Design System SCSS Architecture

This document describes the comprehensive SCSS architecture implemented for the RapidEx application, following BEM methodology and modern design system principles.

## File Structure

```
src/styles/
├── _tokens.scss          # Design tokens (colors, typography, spacing)
├── _mixins.scss          # Utility mixins and responsive breakpoints
├── _animations.scss      # Animation keyframes and utility classes
├── _components.scss      # Component-specific styles (BEM)
├── _utilities.scss       # Utility classes
├── styles.scss           # Main entry point
└── README.md            # This documentation
```

## Design Tokens (_tokens.scss)

### Colors

#### Brand Colors
- **Primary**: Blue color palette (`$primary-50` to `$primary-900`)
- **Secondary**: Gray color palette (`$secondary-50` to `$secondary-900`)

#### Semantic Colors
- **Success**: Green palette for positive actions
- **Error**: Red palette for errors and warnings
- **Warning**: Amber palette for cautions
- **Info**: Blue palette for informational content

#### Neutral Colors
- **Gray Scale**: From `$gray-50` (lightest) to `$gray-900` (darkest)
- **White**: Pure white (`$white`)

### Typography

#### Font Families
- **Primary**: Inter with system font fallbacks
- **Mono**: JetBrains Mono for code/monospace content

#### Font Sizes
- Range from `$font-size-xs` (12px) to `$font-size-6xl` (60px)
- Base size is 16px (`$font-size-base`)

#### Font Weights
- From `$font-weight-thin` (100) to `$font-weight-black` (900)

#### Line Heights
- `$line-height-none` (1) to `$line-height-loose` (2)

### Spacing

#### Spacing Scale
- Consistent 4px base unit system
- From `$spacing-0` (0) to `$spacing-32` (128px)
- Legacy aliases for backward compatibility

### Border & Shadows

#### Border Radius
- From `$border-radius-none` to `$border-radius-full`
- Consistent scaling system

#### Shadows
- Elevation system from `$shadow-sm` to `$shadow-2xl`
- Focus shadows for accessibility

### Transitions & Animations

#### Durations
- `$duration-75` to `$duration-1000`
- Standard transition speeds

#### Easing Functions
- Various cubic-bezier functions for different animation feels

## Mixins (_mixins.scss)

### Responsive Breakpoints

```scss
@include mobile-only { /* styles */ }
@include tablet-up { /* styles */ }
@include desktop-up { /* styles */ }
@include large-desktop-up { /* styles */ }
```

### Layout Utilities

```scss
@include flex-center;
@include flex-between;
@include flex-column-center;
@include grid-center;
```

### Component Mixins

```scss
@include button-base;
@include button-variant($bg-color, $text-color);
@include card($padding, $radius, $shadow);
@include form-control;
```

### Animation Mixins

```scss
@include animate($name, $duration, $timing);
@include transition($properties, $duration);
```

## Components (_components.scss)

### Button Components

```html
<button class="btn btn--primary btn--lg">Primary Button</button>
<button class="btn btn--secondary btn--outline">Secondary Outline</button>
```

### Card Components

```html
<div class="card card--elevated">
  <div class="card__header">
    <h3 class="card__title">Card Title</h3>
  </div>
  <div class="card__body">Content</div>
</div>
```

### Form Components

```html
<div class="form-group">
  <label class="form-group__label">Label</label>
  <input class="form-group__input" type="text">
  <div class="form-group__error">Error message</div>
</div>
```

### Loading Components

```html
<div class="loading__spinner loading__spinner--primary"></div>
<div class="loading__skeleton loading__skeleton--text"></div>
```

### Alert Components

```html
<div class="alert alert--success">
  <div class="alert__title">Success!</div>
  <div class="alert__message">Operation completed successfully.</div>
</div>
```

## Utilities (_utilities.scss)

### Display Utilities
```html
<div class="d-flex justify-center align-center">
<div class="d-grid grid-cols-3 gap-4">
```

### Spacing Utilities
```html
<div class="m-4 p-6">  <!-- margin: 1rem, padding: 1.5rem -->
<div class="mx-auto">  <!-- margin-left: auto, margin-right: auto -->
```

### Typography Utilities
```html
<p class="text-lg font-semibold text-primary">
<p class="text-center text-truncate">
```

### Color Utilities
```html
<div class="bg-primary text-white">
<div class="border border-gray-200">
```

### Responsive Utilities
```html
<div class="d-block sm:d-flex md:grid-cols-4">
```

## Animations (_animations.scss)

### Entrance Animations
```html
<div class="animate-fade-in">
<div class="animate-slide-in-up animate-delay-200">
```

### Attention Animations
```html
<button class="hover:animate-bounce">
<div class="animate-pulse">
```

### Loading Animations
```html
<div class="animate-spin">
<div class="animate-shimmer">
```

## BEM Methodology

### Block
The standalone entity that is meaningful on its own.
```scss
.card { /* styles */ }
```

### Element
A part of a block that has no standalone meaning.
```scss
.card__header { /* styles */ }
.card__title { /* styles */ }
.card__body { /* styles */ }
```

### Modifier
A flag on a block or element that changes appearance or behavior.
```scss
.card--elevated { /* styles */ }
.card__title--large { /* styles */ }
```

## Usage Examples

### Creating a New Component

1. **Define the block:**
```scss
.my-component {
  // Base styles
}
```

2. **Add elements:**
```scss
.my-component__header {
  // Header styles
}

.my-component__content {
  // Content styles
}
```

3. **Add modifiers:**
```scss
.my-component--large {
  // Large variant
}

.my-component--primary {
  // Primary variant
}
```

### Using Design Tokens

```scss
.my-component {
  padding: $spacing-4;
  background-color: $white;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-md;
  color: $gray-900;
  font-size: $font-size-base;
  transition: all $transition-normal;
}
```

### Responsive Design

```scss
.my-component {
  padding: $spacing-4;
  
  @include tablet-up {
    padding: $spacing-6;
  }
  
  @include desktop-up {
    padding: $spacing-8;
  }
}
```

## Accessibility Features

### Focus Management
- Focus rings with `@include focus-ring($color)`
- Visually hidden content with `@include visually-hidden`

### High Contrast Support
```scss
@media (prefers-contrast: high) {
  .component {
    border-width: 2px;
  }
}
```

### Reduced Motion Support
```scss
@media (prefers-reduced-motion: reduce) {
  .component {
    animation: none;
    transition: none;
  }
}
```

## Performance Considerations

### CSS Custom Properties
Use CSS custom properties for dynamic theming:
```scss
.component {
  --component-color: #{$primary-color};
  color: var(--component-color);
}
```

### Critical CSS
- Keep critical styles inline
- Load non-critical styles asynchronously

### Bundle Optimization
- Use tree-shaking for unused utilities
- Purge unused CSS in production

## Best Practices

### Naming Conventions
- Use kebab-case for class names
- Follow BEM methodology strictly
- Use semantic naming over presentational

### Code Organization
- Group related styles together
- Use consistent indentation (2 spaces)
- Comment complex calculations or decisions

### Maintainability
- Use design tokens instead of hardcoded values
- Create reusable mixins for common patterns
- Document component APIs and usage

### Performance
- Avoid deep nesting (max 3 levels)
- Use efficient selectors
- Minimize specificity conflicts

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11 support with appropriate fallbacks
- Progressive enhancement for newer features

## Contributing

When adding new styles:

1. Use existing design tokens
2. Follow BEM methodology
3. Add responsive breakpoints
4. Include accessibility features
5. Test across browsers
6. Update documentation

## Migration Guide

### From Legacy Styles
1. Replace hardcoded values with design tokens
2. Convert to BEM naming convention
3. Use utility classes where appropriate
4. Add responsive breakpoints
5. Include accessibility features