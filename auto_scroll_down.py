from __future__ import annotations

import argparse
import ctypes
import sys
import time


MOUSEEVENTF_WHEEL = 0x0800
DEFAULT_WHEEL_DELTA = -120
VK_ESCAPE = 0x1B


def is_escape_pressed() -> bool:
    return bool(ctypes.windll.user32.GetAsyncKeyState(VK_ESCAPE) & 0x8000)


def scroll_once(lines: int) -> None:
    ctypes.windll.user32.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, lines * DEFAULT_WHEEL_DELTA, 0)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Simulate mouse-wheel scrolling downward on Windows."
    )
    parser.add_argument(
        "--steps",
        type=int,
        default=200,
        help="How many scroll actions to send.",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=0.8,
        help="Seconds to wait between scroll actions.",
    )
    parser.add_argument(
        "--lines",
        type=int,
        default=3,
        help="Wheel notch count per action. Larger values scroll faster.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=3.0,
        help="Seconds to wait before scrolling starts, so you can focus the browser window.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.steps <= 0 or args.interval <= 0 or args.lines <= 0 or args.delay < 0:
        print("All numeric arguments must be positive, except --delay can be 0.")
        return 1

    print(f"Starting in {args.delay:.1f}s. Focus the ChatGPT page now. Press Esc to stop.")
    start_time = time.time()
    while time.time() - start_time < args.delay:
        if is_escape_pressed():
            print("\nStopped before scrolling started.")
            return 0
        time.sleep(0.05)

    for index in range(1, args.steps + 1):
        if is_escape_pressed():
            print(f"\nStopped by Esc at {index - 1}/{args.steps}.")
            return 0
        scroll_once(args.lines)
        print(f"Scrolled {index}/{args.steps}", end="\r", flush=True)
        wait_started = time.time()
        while time.time() - wait_started < args.interval:
            if is_escape_pressed():
                print(f"\nStopped by Esc at {index}/{args.steps}.")
                return 0
            time.sleep(0.05)

    print(f"\nDone. Sent {args.steps} downward scroll actions.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
