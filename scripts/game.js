import { loadJSON, normalize, fixName, LOC, toTitleCase } from './common.js'
import './jquery-3.7.1.min.js'

class AllThePonies {
    constructor() {
        this.gameBar = $('#game-bar')
        this.nameInput = $('#name-input')
        this.timerElement = $('#timer')
        this.progressElement = $('#progress')
        this.startButton = $('#start')
        this.stopButton = $('#stop')
        this.languageSelector = $('#language')
        this.ponyListElement = $('#ponies-list')
        this.optionsButton = $('#options')
        this.optionsDialog = $('#options-dialog')

        let windowHeight = window.screen.height * window.devicePixelRatio


        this.options = {
            ignoreSpaces: true,
            caseSensitive: false,
            ignoreAccents: true,
            ignorePunctuation: true,
        }

        this.optionInfo = {
            ignoreSpaces: {
                type: 'switch',
                name: 'OPTIONS_IGNORE_SPACES',
            },
            caseSensitive: {
                type: 'switch',
                name: 'OPTIONS_CASE_SENSITIVE',
            },
            ignoreAccents: {
                type: 'switch',
                name: 'OPTIONS_IGNORE_ACCENTS',
            },
            ignorePunctuation: {
                type: 'switch',
                name: 'OPTIONS_IGNORE_PUNCTUATION',
            },
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
        return this.languageSelector.val()
    }

    set language(lang) {
        this.languageSelector.val(lang)
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
        this.languageSelector.on('change', () => this.createNameMap())

        this.startButton.on('click', () => this.start())
        this.stopButton.on('click', () => this.stop())
        this.nameInput.on('input', () => this.checkName())

        this.optionsButton.on('click', () => this.showOptionsDialog())

        this.timerHandler = () => this.updateTime()
    }

    checkName() {
        console.log('checking')
        this.nameInput.val(this.nameInput.val().replaceAll('\n', ''))
        console.log(this.nameInput.val())
        let nameId = this.transformName(this.nameInput.val())
        console.log(nameId)
        if (nameId in this.ponyNameMap || nameId in this.altNames) {
            let pony = nameId in this.altNames ? this.altNames[nameId] : this.ponyNameMap[nameId]
            if (!(this.guessedPonies.includes(pony.id))) {
                this.guessedPonies.push(pony.id)
                let nameElement = $('<div>')
                    .addClass('pony-name')
                    .text(pony.name)
                this.ponyListElement.append(nameElement)
                nameElement[0].scrollIntoView()
                this.nameInput.val('')
                this.updateProgress()
            }
        }
    }

    updateProgress() {
        this.progressElement.text(`${this.guessedPonies.length}/${this.totalPonies}`)
    }

    start() {
        this.stop()
        this.guessedPonies = []
        this.ponyListElement.empty()
        this.startButton[0].disabled = true
        this.stopButton[0].disabled = false
        this.nameInput[0].disabled = false

        
        this.languageSelector[0].disabled = true
        this.timerElement[0].innerText = '0:00'
        this.updateProgress()
        this.startTime = new Date().getTime()
        this._timerInterval = setInterval(this.timerHandler, 1000)

        this.ponyListElement.css(
            '--bottom-sticky',
            document.documentElement.clientHeight - this.gameBar.offset().top + 'px',
        )
        this.nameInput.trigger('focus')
        this.gameBar[0].scrollIntoView()
    }

    stop() {
        this.nameInput.value = ''
        this.startButton[0].disabled = false
        this.stopButton[0].disabled = true
        this.nameInput[0].disabled = true
        this.languageSelector[0].disabled = false
        clearInterval(this._timerInterval)
    }

    updateTime() {
        let now = new Date().getTime()
        let timeElapsed = now - this.startTime

        let seconds = Math.floor((timeElapsed % (1000 * 60)) / 1000);
        let minutes = Math.floor((timeElapsed % (1000 * 60 * 60)) / (1000 * 60))
        this.timerElement.text(`${minutes}:${seconds.toString().length == 1 ? '0' : ''}${seconds}`)
    }

    showOptionsDialog() {
        let formOptions = this.optionsDialog.find('.form-options')
        formOptions.empty()
        for (let [option, optionInfo] of Object.entries(this.optionInfo)) {
            $('<div>').addClass('form-option')
                .append(
                    $('<input>', {
                        type: 'checkbox',
                        name: option,
                        id: `option-${option}`,
                    }),
                    $('<label>', {
                        for: `option-${option}`,
                        text: LOC.translate(optionInfo.name),
                    })
                ).appendTo(formOptions)
        }

        this.optionsDialog[0].showModal()
    }
}

window.game = new AllThePonies()
