# GEMINI.md

## Project Overview

This project, "AI 虚拟试衣间" (AI Virtual Try-On), is a Progressive Web App (PWA) for virtual clothes fitting. It is built entirely with frontend technologies (HTML, Tailwind CSS, and vanilla JavaScript) and runs completely in the browser. The application allows users to upload a photo of a model and a photo of a piece of clothing, and then uses AI to generate an image of the model "wearing" the clothing.

A key design principle is user privacy. All user data, including API keys and uploaded photos, is stored exclusively in the browser's `localStorage` and is never sent to a server controlled by this application.

The application features a modular architecture that supports multiple AI service providers:

*   **Google AI Studio (gemini-2.5-flash-image-preview):** A multimodal image generation model (nano banana) with enhanced understanding and generation capabilities.
*   **Grsai (nano-banana-fast):** A specialized image generation model that produces the final try-on image.

The codebase is structured into services, providers, and utility modules, making it easy to understand and extend.

## Building and Running

This is a static web project with no build process or package management dependencies.

To run the application, you must serve the files using a local web server. Opening the `index.html` file directly from the filesystem (`file://`) will not work due to browser CORS restrictions on ES modules.

**Recommended ways to run:**

1.  **Using VS Code Live Server:**
    *   Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in Visual Studio Code.
    *   Right-click on `index.html` and select "Open with Live Server".

2.  **Using Python's HTTP Server:**
    *   Open a terminal in the project's root directory.
    *   Run the command: `python -m http.server`
    *   Open your browser and navigate to `http://localhost:8000`.

## Current Status & Key Features

*   **Single-Page Application (SPA)**: The project has been refactored into an SPA, with `index.html` as the single entry point. Navigation is handled by a client-side router.
*   **Dual Provider Support**: The app supports both Google AI Studio (for multimodal image generation using gemini-2.5-flash-image-preview) and Grsai (for specialized image generation). This is a core architectural feature.
*   **Provider Abstraction**: The logic for each AI provider is abstracted into its own module under `assets/js/providers/`. The `api.service.js` acts as a dispatcher.
*   **Local Storage**: All user settings, including API keys and uploaded images (as Base64), are stored in `localStorage` via `storage.service.js`.
*   **PWA Enabled**: The application is a Progressive Web App with a Service Worker (`sw.js`) for offline caching and a `manifest.json` for installation.
*   **UI**: The UI is built with Tailwind CSS (via CDN) and vanilla JavaScript.
*   **Enhanced API Stability**: Recent updates have resolved Google API integration issues, including improved error handling, automatic key rotation, and better response parsing for the gemini-2.5-flash-image-preview model.

## Key Architectural Decisions

1.  **Client-Side Only**: No backend server. This simplifies deployment and enhances user privacy. All AI calls are made directly from the user's browser to the provider's API.
2.  **SPA with Hash-based Routing**: The application is a Single-Page Application. Navigation is managed by `assets/js/router.js`, which uses URL hashes (e.g., `#settings`) to control which view is displayed. This provides a smoother user experience without full page reloads.
3.  **Modular & Lazy-Loaded JavaScript**: The JS code is broken down into services, providers, and utils. Page-specific logic (`generator.js`, `settings.js`) is encapsulated in modules that are loaded on-demand by the router, improving initial load performance.
    *   `services`: Handle cross-cutting concerns like storage and API dispatching.
    *   `providers`: Contain the specific implementation for each AI service. Each provider must expose a consistent interface.
    *   `utils`: Reusable helper functions (e.g., for DOM manipulation or image processing).
4.  **Base64 for Images**: User-uploaded images are converted to Base64 strings and stored in `localStorage`. This avoids needing a separate file storage system and makes passing image data to APIs straightforward.
5.  **REST API Implementation**: All AI provider implementations use REST API calls instead of SDKs. This approach provides better stability, control over request/response handling, and easier debugging. The Google provider implements sophisticated error handling and API key rotation mechanisms.
6.  **Service Worker Strategy (App Shell)**: The Service Worker now implements a proper App Shell model. For any navigation request, it serves the cached `index.html`. For all other assets, it uses a cache-first strategy. This ensures the app loads quickly and reliably, even offline.

## Important Notes for Gemini

*   **`router.js` is the core**: All navigation and page-level module loading is orchestrated by `assets/js/router.js`.
*   **Dual Image Generation Support**: Both Google AI Studio (using gemini-2.5-flash-image-preview) and Grsai providers can be used for image generation. Google AI offers enhanced multimodal capabilities, while Grsai provides specialized image generation services.
*   **API Keys are Sensitive**: Never log or expose API keys. They are handled by `storage.service.js` and passed directly to the API calls.
*   **State Management**: The application state is simple and managed within each page's respective JS module (`generator.js`, `settings.js`). Settings are persisted via `storage.service.js`.
*   **File Paths**: Be mindful of relative paths. All JS modules are in `assets/js/`, so imports should be relative to that (e.g., `import ... from './services/storage.service.js'`).
*   **PWA Updates**: When adding new files that need to be available offline, remember to update the `urlsToCache` array in `sw.js` and increment the `CACHE_NAME` version number to trigger the update process.
