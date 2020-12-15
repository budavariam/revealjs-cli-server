import { Logger, LogLevel } from "./Logger"
import { RevealServer } from "./RevealServer"
import { defaultConfiguration, IDocumentOptions } from "./Configuration"
import { parseSlides } from "./SlideParser"
import * as path from 'path'
import * as matter from 'gray-matter'
import * as fs from 'fs'

const config = defaultConfiguration
const rootDir = '.'
const documentText = "" + fs.readFileSync("./sample.md")

// const slideContent = (documentText): string => {
//     return matter(documentText).content
// }

const frontMatter = (documentText): any => {
    return matter(documentText).data
}

const documentOptions = (documentText): IDocumentOptions => {
    const front = frontMatter(documentText)
    // tslint:disable-next-line:no-object-literal-type-assertion
    return { ...defaultConfiguration, ...front } as IDocumentOptions
}

const server = new RevealServer(
    new Logger(LogLevel.Verbose, () => { }),
    () => rootDir, //RootDir
    () => parseSlides(documentText, documentOptions(documentText)),
    () => config,
    '.', // PATH TO DATA
    () => false, // is during export
    () => {
        return path.isAbsolute(config.exportHTMLPath)
            ? config.exportHTMLPath
            : path.join(rootDir, config.exportHTMLPath)
    }
)

server.start()

const getUri = (withPosition = true): string | null => {
    if (!server.isListening) {
        return null
    }
    const serverUri = server.uri
    // POSSIBLE PARAMS: `${serverUri}#/${slidepos.horizontal}/${slidepos.vertical}/${Date.now()}
    return `${serverUri}`
}

export const exportPDF = () => {
    const uri = getUri()
    return uri + '?print-pdf-now'
}

console.log(`OPEN IN: ${getUri()}`)
console.log(`EXPORT PDF IN: ${exportPDF()}`)