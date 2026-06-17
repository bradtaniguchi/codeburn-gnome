# Contributing

Thank you for your interest in contributing to codeburn-gnome! This document provides guidelines and information for contributing to this project.

## Setup

Before contributing, ensure you have the following prerequisites installed:

- GNOME Shell 50+
- Node.js (for dev tooling)
- `gnome-extensions` CLI (included with GNOME)

Run the following to set up your development environment:

```bash
npm install
```

## Development Workflow

1. **Edit source files** - Make changes to `extension.js`, `stylesheet.css`, etc.
2. **Package and install** - Run `npm run pack:install` to package and install the extension
3. **Enable** - Run `npm run enable` to activate the extension
4. **Dev mode** (optional) - Run `npm run dev` to open a wayland based GNOME test
5. **Monitor logs** - Use `npm run logs` in a separate terminal to watch for errors

### Common Commands

| Command | Description |
|---------|-------------|
| `npm run pack` | Package the extension into a `.zip` |
| `npm run ext:install` | Install the packed `.zip` into GNOME |
| `npm run pack:install` | Pack and install in one step |
| `npm run enable` | Enable the extension |
| `npm run disable` | Disable the extension |
| `npm run logs` | Stream GNOME Shell logs (useful for debugging) |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |

## Debugging

### Viewing Logs

Stream all GNOME Shell logs:

```bash
npm run logs
```

Or filter for extension-specific errors:

```bash
journalctl -f -o cat /usr/bin/gnome-shell \
  \| grep -i codeburn
```

## Code Style

Before submitting changes, ensure your code passes linting:

```bash
npm run lint
```

To automatically fix some issues:

```bash
npm run lint:fix
```

## Licensing

By contributing to this project, you agree that your contributions will be licensed under the [GNU General Public License v3.0 or later](./LICENSE).

## Development Environment

For testing and debugging purposes, the project provides a development environment that opens a wayland based GNOME instance. This is useful for seeing your changes in action during development.

## Questions?

If you have questions or need help getting started, please open an issue before starting work on a larger feature.
