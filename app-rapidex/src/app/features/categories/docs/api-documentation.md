# Category Management API Documentation

## Overview

The Category Management API provides endpoints for managing product/service categories within establishments. All operations are scoped to the authenticated user's establishments, ensuring complete data isolation.

## Base URL

```
/api/categorias/estabelecimentos/{estabelecimentoId}/categorias
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### 1. List Categories

**GET** `/api/categorias/estabelecimentos/{estabelecimentoId}/categorias`

Retrieves all categories for the specified establishment.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| estabelecimentoId | number | Yes | ID of the establishment |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20) |
| search | string | No | Search term for category name |
| ativo | boolean | No | Filter by active status |
| sortBy | string | No | Sort field (nome, dataCriacao, dataAtualizacao) |
| sortOrder | string | No | Sort order (asc, desc) |

#### Response

```json
{
  "categorias": [
    {
      "id": 1,
      "nome": "Bebidas",
      "descricao": "Categoria de bebidas e sucos",
      "estabelecimentoId": 123,
      "ativo": true,
      "dataCriacao": "2024-01-15T10:30:00Z",
      "dataAtualizacao": "2024-01-15T10:30:00Z",
      "produtosCount": 15
    }
  ],
  "total": 1,
  "pagina": 1,
  "totalPaginas": 1
}
```

#### Status Codes

- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing authentication
- `403 Forbidden` - Access denied to establishment
- `500 Internal Server Error` - Server error

### 2. Get Category Details

**GET** `/api/categorias/estabelecimentos/{estabelecimentoId}/categorias/{id}`

Retrieves detailed information about a specific category.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| estabelecimentoId | number | Yes | ID of the establishment |
| id | number | Yes | ID of the category |

#### Response

```json
{
  "id": 1,
  "nome": "Bebidas",
  "descricao": "Categoria de bebidas e sucos",
  "estabelecimentoId": 123,
  "ativo": true,
  "dataCriacao": "2024-01-15T10:30:00Z",
  "dataAtualizacao": "2024-01-15T10:30:00Z",
  "produtosCount": 15
}
```

#### Status Codes

- `200 OK` - Success
- `401 Unauthorized` - Invalid or missing authentication
- `403 Forbidden` - Access denied to establishment or category
- `404 Not Found` - Category not found
- `500 Internal Server Error` - Server error

### 3. Create Category

**POST** `/api/categorias/estabelecimentos/{estabelecimentoId}/categorias`

Creates a new category for the specified establishment.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| estabelecimentoId | number | Yes | ID of the establishment |

#### Request Body

```json
{
  "nome": "Bebidas",
  "descricao": "Categoria de bebidas e sucos"
}
```

#### Validation Rules

- `nome`: Required, 2-100 characters, unique within establishment
- `descricao`: Optional, max 500 characters

#### Response

```json
{
  "id": 1,
  "nome": "Bebidas",
  "descricao": "Categoria de bebidas e sucos",
  "estabelecimentoId": 123,
  "ativo": true,
  "dataCriacao": "2024-01-15T10:30:00Z",
  "dataAtualizacao": "2024-01-15T10:30:00Z",
  "produtosCount": 0
}
```

#### Status Codes

- `201 Created` - Category created successfully
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Invalid or missing authentication
- `403 Forbidden` - Access denied to establishment
- `409 Conflict` - Category name already exists
- `500 Internal Server Error` - Server error

### 4. Update Category

**PUT** `/api/categorias/estabelecimentos/{estabelecimentoId}/categorias/{id}`

Updates an existing category.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| estabelecimentoId | number | Yes | ID of the establishment |
| id | number | Yes | ID of the category |

#### Request Body

```json
{
  "nome": "Bebidas e Sucos",
  "descricao": "Categoria atualizada de bebidas e sucos",
  "ativo": true
}
```

#### Response

```json
{
  "id": 1,
  "nome": "Bebidas e Sucos",
  "descricao": "Categoria atualizada de bebidas e sucos",
  "estabelecimentoId": 123,
  "ativo": true,
  "dataCriacao": "2024-01-15T10:30:00Z",
  "dataAtualizacao": "2024-01-16T14:20:00Z",
  "produtosCount": 15
}
```

#### Status Codes

- `200 OK` - Category updated successfully
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Invalid or missing authentication
- `403 Forbidden` - Access denied to establishment or category
- `404 Not Found` - Category not found
- `409 Conflict` - Category name already exists
- `500 Internal Server Error` - Server error

### 5. Delete Category

**DELETE** `/api/categorias/estabelecimentos/{estabelecimentoId}/categorias/{id}`

Deletes a category if it has no associated products.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| estabelecimentoId | number | Yes | ID of the establishment |
| id | number | Yes | ID of the category |

#### Response

```json
{
  "message": "Categoria excluída com sucesso"
}
```

#### Status Codes

- `200 OK` - Category deleted successfully
- `401 Unauthorized` - Invalid or missing authentication
- `403 Forbidden` - Access denied to establishment or category
- `404 Not Found` - Category not found
- `409 Conflict` - Category has associated products
- `500 Internal Server Error` - Server error

## Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "CATEGORY_NOT_FOUND",
    "message": "Categoria não encontrada",
    "details": {
      "categoryId": 123,
      "estabelecimentoId": 456
    }
  }
}
```

## Common Error Codes

| Code | Description |
|------|-------------|
| `CATEGORY_NOT_FOUND` | Category does not exist |
| `CATEGORY_ACCESS_DENIED` | User doesn't have access to category |
| `CATEGORY_VALIDATION_ERROR` | Validation failed |
| `CATEGORY_NAME_EXISTS` | Category name already exists |
| `CATEGORY_HAS_PRODUCTS` | Cannot delete category with products |
| `ESTABLISHMENT_NOT_FOUND` | Establishment does not exist |
| `ESTABLISHMENT_ACCESS_DENIED` | User doesn't have access to establishment |

## Rate Limiting

API requests are limited to:
- 100 requests per minute per user
- 1000 requests per hour per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Examples

### Create a new category

```bash
curl -X POST \
  https://api.rapidex.com/api/categorias/estabelecimentos/123/categorias \
  -H 'Authorization: Bearer your_jwt_token' \
  -H 'Content-Type: application/json' \
  -d '{
    "nome": "Bebidas",
    "descricao": "Categoria de bebidas e sucos"
  }'
```

### List categories with search

```bash
curl -X GET \
  'https://api.rapidex.com/api/categorias/estabelecimentos/123/categorias?search=bebidas&page=1&limit=10' \
  -H 'Authorization: Bearer your_jwt_token'
```

### Update category status

```bash
curl -X PUT \
  https://api.rapidex.com/api/categorias/estabelecimentos/123/categorias/1 \
  -H 'Authorization: Bearer your_jwt_token' \
  -H 'Content-Type: application/json' \
  -d '{
    "nome": "Bebidas",
    "descricao": "Categoria de bebidas e sucos",
    "ativo": false
  }'
```