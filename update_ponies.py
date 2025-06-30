import argparse
from glob import glob
import json
import os
from typing import Any
from typing import Iterable, Optional, Sequence, Union
import urllib.parse

import charset_normalizer
import requests
import requests
from rich.progress import (
     BarColumn,
     MofNCompleteColumn,
     Progress,
     ProgressType,
     TextColumn,
     TimeRemainingColumn,
)

from luna_kit.gameobjectdata import GameObject, GameObjectData
from luna_kit.loc import LOC
from luna_kit.xml import parse_xml

IGNORED_PONIES = [
    'Pony_Derpy', # derpy box, not playable muffins
    'Pony_Disguised_Spike',
    'Pony_Chest',
    'Pony_Tirek', # Not the playable tirek
    'Pony_Tirek_TOTB',
    'Pony_Windigo', # seems unused
    'Pony_Las_Pegasus_Showponies_Green',
    'Pony_Las_Pegasus_Showponies_Blue',
]

WIKI_URL = 'https://mlp-gameloft.fandom.com/wiki/'

LOCATIONS = {
    0: 'PONYVILLE',
    1: 'CANTERLOT',
    2: 'SWEET_APPLE_ACRES',
    3: 'EVERFREE_FOREST',
    4: 'CRYSTAL_EMPIRE',
    5: 'CRYSTAL_EMPIRE',
    6: 'KLUGETOWN',
}

def track(
    sequence: Union[Iterable[ProgressType], Sequence[ProgressType]],
    total: Optional[float] = None,
    description: str = 'Working...',
    transient: bool = False,
):
    progress = Progress(
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TimeRemainingColumn(),
        transient = transient,
    )

    with progress:
        yield from progress.track(
            sequence = sequence,
            description = description,
        )

def add_translation(key: str, pony_info: dict, loc_files: list[LOC], type: str = 'name'):
    unknown_name = False
    for loc in loc_files:
        lang = loc['DEV_ID'].lower()
        if key not in loc and not unknown_name:
            print(f"No {type} for {key}")
            unknown_name = True

        name = loc.translate(key).strip()
        pony_info[lang] = name

def main():
    argparser = argparse.ArgumentParser()
    argparser.add_argument(
        '-g', '--game-folder',
        help = 'Game folder',
        required = True,
    )

    argparser.add_argument(
        '-o', '--output',
        help = 'Output json file',
        default = 'ponies.json',
    )

    argparser.add_argument(
        '-w', '--wiki-status',
        help = 'Check wiki status',
        action = 'store_true',
    )

    argparser.add_argument(
        '-u', '--wiki-url',
        help = 'Base wiki url',
        default = WIKI_URL,
    )

    args = argparser.parse_args()

    output = os.path.abspath(args.output)

    wiki_url = args.wiki_url
    if not wiki_url.endswith('/') and not wiki_url.endswith('\\'):
        wiki_url += '/'

    ponies = {}
    
    if os.path.exists(output):
        print(f'Loading {os.path.basename(output)}')
        encoding = charset_normalizer.from_path(output).best().encoding
        with open(output, 'r', encoding = encoding) as file:
            ponies = json.load(file)
        if not isinstance(ponies, dict):
            ponies = {}
    
    game_folder = os.path.abspath(args.game_folder)

    print('Loading gameobjectdata.xml')
    gameobjectdata: GameObjectData = GameObjectData(os.path.join(game_folder, 'gameobjectdata.xml'))

    print('Loading loc files')
    loc_files: list[LOC] = [
        LOC(filename) for filename in glob(os.path.join(game_folder, '*.loc'))
    ]

    if len(loc_files) == 0:
        print('Could not find loc files')
        return

    print('Getting version')
    version = parse_xml(os.path.join(game_folder, 'data_ver.xml'))[0].attrib['Value']


    # print('Gathering ponies')

    pony_category = gameobjectdata.get('Pony')

    if pony_category is None:
        print('Could not find Pony category in gameobjectdata.xml')
        return
    
    for pony_obj in track(
        pony_category.values(),
        description = 'Gathering ponies...',
    ):
        if pony_obj.id in IGNORED_PONIES:
            continue

        pony_info = ponies.setdefault(pony_obj.id, {})
        pony_info.setdefault('name', {})
        pony_info.setdefault('description', {})
        pony_info['location'] = LOCATIONS.get(
            pony_obj.get('House', {}).get('HomeMapZone', ''),
            'UNKNOWN',
        )

        name_id = pony_obj.get('Name', {}).get('Unlocal', '')
        description_id = pony_obj.get('Description', {}).get('Unlocal', '')


        add_translation(
            name_id,
            pony_info['name'],
            loc_files,
            'name',
        )

        add_translation(
            description_id,
            pony_info['description'],
            loc_files,
            'description',
        )

        wiki_path = urllib.parse.quote(pony_info['name'].get('english', '').replace(' ', '_'))
        pony_info.setdefault('wiki', wiki_path)

        if args.wiki_status:
            response = requests.head(wiki_url + wiki_path)
            if response.status_code not in [200, 301]:
                print(f'No page for {pony_info['name'].get('english', pony_obj.id)}')
                print(response.url)
            
                pony_info['wiki_exists'] = False

    print(f'saving {os.path.basename(output)}')
    os.makedirs(os.path.dirname(output), exist_ok = True)
    with open(output, 'w', encoding = 'utf-8') as file:
        json.dump(ponies, file, indent = 2, ensure_ascii = False)
    
    print('Done!')

if __name__ == "__main__":
    main()
