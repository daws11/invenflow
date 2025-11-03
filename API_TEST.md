# API Endpoints Documentation

## Base URL
`http://localhost:3001`

## Health Check
- `GET /` - Server status
- `GET /api/health` - Database health check

## Kanbans
- `GET /api/kanbans` - Get all kanbans
- `GET /api/kanbans/:id` - Get kanban with products
- `POST /api/kanbans` - Create kanban
  ```json
  {
    "name": "New Order Kanban",
    "type": "order"
  }
  ```
- `PUT /api/kanbans/:id` - Update kanban
  ```json
  {
    "name": "Updated Name",
    "linkedKanbanId": "uuid-of-receive-kanban"
  }
  ```
- `DELETE /api/kanbans/:id` - Delete kanban

## Products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product
  ```json
  {
    "kanbanId": "uuid",
    "columnStatus": "New Request",
    "productDetails": "Product description",
    "productLink": "https://example.com",
    "location": "Storage A",
    "priority": "High"
  }
  ```
- `PUT /api/products/:id` - Update product
  ```json
  {
    "productDetails": "Updated description",
    "productLink": "https://example.com",
    "location": "Storage B",
    "priority": "Medium",
    "stockLevel": 10
  }
  ```
- `PUT /api/products/:id/move` - Move product to different column
  ```json
  {
    "columnStatus": "In Review"
  }
  ```
- `DELETE /api/products/:id` - Delete product

## Public Form
- `GET /api/public/form/:token` - Get kanban info for public form
- `POST /api/public/form/:token` - Submit public form
  ```json
  {
    "productDetails": "Product description",
    "productLink": "https://example.com",
    "location": "Storage A",
    "priority": "High"
  }
  ```

## Sample Test Commands

Once the server is running, you can test the API with these curl commands:

```bash
# Get all kanbans
curl http://localhost:3001/api/kanbans

# Create a new order kanban
curl -X POST http://localhost:3001/api/kanbans \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Order Kanban", "type": "order"}'

# Create a new receive kanban
curl -X POST http://localhost:3001/api/kanbans \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Receive Kanban", "type": "receive"}'

# Get kanban with products
curl http://localhost:3001/api/kanbans/{kanban-id}
```

## Features Implemented

✅ **Core API Endpoints**: All CRUD operations for kanbans and products
✅ **Public Forms**: Order kanbans generate public form tokens
✅ **Kanban Linking**: Order kanbans can be linked to Receive kanbans
✅ **Automatic Product Transfer**: Products move from Order to Receive when reaching "Purchased"
✅ **Stock Tracking**: Stock levels are enabled when products reach "Stored" status
✅ **Database Schema**: Complete PostgreSQL schema with proper relationships
✅ **Error Handling**: Comprehensive error handling and validation
✅ **Type Safety**: Full TypeScript support with shared types

## Frontend Features Ready to Implement

🔄 **Kanban Board UI**: React components with drag-and-drop
🔄 **Product Cards**: Editable product information
🔄 **Public Form Page**: Simple form for external submissions
🔄 **Kanban Management**: Create, edit, link kanbans
🔄 **Real-time Updates**: Live updates when products move