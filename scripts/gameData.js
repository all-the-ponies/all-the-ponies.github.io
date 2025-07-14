import { loadJSON, normalize, fixName, toTitleCase, LOC } from "./common.js"
import './jquery-3.7.1.min.js'

export default class GameData {
    constructor(
        gameDataPath,
        options = {
            ignoreSpaces: true,
            caseSensitive: false,
            ignoreAccents: true,
            ignorePunctuation: true,
            includeUnused: true,
        }) {
        this.gameDataPath = gameDataPath
        this.options = {
            ignoreSpaces: true,
            caseSensitive: false,
            ignoreAccents: true,
            ignorePunctuation: true,
            includeUnused: true,
            ...options,
        }
        this.gameData = loadJSON(this.gameDataPath)

        this.tags = ['unused']

        this._language = 'english'

        this.totalPonies = 0
        this.ponyNameMap = {}
        this.altPonyNames = {}

        this.update()
    }

    get language() {
        return this._language
    }

    set language(language) {
        this._language = language
        this.update()
    }

    update() {
        if (this.options.includeUnused) {
            if (!this.tags.includes('unused')) {
                this.tags.push('unused')
            }
        } else {
            if (this.tags.includes('unused')) {
                this.tags.splice(this.tags.indexOf('unused'))
            }
        }

        console.log('tags', this.tags)

        this.totalPonies = 0
        this.ponyNameMap = {}
        this.altPonyNames = {}
        for (let [ponyId, ponyInfo] of Object.entries(this.gameData.ponies)) {
            if (typeof ponyInfo['tags'] != 'undefined' && ponyInfo['tags']) {
                if (!ponyInfo['tags'].some(tag => this.tags.includes(tag))) {
                    console.log(`${ponyId} not included`)
                    continue
                }
            }
            
            let name = fixName(ponyInfo['name'][this.language])
            let newName = name

            let nameId = this.transformName(newName)

            let isChangeling = 'changeling' in ponyInfo && (!!ponyInfo['changeling']['id'])
            
            // this.totalPonies += 1
            // if (!(isChangeling && ponyInfo['changeling']['IamAlt'])) {
            // }
            
            if (nameId in this.ponyNameMap) {
                if (isChangeling) {
                    if (name == this.gameData.ponies[ponyInfo['changeling']['id']]['name'][this.language]) {
                        console.log('changeling detected', name)
                        continue
                    }
                }

                newName = `${name} (${toTitleCase(LOC.translate(ponyInfo['location']))})`
                nameId = this.transformName(newName)
                console.log(ponyId, name, newName)
                if (nameId in this.ponyNameMap) {
                    console.log(ponyId, name, newName)
                }
            }

            this.ponyNameMap[nameId] = {
                id: ponyId,
                name: newName,
            }

            if (typeof ponyInfo['alt_name'] != 'undefined' && typeof ponyInfo['alt_name'][this.language] != 'undefined') {
                for (let name of ponyInfo['alt_name'][this.language]) {
                    newName = name
                    nameId = this.transformName(fixName(name))
                    if (nameId in this.altPonyNames) {
                        if (isChangeling) {
                            if (name == this.ponyInfo[ponyInfo['changeling']['id']]['name'][this.language]) {
                                console.log('changeling detected', name)
                                continue
                            }
                        }

                        newName = `${name} (${toTitleCase(LOC.translate(ponyInfo['location']))})`
                        nameId = this.transformName(newName)
                        console.log(ponyId, name, newName)
                        if (nameId in this.altPonyNames) {
                            console.log(ponyId, name, newName)
                        }
                    }
                    this.altPonyNames[nameId] = {
                        id: ponyId,
                        name: newName,
                    }
                }
            }
        }

        this.totalPonies = Object.keys(this.ponyNameMap).length
    }

    transformName(name) {
        if (!this.options.caseSensitive) {
            name = name.toLocaleLowerCase()
        }
        if (this.options.ignorePunctuation) {
            name = name.replaceAll('-', ' ')
            name = name.replaceAll(/[,.()"']/gm, '')
        }
        if (this.options.ignoreAccents) {
            name = normalize(name)
        }
        if (this.options.ignoreSpaces) {
            name = name.replaceAll(' ', '')
        }

        return name
    }

    matchName(name) {
        let transformedName = this.transformName(name)
        if (transformedName in this.ponyNameMap || transformedName in this.altPonyNames) {
            let pony = transformedName in this.altPonyNames ? this.altPonyNames[transformedName] : this.ponyNameMap[transformedName]
            return this.getPony(pony.id, pony.name)
        }

        return null
    }

    getPony(ponyId, usedName = null) {
        return {
            ...structuredClone(this.gameData.ponies[ponyId]),
            id: ponyId,
            usedName: usedName,
            image: {
                portrait: `/assets/images/ponies/portrait/${ponyId}.png`,
                full: `/assets/images/ponies/shop/${ponyId}.png`,
            },
        }
    }
}
