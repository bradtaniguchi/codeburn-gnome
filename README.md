# codeburn-gnome

GNOME Shell extension that surfaces the CLI tool codeburn, for usage metrics.

**UUID:** `codeburn-gnome@bradtaniguchi.github.io`  
**GNOME Shell:** 50+

## Development

### Prerequisites

- GNOME Shell 50+
- Node.js (for dev tooling)
- `gnome-extensions` CLI (included with GNOME)

### Setup

```bash
npm install
```

### Scripts

| Command | Description |
|---|---|
| `npm run pack` | Package the extension into a `.zip` |
| `npm run ext:install` | Install the packed `.zip` into GNOME |
| `npm run pack:install` | Pack and install in one step |
| `npm run enable` | Enable the extension |
| `npm run disable` | Disable the extension |
| `npm run logs` | Stream GNOME Shell logs (useful for debugging) |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |

### Workflow

1. Edit source files (`extension.js`, `stylesheet.css`, etc.)
2. Run `npm run pack:install` to package and install
3. Run `npm run enable` to enable the extension
4. Run `npm run dev` to open a wayland based gnome test
5. Use `npm run logs` in a separate terminal to watch for errors

### Debugging

```bash
# Stream GNOME Shell logs
npm run logs

# Or filter for just extension errors
journalctl -f -o cat /usr/bin/gnome-shell | grep -i codeburn
```
