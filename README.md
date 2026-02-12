# LabelMaster - Professional POS Label Printer System

A robust, full-stack solution for designing, managing, and synchronizing POS label templates. This system provides a visual editor for label design and a seamless synchronization API for POS terminals.

## 🏗 System Architecture

The system consists of three main components:

1.  **Frontend Editor (S3)**: A React-based web application for designing templates. Deployed on AWS S3.
2.  **Backend API (EC2/Docker)**: A Node.js Express server handling template storage and synchronization. Deployed on AWS EC2 via Docker.
3.  **POS Integration (Client)**: A lightweight integration layer for POS systems to fetch and render active templates locally.

```text
[ Designing ]               [ Storage ]                [ Printing ]
S3 Frontend Designer  ──▶  EC2 Backend API  ◀──  POS Terminal Client
(React/AntD)             (Express/PostgreSQL)     (Label Rendering)
```

## 🚀 Tech Stack

-   **Frontend**: React 18, Vite, Ant Design, Axios.
-   **Backend**: Node.js, Express, PostgreSQL (AWS RDS).
-   **Infrastructure**: Docker, Docker Compose, Nginx, AWS S3, AWS EC2.

## ✨ Key Features

-   **Visual Label Editor**:
    -   Drag-and-drop elements (Text, Images, QR Codes, Lines).
    -   Precise control over dimensions (mm), rotation, and styles.
    -   Real-time canvas preview.
-   **Template Management**:
    -   Create, update, and delete multiple templates per business.
    -   "Set Active" functionality for instant POS synchronization.
-   **Synchronization API**: High-performance endpoint for POS devices to retrieve the latest active design.
-   **Multi-language Support**: Full English and Chinese (Simplified) localization.

## 🛠 Getting Started

### Prerequisites

-   Node.js (v18+)
-   Docker and Docker Compose
-   AWS CLI (for deployment)

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
| `POST` | `/label/sync` | **Sync API**: POS client fetches the active template. |
| `GET` | `/label/templates/:businessId` | List all templates for a specific business. |
| `POST` | `/label/template` | Create a new template. |
| `PUT` | `/label/template/:id` | Update an existing template. |
| `PUT` | `/label/template/:id/activate` | Set a template as the active one for a business. |

### Sync API Example

```bash
curl -X POST http://<server-ip>/label/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <pos-token>" \
  -d '{"businessId": "67295c445242136caa4511d4"}'
```

## 🚢 Deployment

### Backend (Docker on EC2)
The backend is managed via Docker. Use the provided deployment script to update the Nginx configuration:
```bash
bash deploy-nginx.sh
```

### Frontend (S3)
The designer is built and synced to AWS S3:
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://your-bucket-name/label/ --delete
```

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

