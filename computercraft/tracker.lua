-- CC: Tweaked client for the authenticated Minecraft tracker.
-- Configure tracker.url and tracker.api_key with settings.set/settings.save.
local M = {}

local function request(method, path, payload)
    local base = settings.get("tracker.url")
    local key = settings.get("tracker.api_key")
    assert(type(base) == "string", "Set tracker.url before using the tracker")
    assert(type(key) == "string" and key:match("^mct_"), "Set tracker.api_key before using the tracker")
    base = base:gsub("/+$", "")
    assert(base:match("^https://") or base:match("^http://127%.0%.0%.1:%d+$") or base:match("^http://localhost:%d+$"),
        "Use HTTPS, or HTTP on the Minecraft server's loopback address")
    local options = {
        url = base .. path,
        method = method,
        redirect = false,
        timeout = 15,
        headers = { Authorization = "Bearer " .. key, Accept = "application/json" },
    }
    local handle, err, failed
    if payload ~= nil then
        options.headers["Content-Type"] = "application/json"
        options.body = textutils.serializeJSON(payload)
        handle, err, failed = http.post(options)
    else
        handle, err, failed = http.get(options)
    end
    if not handle then
        local message = err or "HTTP request failed"
        if failed then
            local status = failed.getResponseCode()
            local raw = failed.readAll()
            failed.close()
            local ok, data = pcall(textutils.unserializeJSON, raw)
            message = tostring(status) .. ": " .. (ok and type(data) == "table" and data.error or message)
        end
        error(message, 2)
    end
    local raw = handle.readAll()
    handle.close()
    local data = textutils.unserializeJSON(raw)
    assert(type(data) == "table", "Tracker returned invalid JSON")
    return data
end

local function itemPath(id)
    assert(type(id) == "string" and id:match("^[a-z0-9_]+$"), "Use a checklist item ID such as stone")
    return "/api/v1/progress/" .. id
end

function M.items(minecraftId)
    local path = "/api/v1/items"
    if minecraftId then
        assert(minecraftId:match("^[a-z0-9_]+:[a-z0-9_/]+$"), "Invalid Minecraft item identifier")
        path = path .. "?minecraft_id=" .. textutils.urlEncode(minecraftId)
    end
    return request("GET", path).items
end

function M.progress()
    return request("GET", "/api/v1/progress").progress
end

function M.complete(id, collected, revision)
    assert(type(collected) == "boolean", "collected must be a boolean")
    return request("PATCH", itemPath(id), { is_completed = collected, expected_revision = revision })
end

function M.claim(id, hunting, revision)
    assert(type(hunting) == "boolean", "hunting must be a boolean")
    return request("PATCH", itemPath(id), { claimed = hunting, expected_revision = revision })
end

function M.batch(updates)
    assert(type(updates) == "table" and #updates >= 1 and #updates <= 200, "Send 1-200 updates")
    return request("POST", "/api/v1/progress/batch", { items = updates }).results
end

function M.undo(id, undoId)
    return request("POST", itemPath(id) .. "/undo", { undo_id = undoId })
end

return M
