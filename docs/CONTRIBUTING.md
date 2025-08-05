# Contributing to RankPilot

Thank you for your interest in contributing to the **Studio** project for RankPilot! To ensure a smooth and effective development process, please adhere to the following guidelines.

## Code of Conduct

This project and everyone participating in it is governed by a Code of Conduct. By participating, you are expected to uphold this code. Please be respectful and constructive.

## Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** to your local machine.
3.  **Set up your development environment** according to any instructions in a future `DEVELOPMENT_SETUP.md`.
4.  **Create a new branch** for your changes using a descriptive name: `git checkout -b feature/your-feature-name` or `fix/bug-description`.

## Pull Request (PR) Process

1.  Ensure any new code is accompanied by corresponding tests.
2.  Ensure your code lints and follows the established style guidelines.
3.  Update documentation in the `/docs` folder if your changes affect features, architecture, or user flows.
4.  Commit your changes with clear and descriptive messages that reference the relevant issue number (e.g., `feat: Add Stripe webhook handler, fixes #42`).
5.  Push your branch to your fork and submit a pull request to the `main` branch of the upstream `Rizz-Vii/studio` repository.
6.  Your PR will be reviewed by a core team member. Address any feedback promptly to facilitate a timely merge.

## Key Technical Standards

*   **Frontend:** Next.js (App Router), React, Tailwind CSS, shadcn/ui.
*   **Backend:** Firebase Cloud Functions are the target for all scalable backend logic.
*   **Database:** Firestore. Adhere to the established data models.
*   **Security:** Never commit secrets or API keys. Use `.env.local` for local development and configured secrets (e.g., Google Secret Manager) for production environments.