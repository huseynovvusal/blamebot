# Contributing to BlameBot

Thank you for your interest in contributing to BlameBot! We welcome bug reports, feature requests, and pull requests.

## How to Contribute

### Reporting Bugs
If you find a bug, please open an issue on GitHub. Include as much detail as possible, such as steps to reproduce, expected behavior, and actual behavior.

### Suggesting Enhancements
We are always looking for ways to improve BlameBot. If you have an idea, feel free to open an issue to discuss it before implementing.

### Submitting Pull Requests
1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some feature'`)
5. Push to the branch (`git push origin feature/your-feature-name`)
6. Open a Pull Request

## Local Development

### Prerequisites
- Node.js 18+
- pnpm
- Upstash Redis instance

### Setup
1. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/blamebot
   cd blamebot
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables by copying the example or creating `.env.local` (see `README.md`).
4. Start the development server:
   ```bash
   pnpm dev
   ```

## Code Style
- Use `pnpm lint` to ensure your code matches the project's formatting rules.
- Follow Next.js App Router conventions.
- Write clear, self-documenting code and include comments where necessary.

Thank you for contributing!
