/*jshint globalstrict:true, node:true*/

"use strict";

var _ = require("lodash");
var assert = require("assert");
var utils = require("../utils");

var remote = require("remote");
var electronApp = remote.require("app");
var Menu = remote.require("menu");
var shell = remote.require("shell");
var shellState = remote.require("./shell-state");

var menuTemplate = [];

var REMOTE_DEBUGGING_PORT = 9234; // TODO: this is hardcoded in brackets-shell

var AppError = function (code, msg) {
    var err = new Error(msg);
    err.name = "AppError";
    err.code = code;
    return err;
};

var app = module.exports = {
    ERR_NOTFOUND: "NOTFOUND",
    // TODO: cleanup unused below
    ERR_CL_TOOLS_CANCELLED: 12,
    ERR_CL_TOOLS_MKDIRFAILED: 14,
    ERR_CL_TOOLS_NOTSUPPORTED: 17,
    ERR_CL_TOOLS_RMFAILED: 13,
    ERR_CL_TOOLS_SERVFAILED: 16,
    ERR_CL_TOOLS_SYMLINKFAILED: 15,
    ERR_NODE_FAILED: -3,
    ERR_NODE_NOT_YET_STARTED: -1,
    ERR_NODE_PORT_NOT_YET_SET: -2,
    NO_ERROR: 0,
    // TODO: this should be changeable
    language: "en",
    // underscore electron custom props
    _startup: process.hrtime()
};

var __refreshMenu = _.debounce(function () {
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}, 100);

function _refreshMenu(callback) {
    __refreshMenu();
    process.nextTick(callback);
}

function _findMenuItemById(id, where, opts) {
    opts = opts || {};
    where = where || menuTemplate;

    var result = _.find(where, {id: id});

    if (!result) {
        var results = _.compact(where.map(function (menuItem) {
            return menuItem.submenu ? _findMenuItemById(id, menuItem.submenu, opts) : null;
        }));
        result = results.length > 0 ? results[0] : null;
    }

    if (opts.delete && result) {
        var io = where.indexOf(result);
        where.splice(io, 1);
    }

    return result;
}

function _addBeforeOrAfter(obj, target, position, relativeId) {
    var idx = _.findIndex(target, {id: relativeId});
    if (idx === -1) {
        throw new Error("can't find item with id: " + relativeId);
    }
    if (position === "after") {
        idx++;
    }
    target.splice(idx, 0, obj);
}

function _fixBracketsKeyboardShortcut(shortcut) {
    if (typeof shortcut !== "string" || shortcut.trim() === "") {
        return null;
    }

    shortcut = shortcut.replace(/-/g, "+");
    shortcut = shortcut.replace(/\+$/g, "Plus");
    shortcut = shortcut.replace(/\u2190/g, "Left");
    shortcut = shortcut.replace(/\u2191/g, "Up");
    shortcut = shortcut.replace(/\u2192/g, "Right");
    shortcut = shortcut.replace(/\u2193/g, "Down");
    shortcut = shortcut.replace(/\u2212/g, "-");

    if (!shortcut.match(/^[\x00-\x7F]+$/)) {
        console.error("Non ASCII keyboard shortcut used: " + shortcut);
        shortcut = null;
    }

    return shortcut;
}

app.abortQuit = function () {
    // TODO: implement
    throw new Error("app.abortQuit not implemented");
};

app.addMenu = function (title, id, position, relativeId, callback) {
    if (position && ["before", "after"].indexOf(position) === -1) {
        throw new Error("position not implemented in addMenu: " + position);
    }

    var newObj = {
        id: id,
        label: title
    };

    if (position === "before" || position === "after") {
        _addBeforeOrAfter(newObj, menuTemplate, position, relativeId);
    } else {
        menuTemplate.push(newObj);
    }

    _refreshMenu(callback.bind(null, app.NO_ERROR));
};

app.addMenuItem = function (parentId, title, id, key, displayStr, position, relativeId, callback) {
    assert(parentId && typeof parentId === "string", "parentId must be a string");
    assert(title && typeof title === "string", "title must be a string");
    assert(id && typeof id === "string", "id must be a string");
    assert(key == null || key && typeof key === "string", "key must be a string");
    assert(displayStr == null || displayStr && typeof displayStr === "string", "displayStr must be a string");
    assert(position && typeof position === "string", "position must be a string");
    assert(relativeId && typeof relativeId === "string", "relativeId must be a string");
    assert(typeof callback === "function", "callback must be a function");

    key = _fixBracketsKeyboardShortcut(key);

    if (position && ["before", "after"].indexOf(position) === -1) {
        throw new Error("position not implemented in addMenuItem: " + position);
    }

    var isSeparator = title === "---",
        newObj = {
        type: isSeparator ? "separator" : "normal",
        id: id,
        label: title,
        click: function () {
            window.brackets.shellAPI.executeCommand(id, true);
        }
    };

    if (key) {
        newObj.accelerator = key;
    }

    var parentObj = _findMenuItemById(parentId);
    if (!parentObj) {
        return process.nextTick(function () {
            callback(
                new AppError(app.ERR_NOTFOUND, "NOTFOUND: menu item doesn't exist: " + parentId)
            );
        });
    }

    if (!parentObj.submenu) {
        parentObj.submenu = [];
    }

    if (position === "before" || position === "after") {
        _addBeforeOrAfter(newObj, parentObj.submenu, position, relativeId);
    } else {
        parentObj.submenu.push(newObj);
    }

    _refreshMenu(callback.bind(null, app.NO_ERROR));
};

app.closeLiveBrowser = function (callback) {
    // TODO: implement
    callback(new Error("app.closeLiveBrowser not implemented"));
};

app.dragWindow = function () {
    // TODO: implement
    throw new Error("app.dragWindow not implemented");
};

app.getApplicationSupportDirectory = function () {
    // TODO: once stable, change "productName" to Brackets in package.json
    return utils.convertWindowsPathToUnixPath(electronApp.getPath("userData"));
};

app.getDroppedFiles = function (callback) {
    // TODO: implement
    callback(new Error("app.getDroppedFiles not implemented"));
};

// return the number of milliseconds that have elapsed since the application was launched
app.getElapsedMilliseconds = function () {
    var diff = process.hrtime(app._startup);
    // diff = [ seconds, nanoseconds ]
    return diff[0] * 1000 + diff[1] / 1000000;
};

app.getMenuItemState = function (commandId, callback) {
    // TODO: implement
    callback(new Error("app.getDroppedFiles not implemented: " + commandId));
};

app.getMenuPosition = function (commandId, callback) {
    // TODO: implement
    callback(new Error("app.getMenuPosition not implemented: " + commandId));
};

app.getMenuTitle = function (commandId, callback) {
    process.nextTick(function () {
        var obj = _findMenuItemById(commandId);
        if (!obj) {
            return callback(
                new AppError(app.ERR_NOTFOUND, "NOTFOUND: menu item doesn't exist: " + commandId)
            );
        }
        callback(null, obj.label);
    });
};

app.getNodeState = function (callback) {
    var errorCode = app[shellState.get("socketServer.state")];
    var port = shellState.get("socketServer.port");
    callback(errorCode, port);
};

app.getPendingFilesToOpen = function (callback) {
    // TODO: implement
    callback(new Error("app.getPendingFilesToOpen not implemented"), []);
};

app.getRemoteDebuggingPort = function () {
    return REMOTE_DEBUGGING_PORT;
};

app.getUserHomeDirectory = function () {
    return utils.convertWindowsPathToUnixPath(electronApp.getPath("home"));
};

app.getUserDocumentsDirectory = function () {
    console.warn("DEPRECATED: don't use app.getUserDocumentsDirectory(); replaced by app.getUserHomeDirectory()");
    return app.getUserHomeDirectory();
};

app.getZoomLevel = function (callback) {
    // TODO: implement
    callback(new Error("app.getZoomLevel not implemented"));
};

app.installCommandLine = function (callback) {
    // TODO: implement
    callback(new Error("app.installCommandLine not implemented"));
};

app.openLiveBrowser = function (url, enableRemoteDebugging, callback) {
    // TODO: implement
    callback(new Error("app.openLiveBrowser not implemented" + url));
};

app.openURLInDefaultBrowser = function (url, callback) {
    shell.openExternal(url);
    callback(app.NO_ERROR);
};

app.quit = function () {
    electronApp.quit();
};

app.removeMenu = function (commandId, callback) {
    _findMenuItemById(commandId, menuTemplate, {delete: true});
    _refreshMenu(callback.bind(null, app.NO_ERROR));
};

app.removeMenuItem = function (commandId, callback) {
    _findMenuItemById(commandId, menuTemplate, {delete: true});
    _refreshMenu(callback.bind(null, app.NO_ERROR));
};

app.setMenuItemShortcut = function (commandId, shortcut, displayStr, callback) {
    shortcut = _fixBracketsKeyboardShortcut(shortcut);
    var obj = _findMenuItemById(commandId);
    if (shortcut) {
        obj.accelerator = shortcut;
    } else {
        delete obj.accelerator;
    }
    _refreshMenu(callback.bind(null, app.NO_ERROR));
};

app.setMenuItemState = function (commandId, enabled, checked, callback) {
    var obj = _findMenuItemById(commandId);
    obj.enabled = enabled;
    obj.checked = checked;
    if (checked) {
        // TODO: Change addMenuItem to set the type (checkbox, radio, ... submenu)
        obj.type = "checkbox";
    }
    _refreshMenu(callback);
};

app.setMenuTitle = function (commandId, title, callback) {
    var obj = _findMenuItemById(commandId);
    obj.label = title;
    _refreshMenu(callback);
};

app.setZoomLevel = function (zoomLevel, callback) {
    // TODO: implement
    callback(new Error("app.setZoomLevel not implemented" + zoomLevel));
};

app.showDeveloperTools = function () {
    var win = remote.getCurrentWindow();
    win.openDevTools({detach: true});
};

app.showExtensionsFolder = function (appURL, callback) {
    // TODO: implement
    callback(new Error("app.showExtensionsFolder not implemented" + appURL));
};

app.showOSFolder = function (path, callback) {
    // TODO: implement
    callback(new Error("app.showOSFolder not implemented" + path));
};
