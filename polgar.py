#!/usr/bin/env python3
"""
Solve chess problems from polgar.pgn using Stockfish and output JSON to stdout.
Uses parallel processing for faster solving.

Usage: python polgar.py > problems.json
       python polgar.py --start 100 --end 200 > subset.json
"""

import chess
import chess.engine
import json
import sys
import os
import argparse
import multiprocessing
from functools import partial
from chess.pgn import read_game
from dotenv import load_dotenv

load_dotenv()

STOCKFISH_PATH = os.getenv("STOCKFISH_PATH", "stockfish")

# Number of parallel workers (CPU count - 1, minimum 1)
NUM_WORKERS = max(1, multiprocessing.cpu_count() - 1)


def parse_mate_count(move_type):
    """Extract mate count from type like 'Mate in two' -> 2."""
    words = move_type.lower().split()
    number_words = {
        "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10
    }
    for word in words:
        if word in number_words:
            return number_words[word]
        if word.isdigit():
            return int(word)
    return None


def title_case(s):
    """Convert 'Mate in one' to 'Mate in One' (preserving lowercase 'in', 'to')."""
    words = s.split()
    result = []
    for i, word in enumerate(words):
        if i > 0 and word.lower() in ("in", "to"):
            result.append(word.lower())
        else:
            result.append(word.capitalize())
    return " ".join(result)


def solve_puzzle(puzzle_data):
    """Worker function: solve a single puzzle with its own Stockfish instance."""
    problemid, fen, move_type, first_move, mate_count = puzzle_data

    # Each worker creates its own engine instance
    engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)

    try:
        solutions = {}
        if mate_count:
            board = chess.Board(fen)

            # Adaptive MultiPV: fewer candidates for mate in 1
            multipv = 20 if mate_count == 1 else 50
            depth = mate_count * 4 + 2

            info = engine.analyse(
                board,
                chess.engine.Limit(depth=depth),
                multipv=multipv
            )

            for pv_info in info:
                score = pv_info.get("score")
                if score and score.is_mate():
                    mate_value = score.relative.mate()
                    if mate_value == mate_count:
                        pv = pv_info.get("pv", [])
                        if pv:
                            first = pv[0].uci()
                            continuation = [m.uci() for m in pv[1:]]
                            solutions[first] = continuation

        return {
            "problemid": problemid,
            "first": title_case(first_move),
            "type": title_case(move_type),
            "fen": fen,
            "solutions": solutions
        }
    finally:
        engine.quit()


def extract_puzzles_from_pgn(pgn_path, start, end):
    """Extract puzzle metadata from PGN file (sequential)."""
    puzzles = []

    with open(pgn_path, encoding="latin-1") as f:
        # Skip the first game (credits/intro)
        read_game(f)

        for i in range(1, end + 1):
            g = read_game(f)
            if g is None:
                print(f"Warning: Only found {i-1} problems in PGN", file=sys.stderr)
                break

            if i < start:
                continue

            fen = g.headers.get("FEN", "")
            move_type = g.headers.get("White", "")  # e.g., "Mate in one"
            first_move = g.headers.get("Black", "")  # e.g., "White to move"

            if not fen:
                print(f"Warning: Problem {i} has no FEN, skipping", file=sys.stderr)
                continue

            mate_count = parse_mate_count(move_type)
            puzzles.append((i, fen, move_type, first_move, mate_count))

    return puzzles


def main():
    parser = argparse.ArgumentParser(description="Solve chess problems from polgar.pgn")
    parser.add_argument("--pgn", default="polgar.pgn", help="Path to PGN file")
    parser.add_argument("--start", type=int, default=1, help="Start problem ID (inclusive)")
    parser.add_argument("--end", type=int, default=4462, help="End problem ID (inclusive)")
    parser.add_argument("--workers", type=int, default=NUM_WORKERS, help="Number of parallel workers")
    args = parser.parse_args()

    print(f"Extracting puzzles from PGN...", file=sys.stderr)
    puzzles = extract_puzzles_from_pgn(args.pgn, args.start, args.end)
    print(f"Found {len(puzzles)} puzzles", file=sys.stderr)

    print(f"Solving with {args.workers} parallel workers...", file=sys.stderr)

    # Solve puzzles in parallel
    with multiprocessing.Pool(processes=args.workers) as pool:
        # Use imap for progress tracking
        results = []
        for i, result in enumerate(pool.imap(solve_puzzle, puzzles), 1):
            results.append(result)
            if i % 100 == 0 or i == len(puzzles):
                print(f"Solved {i}/{len(puzzles)} puzzles...", file=sys.stderr)

    # Sort by problem ID
    results.sort(key=lambda x: x["problemid"])

    # Output JSON
    output = {"problems": results}
    print(json.dumps(output, indent=4))


if __name__ == "__main__":
    main()
