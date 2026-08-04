// src/extension.ts
import GObject from "gi://GObject";
import St from "gi://St";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
function formatCost(cost) {
  if (typeof cost !== "number" || !isFinite(cost))
    return "$-.--";
  return `$${cost.toFixed(2)}`;
}
function buildArgv(settings) {
  const binary = settings.get_string("codeburn-path").trim() || "codeburn";
  const argv = [binary, "status", "--format", "menubar-json"];
  const provider = settings.get_string("provider-filter").trim();
  if (provider)
    argv.push("--provider", provider);
  return argv;
}
var CodeburnIndicator = GObject.registerClass(
  class CodeburnIndicator2 extends PanelMenu.Button {
    _settings;
    _refreshTimer = null;
    _currentData = null;
    _label;
    _settingsConnections = [];
    _init(settings) {
      super._init(0, _("Codeburn"));
      this._settings = settings;
      this._refreshTimer = null;
      this._currentData = null;
      this._label = new St.Label({
        text: _("codeburn\u2026"),
        y_align: 2,
        // Clutter.ActorAlign.CENTER
        style_class: "codeburn-label"
      });
      this.add_child(this._label);
      this._buildMenu(null);
      this._settingsConnections = [
        this._settings.connect("changed::show-calls", () => this._updateLabel()),
        this._settings.connect("changed::refresh-interval", () => this._resetTimer()),
        this._settings.connect("changed::codeburn-path", () => this._refresh()),
        this._settings.connect("changed::provider-filter", () => this._refresh())
      ];
      this._refresh();
      this._startTimer();
    }
    // -----------------------------------------------------------------------
    // Timer management
    // -----------------------------------------------------------------------
    _startTimer() {
      this._stopTimer();
      const interval = Math.max(10, this._settings.get_int("refresh-interval"));
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
      let argv;
      try {
        argv = buildArgv(this._settings);
      } catch (_e) {
        this._setError(_("Bad settings"));
        return;
      }
      let proc;
      try {
        proc = new Gio.Subprocess({
          argv,
          flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE
        });
        proc.init(null);
      } catch (e) {
        console.error(`[codeburn] Failed to spawn ${argv[0]}: ${e.message}`);
        this._setError(_("codeburn not found"));
        return;
      }
      proc.communicate_utf8_async(null, null, (p, res) => {
        let stdout = null;
        try {
          [, stdout] = p.communicate_utf8_finish(res);
        } catch (_e) {
          console.error(`[codeburn] communicate error: ${_e.message}`);
          this._setError(_("read error"));
          return;
        }
        if (!p.get_successful()) {
          console.error("[codeburn] process exited with non-zero status");
          this._setError(_("codeburn error"));
          return;
        }
        let data;
        try {
          data = JSON.parse(stdout || "{}");
        } catch (e) {
          console.error(`[codeburn] JSON parse error: ${e.message}`);
          this._setError(_("parse error"));
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
    _setError(msg) {
      this._label.set_text(msg);
    }
    /**
     * Refresh the panel label text from the last fetched data.
     */
    _updateLabel() {
      const data = this._currentData;
      if (!data?.current) {
        this._label.set_text(_("codeburn\u2026"));
        return;
      }
      const cost = formatCost(data.current.cost);
      const showCalls = this._settings.get_boolean("show-calls");
      if (showCalls && typeof data.current.calls === "number")
        this._label.set_text(`${cost} / ${data.current.calls} calls`);
      else
        this._label.set_text(cost);
    }
    /**
     * Rebuild the popup menu from fetched data.
     * Called with null on first init (shows a loading state).
     */
    _buildMenu(data) {
      this.menu.removeAll();
      if (!data?.current) {
        const loading = new PopupMenu.PopupMenuItem(_("Loading\u2026"), { reactive: false });
        this.menu.addMenuItem(loading);
      } else {
        const today = data.current;
        const currency = data.currency ?? "USD";
        const header = new PopupMenu.PopupMenuItem(
          today.label ?? _("Today"),
          { reactive: false }
        );
        header.label.style_class = "codeburn-menu-header";
        this.menu.addMenuItem(header);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this._addStatRow(_("Cost"), `${formatCost(today.cost)} ${currency}`);
        this._addStatRow(_("Calls"), `${today.calls ?? "\u2014"}`);
        this._addStatRow(_("Sessions"), `${today.sessions ?? "\u2014"}`);
        if (typeof today.cacheHitPercent === "number")
          this._addStatRow(_("Cache hit"), `${today.cacheHitPercent.toFixed(1)}%`);
        if (today.inputTokens != null || today.outputTokens != null) {
          const inK = today.inputTokens != null ? `${Math.round(today.inputTokens / 1e3)}k in` : "";
          const outK = today.outputTokens != null ? `${Math.round(today.outputTokens / 1e3)}k out` : "";
          this._addStatRow(_("Tokens"), [inK, outK].filter(Boolean).join(" / "));
        }
      }
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      const refreshItem = new PopupMenu.PopupMenuItem(_("Refresh"));
      refreshItem.connect("activate", () => this._refresh());
      this.menu.addMenuItem(refreshItem);
    }
    /**
     * Add a two-column label row to the popup menu.
     */
    _addStatRow(label, value) {
      const item = new PopupMenu.PopupMenuItem("", { reactive: false });
      const labelWidget = new St.Label({
        text: label,
        style_class: "codeburn-stat-label",
        x_expand: true
      });
      const valueWidget = new St.Label({
        text: value,
        style_class: "codeburn-stat-value"
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
  }
);
var CodeburnExtension = class extends Extension {
  _settings = null;
  _indicator = null;
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
};
export {
  CodeburnExtension as default
};
