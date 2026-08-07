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

1. **Edit source files** - Make changes to TypeScript source files in `src/` (`src/extension.ts`, `src/prefs.ts`, etc.)
2. **Build and Typecheck** - Run `npm run build` and `npm run typecheck`
3. **Package and install** - Run `npm run pack:install` to package and install the extension
4. **Enable** - Run `npm run enable` to activate the extension
5. **Dev mode** (optional) - Run `npm run dev` to open a wayland based GNOME test
6. **Monitor logs** - Use `npm run logs` in a separate terminal to watch for errors

### Common Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Transpile TypeScript source from `src/` into `extension.js` and `prefs.js` |
| `npm run watch` | Watch `src/` directory and auto-rebuild on file changes |
| `npm run typecheck` | Run TypeScript compiler type check (`tsc --noEmit`) |
| `npm run pack` | Build source, compile schemas, and package into a `.zip` |
| `npm run ext:install` | Install the packed `.zip` into GNOME |
| `npm run pack:install` | Pack and install in one step |
| `npm run enable` | Enable the extension |
| `npm run disable` | Disable the extension |
| `npm run logs` | Stream GNOME Shell logs (useful for debugging) |
| `npm run lint` | Run ESLint across TypeScript and JavaScript files |
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

## FAQs

### Why don't I see my extension when running `npm run dev`?

If the nested shell starts but your extension is missing, check the following:

- **It isn't installed**: Run `npm run pack:install` first to ensure the code is in `~/.local/share/gnome-shell/extensions/`.
- **It isn't enabled**: Even if installed, it might be disabled in the new session. You can try running `npm run enable` or using the Extensions app.
- **Errors during startup**: Check the logs with `npm run logs` to see if the extension crashed during initialization.

### What packages are required for `npm run dev`?

To use the development environment and build tools, you generally need:

- **GNOME Shell 47+**: Required for the `--devkit` flag.
- **dbus-run-session**: Usually found in `dbus-x11` or `dbus-daemon` packages.
- **glib-compile-schemas**: Found in `libglib2.0-dev` or `glib2-devel`.
- **mutter-dev-bin**: Often required for nested compositor support and development headers.
