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
    'Pony_Windigo', # unobtainable
    'Pony_Las_Pegasus_Showponies_Green',
    'Pony_Las_Pegasus_Showponies_Blue',
    'Pony_Shadowbolts_f',
    'Pony_Shadowbolts_s',
    'Pony_Quest_Duplicate_Starlight',
    'Pony_Quest_Duplicate_Discord',
    'Pony_Quest_Duplicate_Trixie',
    'Pony_Quest_Duplicate_Thorax',
    'Pony_Quest_Fluttershy_Duplicate',
    'Pony_Quest_Duplicate_Scootaloo',
    'Pony_Quest_Duplicate_Sweetiebelle',
    'Pony_Quest_Duplicate_Apple_Bloom',
    'Pony_Quest_Changeling_Runaway_01',
    'Pony_Quest_Changeling_Runaway_02',
    'Pony_Apple_Infantry_b',
    'Pony_Apple_Infantry_c',
    'Pony_Minotaurocellus_Green_2',
    'Pony_Bad_Apple_Hidden',
    'Pony_Nirik_Hidden',
    'Pony_Parasol_UPD81',

]

WIKI_URL = 'https://mlp-game-wiki.no/index.php/'

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

def add_translation(key: str, pony_info: dict, loc_files: list[LOC], type: str = 'name', locked: bool = False):
    unknown_name = False
    for loc in loc_files:
        lang = loc['DEV_ID'].lower()
        if key not in loc and not unknown_name:
            print(f"No {type} for {key}")
            unknown_name = True
        if not locked or (locked and lang not in pony_info[type]):
            name = loc.translate(key).strip().replace('|', '')
            if lang in pony_info[type] and pony_info[type][lang].replace('|', '') != name:
                print(f'new: {name}')
                print(f"old: {pony_info[type][lang].replace('|', '')}")
            pony_info[type][lang] = name
        

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
        default = 'assets/json/ponies.json',
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
        try:

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
                pony_info,
                loc_files,
                'name',
                pony_info.get('locked', False),
            )

            add_translation(
                description_id,
                pony_info,
                loc_files,
                'description',
                pony_info.get('locked', False),
            )

            changeling = pony_obj.get('IsChangelingWithSet', {}).get('AltPony', None)
            if changeling:
                if changeling == 'None':
                    print(pony_obj.id, changeling)
                pony_info['changeling'] = {
                    'id': changeling,
                    'IamAlt': pony_obj.get('IsChangelingWithSet', {}).get('IAmAlterSet', 0) == 1,
                }
            elif 'changeling' in pony_info:
                del pony_info['changeling']

            wiki_path = urllib.parse.quote(pony_info['name'].get('english', '').replace(' ', '_'))
            wiki_path = pony_info.setdefault('wiki', wiki_path)

            if args.wiki_status:
                response = requests.head(wiki_url + wiki_path)
                if response.status_code not in [200, 301]:
                    print(f'No page for {pony_info['name'].get('english', pony_obj.id)}')
                    print(response.url)
                
                    pony_info['wiki_exists'] = False
        except Exception as e:
            e.add_note(f'id: {pony_obj.id}')
            raise e


    print(f'saving {os.path.basename(output)}')
    os.makedirs(os.path.dirname(output), exist_ok = True)
    with open(output, 'w', encoding = 'utf-8') as file:
        json.dump(ponies, file, indent = 2, ensure_ascii = False)
    
    print('Done!')

if __name__ == "__main__":
    main()
