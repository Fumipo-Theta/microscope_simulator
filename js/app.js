/**
 *  Language code of sample list is such as "ja" or "en".
 */

class StaticManager {
    constructor(
        sampleListURL,
        imageDataPathPrefix,
        dbName,
        storageName
    ) {
        this.sampleListURL = sampleListURL
        this.imageDataPathPrefix = imageDataPathPrefix
        this.indexedDBName = dbName
        this.storageName = storageName
    }

    getSampleListURL() {
        return this.sampleListURL
    }

    getImageDataPath(packageName) {
        return this.imageDataPathPrefix + packageName + "/"
    }

    getDBName() {
        return this.indexedDBName;
    }

    getStorageName() {
        return this.storageName
    }
}

staticSettings = new StaticManager(
    "./dynamic/rock_list.json",
    "./data/",
    "db_v2", // "zipfiles"
    "files" //"zip"
)



class DatabaseHandler {
    constructor(db_name, version, storeName, primaryKeyName) {
        this.db = window.indexedDB;
        this.db_name = db_name;
        this.db_version = version;
        this.storeName = storeName;
        this.primaryKey = primaryKeyName;
    }

    schemeDef(db) {
        db.createObjectStore(this.storeName, { keyPath: this.primaryKey, autoIncrement: true });
    }

    connect() {
        const dbp = new Promise((resolve, reject) => {
            const req = this.db.open(this.db_name, this.db_version);
            req.onsuccess = ev => resolve(ev.target.result);
            req.onerror = ev => reject('fails to open db');
            req.onupgradeneeded = ev => this.schemeDef(ev.target.result);
        });
        dbp.then(d => d.onerror = ev => alert("error: " + ev.target.errorCode));
        return dbp;
    }

    async put(db, obj) { // returns obj in IDB
        return new Promise((resolve, reject) => {
            const docs = db.transaction([this.storeName], 'readwrite').objectStore(this.storeName);
            const req = docs.put(obj);
            req.onsuccess = () => resolve(Object.assign({ [this.primaryKey]: req.result }, obj));
            req.onerror = reject;
        });
    }

    async get(db, id) { // NOTE: if not found, resolves with undefined.
        return new Promise((resolve, reject) => {
            const docs = db.transaction([this.storeName,]).objectStore(this.storeName);
            const req = docs.get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = reject;
        });
    }

    async delete(db, id) {
        return new Promise((resolve, reject) => {
            const docs = db.transaction([this.storeName,], 'readwrite')
                .objectStore(this.storeName);
            const req = docs.delete(id);
            req.onsuccess = () => resolve(id);
            req.onerror = reject;
        })
    }

    async loadAll(db) {
        return new Promise(async (resolve, reject) => {
            const saves = [];
            const req = db.transaction([this.storeName]).objectStore(this.storeName).openCursor();
            resolve(req)
        });
    }

    async getAllKeys(db) {
        return new Promise(async (resolve, reject) => {
            try {
                var req = db.transaction([this.storeName]).objectStore(this.storeName)
            } catch (e) {
                return resolve([])
            }

            if (req.getAllKeys) {
                req.getAllKeys().onsuccess = function (event) {
                    const rows = event.target.result;
                    resolve(rows);
                }
            } else {
                const entries = await this.loadAll(db)
                resolve(Object.keys(entries))
            }
            req.onerror = reject
        })
    }
}

class TextNode {
    constructor(selector) {
        this.dom = document.querySelector(selector)
    }

    message(str) {
        this.dom.innerHTML = str;
    }
}

const loadingMessage = new TextNode("#loading_message")

class DummyDatabaseHandler extends DatabaseHandler {
    constructor(db_name, version, storeName, primaryKeyName) {
        console.warn("IndexedDB is not available !")
        super(db_name, version, storeName, primaryKeyName)
        this.storage = {}
    }

    connect() {
        return {}
    }

    put(db, obj) {
        if (db.hasOwnProperty(obj[this.primaryKey])) {
            var old = db[obj[this.primaryKey]]
        } else {
            var old = {}
        }
        const new_entry = Object.assign(old, obj)
        db[obj[this.primaryKey]] = new_entry;
        return { [obj[this.primaryKey]]: new_entry }
    }

    get(db, id) {
        if (db.hasOwnProperty(id)) {
            return db[id]
        } else {
            return undefined
        }
    }

    delete(db, id) {
        if (db.hasOwnProperty(id)) {
            db[id] = null;
            return id
        } else {
            return undefined
        }
    }

    loadAll(db) {
        return Object.entries(db)
    }

    getAllKeys(db) {
        return Object.keys(db)
    }
}

class NativeLocalStorage {
    constructor() {
        this.db = window.localStorage
    }

    put(key, value) {
        this.db.setItem(key, value);
    }

    get(key) {
        const value = this.db.getItem(key)
        return (value == null)
            ? undefined
            : value
    }
}

class DummyLocalStorage {
    constructor() {
        this.db = {}
    }

    put(key, value) {
        this.db[key] = value;
    }

    get(key) {
        return (this.db.hasOwnProperty("key"))
            ? this.db[key]
            : undefined
    }
}

async function detectWebpSupport() {

    const testImageSources = [
        "data:image/webp;base64,UklGRjIAAABXRUJQVlA4ICYAAACyAgCdASoCAAEALmk0mk0iIiIiIgBoSygABc6zbAAA/v56QAAAAA==",
        "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAQAAAAfQ//73v/+BiOh/AAA="
    ]

    const testImage = (src) => {
        return new Promise((resolve, reject) => {
            var img = document.createElement("img")
            img.onerror = error => resolve(false)
            img.onload = () => resolve(true)
            img.src = src
        })
    }

    const results = await Promise.all(testImageSources.map(testImage))

    return results.every(result => !!result)
}

const relax = () => new Promise(resolve => requestAnimationFrame(resolve))


async function detectJ2kSupport() {
    const testImageSources = [
        'data:image/jp2;base64,AAAADGpQICANCocKAAAAFGZ0eXBqcDIgAAAAAGpwMiAAAAAtanAyaAAAABZpaGRyAAAABAAAAAQAAw8HAAAAAAAPY29scgEAAAAAABAAAABpanAyY/9P/1EALwAAAAAABAAAAAQAAAAAAAAAAAAAAAQAAAAEAAAAAAAAAAAAAw8BAQ8BAQ8BAf9SAAwAAAABAQAEBAAB/1wABECA/5AACgAAAAAAGAAB/5PP/BAQFABcr4CA/9k='
    ]

    const testImage = (src) => {
        return new Promise((resolve, reject) => {
            var img = document.createElement("img")
            img.onerror = error => resolve(false)
            img.onload = () => resolve(true)
            img.src = src
        })
    }

    const results = await Promise.all(testImageSources.map(testImage))

    return results.every(result => !!result)
}


function ISmallStorageFactory() {
    return (window.localStorage)
        ? new NativeLocalStorage()
        : new DummyLocalStorage()
}

function es6Available() {
    return (typeof Symbol === "function" && typeof Symbol() === "symbol")
}


function selectLanguageCode() {
    const code = (window.navigator.languages && window.navigator.languages[0]) ||
        window.navigator.language ||
        window.navigator.userLanguage ||
        window.navigator.browserLanguage;

    const lang = code.match("ja") ? "ja" : "en";

    return lang
}

/**
 *
 * @param {String,Object[String,String]} multiLanguageTextObj
 * @return {String}
 */
function multiLanguage(multiLanguageTextObj, languageCode) {
    if (typeof (multiLanguageTextObj) === "string") {
        return multiLanguageTextObj
    } else if (typeof (multiLanguageTextObj) === "object") {
        if (multiLanguageTextObj.hasOwnProperty(languageCode)) {
            return multiLanguageTextObj[languageCode]
        } else {
            const keys = Object.keys(multiLanguageTextObj)
            return (keys.length > 0)
                ? multiLanguageTextObj[keys[0]]
                : ""
        }
    } else {
        return ""
    }
}

function overwrideLanguageByLocalStorage(state) {
    const langInLocalStorage = state.localStorage.get("language")
    const lang = (langInLocalStorage !== undefined)
        ? langInLocalStorage
        : state.language;
    state.language = lang
    document.querySelector("option[value=" + lang + "]").selected = true
    return state
}

const stepBy = unit => val => Math.floor(val / unit)

const cycleBy = unit => val => {
    cycle_count = Math.floor(val / unit)
    return val < 0
        ? val + unit
        : (unit <= val)
            ? val - unit * cycle_count
            : val
}

const mirrorBy = (center) => val => val > center ? 2 * center - val : val

const isInverse = degree => (180 <= degree)

const rotateSign = (clockwise = true) => clockwise ? -1 : 1

const getMinimumWindowSize = () => {
    const width = window.innerWidth
    const height = window.innerHeight - 200
    return width < height ? width : height
}

const VIEW_PADDING = 0 // px


const resetState = () => ({
    "containorID": "",
    "imageNumber": 1,
    "canvasWidth": getMinimumWindowSize() <= 500
        ? getMinimumWindowSize()
        : 500,
    "canvasHeight": getMinimumWindowSize() <= 500
        ? getMinimumWindowSize()
        : 500,
    "imageRadius": 0,
    "open_image_srcs": [],
    "open_images": [],
    "cross_image_srcs": [],
    "cross_images": [],
    "isMousedown": false,
    "drag_start": [0, 0],
    "drag_end": [0, 0],
    "rotate": 0,
    "rotate_axis_translate": [],
    "isClockwise": true,
    "isCrossNicol": false,
    "language": selectLanguageCode(),
    "storedKeys": [],
    "drawHairLine": true,
})


let viewer = document.querySelector("#main-viewer")
let viewer_ctx = viewer.getContext("2d")

async function connectDatabase(state) {
    state.zipDBHandler = (window.indexedDB)
        ? (!navigator.userAgent.match("Edge"))
            ? new DatabaseHandler(staticSettings.getDBName(), 2, staticSettings.getStorageName(), "id")
            : new DummyDatabaseHandler(staticSettings.getDBName(), 2, staticSettings.getStorageName(), "id")
        : new DummyDatabaseHandler(staticSettings.getDBName(), 2, staticSettings.getStorageName(), "id")
    state.zipDB = await state.zipDBHandler.connect()
    state.storedKeys = await state.zipDBHandler.getAllKeys(state.zipDB)
    return state
};

async function checkSupportImageFormat(state) {
    state.supportWebp = await detectWebpSupport();
    state.supportJ2k = await detectJ2kSupport();
    return state
}

function connectLocalStorage(state) {
    state.localStorage = ISmallStorageFactory();
    return state
}


/**
 * サンプルリストをselectタグ内に追加する
 * @param {*} state
 */
const sampleListPresenter = state => response => new Promise(async (res, rej) => {

    const savedSampleNames = state.storedKeys;

    const sampleList = response["list_of_sample"];
    const sampleSelectDOM = document.querySelector("#rock_selector");
    sampleSelectDOM.innerHTML = "<option value='' disabled selected style='display:none;'>Select sample</option>";
    const options = sampleList.map(v => {
        const option = document.createElement("option")
        option.value = v["package-name"];
        option.innerHTML = (savedSampleNames.includes(v["package-name"]) ? "✓ " : "") + v["list-name"][state.language]
        if (savedSampleNames.includes(v["package-name"])) {
            option.classList.add("downloaded")
        }
        return option
    })
    options.forEach(v => {
        sampleSelectDOM.appendChild(v)
    })

    document.querySelector("#top-navigation").classList.add("isready");
    sampleSelectDOM.classList.add("isready")
    res(response);
})

const sampleListLoader = state => new Promise(async (res, rej) => {
    const listURL = staticSettings.getSampleListURL();
    try {
        var response = await fetch(listURL)
            .catch((e) => { throw Error(e) })
            .then(r => r.json())
        state.localStorage.put("list_of_sample", JSON.stringify(response["list_of_sample"]))
    } catch (e) {
        var stored_list = state.localStorage.get("list_of_sample")
        var response = { "list_of_sample": JSON.parse(stored_list) }
        console.warn(e)
        showErrorCard("<p>Internet disconnected.</p>")()
    }

    sampleListPresenter(state)(response)
        .then(_ => res(state))
        .catch(rej)
})

const windowResizeHandler = state => new Promise((res, rej) => {
    state.canvasWidth = getMinimumWindowSize() - 20
    state.canvasHeight = getMinimumWindowSize() - 20

    viewer = document.querySelector("#main-viewer")
    viewer_ctx = viewer.getContext("2d")
    viewer.width = state.canvasWidth
    viewer.height = state.canvasHeight
    viewer_ctx.translate(state.canvasWidth * 0.5, state.canvasHeight * 0.5)
    res(state)
})





const updateStateByMeta = (state) => (containorID, meta) => new Promise((res, rej) => {


    state.containorID = sanitizeID(containorID);
    state.isClockwise = meta.rotate_clockwise
    state.location = (meta.hasOwnProperty("location"))
        ? meta.location
        : "Unknown"
    state.rockType = (meta.hasOwnProperty("rock_type"))
        ? meta.rock_type
        : "Unknown"
    state.owner = (meta.hasOwnProperty("owner"))
        ? meta.owner
        : "Unknown"
    state.discription = (meta.hasOwnProperty("discription"))
        ? meta.discription
        : "No discription. "
    state.rotate_center = getRotationCenter(meta)

    state.imageWidth = meta.image_width;
    state.imageHeight = meta.image_height;

    function getRotationCenter(meta) {
        return (meta.hasOwnProperty("rotate_center"))
            ? {
                "to_right": meta.rotate_center[0],
                "to_bottom": meta.rotate_center[1]
            }
            : {
                "to_right": meta.image_width * 0.5,
                "to_bottom": meta.image_height * 0.5
            }
    }

    function getImageRadius(meta) {
        const shift = getRotationCenter(meta);
        const image_center = {
            "x": meta.image_width * 0.5,
            "y": meta.image_height * 0.5
        }
        return Math.min(
            image_center.x - Math.abs(image_center.x - shift.to_right),
            image_center.y - Math.abs(image_center.y - shift.to_bottom)
        )
    }

    state.imageRadius = getImageRadius(meta)
    state.imageRadiusOriginal = getImageRadius(meta)
    state.scaleWidth = (meta.hasOwnProperty("scale-pixel"))
        ? parseInt(meta["scale-pixel"])
        : false
    state.scaleText = (meta.hasOwnProperty("scale-unit"))
        ? meta["scale-unit"]
        : false


    const rotate_degree_step = meta.rotate_by_degree
    const cycle_degree = meta.hasOwnProperty("cycle_rotate_degree")
        ? parseInt(meta.cycle_rotate_degree)
        : 90;
    const image_number = cycle_degree / rotate_degree_step + 1
    state.image_number = image_number
    const mirror_at = (image_number - 1)
    const total_step = (image_number - 1) * 2

    state.getImageNumber = cycle_degree > 0
        ? degree => cycleBy(image_number - 1)(
            stepBy(rotate_degree_step)(state.isClockwise ? 360 - degree : degree)
        )
        : degree => mirrorBy(mirror_at)(
            cycleBy(total_step)(
                stepBy(rotate_degree_step)(degree)
            )
        )

    state.getAlpha = degree => {
        nth = cycleBy(total_step * 2)(
            stepBy(rotate_degree_step)(degree)
        )
        return 1 - (degree - rotate_degree_step * nth) / rotate_degree_step
    }

    state.open_images = []
    state.cross_images = []

    state.rotate = 0;

    res(state)
})

function selectImageSrc(state, response, packageName, prefix) {
    if (prefix in response.zip) {
        return [response.zip[prefix]]
    }

    const srcDir = staticSettings.getImageDataPath(packageName);

    if (state.supportWebp) {
        return [
            [srcDir + prefix + ".JPG", "image/jpeg"],
            [srcDir + prefix + ".jpg", "image/jpeg"],
            [srcDir + prefix + ".webp", "image/webp"]
        ]
    } else if (state.supportJ2k) {
        return [
            [srcDir + prefix + ".JPG", "image/jpeg"],
            [srcDir + prefix + ".jpg", "image/jpeg"],
            [srcDir + prefix + ".jp2", "image/jp2"]
        ]
    } else {
        return [
            [srcDir + prefix + ".JPG", "image/jpeg"],
            [srcDir + prefix + ".jpg", "image/jpeg"]
        ]
    }

}

function handleImgSrc(src) {
    if (src instanceof Blob) {
        const url = window.URL || window.webkitURL;
        return url.createObjectURL(src)
    } else if (src instanceof String) {
        return src
    } else {
        return src
    }
}

/**
 * @parameter src {dataURL}
 */
function loadImageSrc(state) {
    return src_set => new Promise((res, rej) => {

        const img = new Image()
        const [src, mime] = src_set.pop()

        img.onload = _ => {
            updateView(state)
            this.onnerror = null;
            res([img, mime])
        }
        img.onerror = e => {
            loadImageSrc(state)(src_set)
                .then(res)
                .catch(rej)
        }

        img.src = handleImgSrc(src)
    })
}

function ImageToBlob(img, mime_type) {
    return new Promise(async (res, rej) => {
        // New Canvas
        await relax()
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        // Draw Image
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        // To Base64
        canvas.toBlob(res, mime_type);
    })
}

function ImageToBase64(img, mime_type) {
    return new Promise(async (res, rej) => {
        // New Canvas
        await relax()
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        // Draw Image
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        // To Base64
        res(canvas.toDataURL(mime_type));
    })
}

function updateImageSrc(packageName, response) {
    return (state) => new Promise(async (res, rej) => {

        /* 表示までの時間を短くしたい...*/
        Promise.all([
            ...(Array(state.image_number - 1)
                .fill(0)
                .map((_, i) =>
                    [
                        selectImageSrc(state, response, packageName, `o${i + 1}`),
                        selectImageSrc(state, response, packageName, `c${i + 1}`),
                    ])
                .reduce((acc, e) => [...acc, ...e], [])
                .map((src, i) => loadImageSrc(state)(src)
                    .then(result => {
                        const img = result[0]
                        const mime = result[1]
                        if (i % 2 === 0) {
                            state.open_images[i / 2] = img;
                            return [`o${i / 2 + 1}`, mime, img]
                        } else {
                            state.cross_images[(i - 1) / 2] = img;
                            return [`c${(i - 1) / 2 + 1}`, mime, img]
                        }
                    }).catch(e => false)
                )
            )
        ]).then(results => res([results, response]))
    })
}

if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
        value: function (callback, type, quality) {

            var binStr = atob(this.toDataURL(type, quality).split(',')[1]),
                len = binStr.length,
                arr = new Uint8Array(len);

            for (var i = 0; i < len; i++) {
                arr[i] = binStr.charCodeAt(i);
            }

            callback(new Blob([arr], { type: type || 'image/png' }));
        }
    });
}

function serializeImages(isNewData) {
    if (!isNewData) return;
    return _ => new Promise((res, rej) => {
        const [results, response] = _
        if (!results.every(_ => _)) {
            rej()
        }

        Promise.all(
            results.map((v) => {
                return new Promise(async (resolve) => {
                    const [name, mime, img] = v
                    resolve([name, [
                        await ImageToBase64(img, mime),
                        mime
                    ]])
                })
            })
        ).then(data => {
            response.zip = Object.assign(
                response.zip,
                objectFrom(data)
            )
            return response
        }).then(res)

        /*
        const data = results.map((v) => {
            const [name, mime, img] = v
            return [name, [
                ImageToBase64(img, mime),
                mime
            ]]
        })

        response.zip = Object.assign(
            response.zip,
            objectFrom(data)
        )
        res(response)
        */
    })
}

function handleErrors(response) {
    if (response.ok) {
        return response;
    }

    switch (response.status) {
        case 400: throw new Error('INVALID_TOKEN');
        case 401: throw new Error('UNAUTHORIZED');
        case 500: throw new Error('INTERNAL_SERVER_ERROR');
        case 502: throw new Error('BAD_GATEWAY');
        case 404: throw new Error('NOT_FOUND');
        default: throw new Error('UNHANDLED_ERROR');
    }
}



const updateViewDiscription = state => {
    const discriptionBox = document.querySelector("#view_discription")
    const lang = state.language

    const rockFrom = `${multiLanguage(state.rockType, lang)} ${state.location ? "(" + multiLanguage(state.location, lang) + ")" : ""}`
    const rockDisc = multiLanguage(state.discription, lang)
    const rockOwner = multiLanguage(state.owner, lang)

    const textTemplate = `<ul style="list-style-type:none;">
            <li>${rockFrom}</li>
            <li>${rockDisc}</li>
            <li>${rockOwner}</li>
        </ul>`

    discriptionBox.innerHTML = textTemplate;
    return state
}

const showLoadingAnimation = state => {
    const anime = document.querySelectorAll(".lds-css.ng-scope")
    Array.from(anime).forEach(d => {
        d.classList.remove("inactive")
    })
    return state
}

const hideLoadingAnimation = state => {
    const anime = document.querySelectorAll(".lds-css.ng-scope")
    Array.from(anime).forEach(d => {
        d.classList.add("inactive")
    })
    return state
}

const hideWelcomeBoard = state => {
    const board = document.querySelector("#welcome-card")
    board.classList.add("inactive");
    return state
}

const showViewer = state => {
    const card = document.querySelector("#viewer_wrapper")
    card.classList.remove("inactive")
    return state
}

const showNicolButton = state => {
    const button = document.querySelector("#low-navigation")
    button.classList.remove("inactive");
    return state
}

function hideErrorCard() {
    return _ => {
        const errorCard = document.querySelector("#error_notification")
        errorCard.classList.add("inactive")
        return _
    }
}

function showErrorCard(messageHTML) {
    return (e) => {
        const errorCard = document.querySelector("#error_notification")
        errorCard.innerHTML = messageHTML;
        errorCard.classList.remove("inactive")
        return e
    }
}

function progressCircle(selector) {
    const progress_circle = document.querySelector(selector)
    const total = progress_circle.attributes["r"].value * 2 * Math.PI
    progress_circle.attributes["stroke-dasharray"].value = total
    progress_circle.attributes["stroke-dashoffset"].value = total

    return (load) => {
        progress_circle.attributes["stroke-dashoffset"].value = total * (1 - 0.5 * load)
    }
}


function buffer_to_string(buf) {
    const decoder = new TextDecoder("UTF-8");
    return decoder.decode(new Uint8Array(buf))
}

function base64ToBlob(base64, mime) {
    var binary = atob(base64);
    var buffer = new Uint8Array(binary.length)
    for (var i = 0; i < binary.length; i++) {
        buffer[i] = binary.charCodeAt(i);
    }
    return new Blob([buffer.buffer], {
        type: mime
    });
}

function base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

function objectFrom(keys_values) {
    const o = {}
    keys_values.forEach(kv => {
        o[kv[0]] = kv[1]
    })
    return o
}



/**
 *
 * @param {*} state
 * @param {*} key
 * @return {Object[meta,zip]}
 */
function registerZip(state) {
    return async (entry) => {

        const newOne = await state.zipDBHandler.put(state.zipDB, entry)

        state.storedKeys.push(entry.id)

        if (state.storedKeys.length > 20) {
            const oldest = state.storedKeys.shift()
            const deleted = await state.zipDBHandler.delete(state.zipDB, oldest)
            Array.from(document.querySelectorAll(`#rock_selector>option[value=${oldest}]`)).forEach(option => {
                label = option.innerHTML.replace("✓ ", "")
                option.innerHTML = label
                option.classList.remove("downloaded")
            })
        }

        return state
    }
}

function register(state, isNewData) {
    if (isNewData) {
        return _ => new Promise((res, rej) => {
            registerZip(state)(_)
                .then(res)
        })
    } else {
        return _ => new Promise((res, rej) => {
            res(state)
        })
    }
}

/**
 *
 * @param {*} packageName
 * @return {Object[meta,zip]}
 */
const markDownloadedOption = packageName => manifest => new Promise((res, rej) => {
    Array.from(document.querySelectorAll(`#rock_selector>option[value=${packageName}]`)).forEach(option => {
        label = option.innerHTML.replace("✓ ", "")
        option.innerHTML = "✓ " + label
        option.classList.add("downloaded")
    })
    res(manifest)
})

/**
 * package をどこかから取得する
 * @param {*} state
 * @param {*} packageName
 */
const zipUrlHandler = (state, packageName) => new Promise(async (res, rej) => {
    loadingMessage.message("Loading images")

    const key = sanitizeID(packageName)
    const manifestURL = staticSettings.getImageDataPath(packageName) + "manifest.json"

    try {
        const header = await fetch(manifestURL, { method: 'HEAD' }).catch(e => {
            console.log("Package metadata cannot be fetched.")
            throw Error(e)
        })
        var lastModified = header.headers.get("last-modified")
    } catch (e) {
        var lastModified = "none"
        var networkDisconnected = true
    }

    const storedData = await state.zipDBHandler.get(state.zipDB, key)


    if (storedData !== undefined && storedData.lastModified === lastModified) {
        res([storedData, false])
    } else if (networkDisconnected) {
        if (storedData !== undefined) {
            res([storedData, false])
        } else {
            res()
        }
    } else {
        const response = {
            zip: {
                "manifest.json": await fetch(manifestURL)
                    .then(response => response.text())
                    .then(markDownloadedOption(packageName))
            },
            id: key,
            lastModified: lastModified
        }
        res([response, true])
    }
})

function extractManifestFromZip(zip) {
    return JSON.parse((zip["manifest.json"]))
}

const rockNameSelectHandler = state => {
    return new Promise(async (res, rej) => {
        const rock_selector = document.querySelector("#rock_selector")
        const packageName = rock_selector.options[rock_selector.selectedIndex].value

        showLoadingAnimation(state)
        hideWelcomeBoard(state)
        showViewer(state)
        showNicolButton(state)


        try {
            const [response, isNewData] = await zipUrlHandler(state, packageName)
            const manifest = extractManifestFromZip(response.zip)
            updateStateByMeta(state)(packageName, manifest)
                .then(updateImageSrc(packageName, response))
                .then(serializeImages(isNewData))
                .then(register(state, isNewData))
                .then(updateViewDiscription)
                .then(res)
        } catch (e) {
            rej(e)
        }
    })
}

function sanitizeID(id) {
    return id.replace(/\//g, "_").replace(/\./g, "")
}


const updateImages = state => imgSets => new Promise((res, rej) => {
    state.open_images = imgSets.open
    state.cross_images = imgSets.cross
    res(state)
})


/**
 * Check images are in containor.
 * If true, set them in state object.
 * else, create img element and set them in state object.
 */
const createImageContainor = state => new Promise((res, rej) => {

    Promise.all([
        Promise.all(state.open_image_srcs.map(src => loadImageSrc(src))),
        Promise.all(state.cross_image_srcs.map(src => loadImageSrc(src)))
    ])
        .then(imgDOMs => {
            const open_imgs = imgDOMs[0]

            const cross_imgs = imgDOMs[1]

            return { open: open_imgs, cross: cross_imgs }
        })
        .then(updateImages(state))
        .then(res)

})

/**
 *  range of state.rotate is 0 <= degree < 360
 */

const clipGeometoryFromImageCenter = (imgDOM, state) => {

    return [
        state.rotate_center.to_right - state.imageRadius,
        state.rotate_center.to_bottom - state.imageRadius,
        state.imageRadius * 2,
        state.imageRadius * 2
    ]
}

function clearView(state) {
    viewer_ctx.clearRect(-state.canvasWidth * 0.5, -state.canvasHeight * 0.5, state.canvasWidth, state.canvasHeight)
    return state
}

function blobToCanvas(state) {

    image_srcs = state.isCrossNicol
        ? state.cross_images
        : state.open_images

    // view window circle

    viewer_ctx.save()
    viewer_ctx.beginPath()
    viewer_ctx.arc(0, 0, state.canvasWidth / 2 - VIEW_PADDING, 0, Math.PI * 2, false)
    viewer_ctx.clip()

    // Draw a image
    alpha = state.getAlpha(state.rotate)

    viewer_ctx.rotate(
        rotateSign(state.isClockwise) * (state.rotate + state.getImageNumber(state.rotate) * 15) / 180 * Math.PI
    )

    viewer_ctx.globalAlpha = 1
    image1 = image_srcs[state.getImageNumber(state.rotate)]

    try {
        viewer_ctx.drawImage(
            image1,
            ...clipGeometoryFromImageCenter(image1, state),
            -state.canvasWidth / 2,
            -state.canvasHeight / 2,
            state.canvasWidth,
            state.canvasHeight
        );
    } catch (e) {

    }

    viewer_ctx.restore()

    // Draw next image
    viewer_ctx.save()
    viewer_ctx.beginPath()
    viewer_ctx.arc(0, 0, state.canvasWidth / 2 - VIEW_PADDING, 0, Math.PI * 2, false)
    viewer_ctx.clip()

    viewer_ctx.rotate(
        rotateSign(state.isClockwise) * (state.rotate + state.getImageNumber(state.rotate + 15) * 15) / 180 * Math.PI
    )

    viewer_ctx.globalAlpha = 1 - alpha
    image2 = image_srcs[state.getImageNumber(state.rotate + 15)]
    try {
        viewer_ctx.drawImage(
            image2,
            ...clipGeometoryFromImageCenter(image2, state),
            -state.canvasWidth / 2,
            -state.canvasHeight / 2,
            state.canvasWidth,
            state.canvasHeight)
    } catch (e) {

    }
    viewer_ctx.restore()
    return state
}

function drawHairLine(state) {
    if (!state.drawHairLine) return
    viewer_ctx.strokeStyle = state.isCrossNicol
        ? "white"
        : "black";
    viewer_ctx.globalAlpha = 1
    viewer_ctx.beginPath()
    viewer_ctx.moveTo(0, -state.canvasHeight * 0.5 + VIEW_PADDING)
    viewer_ctx.lineTo(0, state.canvasHeight * 0.5 - VIEW_PADDING)
    viewer_ctx.moveTo(-state.canvasWidth * 0.5 + VIEW_PADDING, 0)
    viewer_ctx.lineTo(state.canvasWidth * 0.5 - VIEW_PADDING, 0)
    viewer_ctx.closePath()
    viewer_ctx.stroke()
    return state
}

const scaleLength = (canvasWidth, imageWidth, scaleWidth) => canvasWidth * scaleWidth / imageWidth

function drawScale(state) {
    if (!state["scaleWidth"]) return;
    let scalePixel = scaleLength(state.canvasWidth, state.imageRadius * 2, state.scaleWidth)
    const canvasWidth = state.canvasWidth;
    const scaleBar = document.querySelector("#scalebar")


    let scaleNumber = state.scaleText.match(/(\d+\.?\d*)/)[0] * 1
    const scaleUnit = state.scaleText.match(/\D*$/)[0]

    while (scalePixel >= canvasWidth) {
        scalePixel *= 0.5
        scaleNumber *= 0.5
    }
    scaleBar.style.width = scalePixel + "px";
    scaleBar.querySelector("div:first-child").innerHTML = `${scaleNumber} ${scaleUnit}`;
    return state
}

const updateState = (state, newState) => new Promise((res, rej) => {
    _state = Object.assign(state, newState)
    console.log(_state)
    res(_state)
})


function updateView(state) {
    clearView(state)
    blobToCanvas(state)
    drawHairLine(state)
    drawScale(state)
    return state
}


const getCoordinateOnCanvas = canvas => (e, fingur = 0) => {
    if (e instanceof MouseEvent) {
        return (e instanceof WheelEvent)
            ? [
                e.deltaX,
                e.deltaY
            ]
            : [
                e.pageX - canvas.offsetLeft,
                e.pageY - canvas.offsetTop
            ]
    } else if (e instanceof TouchEvent && e.touches.length > fingur) {
        return [
            e.touches[fingur].pageX - canvas.offsetLeft,
            e.touches[fingur].pageY - canvas.offsetTop
        ]
    }
}

const canvasCoordinate = getCoordinateOnCanvas(viewer)



const radiunBetween = (cx, cy) => (_x1, _y1, _x2, _y2) => {
    x1 = _x1 - cx
    x2 = _x2 - cx
    y1 = _y1 - cy
    y2 = _y2 - cy

    cos = (x1 * x2 + y1 * y2) / Math.sqrt((x1 * x1 + y1 * y1) * (x2 * x2 + y2 * y2))
    return Math.sign(x1 * y2 - x2 * y1) * Math.acos(cos)
}

/**
 * Update start and end position
 * @param {*} state
 * @param {*} e
 */
function updateCoordinate(state, e) {
    state.drag_start = state.drag_end || undefined
    state.drag_end = canvasCoordinate(e)

    state.pinch_start = state.pinch_end || undefined
    state.pinch_end = canvasCoordinate(e, 1)
    return state
}

/**
 * Calculate small difference of rotation.
 * Update total rotation.
 *
 * @param {*} state
 * @param {*} e
 */
function updateRotate(state, e) {
    if (state.drag_start === undefined) return
    // delta rotate radius
    const rotate_end = radiunBetween(
        state.canvasWidth * 0.5,
        state.canvasHeight * 0.5
    )(...state.drag_end, ...state.drag_start)

    state.rotate += rotate_end / Math.PI * 180
    if (state.rotate >= 360) {
        state.rotate -= 360
    } else if (state.rotate < 0) {
        state.rotate += 360
    }
    return state
}



const rotateImage = (state, e) => () => {
    updateCoordinate(state, e)
    updateRotate(state, e)
    blobToCanvas(state)
    drawHairLine(state)
}

function updateMagnifyByPinch(state, e) {
    if (state.drag_start === undefined) return
    if (state.pinch_start === undefined) return

    const x1 = [...state.drag_start]
    const y1 = [...state.pinch_start]
    const x2 = [...state.drag_end]
    const y2 = [...state.pinch_end]

    const expansion = Math.sqrt((x2[0] - y2[0]) ** 2 + (x2[1] - y2[1]) ** 2) / Math.sqrt((x1[0] - y1[0]) ** 2 + (x1[1] - y1[1]) ** 2)

    const newRadius = (expansion > 2)
        ? state.imageRadius
        : state.imageRadius / expansion
    state.imageRadius = (newRadius) > state.imageRadiusOriginal
        ? state.imageRadiusOriginal
        : (newRadius < 100)
            ? 100
            : newRadius
    return state
}

function updateMagnifyByWheel(state, e) {
    const scrolled = canvasCoordinate(e)[1]

    const newRadius = state.imageRadius + scrolled
    state.imageRadius = (newRadius) > state.imageRadiusOriginal
        ? state.imageRadiusOriginal
        : (newRadius < 100)
            ? 100
            : newRadius
    return state
}

const pinchImage = (state, e) => () => {
    updateCoordinate(state, e)
    updateMagnifyByPinch(state, e)
    blobToCanvas(state)
    drawHairLine(state)
    drawScale(state)
}

const touchStartHandler = state => e => {
    state.isMousedown = true
    state.drag_end = canvasCoordinate(e)
    e.preventDefault();
}

const wheelImage = (state, e) => () => {
    updateMagnifyByWheel(state, e)
    blobToCanvas(state)
    drawHairLine(state)
    drawScale(state)
}

const wheelHandler = state => e => {
    e.preventDefault();
    requestAnimationFrame(
        wheelImage(state, e)
    )
}

const touchMoveHandler = state => e => {
    if (!state.isMousedown) return
    if (e instanceof MouseEvent || e.touches.length === 1) {
        e.preventDefault();
        requestAnimationFrame(
            rotateImage(state, e)
        )
    } else if (e.touches.length === 2) {
        e.preventDefault()
        requestAnimationFrame(
            pinchImage(state, e)
        )
    }
    //if (e.cancelable) {

    //}
}

const touchEndHandler = state => e => {
    state.isMousedown = false
    state.drag_end = undefined
    state.pinch_end = undefined
    e.preventDefault()
}





function languageChangeHundler(state) {
    return function (e) {
        return new Promise((res, rej) => {
            const languageSelector = document.querySelector("#language_selector")
            const lang = languageSelector.options[languageSelector.selectedIndex].value;
            state.language = lang
            state.localStorage.put("language", lang)
            res(state)
        })
    }
}


function contact_handler() {
    return async function (e) {
        const form = document.querySelector("#form-contact")
        const selection = form.querySelector("#select-contact_topic")
        const topic = selection[selection.selectedIndex].value
        const message = form.querySelector("textarea").value
        const from = form.querySelector("input[type=email").value
        const obj = {
            "from": from,
            "title": topic,
            "body": message
        }

        const method = "POST";
        const body = JSON.stringify(obj);
        const headers = {
            'Accept': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',

        };

        console.log({ method, headers, body })



        const response = await fetch("https://dgo96yhuni.execute-api.us-east-1.amazonaws.com/contactapi/", { method, headers, body, 'mode': 'cors' })
        return false
    }
}
