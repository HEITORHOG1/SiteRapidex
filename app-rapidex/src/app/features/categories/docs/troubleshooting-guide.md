# Category Management Troubleshooting Guide

## Table of Contents

1. [Common Issues](#common-issues)
2. [Error Messages](#error-messages)
3. [Performance Issues](#performance-issues)
4. [Authentication Problems](#authentication-problems)
5. [Data Synchronization Issues](#data-synchronization-issues)
6. [Browser Compatibility](#browser-compatibility)
7. [Network Issues](#network-issues)
8. [Form Validation Problems](#form-validation-problems)
9. [Accessibility Issues](#accessibility-issues)
10. [Advanced Troubleshooting](#advanced-troubleshooting)

## Common Issues

### Issue: "Category name already exists"

**Symptoms:**
- Error message when creating or editing categories
- Form submission fails with validation error
- Red error indicator on name field

**Causes:**
- Attempting to create a category with a name that already exists in the same establishment
- Case-insensitive name conflict
- Cached data showing outdated information

**Solutions:**

1. **Check existing categories:**
   ```
   1. Go to category list
   2. Use search to find similar names
   3. Choose a different, unique name
   ```

2. **Clear cache and retry:**
   ```
   1. Press Ctrl+F5 to hard refresh
   2. Clear browser cache
   3. Try creating the category again
   ```

3. **Modify existing category:**
   ```
   1. Find the existing category with the same name
   2. Edit or delete it if no longer needed
   3. Create your new category
   ```

**Prevention:**
- Use descriptive, unique names
- Check existing categories before creating new ones
- Implement naming conventions for your establishment

---

### Issue: "Cannot delete category"

**Symptoms:**
- Delete button is disabled or grayed out
- Error message about associated products
- Deletion confirmation dialog shows warnings

**Causes:**
- Category has associated products or services
- Category is referenced by other system components
- Insufficient permissions

**Solutions:**

1. **Remove associated products:**
   ```
   1. Go to category details
   2. View associated products list
   3. Move products to other categories or delete them
   4. Try deleting the category again
   ```

2. **Use deactivation instead:**
   ```
   1. Edit the category
   2. Set status to "Inactive"
   3. Save changes
   4. Category will be hidden but data preserved
   ```

3. **Check permissions:**
   ```
   1. Verify you're the establishment owner
   2. Check if you have admin privileges
   3. Contact support if permissions seem incorrect
   ```

**Prevention:**
- Regularly review and clean up unused categories
- Move products before deleting categories
- Use deactivation for categories you might need later

---

### Issue: Categories not loading

**Symptoms:**
- Empty category list
- Loading spinner that never stops
- "No categories found" message when categories should exist

**Causes:**
- Network connectivity issues
- Server problems
- Wrong establishment selected
- Authentication token expired

**Solutions:**

1. **Check establishment selection:**
   ```
   1. Look at the establishment dropdown
   2. Ensure correct establishment is selected
   3. Switch to the right establishment if needed
   ```

2. **Refresh authentication:**
   ```
   1. Log out of the application
   2. Log back in
   3. Navigate to categories again
   ```

3. **Check network connection:**
   ```
   1. Verify internet connectivity
   2. Try accessing other parts of the application
   3. Check browser console for network errors
   ```

4. **Clear application data:**
   ```
   1. Open browser developer tools (F12)
   2. Go to Application/Storage tab
   3. Clear localStorage and sessionStorage
   4. Refresh the page
   ```

**Prevention:**
- Maintain stable internet connection
- Keep browser updated
- Regularly clear browser cache

---

## Error Messages

### "Access denied to establishment"

**Meaning:** You don't have permission to access the selected establishment's categories.

**Solutions:**
1. Verify establishment ownership
2. Check user permissions with admin
3. Ensure correct establishment is selected
4. Contact support if permissions are incorrect

### "Category not found"

**Meaning:** The requested category doesn't exist or has been deleted.

**Solutions:**
1. Refresh the category list
2. Check if category was deleted by another user
3. Verify the category ID in the URL
4. Navigate back to category list and try again

### "Validation failed"

**Meaning:** Form data doesn't meet validation requirements.

**Solutions:**
1. Check all required fields are filled
2. Ensure name is 2-100 characters
3. Verify description is under 500 characters
4. Remove any special characters that might cause issues

### "Network error"

**Meaning:** Unable to communicate with the server.

**Solutions:**
1. Check internet connection
2. Try refreshing the page
3. Wait a few minutes and try again
4. Contact support if problem persists

### "Session expired"

**Meaning:** Your authentication session has timed out.

**Solutions:**
1. Log out and log back in
2. Save any unsaved work before refreshing
3. Check if "Remember me" option is available
4. Contact admin about session timeout settings

---

## Performance Issues

### Slow category loading

**Symptoms:**
- Categories take a long time to appear
- Page feels sluggish
- Loading indicators persist

**Causes:**
- Large number of categories
- Slow network connection
- Browser performance issues
- Server overload

**Solutions:**

1. **Enable pagination:**
   ```
   1. Go to category settings
   2. Enable "Show fewer items per page"
   3. Set to 20-50 categories per page
   ```

2. **Use search and filters:**
   ```
   1. Use search bar to find specific categories
   2. Apply filters to reduce displayed items
   3. Sort by most recently used
   ```

3. **Clear browser cache:**
   ```
   1. Press Ctrl+Shift+Delete
   2. Select "Cached images and files"
   3. Clear cache and reload page
   ```

4. **Check browser performance:**
   ```
   1. Close unnecessary browser tabs
   2. Restart browser
   3. Update to latest browser version
   ```

### Search not working

**Symptoms:**
- Search results don't appear
- Search seems to ignore input
- No results for known categories

**Causes:**
- JavaScript errors
- Cache issues
- Server-side search problems
- Special characters in search

**Solutions:**

1. **Basic troubleshooting:**
   ```
   1. Clear search field and try again
   2. Try searching for partial names
   3. Check for typos in search terms
   ```

2. **Browser issues:**
   ```
   1. Refresh the page (F5)
   2. Hard refresh (Ctrl+F5)
   3. Try in incognito/private mode
   ```

3. **Check browser console:**
   ```
   1. Press F12 to open developer tools
   2. Look for JavaScript errors in Console tab
   3. Report any errors to support
   ```

---

## Authentication Problems

### Frequent logouts

**Symptoms:**
- Automatically logged out while working
- Session expires quickly
- Need to re-authenticate often

**Causes:**
- Short session timeout
- Inactive browser tabs
- Security policies
- Network interruptions

**Solutions:**

1. **Extend session:**
   ```
   1. Check for "Keep me logged in" option
   2. Increase activity by clicking occasionally
   3. Keep only one browser tab open
   ```

2. **Check security settings:**
   ```
   1. Review account security settings
   2. Check if 2FA is causing issues
   3. Verify browser is saving login credentials
   ```

3. **Network stability:**
   ```
   1. Ensure stable internet connection
   2. Avoid switching networks frequently
   3. Use wired connection if possible
   ```

### Permission errors

**Symptoms:**
- "Access denied" messages
- Cannot perform certain actions
- Limited functionality available

**Causes:**
- Insufficient user permissions
- Role-based access restrictions
- Establishment ownership issues

**Solutions:**

1. **Verify permissions:**
   ```
   1. Check your user role in account settings
   2. Confirm establishment ownership
   3. Contact admin to review permissions
   ```

2. **Re-authenticate:**
   ```
   1. Log out completely
   2. Clear browser data
   3. Log back in with correct credentials
   ```

---

## Data Synchronization Issues

### Changes not saving

**Symptoms:**
- Edits don't persist after page refresh
- Success message appears but changes revert
- Inconsistent data across devices

**Causes:**
- Network interruptions during save
- Conflicting changes from other users
- Browser cache issues
- Server synchronization problems

**Solutions:**

1. **Immediate actions:**
   ```
   1. Don't refresh the page immediately
   2. Try saving again
   3. Check network connection
   4. Wait for confirmation message
   ```

2. **Conflict resolution:**
   ```
   1. Check if another user is editing
   2. Coordinate with team members
   3. Use "Force save" option if available
   4. Merge changes manually if needed
   ```

3. **Prevent future issues:**
   ```
   1. Save changes frequently
   2. Communicate with team about edits
   3. Use draft/auto-save features
   4. Work during off-peak hours
   ```

### Offline synchronization problems

**Symptoms:**
- Changes made offline don't sync when online
- Duplicate categories appear
- Data conflicts after reconnection

**Causes:**
- Poor network connectivity
- Sync service failures
- Conflicting offline changes
- Browser storage limitations

**Solutions:**

1. **Manual sync:**
   ```
   1. Look for sync status indicator
   2. Click manual sync button if available
   3. Wait for sync completion
   4. Verify changes are reflected
   ```

2. **Resolve conflicts:**
   ```
   1. Review conflict resolution dialog
   2. Choose correct version of data
   3. Merge changes if possible
   4. Delete duplicates manually
   ```

---

## Browser Compatibility

### Feature not working in specific browser

**Symptoms:**
- Buttons don't respond
- Forms don't submit
- Visual elements missing
- JavaScript errors

**Supported Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Solutions:**

1. **Update browser:**
   ```
   1. Check current browser version
   2. Update to latest version
   3. Restart browser after update
   4. Clear cache and cookies
   ```

2. **Try different browser:**
   ```
   1. Test in Chrome or Firefox
   2. Use incognito/private mode
   3. Disable browser extensions
   4. Check if issue persists
   ```

3. **Browser-specific fixes:**

   **Chrome:**
   ```
   1. Disable ad blockers
   2. Clear site data
   3. Reset Chrome settings
   ```

   **Firefox:**
   ```
   1. Disable tracking protection
   2. Clear cookies and site data
   3. Try safe mode
   ```

   **Safari:**
   ```
   1. Enable JavaScript
   2. Clear website data
   3. Disable content blockers
   ```

---

## Network Issues

### Intermittent connectivity

**Symptoms:**
- Operations sometimes fail
- Inconsistent loading times
- Timeout errors

**Solutions:**

1. **Network diagnostics:**
   ```
   1. Test internet speed
   2. Check for packet loss
   3. Try different network if available
   4. Contact ISP if issues persist
   ```

2. **Application settings:**
   ```
   1. Enable offline mode if available
   2. Increase timeout settings
   3. Use retry mechanisms
   4. Save work frequently
   ```

### Firewall/proxy issues

**Symptoms:**
- Cannot connect to category service
- Specific features blocked
- Corporate network restrictions

**Solutions:**

1. **Check with IT department:**
   ```
   1. Verify Rapidex domains are whitelisted
   2. Check proxy settings
   3. Request firewall exceptions
   4. Test from different network
   ```

2. **Required domains to whitelist:**
   ```
   - api.rapidex.com
   - app.rapidex.com
   - cdn.rapidex.com
   ```

---

## Form Validation Problems

### Validation errors not clearing

**Symptoms:**
- Error messages persist after fixing issues
- Form won't submit despite valid data
- Red error indicators remain

**Solutions:**

1. **Force validation refresh:**
   ```
   1. Click outside the form field
   2. Tab to next field and back
   3. Clear field completely and retype
   4. Save as draft and reload
   ```

2. **Browser form issues:**
   ```
   1. Disable browser autofill
   2. Clear form data cache
   3. Try typing instead of pasting
   4. Use different input method
   ```

### Async validation delays

**Symptoms:**
- Long delays when typing in name field
- Validation spinner doesn't stop
- Form becomes unresponsive

**Solutions:**

1. **Reduce validation frequency:**
   ```
   1. Type complete name before pausing
   2. Wait for validation to complete
   3. Don't type while validation is running
   ```

2. **Network optimization:**
   ```
   1. Ensure stable connection
   2. Close other network-intensive applications
   3. Try during off-peak hours
   ```

---

## Accessibility Issues

### Screen reader problems

**Symptoms:**
- Screen reader doesn't announce changes
- Navigation is confusing
- Missing or incorrect labels

**Solutions:**

1. **Check browser settings:**
   ```
   1. Ensure screen reader is properly configured
   2. Update screen reader software
   3. Test with different screen readers
   ```

2. **Application settings:**
   ```
   1. Enable high contrast mode
   2. Increase font sizes
   3. Enable keyboard navigation
   4. Turn on audio announcements
   ```

### Keyboard navigation issues

**Symptoms:**
- Cannot navigate with Tab key
- Focus indicators missing
- Keyboard shortcuts don't work

**Solutions:**

1. **Browser settings:**
   ```
   1. Enable "Press Tab to highlight each item"
   2. Check keyboard accessibility settings
   3. Disable conflicting browser extensions
   ```

2. **Application features:**
   ```
   1. Use Shift+Tab to navigate backwards
   2. Press Enter to activate buttons
   3. Use arrow keys in lists
   4. Press Escape to close dialogs
   ```

---

## Advanced Troubleshooting

### Browser Developer Tools

**Opening Developer Tools:**
- Chrome/Edge: F12 or Ctrl+Shift+I
- Firefox: F12 or Ctrl+Shift+I
- Safari: Cmd+Option+I (after enabling Developer menu)

**Console Tab:**
```javascript
// Check for JavaScript errors
// Look for red error messages
// Note any 404 or 500 HTTP errors

// Test category service manually
categoryService.getCategories(establishmentId).subscribe(
  data => console.log('Categories loaded:', data),
  error => console.error('Error loading categories:', error)
);
```

**Network Tab:**
```
1. Reload page with Network tab open
2. Look for failed requests (red entries)
3. Check request/response details
4. Verify API endpoints are correct
5. Check response times for performance issues
```

**Application Tab:**
```
1. Check Local Storage for cached data
2. Clear storage if data seems corrupted
3. Verify service worker status
4. Check IndexedDB for offline data
```

### Performance Profiling

**Memory Issues:**
```javascript
// Check memory usage
console.log('Memory usage:', performance.memory);

// Monitor for memory leaks
// Look for increasing memory usage over time
// Check if components are properly destroyed
```

**Network Performance:**
```
1. Use Network tab to monitor request times
2. Look for large response sizes
3. Check for unnecessary requests
4. Monitor WebSocket connections
```

### Logging and Debugging

**Enable Debug Mode:**
```javascript
// In browser console
localStorage.setItem('debug', 'category:*');
// Reload page to see debug logs
```

**Custom Logging:**
```javascript
// Add temporary logging
console.log('Category state:', categoryService.getState());
console.log('Current establishment:', establishmentService.getCurrentEstablishment());
```

### Data Recovery

**Recover Lost Changes:**
```
1. Check browser's back/forward cache
2. Look for auto-saved drafts
3. Check local storage for temporary data
4. Contact support for server-side recovery
```

**Export Data Before Troubleshooting:**
```
1. Export all categories to CSV
2. Save current state as backup
3. Document current issue state
4. Proceed with troubleshooting steps
```

---

## Getting Additional Help

### Before Contacting Support

**Gather Information:**
1. Browser name and version
2. Operating system
3. Steps to reproduce the issue
4. Error messages (exact text)
5. Screenshots or screen recordings
6. Network conditions
7. Time when issue occurred

**Try Basic Solutions:**
1. Refresh the page
2. Clear browser cache
3. Try different browser
4. Check internet connection
5. Log out and back in

### Contact Information

**Support Channels:**
- **Email:** support@rapidex.com
- **In-app Chat:** Click the chat icon in bottom right
- **Phone:** Available in your account settings
- **Documentation:** docs.rapidex.com

**Emergency Issues:**
- Data loss or corruption
- Security concerns
- System-wide outages
- Critical business impact

**Response Times:**
- Critical issues: 1-2 hours
- High priority: 4-8 hours
- Normal issues: 24-48 hours
- Feature requests: 1-2 weeks

---

**Remember:** Most issues can be resolved with basic troubleshooting steps. When in doubt, try refreshing the page, clearing cache, or logging out and back in before contacting support.