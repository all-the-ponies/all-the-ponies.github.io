
// Load JSON text from server hosted file and return JSON parsed object
// From stackoverflow https://stackoverflow.com/a/4117299/17129659
export function loadJSON(filePath) {
  // Load json file;
  var json = loadTextFileAjaxSync(filePath, "application/json");
  // Parse json
  return JSON.parse(json);
}


// Load text with Ajax synchronously: takes path to file and optional MIME type
function loadTextFileAjaxSync(filePath, mimeType)
{
  var xmlhttp=new XMLHttpRequest();
  xmlhttp.open("GET", filePath, false);
  if (mimeType != null) {
    if (xmlhttp.overrideMimeType) {
      xmlhttp.overrideMimeType(mimeType);
    }
  }
  let error = xmlhttp.send();
  if (xmlhttp.status==200 && xmlhttp.readyState == 4 ) {
    return xmlhttp.responseText;
  }
  else {
    
    // TODO Throw exception
    return null;
  }
}

export function normalize(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, "")
}

export function fixName(name) {
  name = name.replaceAll('|', '')
  return name
}

export class Localization {
  constructor(file, languageSelector = null) {
    if (languageSelector == null) {
      languageSelector = document.getElementById('language')
    }
    this.languageSelector = languageSelector
    this._language = 'english'

    this.dictionary = loadJSON(file)
  }

  get language() {
    try {
      this._language = this.languageSelector.value
      return this._language
    } catch {
      return this._language
    }
  }

  set language(language) {
    this._language = language
    try {
      this.languageSelector.value = language
    } catch {
      return
    }
  }

  translate(key) {
    if (typeof this.dictionary[key] != 'undefined') {
      return this.dictionary[key][this.language] || this.dictionary[key]['english']
    } else {
      return key
    }
  }
}

export var LOC = new Localization('assets/json/localization.json')

export function capitalize(str) {
  if (str == '') return ''
  return str[0].toLocaleUpperCase() + str.substr(1).toLocaleLowerCase()
}

export function toTitleCase(str) {
  return str.split(' ').map(capitalize).join(' ')
}
