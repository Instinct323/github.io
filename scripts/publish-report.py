import argparse
import os
import shutil
from datetime import datetime
from pathlib import Path

WORKDIR = Path(__file__).parent.parent


def execute(cmd, check=True):
    exit_code = print("\033[32m\033[1m" + cmd + "\033[0m") or os.system(cmd)
    if check and exit_code: raise OSError(f"Fail to execute: {cmd}")
    return exit_code


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Initialize the registry")
    parser.add_argument("file", type=str, help="Report file path")
    args = parser.parse_args()

    file = Path(args.file).resolve()
    assert file.exists(), f"{file} does not exist."
    assert file.suffix == ".md", f"{file} is not a markdown file."

    os.chdir(WORKDIR)
    now = datetime.today().strftime('%Y-%m-%d-%H-%M-%S')
    dst = Path("content/blog") / f"Report-{now}"
    dst.mkdir(exist_ok=False)
    shutil.copy(file, dst / "README.md")

    execute(f"git add {dst}")
    execute(f"git add {dst} --renormalize")
    execute(f"git commit -m \"add {file.stem}\"")
    execute("git push")
