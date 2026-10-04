# Builds the PDF font subsets public/fonts/tq-zh.ttf and public/fonts/tq-ar.ttf (SIL OFL 1.1, see public/fonts/OFL.txt).
# Sources (run from a folder containing them): NotoSansSC-400.ttf (Noto Sans SC instanced at wght 400, from
# github.com/google/fonts ofl/notosanssc) and NotoSansArabic.ttf (github.com/google/fonts ofl/notosansarabic), plus
# Noto Sans (Latin) for the Arabic font. Requires fonttools. Usage: python3 scripts/build-fonts.py /path/to/tradequote
# Re-run after adding Chinese strings: the Chinese subset includes every CJK character used in the sources.
import sys, re, glob, subprocess
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib import instancer

ROOT = sys.argv[1] if len(sys.argv) > 1 else "/workspace/tradequote"
OUT = ROOT + "/public/fonts"

def base_latin():
    s = set(range(0x20, 0x7F)) | set(range(0xA0, 0x180)) | set(range(0x2010, 0x2070)) | {0x20AC, 0x2116, 0x2122, 0x00D7, 0x2212}
    return s

def source_chars():
    s = set()
    for f in glob.glob(ROOT + "/lib/**/*.ts", recursive=True) + glob.glob(ROOT + "/components/**/*.tsx", recursive=True) + glob.glob(ROOT + "/app/**/*.tsx", recursive=True):
        s |= {ord(c) for c in open(f, encoding="utf8").read()}
    return s

# --- Chinese: GB2312 (6 763 hanzi + symbols) + Latin + every character used in the sources.
zh = base_latin() | set(range(0x3000, 0x3040)) | set(range(0xFF00, 0xFFF0))
for hi in range(0xA1, 0xF8):
    for lo in range(0xA1, 0xFF):
        try: zh.add(ord(bytes([hi, lo]).decode("gb2312")))
        except Exception: pass
zh |= {c for c in source_chars() if 0x2E80 <= c <= 0x9FFF or 0xF900 <= c <= 0xFAFF}
f = TTFont("NotoSansSC-400.ttf")
opts = subset.Options(); opts.layout_features = []; opts.hinting = False; opts.notdef_outline = True; opts.name_IDs = ["*"]; opts.glyph_names = False
sub = subset.Subsetter(opts); sub.populate(unicodes=zh); sub.subset(f)
f.save(OUT + "/tq-zh.ttf")

# --- Arabic: Noto Sans Arabic 400 (incl. presentation forms used by jsPDF's shaping) merged with Noto Sans Latin.
ar = TTFont("NotoSansArabic.ttf")
ar = instancer.instantiateVariableFont(ar, {"wght": 400, "wdth": 100})
arset = set(range(0x0600, 0x0700)) | set(range(0xFB50, 0xFE00)) | set(range(0xFE70, 0xFF00)) | {0x20, 0x200C, 0x200D, 0x200E, 0x200F, 0x060C, 0x061B, 0x061F}
opts2 = subset.Options(); opts2.layout_features = ["*"]; opts2.hinting = False; opts2.notdef_outline = True; opts2.name_IDs = ["*"]
s2 = subset.Subsetter(opts2); s2.populate(unicodes=arset); s2.subset(ar)
ar.save("ar-part.ttf")
lat = TTFont("/usr/share/fonts/truetype/sand-box/google/Noto Sans/NotoSans-VariableFont_wdth,wght.ttf")
lat = instancer.instantiateVariableFont(lat, {"wght": 400, "wdth": 100})
s3 = subset.Subsetter(opts2); s3.populate(unicodes=base_latin()); s3.subset(lat)
lat.save("lat-part.ttf")
from fontTools.merge import Merger
m = Merger().merge(["ar-part.ttf", "lat-part.ttf"])
m.save(OUT + "/tq-ar.ttf")
import os
for n in ("tq-zh.ttf", "tq-ar.ttf"):
    t = TTFont(OUT + "/" + n); print(n, os.path.getsize(OUT + "/" + n), len(t.getBestCmap()), t["head"].unitsPerEm)
