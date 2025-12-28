#!/usr/bin/env python3
"""
Solve chess problems from polgar.pgn using Stockfish and output JSON to stdout.

Usage: python polgar.py > problems.json
       python polgar.py --start 100 --end 200 > subset.json
"""

import chess
import chess.engine
import json
import sys
import os
import argparse
from chess.pgn import read_game
from dotenv import load_dotenv

load_dotenv()

STOCKFISH_PATH = os.getenv("STOCKFISH_PATH", "stockfish")


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


def solve(engine, fen, move_type=""):
    """Solve a chess problem by playing until checkmate."""
    moves = []
    board = chess.Board(fen)

    # Calculate max plies: "Mate in N" = (N * 2) - 1 plies
    mate_count = parse_mate_count(move_type)
    max_plies = (mate_count * 2 - 1) if mate_count else 100

    while not board.is_game_over() and len(moves) < max_plies:
        result = engine.play(board, chess.engine.Limit(time=1.0))
        move_str = str(result.move)
        # Format as "e2-e4" or "e7-e8q" for promotions
        formatted = move_str[0:2] + "-" + move_str[2:]
        moves.append(formatted)
        board.push(result.move)
    return ";".join(moves)


def title_case(s):
    """Convert 'Mate in one' to 'Mate in One' (preserving lowercase 'in', 'to')."""
    words = s.split()
    result = []
    for i, word in enumerate(words):
        # Keep certain words lowercase unless first word
        if i > 0 and word.lower() in ("in", "to"):
            result.append(word.lower())
        else:
            result.append(word.capitalize())
    return " ".join(result)


def main():
    parser = argparse.ArgumentParser(description="Solve chess problems from polgar.pgn")
    parser.add_argument("--pgn", default="polgar.pgn", help="Path to PGN file")
    parser.add_argument("--start", type=int, default=1, help="Start problem ID (inclusive)")
    parser.add_argument("--end", type=int, default=4462, help="End problem ID (inclusive)")
    parser.add_argument("--time", type=float, default=1.0, help="Time per move in seconds")
    args = parser.parse_args()

    engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)

    problems = []

    with open(args.pgn, encoding="latin-1") as f:
        # Skip the first game (credits/intro)
        read_game(f)

        for i in range(1, args.end + 1):
            g = read_game(f)
            if g is None:
                print(f"Warning: Only found {i-1} problems in PGN", file=sys.stderr)
                break

            if i < args.start:
                continue

            fen = g.headers.get("FEN", "")
            move_type = g.headers.get("White", "")  # e.g., "Mate in one"
            first_move = g.headers.get("Black", "")  # e.g., "White to move"

            if not fen:
                print(f"Warning: Problem {i} has no FEN, skipping", file=sys.stderr)
                continue

            print(f"Solving problem {i}...", file=sys.stderr)

            problem = {
                "problemid": i,
                "first": title_case(first_move),
                "type": title_case(move_type),
                "fen": fen,
                "moves": solve(engine, fen, move_type)
            }
            problems.append(problem)

    engine.quit()

    # Output JSON
    output = {"problems": problems}
    print(json.dumps(output, indent=4))


if __name__ == "__main__":
    main()
