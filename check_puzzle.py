#!/usr/bin/env python3
"""
Check all first moves that lead to mate in X for a given puzzle.
Uses Stockfish's MultiPV to efficiently find all winning moves.

Usage: python check_puzzle.py <puzzle_id>
"""

import subprocess
import json
import sys
import threading
import queue
import time
from pathlib import Path

STOCKFISH_PATH = "/home/cas/stockfish/stockfish-ubuntu-x86-64-avx2"


def load_puzzle(puzzle_id):
    """Load puzzle from chunk files"""
    chunk_num = (puzzle_id - 1) // 100
    chunk_file = Path(__file__).parent / f"public/puzzles/chunk-{chunk_num}.json"

    with open(chunk_file) as f:
        puzzles = json.load(f)

    for p in puzzles:
        if p["problemid"] == puzzle_id:
            return p
    return None


def parse_mate_count(puzzle_type):
    """Extract mate count from puzzle type string"""
    t = puzzle_type.lower()
    if 'one' in t or 'in 1' in t:
        return 1
    elif 'two' in t or 'in 2' in t:
        return 2
    elif 'three' in t or 'in 3' in t:
        return 3
    elif 'four' in t or 'in 4' in t:
        return 4
    return None


def find_mate_moves(fen, mate_in, depth=20, multipv=50):
    """
    Use Stockfish MultiPV to find all moves that lead to mate in exactly N moves.
    Returns list of (move, pv) tuples.
    """
    proc = subprocess.Popen(
        [STOCKFISH_PATH],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    output_queue = queue.Queue()

    def reader():
        while True:
            line = proc.stdout.readline()
            if not line:
                break
            output_queue.put(line.strip())

    thread = threading.Thread(target=reader, daemon=True)
    thread.start()

    def send(cmd):
        proc.stdin.write(cmd + "\n")
        proc.stdin.flush()

    def collect_until_bestmove(timeout=30):
        lines = []
        end_time = time.time() + timeout
        while time.time() < end_time:
            try:
                line = output_queue.get(timeout=0.1)
                lines.append(line)
                if line.startswith("bestmove"):
                    break
            except queue.Empty:
                pass
        return lines

    # Initialize Stockfish
    send("uci")
    time.sleep(0.3)
    while not output_queue.empty():
        output_queue.get()

    send(f"setoption name MultiPV value {multipv}")
    send("isready")
    time.sleep(0.2)
    while not output_queue.empty():
        output_queue.get()

    # Search
    send(f"position fen {fen}")
    send(f"go depth {depth}")

    lines = collect_until_bestmove(timeout=30)
    proc.terminate()

    # Parse results - find all moves with score mate N at final depth
    mate_moves = {}
    final_depth = 0

    for line in lines:
        if not line.startswith("info depth"):
            continue

        parts = line.split()
        try:
            depth_idx = parts.index("depth")
            current_depth = int(parts[depth_idx + 1])
            final_depth = max(final_depth, current_depth)
        except (ValueError, IndexError):
            continue

    # Now extract moves from final depth with score mate N
    for line in lines:
        if not line.startswith("info depth"):
            continue

        parts = line.split()
        try:
            depth_idx = parts.index("depth")
            current_depth = int(parts[depth_idx + 1])

            if current_depth != final_depth:
                continue

            if "score" not in parts or "mate" not in parts:
                continue

            score_idx = parts.index("score")
            if parts[score_idx + 1] != "mate":
                continue

            mate_value = int(parts[score_idx + 2])
            if mate_value != mate_in:
                continue

            # Get the move from pv
            pv_idx = parts.index("pv")
            move = parts[pv_idx + 1]
            pv = " ".join(parts[pv_idx + 1:])

            mate_moves[move] = pv

        except (ValueError, IndexError):
            continue

    return list(mate_moves.items())


def main():
    if len(sys.argv) < 2:
        print("Usage: python check_puzzle.py <puzzle_id>")
        sys.exit(1)

    puzzle_id = int(sys.argv[1])
    puzzle = load_puzzle(puzzle_id)

    if not puzzle:
        print(f"Puzzle {puzzle_id} not found")
        sys.exit(1)

    print(f"Puzzle #{puzzle_id}")
    print(f"Type: {puzzle['type']}")
    print(f"FEN: {puzzle['fen']}")
    print(f"Solution: {puzzle['moves']}")
    print()

    mate_in = parse_mate_count(puzzle['type'])
    if not mate_in:
        print(f"Unknown mate type: {puzzle['type']}")
        sys.exit(1)

    print(f"Searching for all moves that force mate in {mate_in}...")
    print()

    fen = puzzle['fen']
    # Use depth = mate_in * 4 + 2 (enough to verify mate, fast enough)
    depth = mate_in * 4 + 2
    mate_moves = find_mate_moves(fen, mate_in, depth=depth)

    print(f"Found {len(mate_moves)} move(s) that force mate in {mate_in}:")
    print()
    for move, pv in mate_moves:
        print(f"  {move}: {pv}")

    # Compare with puzzle solution
    solution_first = puzzle['moves'].split(';')[0].replace('-', '')
    print()
    print(f"Puzzle's expected first move: {solution_first}")

    matching = [m for m, _ in mate_moves if m == solution_first]
    if len(mate_moves) > 1:
        print(f"⚠️  Multiple valid first moves exist!")
    elif len(mate_moves) == 1 and matching:
        print("✓ Puzzle has unique solution")
    elif len(mate_moves) == 0:
        print("❌ No mate found (puzzle may be incorrect)")
    elif not matching:
        print(f"❌ Puzzle solution '{solution_first}' not among valid moves!")


if __name__ == "__main__":
    main()
