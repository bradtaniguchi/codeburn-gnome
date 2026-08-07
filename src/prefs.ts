/* prefs.ts
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

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class CodeburnPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window: Adw.PreferencesWindow): void {
        const settings = this.getSettings();

        window.set_default_size(600, 480);

        // ---------------------------------------------------------------
        // Page: General
        // ---------------------------------------------------------------
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        // ---- Group: Display ----
        const displayGroup = new Adw.PreferencesGroup({
            title: _('Display'),
            description: _('Controls what is shown in the GNOME panel.'),
        });
        page.add(displayGroup);

        // Show call count toggle
        const showCallsRow = new Adw.SwitchRow({
            title: _('Show call count'),
            subtitle: _('Append the number of AI calls to the panel label (e.g. "$1.63 / 184 calls").'),
        });
        settings.bind('show-calls', showCallsRow, 'active', 0 /* GET_SET */);
        displayGroup.add(showCallsRow);

        // ---- Group: Data ----
        const dataGroup = new Adw.PreferencesGroup({
            title: _('Data'),
            description: _('Controls how codeburn is queried for metrics.'),
        });
        page.add(dataGroup);

        // Refresh interval — SpinRow (10 – 3600 s)
        const refreshRow = new Adw.SpinRow({
            title: _('Refresh interval'),
            subtitle: _('How often to query the codeburn CLI, in seconds.'),
            adjustment: new Gtk.Adjustment({
                lower: 10,
                upper: 3600,
                step_increment: 10,
                page_increment: 60,
            }),
        });
        settings.bind('refresh-interval', refreshRow, 'value', 0 /* GET_SET */);
        dataGroup.add(refreshRow);

        // Provider filter — EntryRow
        const providerRow = new Adw.EntryRow({
            title: _('Provider filter'),
            show_apply_button: true,
        });
        providerRow.set_text(settings.get_string('provider-filter'));
        providerRow.connect('apply', row => {
            settings.set_string('provider-filter', row.get_text().trim());
        });
        // Also save when the row loses focus
        providerRow.connect('notify::has-focus', row => {
            if (!row.has_focus)
                settings.set_string('provider-filter', row.get_text().trim());
        });
        const providerHint = new Gtk.Label({
            label: _('e.g. claude, copilot, gemini — leave blank for all providers'),
            css_classes: ['caption', 'dim-label'],
            halign: Gtk.Align.START,
            margin_start: 6,
            margin_bottom: 4,
            wrap: true,
        });
        dataGroup.add(providerRow);
        dataGroup.add(providerHint);

        // ---- Group: Advanced ----
        const advGroup = new Adw.PreferencesGroup({
            title: _('Advanced'),
            description: _('Override how the codeburn binary is located.'),
        });
        page.add(advGroup);

        // Codeburn binary path — EntryRow
        const pathRow = new Adw.EntryRow({
            title: _('codeburn binary path'),
            show_apply_button: true,
        });
        pathRow.set_text(settings.get_string('codeburn-path'));
        pathRow.connect('apply', row => {
            settings.set_string('codeburn-path', row.get_text().trim());
        });
        pathRow.connect('notify::has-focus', row => {
            if (!row.has_focus)
                settings.set_string('codeburn-path', row.get_text().trim());
        });
        const pathHint = new Gtk.Label({
            label: _('Absolute path to the codeburn executable — leave blank to use $PATH.\nUseful when codeburn is installed via nvm or a non-standard location.'),
            css_classes: ['caption', 'dim-label'],
            halign: Gtk.Align.START,
            margin_start: 6,
            margin_bottom: 4,
            wrap: true,
        });
        advGroup.add(pathRow);
        advGroup.add(pathHint);

        // "Detect path" button — runs `which codeburn` and pre-fills the entry
        const detectButton = new Gtk.Button({
            label: _('Detect path automatically'),
            halign: Gtk.Align.START,
            margin_top: 4,
            margin_start: 6,
            margin_bottom: 8,
            css_classes: ['pill'],
        });
        detectButton.connect('clicked', () => {
            try {
                const [ok, out] = GLib.spawn_command_line_sync('which codeburn');
                if (ok && out) {
                    const detected = new TextDecoder().decode(out).trim();
                    if (detected) {
                        pathRow.set_text(detected);
                        settings.set_string('codeburn-path', detected);
                    }
                }
            } catch (_e) {
                // which not available or codeburn not found — silently ignore
            }
        });
        advGroup.add(detectButton);
    }
}
