import { Logger, LogLevel } from "./Logger"
import { RevealServer } from "./RevealServer"
import { defaultConfiguration, IDocumentOptions } from "./Configuration"
import { parseSlides } from "./SlideParser"
import * as jetpack from "fs-jetpack";
import * as path from 'path'
import * as matter from 'gray-matter'
import * as fs from 'fs'

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

export const exportPDFUri = (server) => {
    const uri = getUri(server)
    return uri + '?print-pdf-now'
}

async function main(slideSource, overrideConfig = {}) {
    const config = { ...defaultConfiguration, ...overrideConfig }
    const documentText = "" + fs.readFileSync(slideSource)
    await jetpack.removeAsync(getExportPath(config))
    const server = new RevealServer(
        new Logger(LogLevel.Verbose, () => { }),
        () => rootDir, //RootDir
        () => parseSlides(documentText, documentOptions(documentText)),
        () => config,
        '.', // PATH TO DATA
        () => false, // is during export
        () => getExportPath(config)
    )

    server.start()
    console.log(`Serving slides at: ${getUri(server)}`)
    // o - slides
    // p/h - prev
    // n/l - next
    // f - fullscreen
    // d - download chalkboard
    // s - speaker view
    // c - toggle chalkboard
    // b - crayon chalkboard
    // v - pause
    // m - table of contents
    console.log(`Use this url to export pdf: ${exportPDFUri(server)}`)
    console.log(`Speaker view served from: ${getUri(server)}libs/reveal.js/3.8.0/plugin/notes/notes.html (NEEDS TO OPEN WITH SHORTCUT)`)

    //server.stop()

}

main("./examples/speakerview/sample.md")