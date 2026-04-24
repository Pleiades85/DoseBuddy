# DoseBuddy

DoseBuddy is a smart medication management application built with React Native (Expo). It helps users track their medications, get reminders, and manage prescriptions with the help of AI.

## 🚀 Features

- **Medication Scanning**: Use AI to scan pill bottles and automatically identify medications.
- **Smart Reminders**: Get timely alerts to take your meds.
- **AI Health Assistant**: Chat with a Gemini-powered assistant for health advice.
- **Pharmacy Integration**: Find nearby pharmacies and order refills.
- **Profile Management**: Securely manage your personal and medical information.

## 🛠️ Setup & Installation

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Configuration**
    *   Create a `.env` file in the root directory.
    *   Copy the contents from `env.example` into `.env`.
    *   **CRITICAL**: You must fill in your API keys (Firebase, Gemini, Google Places) for the app to work.

3.  **Start the App**
    ```bash
    npx expo start
    ```

## 📱 Project Structure

- `app/(tabs)/index.tsx`: **Home Dashboard** - Quick actions and next reminder.
- `app/(tabs)/profile.tsx`: **Profile** - User information (formerly Dashboard).
- `app/(tabs)/medications.tsx`: Medication list and management.
- `app/(tabs)/scanner.tsx`: AI-powered medication scanner.
- `services/`: API integrations (Firebase, Gemini, Places).
- `store/`: Redux state management.

## 🔒 Security

- API keys are managed via environment variables.
- Input sanitization is implemented to prevent injection attacks.

## 🤝 Contributing

1.  Fork the repository
2.  Create your feature branch
3.  Commit your changes
4.  Push to the branch
5.  Open a Pull Request
