declare module 'resource:///org/gnome/shell/extensions/extension.js' {
    import Gio from 'gi://Gio';
    export class Extension {
        uuid: string;
        dir: Gio.File;
        path: string;
        metadata: Record<string, unknown>;
        getSettings(schema?: string): Gio.Settings;
        enable(): void;
        disable(): void;
    }
    export function gettext(str: string): string;
}

declare module 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js' {
    import Gio from 'gi://Gio';
    import Adw from 'gi://Adw';
    export class ExtensionPreferences {
        uuid: string;
        dir: Gio.File;
        path: string;
        metadata: Record<string, unknown>;
        getSettings(schema?: string): Gio.Settings;
        fillPreferencesWindow(window: Adw.PreferencesWindow): void | Promise<void>;
    }
    export function gettext(str: string): string;
}

declare module 'resource:///org/gnome/shell/ui/panelMenu.js' {
    import St from 'gi://St';
    import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
    export class Button extends St.Widget {
        menu: PopupMenu.PopupMenu;
        constructor(...args: any[]);
        _init(...args: any[]): void;
    }
}

declare module 'resource:///org/gnome/shell/ui/popupMenu.js' {
    import St from 'gi://St';
    import GObject from 'gi://GObject';

    export class PopupBaseMenuItem extends St.BoxLayout {
        constructor(...args: any[]);
        _init(...args: any[]): void;
        activate(event: unknown): void;
    }

    export class PopupMenuItem extends PopupBaseMenuItem {
        label: St.Label;
        constructor(text: string, params?: Record<string, unknown>);
        _init(...args: any[]): void;
    }

    export class PopupSeparatorMenuItem extends PopupBaseMenuItem {
        constructor();
        _init(...args: any[]): void;
    }

    export class PopupMenu extends GObject.Object {
        addMenuItem(menuItem: PopupBaseMenuItem, position?: number): void;
        removeAll(): void;
    }
}

declare module 'resource:///org/gnome/shell/ui/main.js' {
    import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
    export const panel: {
        addToStatusArea(role: string, indicator: PanelMenu.Button, position?: number, box?: string): void;
    };
}
