/**
 * Category Management Documentation Index
 * 
 * This file provides programmatic access to documentation metadata
 * for the Category Management system. It can be used by help systems,
 * documentation generators, and other tools that need to access
 * documentation information.
 */

export interface DocumentationItem {
  id: string;
  title: string;
  description: string;
  path: string;
  type: 'user' | 'developer' | 'api' | 'troubleshooting' | 'video';
  audience: 'end-user' | 'developer' | 'admin' | 'all';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: number; // in minutes
  lastUpdated: string;
  version: string;
  tags: string[];
  prerequisites?: string[];
  relatedDocs?: string[];
}

export const CATEGORY_DOCUMENTATION: DocumentationItem[] = [
  {
    id: 'readme',
    title: 'Documentation Overview',
    description: 'Complete overview of the Category Management documentation structure and resources.',
    path: './README.md',
    type: 'user',
    audience: 'all',
    difficulty: 'beginner',
    estimatedReadTime: 5,
    lastUpdated: '2024-01-15',
    version: '2.1.0',
    tags: ['overview', 'getting-started', 'navigation'],
    relatedDocs: ['user-guide', 'developer-guide']
  },
  {
    id: 'user-guide',
    title: 'Category Management User Guide',
    description: 'Comprehensive guide for end users covering all aspects of category management.',
    path: './user-guide.md',
    type: 'user',
    audience: 'end-user',
    difficulty: 'beginner',
    estimatedReadTime: 25,
    lastUpdated: '2024-01-15',
    version: '2.1.0',
    tags: ['user-guide', 'tutorial', 'categories', 'crud', 'search', 'import-export'],
    relatedDocs: ['troubleshooting-guide', 'video-tutorials']
  },
  {
    id: 'api-documentation',
    title: 'Category Management API Documentation',
    description: 'Complete API reference including endpoints, authentication, and examples.',
    path: './api-documentation.md',
    type: 'api',
    audience: 'developer',
    difficulty: 'intermediate',
    estimatedReadTime: 20,
    lastUpdated: '2024-01-15',
    version: '2.1.0',
    tags: ['api', 'rest', 'endpoints', 'authentication', 'examples'],
    prerequisites: ['basic-http-knowledge', 'json-understanding'],
    relatedDocs: ['developer-guide']
  },
  {
    id: 'developer-guide',
    title: 'Category Management Developer Guide',
    description: 'Technical documentation for developers including architecture, extending functionality, and best practices.',
    path: './developer-guide.md',
    type: 'developer',
    audience: 'developer',
    difficulty: 'advanced',
    estimatedReadTime: 45,
    lastUpdated: '2024-01-15',
    version: '2.1.0',
    tags: ['architecture', 'development', 'angular', 'typescript', 'testing', 'performance'],
    prerequisites: ['angular-knowledge', 'typescript-experience', 'rxjs-understanding'],
    relatedDocs: ['api-documentation', 'troubleshooting-guide']
  },
  {
    id: 'troubleshooting-guide',
    title: 'Category Management Troubleshooting Guide',
    description: 'Comprehensive troubleshooting guide covering common issues, error messages, and solutions.',
    path: './troubleshooting-guide.md',
    type: 'troubleshooting',
    audience: 'all',
    difficulty: 'intermediate',
    estimatedReadTime: 30,
    lastUpdated: '2024-01-15',
    version: '2.1.0',
    tags: ['troubleshooting', 'errors', 'debugging', 'performance', 'browser-issues'],
    relatedDocs: ['user-guide', 'developer-guide']
  },
  {
    id: 'video-tutorials',
    title: 'Category Management Video Tutorials',
    description: 'Catalog of video tutorials covering all aspects of the category management system.',
    path: './video-tutorials.md',
    type: 'video',
    audience: 'all',
    difficulty: 'beginner',
    estimatedReadTime: 15,
    lastUpdated: '2024-01-15',
    version: '2.1.0',
    tags: ['video', 'tutorials', 'visual-learning', 'step-by-step', 'accessibility'],
    relatedDocs: ['user-guide', 'troubleshooting-guide']
  }
];

export interface DocumentationSection {
  id: string;
  title: string;
  description: string;
  documents: string[]; // Document IDs
  icon: string;
  color: string;
}

export const DOCUMENTATION_SECTIONS: DocumentationSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Essential resources for new users to get up and running quickly.',
    documents: ['readme', 'user-guide', 'video-tutorials'],
    icon: 'fas fa-rocket',
    color: '#28a745'
  },
  {
    id: 'user-resources',
    title: 'User Resources',
    description: 'Comprehensive guides and tutorials for end users.',
    documents: ['user-guide', 'video-tutorials', 'troubleshooting-guide'],
    icon: 'fas fa-user',
    color: '#007bff'
  },
  {
    id: 'developer-resources',
    title: 'Developer Resources',
    description: 'Technical documentation for developers and integrators.',
    documents: ['developer-guide', 'api-documentation'],
    icon: 'fas fa-code',
    color: '#6f42c1'
  },
  {
    id: 'support',
    title: 'Support & Troubleshooting',
    description: 'Help resources for resolving issues and getting support.',
    documents: ['troubleshooting-guide'],
    icon: 'fas fa-life-ring',
    color: '#dc3545'
  }
];

export interface HelpTopic {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  documentId: string;
  section?: string;
  priority: number; // 1-10, higher is more important
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'create-category',
    title: 'Creating a New Category',
    description: 'Learn how to create a new category with proper validation and best practices.',
    keywords: ['create', 'new', 'category', 'add', 'form'],
    documentId: 'user-guide',
    section: 'creating-categories',
    priority: 9
  },
  {
    id: 'edit-category',
    title: 'Editing Categories',
    description: 'Modify existing categories including name, description, and status.',
    keywords: ['edit', 'modify', 'update', 'change', 'category'],
    documentId: 'user-guide',
    section: 'editing-categories',
    priority: 8
  },
  {
    id: 'delete-category',
    title: 'Deleting Categories',
    description: 'Safely delete categories with dependency checking and confirmation.',
    keywords: ['delete', 'remove', 'category', 'dependencies'],
    documentId: 'user-guide',
    section: 'deleting-categories',
    priority: 7
  },
  {
    id: 'search-categories',
    title: 'Searching and Filtering',
    description: 'Use search and filter features to find categories quickly.',
    keywords: ['search', 'filter', 'find', 'categories'],
    documentId: 'user-guide',
    section: 'searching-and-filtering',
    priority: 8
  },
  {
    id: 'import-export',
    title: 'Import and Export',
    description: 'Bulk operations for importing and exporting category data.',
    keywords: ['import', 'export', 'bulk', 'csv', 'excel'],
    documentId: 'user-guide',
    section: 'import-and-export',
    priority: 6
  },
  {
    id: 'offline-mode',
    title: 'Offline Usage',
    description: 'Work with categories when offline and understand synchronization.',
    keywords: ['offline', 'sync', 'synchronization', 'network'],
    documentId: 'user-guide',
    section: 'offline-usage',
    priority: 5
  },
  {
    id: 'api-integration',
    title: 'API Integration',
    description: 'Integrate with the Category Management API for custom applications.',
    keywords: ['api', 'integration', 'rest', 'endpoints', 'development'],
    documentId: 'api-documentation',
    priority: 7
  },
  {
    id: 'troubleshooting-errors',
    title: 'Common Error Messages',
    description: 'Understand and resolve common error messages and issues.',
    keywords: ['error', 'troubleshooting', 'problems', 'issues', 'solutions'],
    documentId: 'troubleshooting-guide',
    section: 'error-messages',
    priority: 9
  },
  {
    id: 'performance-issues',
    title: 'Performance Optimization',
    description: 'Optimize performance for large category datasets and slow connections.',
    keywords: ['performance', 'slow', 'optimization', 'speed', 'loading'],
    documentId: 'troubleshooting-guide',
    section: 'performance-issues',
    priority: 6
  },
  {
    id: 'accessibility-features',
    title: 'Accessibility Features',
    description: 'Use accessibility features including keyboard navigation and screen readers.',
    keywords: ['accessibility', 'keyboard', 'screen-reader', 'a11y'],
    documentId: 'user-guide',
    section: 'accessibility',
    priority: 7
  }
];

/**
 * Search help topics by keywords
 */
export function searchHelpTopics(query: string): HelpTopic[] {
  const searchTerm = query.toLowerCase();
  
  return HELP_TOPICS
    .filter(topic => 
      topic.title.toLowerCase().includes(searchTerm) ||
      topic.description.toLowerCase().includes(searchTerm) ||
      topic.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
    )
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get documentation item by ID
 */
export function getDocumentationItem(id: string): DocumentationItem | undefined {
  return CATEGORY_DOCUMENTATION.find(doc => doc.id === id);
}

/**
 * Get help topic by ID
 */
export function getHelpTopic(id: string): HelpTopic | undefined {
  return HELP_TOPICS.find(topic => topic.id === id);
}

/**
 * Get documentation items by audience
 */
export function getDocumentationByAudience(audience: DocumentationItem['audience']): DocumentationItem[] {
  return CATEGORY_DOCUMENTATION.filter(doc => doc.audience === audience || doc.audience === 'all');
}

/**
 * Get documentation items by type
 */
export function getDocumentationByType(type: DocumentationItem['type']): DocumentationItem[] {
  return CATEGORY_DOCUMENTATION.filter(doc => doc.type === type);
}

/**
 * Get documentation items by difficulty
 */
export function getDocumentationByDifficulty(difficulty: DocumentationItem['difficulty']): DocumentationItem[] {
  return CATEGORY_DOCUMENTATION.filter(doc => doc.difficulty === difficulty);
}

/**
 * Get related documentation for a given document ID
 */
export function getRelatedDocumentation(documentId: string): DocumentationItem[] {
  const document = getDocumentationItem(documentId);
  if (!document || !document.relatedDocs) {
    return [];
  }
  
  return document.relatedDocs
    .map(id => getDocumentationItem(id))
    .filter(doc => doc !== undefined) as DocumentationItem[];
}

/**
 * Get documentation section by ID
 */
export function getDocumentationSection(id: string): DocumentationSection | undefined {
  return DOCUMENTATION_SECTIONS.find(section => section.id === id);
}

/**
 * Get all documentation items in a section
 */
export function getDocumentationInSection(sectionId: string): DocumentationItem[] {
  const section = getDocumentationSection(sectionId);
  if (!section) {
    return [];
  }
  
  return section.documents
    .map(id => getDocumentationItem(id))
    .filter(doc => doc !== undefined) as DocumentationItem[];
}

/**
 * Documentation metadata for the entire category management system
 */
export const DOCUMENTATION_METADATA = {
  title: 'Category Management Documentation',
  version: '2.1.0',
  lastUpdated: '2024-01-15',
  totalDocuments: CATEGORY_DOCUMENTATION.length,
  totalHelpTopics: HELP_TOPICS.length,
  supportedLanguages: ['pt-BR', 'en-US', 'es-ES'],
  maintainers: ['Rapidex Documentation Team'],
  repository: 'https://github.com/rapidex/category-management',
  license: 'MIT',
  contact: 'documentation@rapidex.com'
};