const fs = require('fs')
const reservedKeywords = ["tag", "children", "raw"];

const readJsonFile = (path) =>
    new Promise((resolve, reject) =>
        fs.readFile(path, function (err, data) {
            if (err) {
                reject(err);
            }
            resolve(JSON.parse(data));
        }));

const parseJsonToHtml = (json) => {
    const html = parseChildren(json);
    return `<!doctype html><html>${html}</html>`;
}

const parseAttributes = (json) => {
    let htmlAttributes = "";
    Object.keys(json).forEach(function (key) {
        if (reservedKeywords.includes(key)) return;
        let value = json[key];
        htmlAttributes += ` ${key}="${value}"`;
    });
    return htmlAttributes;
}

const parseChildren = (children) => {
    if (!Array.isArray(children)) {
        console.log("Children needs to be a array");
        return "Children need to be an array";
    }
    let htmlChildren = "";
    children.forEach(function (tag) {
        htmlChildren += parseTag(tag);
    });
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
        console.log("style", key, value);
    });
    return css;
}

const parseTag = (json) => {
    let htmlTag = json["tag"];
    if (htmlTag === "style") {
        return `<style type="text/css">${parseStyle(json)}</style>`;
    } else {
        let htmlAttributes = parseAttributes(json);
        let htmlChildren =
            json["children"] ?
                parseChildren(json["children"])
                : json["raw"] ?
                    json["raw"]
                    : null;
        return htmlChildren ? `<${htmlTag}${htmlAttributes}>${htmlChildren}</${htmlTag}>` : `<${htmlTag}${htmlAttributes} />`;
    }
}

const toHTMLFile = (json, path) => {
    fs.writeFile(path, json, function (err) {
        if (err) throw err;
        console.log('Saved!');
    });
}


const main = async () => {
    const json = await readJsonFile("examples/test.json");
    const html = parseJsonToHtml(json);
    toHTMLFile(html, "examples/test.html");
}

main();
