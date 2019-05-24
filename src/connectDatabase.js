import { staticSettings } from "./global_objects.js"
import DatabaseHandler from "./DatabaseHandler.js"
import DummyDatabaseHandler from "./DummyDatabaseHandler.js"

export default async function connectDatabase(state) {
    state.zipDBHandler = (window.indexedDB)
        ? (!navigator.userAgent.match("Edge"))
            ? new DatabaseHandler(staticSettings.getDBName(), 2, staticSettings.getStorageName(), "id")
            : new DummyDatabaseHandler(staticSettings.getDBName(), 2, staticSettings.getStorageName(), "id")
        : new DummyDatabaseHandler(staticSettings.getDBName(), 2, staticSettings.getStorageName(), "id")
    state.zipDB = await state.zipDBHandler.connect()
    state.storedKeys = await state.zipDBHandler.getAllKeys(state.zipDB)
    return state
};