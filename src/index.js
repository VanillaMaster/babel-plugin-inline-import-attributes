/**
 * @import { PluginAPI, PluginObject, types, Visitor } from "@babel/core"
 */
import { resolve as resolveUnsafe } from "import-meta-resolve"
import { pathToFileURL, fileURLToPath } from "node:url"
import { join } from "node:path"
import { readFileSync as readFileUnsafe } from "node:fs"

/**
 * @param { PluginAPI } api 
 * @param { unknown } options 
 * @returns { PluginObject }
 */
export default function (api, options) {
    return {
        visitor: {
            ImportDeclaration(path, pass) {
                /**@type { { type: string | null; moduleSpecifier: string; defaultIdentifier: string | null; namespaceIdentifier: string | null; } } */
                const context = { type: null, moduleSpecifier: path.node.source.value, defaultIdentifier: null, namespaceIdentifier: null };
                path.traverse(importAttributeInspector, context);
                if (context.type !== "inline/text") return;
                path.traverse(importSpecifierInspector, context);
                if (context.defaultIdentifier === null && context.namespaceIdentifier === null) return void path.remove();
                const parent = pathToFileURL(pass.filename ?? join(pass.cwd, "index.js")).href;
                const url = resolve(context.moduleSpecifier, parent);
                if (url === null) throw path.get("source").buildCodeFrameError(`Cannot find package '${context.moduleSpecifier}' imported from ${parent}`);
                if (!url.startsWith("file://")) throw path.get("source").buildCodeFrameError(`Module '${url}' is not of type '${context.type}'`);
                const text = readFile(url);
                if (text === null) throw path.get("source").buildCodeFrameError(`Cannot find module '${url}' imported from ${parent}`);
                path.replaceWith(createDeclaration(api, context.namespaceIdentifier, context.defaultIdentifier, text));
            }
        }
    }
}

/**@type { Visitor<{ moduleSpecifier: string; defaultIdentifier: string | null; namespaceIdentifier: string | null; }> } */
const importSpecifierInspector = {
    ImportSpecifier(path, context) {
        throw path.buildCodeFrameError(`The requested module '${context.moduleSpecifier}' does not provide an export named '${ getValue(path.node.imported) }'`);
    },
    ImportNamespaceSpecifier(path, context) {
        context.namespaceIdentifier = path.node.local.name;
    },
    ImportDefaultSpecifier(path, context) {
        context.defaultIdentifier = path.node.local.name;
    }
}

/**@type { Visitor<{ type: string | null }> } */
const importAttributeInspector = {
    ImportAttribute(path, context) {
        if (getValue(path.node.key) === "type") context.type = path.node.value.value;
    }
}

/**
 * @param { PluginAPI } api 
 * @param { string | null } namespaceIdentifier 
 * @param { string | null } defaultIdentifier 
 * @param { string } text 
 */
function createDeclaration(api, namespaceIdentifier, defaultIdentifier, text) {
    if (namespaceIdentifier !== null) {
        /**@type { types.VariableDeclarator[] } */
        const declarations = [
            api.types.variableDeclarator(
                api.types.identifier(namespaceIdentifier),
                api.types.callExpression(
                    api.types.memberExpression(
                        api.types.identifier("Object"),
                        api.types.identifier("create")
                    ),
                    [
                        api.types.nullLiteral(),
                        api.types.objectExpression([
                            api.types.objectProperty(
                                api.types.identifier("default"),
                                api.types.objectExpression([
                                    api.types.objectProperty(
                                        api.types.identifier("value"),
                                        api.types.stringLiteral(JSON.stringify(text).slice(1, -1))
                                    ),
                                    api.types.objectProperty(
                                        api.types.identifier("configurable"),
                                        api.types.booleanLiteral(false)
                                    ),
                                    api.types.objectProperty(
                                        api.types.identifier("writable"),
                                        api.types.booleanLiteral(false)
                                    ),
                                    api.types.objectProperty(
                                        api.types.identifier("enumerable"),
                                        api.types.booleanLiteral(true)
                                    )
                                ])
                            ),
                            api.types.objectProperty(
                                api.types.memberExpression(
                                    api.types.identifier("Symbol"),
                                    api.types.identifier("toStringTag")
                                ),
                                api.types.objectExpression([
                                    api.types.objectProperty(
                                        api.types.identifier("value"),
                                        api.types.stringLiteral("Module")
                                    ),
                                    api.types.objectProperty(
                                        api.types.identifier("configurable"),
                                        api.types.booleanLiteral(false)
                                    ),
                                    api.types.objectProperty(
                                        api.types.identifier("writable"),
                                        api.types.booleanLiteral(false)
                                    ),
                                    api.types.objectProperty(
                                        api.types.identifier("enumerable"),
                                        api.types.booleanLiteral(false)
                                    )
                                ]),
                                true
                            )
                        ])
                    ]
                )
            )
        ];
        if (defaultIdentifier !== null) declarations.push(api.types.variableDeclarator(
            api.types.identifier(defaultIdentifier),
            api.types.memberExpression(
                api.types.identifier(namespaceIdentifier),
                api.types.identifier("default")
            )
        ));
        return api.types.variableDeclaration("const", declarations);
    } else if (defaultIdentifier !== null) {
        return api.types.variableDeclaration("const", [
            api.types.variableDeclarator(
                api.types.identifier(defaultIdentifier),
                api.types.stringLiteral(JSON.stringify(text).slice(1, -1))
            )
        ]);
    }
    throw new Error("unreachable");
}

/**
 * @param { string } specifier 
 * @param { string } parent 
 */
function resolve(specifier, parent) {
    try {
        return resolveUnsafe(specifier, parent)
    } catch (error) {
        return null;
    }
}

/**
 * @param { string } url 
 */
function readFile(url) {
    try {
        return readFileUnsafe(fileURLToPath(url), "utf8")
    } catch (error) {
        return null;
    }
}

/**
 * @param { types.Identifier | types.StringLiteral } node 
 */
function getValue(node) {
    switch (node.type) {
        case "Identifier": return node.name;
        case "StringLiteral": return node.value;
        default: throw new Error("unreachable");
    }
}