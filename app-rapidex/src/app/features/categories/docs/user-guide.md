# Category Management User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Managing Categories](#managing-categories)
3. [Creating Categories](#creating-categories)
4. [Editing Categories](#editing-categories)
5. [Deleting Categories](#deleting-categories)
6. [Searching and Filtering](#searching-and-filtering)
7. [Import and Export](#import-and-export)
8. [Offline Usage](#offline-usage)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## Getting Started

### Prerequisites

Before you can manage categories, ensure you have:

1. **Active Account**: A valid Rapidex account with establishment owner permissions
2. **Selected Establishment**: At least one establishment selected in your account
3. **Internet Connection**: For real-time synchronization (offline mode available)

### Accessing Category Management

1. Log in to your Rapidex dashboard
2. Select your establishment from the dropdown menu
3. Navigate to **Categories** from the main menu
4. You'll see your category management dashboard

## Managing Categories

### Category Overview

Categories help you organize your products and services into logical groups. Each category:

- Belongs to a specific establishment
- Has a unique name within that establishment
- Can contain multiple products/services
- Can be activated or deactivated
- Tracks creation and modification dates

### Category List View

The main category screen shows:

- **Category Cards**: Visual representation of each category
- **Search Bar**: Quick search functionality
- **Filter Options**: Filter by status, date, etc.
- **Action Buttons**: Create, edit, delete options
- **View Toggle**: Switch between grid and list views

## Creating Categories

### Step-by-Step Process

1. **Access Creation Form**
   - Click the **"+ New Category"** button
   - The creation form will open

2. **Fill Required Information**
   - **Name**: Enter a unique category name (2-100 characters)
   - **Description**: Add an optional description (up to 500 characters)

3. **Validation**
   - The system validates your input in real-time
   - Red indicators show validation errors
   - Green indicators confirm valid input

4. **Submit**
   - Click **"Create Category"** to save
   - Success message confirms creation
   - You're redirected to the category list

### Validation Rules

- **Name**: Required, 2-100 characters, unique within establishment
- **Description**: Optional, maximum 500 characters
- **Special Characters**: Limited to prevent security issues

### Tips for Creating Categories

- Use clear, descriptive names
- Keep descriptions concise but informative
- Consider your product organization strategy
- Plan for future expansion

## Editing Categories

### How to Edit

1. **Find the Category**
   - Locate the category in your list
   - Use search if you have many categories

2. **Access Edit Mode**
   - Click the **pencil icon** on the category card
   - Or click **"Edit"** from the category detail view

3. **Make Changes**
   - Modify name, description, or status
   - Real-time validation shows any errors

4. **Save Changes**
   - Click **"Update Category"**
   - Confirmation message appears
   - Changes are immediately visible

### What You Can Edit

- **Name**: Change the category name (must remain unique)
- **Description**: Update or add description
- **Status**: Activate or deactivate the category

### Edit Restrictions

- Cannot edit categories from other establishments
- Cannot duplicate names within the same establishment
- Cannot edit if you don't have proper permissions

## Deleting Categories

### Before You Delete

⚠️ **Important**: Categories with associated products cannot be deleted. You must:

1. Remove all products from the category, OR
2. Move products to other categories, OR
3. Deactivate the category instead

### Deletion Process

1. **Select Category**
   - Find the category to delete
   - Click the **trash icon**

2. **Confirm Deletion**
   - A confirmation dialog appears
   - Review the category details
   - Check for associated products

3. **Final Confirmation**
   - Type the category name to confirm
   - Click **"Delete Permanently"**
   - Category is immediately removed

### Safety Features

- **Dependency Check**: Prevents deletion of categories with products
- **Confirmation Dialog**: Requires explicit confirmation
- **Undo Option**: Recent deletions can be undone (within 5 minutes)
- **Audit Trail**: All deletions are logged

## Searching and Filtering

### Quick Search

- Use the search bar at the top of the category list
- Search by category name or description
- Results update as you type (debounced)
- Clear search to see all categories

### Advanced Filtering

Access advanced filters by clicking the **filter icon**:

- **Status**: Active, Inactive, or All
- **Date Range**: Filter by creation or modification date
- **Product Count**: Categories with/without products
- **Sort Options**: Name, date, usage frequency

### Search Tips

- Use partial words for broader results
- Combine search with filters for precision
- Save frequently used filter combinations
- Use keyboard shortcuts (Ctrl+F) for quick access

## Import and Export

### Exporting Categories

1. **Select Export Format**
   - CSV for spreadsheet applications
   - Excel for advanced formatting
   - PDF for printing or sharing

2. **Choose Data Range**
   - All categories or filtered subset
   - Include/exclude inactive categories
   - Select specific fields to export

3. **Download**
   - Click **"Export"**
   - File downloads automatically
   - Check your downloads folder

### Importing Categories

1. **Prepare Your File**
   - Use the provided template
   - Ensure proper column headers
   - Validate data before import

2. **Upload File**
   - Click **"Import Categories"**
   - Select your prepared file
   - Review the preview

3. **Validate and Import**
   - System validates all entries
   - Review any errors or warnings
   - Confirm import to proceed

### Import Guidelines

- **File Format**: CSV or Excel (.xlsx)
- **Required Columns**: Name (required), Description (optional)
- **Maximum Rows**: 1000 categories per import
- **Validation**: Names must be unique within establishment

## Offline Usage

### Offline Capabilities

The category management system works offline with limited functionality:

- **View Categories**: Browse your cached categories
- **Create/Edit**: Changes are queued for synchronization
- **Search**: Search within cached data
- **Delete**: Queued for processing when online

### Sync Process

1. **Automatic Sync**: When connection is restored
2. **Manual Sync**: Click the sync button
3. **Conflict Resolution**: System handles conflicts automatically
4. **Status Indicator**: Shows sync status

### Offline Limitations

- Cannot validate name uniqueness in real-time
- Limited to cached data
- Some advanced features unavailable
- Requires periodic online connection

## Troubleshooting

### Common Issues

#### "Category name already exists"
- **Cause**: Duplicate name within establishment
- **Solution**: Choose a different name or modify existing category

#### "Cannot delete category"
- **Cause**: Category has associated products
- **Solution**: Remove products first or deactivate category

#### "Access denied"
- **Cause**: Insufficient permissions or wrong establishment
- **Solution**: Check establishment selection and user permissions

#### "Connection error"
- **Cause**: Network connectivity issues
- **Solution**: Check internet connection, try again, or use offline mode

### Performance Issues

#### Slow loading
- **Causes**: Large number of categories, slow connection
- **Solutions**: Use pagination, enable caching, check network

#### Search not working
- **Causes**: JavaScript disabled, browser issues
- **Solutions**: Refresh page, clear browser cache, update browser

### Getting Help

1. **In-App Help**: Click the help icon (?) for contextual assistance
2. **Support Chat**: Use the chat widget for real-time help
3. **Documentation**: Refer to this guide and API documentation
4. **Contact Support**: Email support@rapidex.com for complex issues

## Best Practices

### Organization Strategy

1. **Logical Grouping**: Group related products/services together
2. **Consistent Naming**: Use clear, consistent naming conventions
3. **Hierarchy Planning**: Consider subcategories for complex catalogs
4. **Regular Review**: Periodically review and optimize categories

### Naming Conventions

- Use descriptive, business-friendly names
- Avoid technical jargon or abbreviations
- Keep names concise but clear
- Consider customer perspective

### Maintenance Tips

1. **Regular Cleanup**: Remove unused categories
2. **Status Management**: Deactivate instead of deleting when possible
3. **Documentation**: Keep descriptions updated
4. **Backup**: Regular exports for backup purposes

### Security Considerations

- Never share establishment access credentials
- Regularly review user permissions
- Monitor category changes through audit logs
- Report suspicious activity immediately

### Performance Optimization

1. **Limit Categories**: Keep reasonable number of active categories
2. **Use Descriptions**: Detailed descriptions improve searchability
3. **Regular Maintenance**: Archive old or unused categories
4. **Monitor Usage**: Track which categories are most/least used

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | Create new category |
| `Ctrl + F` | Focus search bar |
| `Ctrl + E` | Edit selected category |
| `Delete` | Delete selected category |
| `Escape` | Close modal/cancel action |
| `Enter` | Confirm action |
| `Tab` | Navigate between elements |
| `Space` | Select/deselect items |

## Mobile Usage

### Mobile-Specific Features

- **Touch Gestures**: Swipe to reveal actions
- **Responsive Design**: Optimized for all screen sizes
- **Offline Sync**: Works seamlessly on mobile networks
- **Quick Actions**: Streamlined interface for mobile efficiency

### Mobile Tips

- Use landscape mode for better visibility
- Enable notifications for sync status
- Use voice input for faster data entry
- Keep app updated for best performance

---

**Need more help?** Contact our support team at support@rapidex.com or use the in-app chat feature.