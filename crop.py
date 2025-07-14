from PIL import Image
import numpy as np

def crop_image(pil_image: Image.Image):
    # pil_image = Image.open(pil_image)
    pil_image = pil_image.convert('RGBA')
    np_array = np.array(pil_image)
    blank_px = pil_image.getpixel((0,0))
    mask = np_array != blank_px
    mask = np.take(mask,axis=2,indices=3)
    coords = np.argwhere(mask)
    x0, y0 = coords.min(axis=0)
    x1, y1 = coords.max(axis=0) + 1
    cropped_box = np_array[x0:x1, y0:y1]
    pil_image = Image.fromarray(cropped_box, 'RGBA')
    return pil_image

if __name__ == "__main__":
    import argparse
    from glob import glob

    argparser = argparse.ArgumentParser(
        description = 'Crop images'
    )

    argparser.add_argument(
        'files',
        nargs = '+',
        help = 'Input file(s) to crop',
    )

    args = argparser.parse_args()

    files: list[str] = []

    for file in args.files:
        files.extend(glob(file))

    if len(files) == 0:
        print('no files to crop')
    
    for file in files:
        try:
            image = Image.open(file)
        except Exception as e:
            print(e)

