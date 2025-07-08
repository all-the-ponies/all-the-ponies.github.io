import { loadJSON, normalize, fixName, LOC, toTitleCase } from './common.js'

class AllThePonies {
    constructor() {
        this.gameBar = document.getElementById('game-bar')
        this.nameInput = document.getElementById('name-input')
        this.timerElement = document.getElementById('timer')
        this.progressElement = document.getElementById('progress')
        this.startButton = document.getElementById('start')
        this.stopButton = document.getElementById('stop')
        this.languageSelector = document.getElementById('language')
        this.ponyListElement = document.getElementById('ponies-list')
        this.optionsButton = document.getElementById('options')
        this.optionsDialog = document.getElementById('options-dialog')

        let windowHeight = window.screen.height * window.devicePixelRatio




        this.options = {
            ignoreSpaces: true,
            caseSensitive: false,
            ignoreAccents: true,
            ignorePunctuation: true,
        }

        this.tags = ['unused']

        this.ponyInfo = {}
        this.ponyNameMap = {}
        this.altNames = {}
        this.guessedPonies = []
        this.totalPonies = 0
        this.startTime = 0

        
        this.loadPonies()
        this.createNameMap()
        this.bindEventListeners()
    }

    loadPonies() {
        this.ponyInfo = loadJSON('assets/json/ponies.json')
    }

    createNameMap() {
        this.totalPonies = 0
        this.ponyNameMap = {}
        this.altNames = {}
        for (let [ponyId, ponyInfo] of Object.entries(this.ponyInfo)) {
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
                    if (name == this.ponyInfo[ponyInfo['changeling']['id']]['name'][this.language]) {
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
                    if (nameId in this.altNames) {
                        if (isChangeling) {
                            if (name == this.ponyInfo[ponyInfo['changeling']['id']]['name'][this.language]) {
                                console.log('changeling detected', name)
                                continue
                            }
                        }

                        newName = `${name} (${toTitleCase(LOC.translate(ponyInfo['location']))})`
                        nameId = this.transformName(newName)
                        console.log(ponyId, name, newName)
                        if (nameId in this.altNames) {
                            console.log(ponyId, name, newName)
                        }
                    }
                    this.altNames[nameId] = {
                        id: ponyId,
                        name: newName,
                    }
                }
            }
        }

        this.totalPonies = Object.keys(this.ponyNameMap).length
        this.updateProgress()
    }

    get language() {
        return this.languageSelector.value
    }

    set language(lang) {
        this.languageSelector.value = lang
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

    bindEventListeners() {
        this.languageSelector.addEventListener('change', () => this.createNameMap())

        this.startButton.addEventListener('click', () => this.start())
        this.stopButton.addEventListener('click', () => this.stop())
        this.nameInput.addEventListener('input', () => this.checkName())

        this.optionsButton.addEventListener('click', () => {
            this.optionsDialog.showModal()
        })

        this.timerHandler = () => this.updateTime()
    }

    checkName() {
        this.nameInput.value = this.nameInput.value.replaceAll('\n', '')
        let nameId = this.transformName(this.nameInput.value)
        if (nameId in this.ponyNameMap || nameId in this.altNames) {
            let pony = nameId in this.altNames ? this.altNames[nameId] : this.ponyNameMap[nameId]
            if (!(this.guessedPonies.includes(pony.id))) {
                this.guessedPonies.push(pony.id)
                let nameElement = document.createElement('div')
                nameElement.innerText = pony.name
                nameElement.classList.add('pony-name')
                this.ponyListElement.append(nameElement)
                nameElement.scrollIntoView()
                this.nameInput.value = ''
                this.updateProgress()
            }
        }
    }

    updateProgress() {
        this.progressElement.innerText = `${this.guessedPonies.length}/${this.totalPonies}`
    }

    start() {
        this.stop()
        this.guessedPonies = []
        this.ponyListElement.replaceChildren()
        this.startButton.disabled = true
        this.stopButton.disabled = false
        this.nameInput.disabled = false

        
        this.languageSelector.disabled = true
        this.timerElement.innerText = '0:00'
        this.updateProgress()
        this.startTime = new Date().getTime()
        this._timerInterval = setInterval(this.timerHandler, 1000)

        this.ponyListElement.style.setProperty(
            '--bottom-sticky',
            document.documentElement.clientHeight - this.gameBar.getBoundingClientRect().top + 'px',
        )
        this.nameInput.focus()
        this.gameBar.scrollIntoView()
    }

    stop() {
        this.nameInput.value = ''
        this.startButton.disabled = false
        this.stopButton.disabled = true
        this.nameInput.disabled = true
        this.languageSelector.disabled = false
        clearInterval(this._timerInterval)
    }

    updateTime() {
        let now = new Date().getTime()
        let timeElapsed = now - this.startTime

        let seconds = Math.floor((timeElapsed % (1000 * 60)) / 1000);
        let minutes = Math.floor((timeElapsed % (1000 * 60 * 60)) / (1000 * 60))
        this.timerElement.innerText = `${minutes}:${seconds.toString().length == 1 ? '0' : ''}${seconds}`
    }
}

window.game = new AllThePonies()
