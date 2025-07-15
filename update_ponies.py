import argparse
from glob import glob
import json
import os
from typing import Any
from typing import Iterable, Optional, Sequence, Union
import urllib.parse
from datetime import datetime, timedelta

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
from rich.console import Console
console = Console()

from PIL import Image
from crop import crop_image

from luna_kit.gameobjectdata import GameObject, GameObjectData
from luna_kit.loc import LOC
from luna_kit.xml import parse_xml
from luna_kit.pvr import PVR

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

WIKI_URLS = {
    'indie': 'https://mlp-game-wiki.no/index.php/',
    'fandom': 'https://mlp-gameloft.fandom.com/wiki/',
}

WIKI_PAGES = {
    'indie': {
        'page': '{name}',
        '2d_image': 'File:{name}_2d.png',
        'portrait': 'File:{name}_portrait.png',
    },
    'fandom': {
        'page': '{name}',
    }
}

LOCATIONS = {
    0: 'PONYVILLE',
    1: 'CANTERLOT',
    2: 'SWEET_APPLE_ACRES',
    3: 'EVERFREE_FOREST',
    4: 'CRYSTAL_EMPIRE',
    5: 'CRYSTAL_EMPIRE',
    6: 'KLUGETOWN',
}

PRIZE_TYPES = {
    'XP': 'XP',
    'Bits': 'Bits',
    'Gems': 'Gems',
    'MinecartWheel_StarMastery': 'Minecart_Wheel',
    'MinecartWheel': 'Minecart_Wheel',
    'LoyaltyShard': 'Loyalty_Shard',
    'KindnessShard': 'Kindness_Shard',
    'LaughterShard': 'Laughter_Shard',
    'GenerosityShard': 'Generosity_Shard',
    'HonestyShard': 'Honesty_Shard',
    'MagicShard': 'Magic_Shard',
    'PopCurrency1': 'Pin',
    'PopCurrency2': 'Button',
    'PopCurrency3': 'Twine',
    'PopCurrency4': 'Ribbon',
    'PopCurrency5': 'Bow',
    'Token_Lottery': 'Lucky_Coin',
    'Token_CE_Lottery': 'Crystal_Coin',
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
        console = console,
    )

    with progress:
        yield from progress.track(
            sequence = sequence,
            description = description,
        )

def check_wiki(name: str, result: Optional[dict] = None, check: bool = False):
    if not isinstance(result, dict):
        result = {}
    
    
    for wiki, wiki_url in WIKI_URLS.items():
        if not wiki_url.endswith('/') and not wiki_url.endswith('\\'):
            wiki_url += '/'
        
        wiki_result = result.setdefault(wiki, {})
        for page, url_template in WIKI_PAGES[wiki].items():
            page_result: dict = wiki_result.setdefault(page, {
                'exists': False,
                'redirect': False,
                'path': url_template.format(name = name),
            })
            if check and (not page_result.get('exists', False) or page_result.get('redirect', False)):
                page_result['path'] = url_template.format(name = name)
                url = wiki_url + page_result.get('path', url_template.format(name = name))

                if (datetime.now() - datetime.fromtimestamp(page_result.get('timestamp', 0))) < timedelta(days = 1):
                    console.print(f'skipping {url}')
                    continue
                    
                response = requests.head(url)
                if response.status_code == 301:
                    page_result['exists'] = True
                    page_result['redirect'] = True
                elif response.status_code == 200:
                    page_result['exists'] = True
                    page_result['redirect'] = False
                else:
                    page_result['exists'] = False
                    page_result['redirect'] = False
                    page_result['timestamp'] = datetime.now().timestamp()
                    console.print(f'[red]no page for [blue]{url}[/]')
        
    return result

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


def translate(key: str, loc_files: list[LOC]) -> dict[str, str]:
    result = {}
    for loc in loc_files:
        lang = loc['DEV_ID'].lower()
        result[lang] = loc.translate(key)
    
    return result


def main():
    argparser = argparse.ArgumentParser()
    argparser.add_argument(
        '-v', '--version',
        help = 'Game version',
    )

    argparser.add_argument(
        '-g', '--game-folder',
        help = 'Game folder',
        required = True,
    )

    argparser.add_argument(
        '-o', '--output',
        help = 'Output json file',
        default = 'assets/json/game-data.json',
    )

    argparser.add_argument(
        '-a', '--assets',
        help = 'Assets output folder',
        default = 'assets',
    )

    argparser.add_argument(
        '-ni', '--no-images',
        action = 'store_true',
        help = "Don't get images",
    )

    argparser.add_argument(
        '-w', '--wiki-status',
        help = 'Check wiki status',
        action = 'store_true',
    )

    args = argparser.parse_args()

    output = os.path.abspath(args.output)
    ASSETS_FOLDER = args.assets
    
    game_info = {}

    if os.path.exists(output):
        console.print(f'Loading {os.path.basename(output)}')
        encoding = charset_normalizer.from_path(output).best().encoding
        with open(output, 'r', encoding = encoding) as file:
            game_info = json.load(file)
        if not isinstance(game_info, dict):
            game_info = {}

    ponies = game_info.setdefault('ponies', {})
    
    if not game_info.get('file_version'):
        ponies = game_info
        game_info = {
            'file_version': 1,
            'ponies': ponies,
        }
    
    game_info['file_version'] = 1
    
    game_folder = os.path.abspath(args.game_folder)

    console.print('Loading gameobjectdata.xml')
    gameobjectdata: GameObjectData = GameObjectData(os.path.join(game_folder, 'gameobjectdata.xml'))

    console.print('Loading loc files')
    loc_files: list[LOC] = [
        LOC(filename) for filename in glob(os.path.join(game_folder, '*.loc'))
    ]

    if len(loc_files) == 0:
        console.print('Could not find loc files')
        return

    console.print('Getting version')
    content_version = parse_xml(os.path.join(game_folder, 'data_ver.xml'))[0].attrib['Value']

    if args.version:
        game_info['game_version'] = args.version
    else:
        game_info['game_version'] = content_version
    
    game_info['content_version'] = content_version

    # Gather prize types

    prizetypes_info = game_info.setdefault('prizes', {})
    with open(os.path.join(game_folder, 'prizetype.json'), 'r') as file:
        prizetypes = json.load(file)
    
    os.makedirs(os.path.join(ASSETS_FOLDER, 'images', 'prizes'), exist_ok = True)
    for prize, prize_id in PRIZE_TYPES.items():
        if prize not in prizetypes['PrizeData']:
            prize_obj = gameobjectdata.get_object(prize)

            if prize_obj is not None and prize_obj.category == 'QuestSpecialItem':
                prize_game_info = {
                    'loc_string': prize_obj.get('QuestSpecialItem', {}).get('Name', ''),
                    'image': prize_obj.get('QuestSpecialItem', {}).get('Icon', '')
                }
            else:
                raise ValueError(f'Cannot find {prize}')
        else:
            prize_game_info = prizetypes['PrizeData'][prize]
        
        image = crop_image(Image.open(os.path.join(game_folder, prize_game_info['image'])))
        prize_image_path = os.path.join(ASSETS_FOLDER, 'images', 'prizes', f'{prize_id}.png')
        image.save(prize_image_path)
        
        prize_info = {
            'name': translate(prize_game_info['loc_string'], loc_files),
        }

        prizetypes_info[prize_id] = prize_info
    
    PRIZES_MAP = {}
    for prize_id, prize_aliases in prizetypes['PrizeStrings'].items():
        for alias in prize_aliases:
            PRIZES_MAP[alias] = prize_id

    # print('Gathering ponies')

    pony_category = gameobjectdata.get('Pony')

    if pony_category is None:
        print('Could not find Pony category in gameobjectdata.xml')
        return
    
    os.makedirs(os.path.dirname(output), exist_ok = True)
    # Do an initial save
    with open(output, 'w', encoding = 'utf-8') as file:
        json.dump(game_info, file, indent = 2, ensure_ascii = False)
        
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
            pony_info['house'] = pony_obj.get('House', {}).get('Type')

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

            if not args.no_images:
                shop_image_name = pony_obj.get('Shop', {}).get('Icon')
                if shop_image_name is not None and os.path.exists(shop_image_path := os.path.join(game_folder, shop_image_name)):
                    shop_image = Image.open(shop_image_path)
                    shop_image = crop_image(shop_image)
                    shop_image.save(os.path.join(ASSETS_FOLDER, 'images', 'ponies', 'shop', f'{pony_obj.id}.png'))
                else:
                    console.print(f'could not find {pony_obj.id} image')
                    
                
                portrait_image_name = pony_obj.get('Icon', {}).get('Url')
                portrait_image_path = os.path.join(game_folder, portrait_image_name)
                portrait_image = None
                if portrait_image_name is not None:
                    if os.path.exists(portrait_image_path + '.png'):
                        portrait_image = Image.open(portrait_image_path + '.png')
                    elif os.path.exists(portrait_image_path + '.pvr'):
                        portrait_image = PVR(portrait_image_path + '.pvr', external_alpha = True).image
                    else:
                        console.print(f'could not find {pony_obj.id} portrait')
                
                    if portrait_image is not None:
                        portrait_image = crop_image(portrait_image)
                        portrait_image.save(os.path.join(ASSETS_FOLDER, 'assets', 'ponies', 'portrait', f'{pony_obj.id}.png'))
                else:
                    console.print(f'could not find {pony_obj.id} portrait')

            

            changeling = pony_obj.get('IsChangelingWithSet', {}).get('AltPony', None)
            if changeling:
                pony_info['changeling'] = {
                    'id': changeling,
                    'IAmAlterSet': pony_obj.get('IsChangelingWithSet', {}).get('IAmAlterSet', 0) == 1,
                }
            elif 'changeling' in pony_info:
                del pony_info['changeling']


            # star rewards

            pony_info['max_level'] = pony_obj.get('AI', {}).get('Max_Level', 0) == 1


            star_rewards = []

            for prize_id, amount in zip(
                pony_obj.get('StarRewards', {}).get('ID', []),
                pony_obj.get('StarRewards', {}).get('Amount', []),
            ):
                prize_id = PRIZES_MAP.get(prize_id, prize_id)
                prize_id = PRIZE_TYPES.get(prize_id, prize_id)

                star_rewards.append({
                    'item': prize_id,
                    'amount': amount,
                })
            
            pony_info['rewards'] = star_rewards

            # extra metadata
            
            minigames = pony_info.setdefault('minigames', {})
            minigames['can_play_minecart'] = pony_obj.get('Minigames', {}).get('CanPlayMineCart', 1) == 1
            minigames['minigame_cooldown'] = pony_obj.get('Minigames', {}).get('TimeBetweenPlayActions', 0)
            minigames['minigame_skip_cost'] = pony_obj.get('Minigames', {}).get('PlayActionSkipAgainCost', 0)
            minigames['exp_rank'] = pony_obj.get('Minigames', {}).get('EXP_Rank', 0) # Not sure what this is, but I'll keep it

            pony_info['arrival_xp'] = pony_obj.get('OnArrive', {}).get('EarnXP', 0)




            # wiki stuff

            wiki_path = urllib.parse.quote(pony_info['name'].get('english', '').replace(' ', '_'))

            if isinstance(pony_info.get('wiki'), str):
                pony_info['wiki_path'] = pony_info['wiki']
                del pony_info['wiki']
            
            wiki_path = pony_info.setdefault('wiki_path', wiki_path)
            pony_info['wiki'] = check_wiki(
                wiki_path,
                pony_info.get('wiki'),
                args.wiki_status,
            )

            if 'wiki_exists' in pony_info:
                del pony_info['wiki_exists']
            
        except Exception as e:
            with open(output, 'w', encoding = 'utf-8') as file:
                json.dump(game_info, file, indent = 2, ensure_ascii = False)
            e.add_note(f'id: {pony_obj.id}')
            raise e
        
    console.print('saving game data')
    with open(output, 'w', encoding = 'utf-8') as file:
        json.dump(game_info, file, indent = 2, ensure_ascii = False)
    
    print('Done!')

if __name__ == "__main__":
    main()
