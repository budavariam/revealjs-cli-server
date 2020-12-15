import * as fs from 'fs'
import * as http from 'http'
import * as jetpack from "fs-jetpack";
import * as matter from 'gray-matter'
import * as path from 'path'

import { defaultConfiguration, IDocumentOptions } from "./Configuration"
import { Logger, LogLevel } from "./Logger"
import { RevealServer } from "./RevealServer"
import { parseSlides } from "./SlideParser"

const rootDir = '.'

const getExportPath = (config) => {
    return path.isAbsolute(config.exportHTMLPath)
        ? config.exportHTMLPath
        : path.join(rootDir, config.exportHTMLPath)
}

// const slideContent = (documentText): string => {
//     return matter(documentText).content
// }

const frontMatter = (documentText: string): any => {
    return matter(documentText).data
}

const documentOptions = (documentText: string): IDocumentOptions => {
    const front = frontMatter(documentText)
    // tslint:disable-next-line:no-object-literal-type-assertion
    return { ...defaultConfiguration, ...front } as IDocumentOptions
}

const getUri = (server): string | null => {
    if (!server.isListening) {
        return null
    }
    const serverUri = server.uri
    // POSSIBLE PARAMS: `${serverUri}#/${slidepos.horizontal}/${slidepos.vertical}/${Date.now()}
    return `${serverUri}`
}

const exportPDFUri = (server) => {
    const uri = getUri(server)
    return uri + '?print-pdf-now'
}

const showHints = () => {
    const hints: any = {};
    hints["Select slide carousel"] = 'o / ESC'
    hints["Prev slide"] = 'p / h'
    hints["Next slide"] = 'n / l'
    hints["Fullscreen mode"] = 'f'
    hints["Download chalkboard"] = 'd'
    hints["Speaker view"] = 's'
    hints["Toggle drawing"] = 'c'
    hints["Chalkboard"] = 'b'
    hints["Pause presentation"] = 'v'
    hints["Table of contents"] = 'm'
    console.table(hints);
}

export const initLogger = (logLevel: LogLevel): Logger => new Logger(logLevel, (e) => { console.log(e) })
export const loadConfigFile = (path: string): any => {
    if (!path) {
        return {}
    }
    try {
        const file = "" + fs.readFileSync(path)
        return JSON.parse(file)
    } catch (err) {
        console.error("Failed to load config file from path %s, error: %s ", path, err)
    }
    return {}
}

export const main = async (
    logger: Logger,
    slideSource: string,
    generateBundle: boolean,
    serve: boolean = true,
    port: number = 0,
    debugMode: boolean = false,
    overrideConfig = {},
) => {
    const config = { ...defaultConfiguration, ...overrideConfig }
    const documentText = "" + fs.readFileSync(slideSource)
    if (generateBundle) {
        const exportPath = getExportPath(config)
        console.log(`Remove files from: ${exportPath}`)
        await jetpack.removeAsync(exportPath)
        console.log(`Start to generate presentation to: ${exportPath}`)
    }
    const server = new RevealServer(
        logger,
        () => rootDir, // RootDir
        () => parseSlides(documentText, documentOptions(documentText)),
        () => config,
        '.', // PATH TO DATA
        () => generateBundle,
        () => getExportPath(config)
        )
        server.start(Math.abs(port), debugMode)
        showHints()
    if (serve) {
        console.log(`Serving slides at: ${getUri(server)}`)
        console.log(`Use this url to export (print) pdf: ${exportPDFUri(server)}`)
        //console.log(`Speaker view served from: ${getUri(server)}libs/reveal.js/3.8.0/plugin/notes/notes.html (NEEDS TO OPEN WITH SHORTCUT)`)
    } else if (!serve) {
        // force ejs to generate main file
        await http.get(getUri(server) || "");
        console.log("index.html generated...")
        // copy all libs. Might be exhausting, but simpler and smaller than an automated scraper
        await jetpack.copy(path.join(rootDir, "libs"), getExportPath(config))
        console.log("Lib info generated...")
        // stop server and quit
        server.stop()
        console.log("Server stopped... Exiting")
        process.exit(0)
    }

}