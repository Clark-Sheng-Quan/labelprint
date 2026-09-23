# LabelMaster - Professional POS Label Printer System

A robust, full-stack solution for designing, managing, and synchronizing POS label templates. This system provides a visual editor for label design and a seamless synchronization API for POS terminals.

## 🏗 System Architecture

The system consists of three main components:

1.  **Frontend Editor**: A React-based web application for designing templates.
2.  **Backend API**: A Node.js Express server handling template storage and rendering.
3.  **POS Integration (Client)**: A lightweight integration layer for POS systems to fetch and render active templates locally.

```text
[ Designing ]               [ Storage ]                [ Printing ]
Company Frontend       ──▶  Company Backend API  ◀──  POS Terminal Client
(React/AntD)                 (Express/MongoDB)        (Label Rendering)
```

## 🚀 Tech Stack

-   **Frontend**: React 18, Vite, Ant Design, Axios.
-   **Backend**: Node.js, Express, MongoDB.
-   **Infrastructure**: Docker, Docker Compose, Nginx.

## ✨ Key Features

-   **Visual Label Editor**:
    -   Drag-and-drop elements (Text, Images, QR Codes, Lines).
    -   Precise control over dimensions (mm), rotation, and styles.
    -   Real-time canvas preview.
-   **Template Management**:
    -   Create, update, and delete multiple templates per business.
    -   "Set Active" functionality for instant POS synchronization.
-   **Render API**: Returns TSPL for the latest active design.
-   **Multi-language Support**: Full English and Chinese (Simplified) localization.

## 🛠 Getting Started

### Prerequisites

-   Node.js (v18+)
-   Docker and Docker Compose
-   A Linux company server with Docker Engine and Docker Compose v2

### Local Development

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd labelprint
    ```

2.  **Backend Setup**:
    ```bash
    cd backend
    npm install
    # Copy .env.example to .env and configure your database
    npm run dev
    ```

3.  **Frontend Setup**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## 📡 API Reference

The backend runs on port `3080`. All designers and POS clients communicate through these endpoints.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/label/render?business_id=...` | Returns TSPL for the active template. |
| `GET` | `/label/templates/:businessId` | List all templates for a specific business. |
| `POST` | `/label/template` | Create a new template. |
| `PUT` | `/label/template/:id` | Update an existing template. |
| `PUT` | `/label/template/:id/activate` | Set a template as the active one for a business. |

### Render API Example

```bash
curl "http://<server-ip>/label/render?business_id=67295c445242136caa4511d4" \
    -H "Authorization: Bearer <pos-token>"
```

## 🚢 Deployment

### Company server deployment
Copy the project to the company server, create `backend/.env` from `backend/.env.example`, and set the company frontend URL and POS API settings. The default Compose file starts MongoDB and the backend:
```bash
cd backend
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 backend
curl http://127.0.0.1:3000/health
```

MongoDB is hosted by the company-provided MongoDB service. The backend server only runs the application container and connects using `MONGODB_URI`; no local MongoDB container or database volume is required.

## 📂 Project Structure

```text
├── backend/            # Express.js server & API
│   ├── src/            # Source code (Models, Routes, Services)
│   ├── nginx.conf      # Nginx proxy configuration
│   └── docker-compose.yml
├── frontend/           # React Designer application
│   └── src/            # Components, Pages, State management
└── pos-label/          # POS Integration example
```

## 📝 License

This project is proprietary. All rights reserved.

