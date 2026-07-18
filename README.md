<<<<<<< HEAD
# CropPassport AI

A hackathon MVP for creating simple, trustworthy Digital Crop Passports. Farmers can start a harvest record and view a buyer-friendly passport with a mock QR verification panel.

## Project structure

```
CropPassportAI/
├── index.html                 # Home page
├── create-harvest.html        # Harvest creation form
├── harvest-details.html       # Mock field activity timeline
├── passport.html              # Buyer-facing digital passport
├── css/                       # Shared and page-specific styles
├── js/                        # Shared utilities and page scripts
└── assets/                    # Reserved for icons, images, and logo files
```

## Run with VS Code Live Server

1. Open the `CropPassportAI` folder in VS Code.
2. Install the **Live Server** extension if it is not already installed.
3. Right-click `index.html` and choose **Open with Live Server**.
4. The project opens in your browser. Use the navigation or home-page cards to visit each screen.

## Demo behaviour

Submitting the create-harvest form stores the supplied values in browser `localStorage`. The passport and details pages then display those values. This mock behaviour needs no backend and can be reset by clearing the browser's site data.

Firebase, AI summaries, photo uploads, voice notes, and production QR generation are intentionally placeholder features for this MVP.
