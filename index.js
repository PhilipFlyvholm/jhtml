const yargs = require('yargs');

const fs = require('fs');
const beautify = require('js-beautify').html;
const isEmptyTag = require('./utils/emptyTags').isEmptyTag;
const reservedKeywords = ["tag", "children", "raw"];
const components = {};
const readJsonFile = (path) =>
    new Promise((resolve, reject) =>
        fs.readFile(path, function (err, data) {
            if (err) {
                reject(err);
            }
            resolve(JSON.parse(data));
        }));

const parseJsonToHtml = async (json, currentPath) => {
    if (Array.isArray(json)) {
        const html = parseChildren(json);
        return `${html}`;
    }
    if (!json.page && !Array.isArray(json.page) && !json.component) {
        console.log("Invalid json file - missing/invalid page or component");
        return;
    }
    if (json.import) {
        for (let componentRef of Object.keys(json.import)) {
            if (components[componentRef]) {
                console.log(`Component ${componentRef} already exists`);
                return;
            }
            const componentPath = json.import[componentRef];
            if (typeof componentPath !== "string") {
                console.log("Invalid import path:", componentPath);
                return `<p>Invalid import path ${componentPath}</p>`;
            }
            const folder = currentPath.substring(0, currentPath.lastIndexOf("/"));
            const relativePath = `${folder}/${componentPath}`;
            if (!fs.existsSync(relativePath)) {
                console.log("Invalid import path:", relativePath);
                return `<p>Invalid import path ${relativePath}</p>`;
            }
            console.log(relativePath);
            const component = await readJsonFile(relativePath);
            components[componentRef] = await parseJsonToHtml(component, relativePath);
        }
    }

    if (json.page) {
        const html = parseChildren(json.page);
        return `<!doctype html><html>${html}</html>`;
    }
    if (json.component) {
        const html = parseChildren(json.component);
        return html;
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
    });
    return css;
}

const parseShorthandTag = (json) => {
    let htmlTag = Object.keys(json)[0];
    let htmlAttributes = parseAttributes(json, [htmlTag]);
    let value = json[htmlTag];
    if (value === null) return isEmptyTag(htmlTag) ? `<${htmlTag}${htmlAttributes}/>` : `<${htmlTag}${htmlAttributes}></${htmlTag}>`;
    if (Array.isArray(value)) {
        return `<${htmlTag}${htmlAttributes}>${parseChildren(value)}</${htmlTag}>`;
    }
    return `<${htmlTag}${htmlAttributes}>${value}</${htmlTag}>`;
}

const parseTag = (json) => {
    if (!json || json.lenght === 0) return "";
    if (!json.tag) return parseShorthandTag(json);
    let htmlTag = json["tag"];
    if (components[htmlTag]) return components[htmlTag];
    if (htmlTag === "style") {
        return `<style type="text/css">${parseStyle(json)}</style>`;
    } else {
        let htmlAttributes = parseAttributes(json);
        let htmlChildren =
            json["children"] ?
                parseChildren(json["children"])
                : json["raw"] ? json["raw"] : null;
        return htmlChildren ? `<${htmlTag}${htmlAttributes}>${htmlChildren}</${htmlTag}>` : isEmptyTag(htmlTag) ? `<${htmlTag}${htmlAttributes} />` : `<${htmlTag}${htmlAttributes}></${htmlTag}>`;
    }
}

const toHTMLFile = (json, path) => {
    fs.writeFile(path, json, function (err) {
        if (err) throw err;
        console.log(`Saved build to ${path}!`);
    });
}

const main = async (argv) => {
    if (!fs.existsSync(argv.filePath)) {
        console.log("Invalid file path");
        return;
    }
    const json = await readJsonFile(argv.filePath);
    const html = argv.minify ? await parseJsonToHtml(json, argv.filePath) : beautify(await parseJsonToHtml(json, argv.filePath));
    const output = argv.filePath.replace(".json", ".html");
    toHTMLFile(html, output);
}


yargs.scriptName("jhtml")
    .usage('$0 <command> [options]')
    .command('parse [filePath] [minify]', 'Parse a json file to html', (yargs) => {
        yargs.positional('filePath', {
            type: 'string',
            default: 'index.json',
            describe: 'Path to the index file'
        })
        yargs.positional('minify', {
            type: 'boolean',
            default: true,
            describe: 'Minify the html'
        })
    }, function (argv) {
        main(argv);
    })
    .demandCommand(1)
    .help()
    .argv
