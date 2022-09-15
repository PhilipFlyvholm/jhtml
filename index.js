const fs = require('fs');
const beautifyHtml = require('js-beautify').html;
const isEmptyTag = require('./utils/emptyTags').isEmptyTag;
const reservedKeywords = ["tag", "children", "raw"];
let shouldDebug = false;
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


class Parser {
    constructor(json) {
        this.json = json;
        this.components = [];
    }

    /*loadComponent = async (componentRef, componentPath, currentPath) => {
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

    parseAttributes = (tagJson, ignoreKeys = []) => {
        let htmlAttributes = "";
        Object.keys(tagJson).forEach(function (key) {
            if (reservedKeywords.includes(key) || ignoreKeys.includes(key)) return;
            let value = tagJson[key];
            if (Array.isArray(value)) {
                value = value.join(" ");
            }
            htmlAttributes += ` ${key}="${value}"`;
        });
        return htmlAttributes;
    }

    parseStyle = (tagJson) => {
        let css = ""
        Object.keys(tagJson).forEach((key) => {
            if (key === "tag") return;
            let value = tagJson[key];
            if (typeof value === "object") {
                css += `${key} {${this.parseStyle(value)}}`;
            } else {
                css += `${key}: ${value};`;
            }
        });
        return css;
    }

    parseTag = (tagJson) => {
        if (!tagJson || tagJson.lenght === 0) return "";
        const type = typeof tagJson;
        if (type !== "object") {
            if (type !== "string") {
                return createErrorOutput(`Invalid data type: ${type}`);
            }
            if (!components[tagJson]) return isEmptyTag(tagJson) ? `<${tagJson}/>` : `<${tagJson}></${tagJson}>`;

            let component = components[tagJson];
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
        const isShortHand = !tagJson.tag;
        const htmlTag = isShortHand ? Object.keys(tagJson)[0] : tagJson["tag"];
        if (htmlTag === "style") {
            return `<style type="text/css">${this.parseStyle(tagJson)}</style>`;
        } else {
            const childrenJson = isShortHand ? tagJson[htmlTag] : tagJson.children;
            let htmlChildren = null;
            if (childrenJson) {
                if ((typeof childrenJson === "object" || Array.isArray(childrenJson))) {
                    let children = this.parseChildren(childrenJson);
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
            let htmlAttributes = this.parseAttributes(tagJson, isShortHand ? [htmlTag] : []);
            return htmlChildren ? `<${htmlTag}${htmlAttributes}>${htmlChildren}</${htmlTag}>` : isEmptyTag(htmlTag) ? `<${htmlTag}${htmlAttributes} />` : `<${htmlTag}${htmlAttributes}></${htmlTag}>`;
        }
    }

    parseChildren = (children) => {
        if (!Array.isArray(children)) {
            return new Error("Children need to be an array");
        }
        let htmlChildren = "";
        let errors = [];
        children.forEach((tag) => {
            let parsedTag = this.parseTag(tag);
            if (typeof parsedTag === "Error") {
                errors.push(children.msg);
                return;
            }
            htmlChildren += this.parseTag(tag);
        });
        if (errors.length > 0) return createErrorOutput(errors);
        return htmlChildren;
    }

    parse = async () => {
        if (Array.isArray(this.json)) {
            let children = this.parseChildren(this.json);
            if (typeof children === "Error") {
                return createErrorOutput(children.msg);
            }

            debug(children);
            return { output: children, errors: null };
        }
        if (!this.json.page && !Array.isArray(this.json.page) && !this.json.component) {
            return createErrorOutput("Invalid json file - missing/invalid page/component tag");
        }
        /*if (json.import) {
            for (let componentRef of Object.keys(json.import)) {
                await loadComponent(componentRef, json.import[componentRef], currentPath);
            }
        }*/
        if (this.json.page) {
            const html = this.parseChildren(this.json.page);
            if (typeof children === "Error") {
                return createErrorOutput(children.msg);
            }
            return { output: `<!doctype html><html>${html}</html>`, errors: null };
        }
        if (this.json.component) {
            let children =  this.parseChildren(this.json.component);
            if (typeof children === "Error") {
                return createErrorOutput(children.msg);
            }
            return { output: children, errors: null };
        }
    }
}

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
    const parser = new Parser(json);
    console.log(parser);
    const result = await parser.parse();
    if (beautify && !result.errors) result.output = beautifyHtml(result.output);
    return result;
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
if(process.argv.slice(2).includes("--debug")){
    shouldDebug = true;
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
    exports.jsonFileToHtml("./examples/index.json", true).then((r) => debug(r));
    exports.jsonFileToHtml("I failed", true).then((r) => debug(r));
    exports.jsonFileToHtmlFile("./examples/index.json", "./examples/index.html", true).then((r) => debug("file", r));
}