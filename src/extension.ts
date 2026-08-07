/* extension.ts
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import type { CodeburnStatusResponse } from './types/codeburn.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a cost number as a USD string (e.g. 1.63 → "$1.63").
 */
function formatCost(cost: number): string {
    if (typeof cost !== 'number' || !isFinite(cost))
        return '$-.--';
    return `$${cost.toFixed(2)}`;
}

/**
 * Build the argv array for the codeburn subprocess, respecting user settings.
 */
function buildArgv(settings: Gio.Settings): string[] {
    const binary = settings.get_string('codeburn-path').trim() || 'codeburn';
    const argv = [binary, 'status', '--format', 'menubar-json'];
    const provider = settings.get_string('provider-filter').trim();
    if (provider)
        argv.push('--provider', provider);
    return argv;
}

// ---------------------------------------------------------------------------
// Indicator widget
// ---------------------------------------------------------------------------

const CodeburnIndicator = GObject.registerClass(
class CodeburnIndicator extends PanelMenu.Button {
    private _settings!: Gio.Settings;
    private _refreshTimer: number | null = null;
    private _currentData: CodeburnStatusResponse | null = null;
    private _label!: St.Label;
    private _settingsConnections: number[] = [];

    _init(settings: Gio.Settings) {
        super._init(0.0, _('Codeburn'));

        this._settings = settings;
        this._refreshTimer = null;
        this._currentData = null;

        // Panel label
        this._label = new St.Label({
            text: _('codeburn…'),
            y_align: 2, // Clutter.ActorAlign.CENTER
            style_class: 'codeburn-label',
        });
        this.add_child(this._label);

        // Build initial (empty) popup menu
        this._buildMenu(null);

        // Watch settings changes that affect the display
        this._settingsConnections = [
            this._settings.connect('changed::show-calls', () => this._updateLabel()),
            this._settings.connect('changed::refresh-interval', () => this._resetTimer()),
            this._settings.connect('changed::codeburn-path', () => this._refresh()),
            this._settings.connect('changed::provider-filter', () => this._refresh()),
        ];

        // First fetch, then start the timer
        this._refresh();
        this._startTimer();
    }

    // -----------------------------------------------------------------------
    // Timer management
    // -----------------------------------------------------------------------

    _startTimer() {
        this._stopTimer();
        const interval = Math.max(10, this._settings.get_int('refresh-interval'));
        this._refreshTimer = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            interval,
            () => {
                this._refresh();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _stopTimer() {
        if (this._refreshTimer !== null) {
            GLib.Source.remove(this._refreshTimer);
            this._refreshTimer = null;
        }
    }

    _resetTimer() {
        this._startTimer();
    }

    // -----------------------------------------------------------------------
    // Data fetching
    // -----------------------------------------------------------------------

    /**
     * Spawn codeburn asynchronously and update the UI when done.
     * Never throws — errors are surfaced in the panel label instead.
     */
    _refresh() {
        let argv: string[];
        try {
            argv = buildArgv(this._settings);
        } catch (_e) {
            this._setError(_('Bad settings'));
            return;
        }

        let proc: Gio.Subprocess;
        try {
            proc = new Gio.Subprocess({
                argv,
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE,
            });
            proc.init(null);
        } catch (e: any) {
            console.error(`[codeburn] Failed to spawn ${argv[0]}: ${e.message}`);
            this._setError(_('codeburn not found'));
            return;
        }

        proc.communicate_utf8_async(null, null, (p, res) => {
            let stdout: string | null = null;
            try {
                [, stdout] = p!.communicate_utf8_finish(res);
            } catch (_e: any) {
                console.error(`[codeburn] communicate error: ${_e.message}`);
                this._setError(_('read error'));
                return;
            }

            if (!p!.get_successful()) {
                console.error('[codeburn] process exited with non-zero status');
                this._setError(_('codeburn error'));
                return;
            }

            let data: CodeburnStatusResponse;
            try {
                data = JSON.parse(stdout || '{}');
            } catch (e: any) {
                console.error(`[codeburn] JSON parse error: ${e.message}`);
                this._setError(_('parse error'));
                return;
            }

            this._currentData = data;
            this._updateLabel();
            this._buildMenu(data);
        });
    }

    // -----------------------------------------------------------------------
    // UI updates
    // -----------------------------------------------------------------------

    _setError(msg: string) {
        this._label.set_text(msg);
    }

    /**
     * Refresh the panel label text from the last fetched data.
     */
    _updateLabel() {
        const data = this._currentData;
        if (!data?.current) {
            this._label.set_text(_('codeburn…'));
            return;
        }

        const cost = formatCost(data.current.cost);
        const showCalls = this._settings.get_boolean('show-calls');

        if (showCalls && typeof data.current.calls === 'number')
            this._label.set_text(`${cost} / ${data.current.calls} calls`);
        else
            this._label.set_text(cost);
    }

    /**
     * Rebuild the popup menu from fetched data.
     * Called with null on first init (shows a loading state).
     */
    _buildMenu(data: CodeburnStatusResponse | null) {
        this.menu.removeAll();

        if (!data?.current) {
            const loading = new PopupMenu.PopupMenuItem(_('Loading…'), {reactive: false});
            this.menu.addMenuItem(loading);
        } else {
            const today = data.current;
            const currency = data.currency ?? 'USD';

            // Section header — e.g. "Today (2026-06-03)"
            const header = new PopupMenu.PopupMenuItem(
                today.label ?? _('Today'),
                {reactive: false}
            );
            header.label.style_class = 'codeburn-menu-header';
            this.menu.addMenuItem(header);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            // Core metrics
            this._addStatRow(_('Cost'), `${formatCost(today.cost)} ${currency}`);
            this._addStatRow(_('Calls'), `${today.calls ?? '—'}`);
            this._addStatRow(_('Sessions'), `${today.sessions ?? '—'}`);

            if (typeof today.cacheHitPercent === 'number')
                this._addStatRow(_('Cache hit'), `${today.cacheHitPercent.toFixed(1)}%`);

            if (today.inputTokens != null || today.outputTokens != null) {
                const inK = today.inputTokens != null
                    ? `${Math.round(today.inputTokens / 1000)}k in` : '';
                const outK = today.outputTokens != null
                    ? `${Math.round(today.outputTokens / 1000)}k out` : '';
                this._addStatRow(_('Tokens'), [inK, outK].filter(Boolean).join(' / '));
            }
        }

        // Always show a separator + Refresh item at the bottom
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const refreshItem = new PopupMenu.PopupMenuItem(_('Refresh'));
        refreshItem.connect('activate', () => this._refresh());
        this.menu.addMenuItem(refreshItem);
    }

    /**
     * Add a two-column label row to the popup menu.
     */
    _addStatRow(label: string, value: string) {
        const item = new PopupMenu.PopupMenuItem('', {reactive: false});

        const labelWidget = new St.Label({
            text: label,
            style_class: 'codeburn-stat-label',
            x_expand: true,
        });
        const valueWidget = new St.Label({
            text: value,
            style_class: 'codeburn-stat-value',
        });

        item.add_child(labelWidget);
        item.add_child(valueWidget);
        this.menu.addMenuItem(item);
    }

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    destroy() {
        this._stopTimer();

        for (const id of this._settingsConnections ?? [])
            this._settings.disconnect(id);
        this._settingsConnections = [];

        super.destroy();
    }
});

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default class CodeburnExtension extends Extension {
    private _settings: Gio.Settings | null = null;
    private _indicator: InstanceType<typeof CodeburnIndicator> | null = null;

    enable() {
        this._settings = this.getSettings();
        this._indicator = new CodeburnIndicator(this._settings);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
        this._settings = null;
    }
}
