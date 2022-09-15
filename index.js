const fs = require('fs');
const beautifyHtml = require('js-beautify').html;
const isEmptyTag = require('./utils/emptyTags').isEmptyTag;
const reservedKeywords = ["tag", "children", "raw"];
const shouldDebug = false;
let components = {};

const debug = (...args) => {
    if (shouldDebug) console.log("Debug:", ...args);
};
class Error {
    constructor(msg) {
        debug(msg);
        this.msg = msg;
    }
}
const createErrorOutput = (error) => {
    debug(error);
    if (typeof error === "string") return { output: null, errors: [error] };
    return { output: null, errors: error };
}

const readJsonFile = (path) =>
    new Promise((resolve, reject) => {
        fs.readFile(path, function (err, data) {
            if (err) {
                reject(err);
                return;
            }
            resolve(JSON.parse(data));
        })
    });

/*const loadComponent = async (componentRef, componentPath, currentPath) => {
    if (components[componentRef]) {
        debug(`Component ${componentRef} already exists`);
        return;
    }
    if (typeof componentPath !== "string") {
        debug("Invalid import path:", componentPath);
        return `<p>Invalid import path ${componentPath}</p>`;
    }
    const folder = currentPath.substring(0, currentPath.lastIndexOf("/"));
    const relativePath = `${folder}/${componentPath}`;
    if (!fs.existsSync(relativePath)) {
        debug("Invalid import path:", relativePath);
        return `<p>Invalid import path ${relativePath}</p>`;
    }
    const component = await readJsonFile(relativePath);
    let props = component.props ?? {};
    components[componentRef] = {
        props: props,
        html: await parseJsonToHtml(component, relativePath)
    };
}*/

const parseJsonToHtml = async (json) => {
    if (Array.isArray(json)) {
        let children = parseChildren(json);
        if (typeof children === "Error") {
            return createErrorOutput(children.msg);
        }

        debug(children);
        return { output: children, errors: null };
    }
    if (!json.page && !Array.isArray(json.page) && !json.component) {
        return createErrorOutput("Invalid json file - missing/invalid page/component tag");
    }
    /*if (json.import) {
        for (let componentRef of Object.keys(json.import)) {
            await loadComponent(componentRef, json.import[componentRef], currentPath);
        }
    }*/
    if (json.page) {
        const html = parseChildren(json.page);
        if (typeof children === "Error") {
            return createErrorOutput(children.msg);
        }
        return { output: `<!doctype html><html>${html}</html>`, errors: null };
    }
    if (json.component) {
        let children = parseChildren(json.component);
        if (typeof children === "Error") {
            return createErrorOutput(children.msg);
        }
        return { output: children, errors: null };
    }

}

const parseAttributes = (json, ignoreKeys = []) => {
    let htmlAttributes = "";
    Object.keys(json).forEach(function (key) {
        if (reservedKeywords.includes(key) || ignoreKeys.includes(key)) return;
        let value = json[key];
        if (Array.isArray(value)) {
            value = value.join(" ");
        }
        htmlAttributes += ` ${key}="${value}"`;
    });
    return htmlAttributes;
}

const parseChildren = (children) => {
    if (!Array.isArray(children)) {
        return new Error("Children need to be an array");
    }
    let htmlChildren = "";
    let errors = [];
    children.forEach(function (tag) {
        let parsedTag = parseTag(tag);
        if (typeof parsedTag === "Error") {
            errors.push(children.msg);
            return;
        }
        htmlChildren += parseTag(tag);
    });
    if (errors.length > 0) return createErrorOutput(errors);
    return htmlChildren;
}
const parseStyle = (json) => {
    let css = ""
    Object.keys(json).forEach(function (key) {
        if (key === "tag") return;
        let value = json[key];
        if (typeof value === "object") {
            css += `${key} {${parseStyle(value)}}`;
        } else {
            css += `${key}: ${value};`;
        }
    });
    return css;
}

const parseTag = (json) => {
    if (!json || json.lenght === 0) return "";
    const type = typeof json;
    if (type !== "object") {
        if (type !== "string") {
            return createErrorOutput(`Invalid data type: ${type}`);
        }
        if (!components[json]) return isEmptyTag(json) ? `<${json}/>` : `<${json}></${json}>`;

        let component = components[json];
        let html = component.html;
        let props = component.props;
        Object.keys(props).forEach(function (prop) {
            if (reservedKeywords.includes(prop)) return;
            let value = props[prop];
            let regex = new RegExp('\\${' + prop + '}', "gm");
            html = html.replaceAll(regex, value);
        });
        return html;
    }
    const isShortHand = !json.tag;
    const htmlTag = isShortHand ? Object.keys(json)[0] : json["tag"];
    if (htmlTag === "style") {
        return `<style type="text/css">${parseStyle(json)}</style>`;
    } else {
        const childrenJson = isShortHand ? json[htmlTag] : json.children;
        let htmlChildren = null;
        if (childrenJson) {
            if ((typeof childrenJson === "object" || Array.isArray(childrenJson))) {
                let children = parseChildren(childrenJson);
                if (typeof children === "Error") return createErrorOutput(children.msg);
                htmlChildren = children;
            } else {
                htmlChildren = childrenJson;
            }
        }
        /*if (components[htmlTag]) {
            let component = components[htmlTag];
            let html = component.html;
            let props = component.props;
            Object.keys(props).forEach(function (prop) {
                if (reservedKeywords.includes(prop)) return;
                let value = json[prop] ?? props[prop];
                let regex = new RegExp('\\${' + prop + '}', "gm");
                html = html.replaceAll(regex, value);
            });
            if (htmlChildren) {
                let childRegex = new RegExp('\\${children}', "m");
                html = html.replace(childRegex, htmlChildren);
            }
            /*Object.keys(json).forEach(function (key) {
                if (reservedKeywords.includes(key) || key == htmlTag) return;
                if (!component.props[key]) {
                    debug("Unknown prop", key);
                    return;
                }
            });
            return html;
        }*/
        let htmlAttributes = parseAttributes(json, isShortHand ? [htmlTag] : []);
        return htmlChildren ? `<${htmlTag}${htmlAttributes}>${htmlChildren}</${htmlTag}>` : isEmptyTag(htmlTag) ? `<${htmlTag}${htmlAttributes} />` : `<${htmlTag}${htmlAttributes}></${htmlTag}>`;
    }
}

const toHTMLFile = async (object, path) =>
    new Promise((resolve, reject) => {
        if (object.errors) { reject(object); return; }
        fs.writeFile(path, object.output, function (err) {
            if (err) {
                reject(createErrorOutput(err));
                return;
            }
            debug(`Saved build to ${path}!`);
            resolve(object);
            return;
        });
    });


const parseJson = async (json, beautify) => {
    if (!json) {
        return createErrorOutput("Invalid json object given");
    }
    if (typeof json === "string") {
        try {
            json = JSON.parse(json);
        }
        catch (e) {
            return createErrorOutput(e);
        }
        if (!json) {
            return createErrorOutput("Could not parse given json object");
        }
    }
    const result = await parseJsonToHtml(json);
    if (beautify && !result.errors) result.output = beautifyHtml(result.output);
    return result;
}

const parse = async () => {
    components = {};
    const path = argv.filePath;
    const json = await readJsonFile(path);
    const html = argv.minify ? await parseJsonToHtml(json, path) : beautifyHtml(await parseJsonToHtml(json, path));
    const buildPath = path.substring(0, path.lastIndexOf("/")) + "/build";
    if (!fs.existsSync(buildPath)) {
        fs.mkdirSync(buildPath);
    }
    const outputFile = buildPath + path.substring(path.lastIndexOf("/")).replace(".json", ".html");
    toHTMLFile(html, outputFile);
}
const main = async (argv) => {
    if (!fs.existsSync(argv.filePath)) {
        debug("Invalid file path");
        return;
    }
    await parse(argv);
    if (argv.watch) fs.watchFile(argv.filePath, async () => {
        debug("Reparsing...");
        try {
            await parse(argv);
        } catch (e) {
            debug(e);
        }
    });
}


/**
 * Converts a json object to html string
 * Example: jsonToHtml(json, true);
 * @param {string} json - The json object to convert
 * @param {boolean} beautify - Default: false - The relative path to the html file generated
 * @return {{string, errors}} - Returns a object with the output and errors if any
 */
exports.jsonToHtml = async (json, beautify = false) => {
    return await parseJson(json, beautify);
}
/**
 * Converts a json file to html file
 * jsonFileToHtml(inputPath, true);
 * @param {string} inputPath - The relative path to the json file
 * @param {boolean} beautify - Default: false - The relative path to the html file generated
 * @return {{string, errors}} - Returns a object with the output and errors if any
 */
exports.jsonFileToHtml = async (inputPath, beautify = false) => {
    return readJsonFile(inputPath).then(
        (json) => {
            return parseJson(json, beautify);
        }, (error) => {
            return createErrorOutput(error);
        })
}
/**
 * Converts a json file to html file
 * Example: jsonFileToHtmlFile(inputPath, outputPath, true);
 * @param {string} inputPath - The relative path to the json file
 * @param {string} outputPath - The relative path to the html file generated
 * @param {boolean} beautify - Default: false - The relative path to the html file generated
 * @return {{string, errors}} - Returns a object with the output and errors if any
 */
exports.jsonFileToHtmlFile = async (inputPath, outputPath, beautify = false) => {
    let html = await exports.jsonFileToHtml(inputPath, beautify);
    return await toHTMLFile(html, outputPath);
}

exports.jsonToHtml([
    {
        "div": "${children}",
        "class": [
            "flex",
            "justify-center",
            "items-center",
            "flex-col"
        ]
    }
], true).then((r) => debug(r));

const test = () => {
    exports.jsonFileToHtml("./examples/index.json", true).then((r) => debug(r));
    exports.jsonFileToHtml("I failed", true).then((r) => debug(r));
    exports.jsonFileToHtmlFile("./examples/index.json", "./examples/index.html", true).then((r) => debug("file", r));
}