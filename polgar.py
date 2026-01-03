#!/usr/bin/env python3
"""
Solve chess problems from polgar.pgn using Stockfish and output JSON to stdout.
Uses parallel processing for faster solving.
Prefers original polgar.pgn continuations when available.

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


def extract_pgn_moves(game):
    """Extract mainline moves from PGN game as UCI strings."""
    moves = []
    board = game.board()
    for move in game.mainline_moves():
        moves.append(move.uci())
        board.push(move)
    return moves


def solve_puzzle(puzzle_data):
    """Worker function: solve a single puzzle with its own Stockfish instance.

    Uses iterative deepening: starts shallow and only goes deeper if needed.
    """
    problemid, fen, move_type, first_move, mate_count, pgn_moves = puzzle_data

    # Each worker creates its own engine instance
    engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
    engine.configure({"Hash": 128})  # 128 MB hash table per engine

    try:
        solutions = {}
        if mate_count:
            board = chess.Board(fen)

            # Adaptive MultiPV: fewer candidates for mate in 1
            multipv = 20 if mate_count == 1 else 50

            # Iterative deepening: start shallow, go deeper only if needed
            # Tuned per difficulty based on empirical testing
            if mate_count == 1:
                depth_levels = [1, 2, 4, 8]
            elif mate_count == 2:
                depth_levels = [8, 12, 18, 26]
            elif mate_count == 3:
                depth_levels = [10, 14, 20, 28]
            else:
                # Mate in 3+: use formula
                depth_levels = [
                    mate_count * 4 + 4,
                    mate_count * 6 + 8,
                    mate_count * 8 + 12,
                    mate_count * 10 + 16,
                ]

            info = None
            used_depth = 0
            expected_pv_len = mate_count * 2 - 1  # Full line: first move + continuation
            expected_cont_len = (mate_count - 1) * 2  # Continuation without first move

            for depth in depth_levels:
                info = engine.analyse(
                    board,
                    chess.engine.Limit(depth=depth),
                    multipv=multipv
                )

                # Check if we found valid mate solutions with full continuation
                found_complete = False
                for pv_info in info:
                    score = pv_info.get("score")
                    if score and score.is_mate():
                        mate_value = score.relative.mate()
                        pv = pv_info.get("pv", [])
                        cont_len = len(pv) - 1  # Continuation = PV minus first move
                        # Accept only if correct mate count AND full continuation
                        if mate_value == mate_count and cont_len >= expected_cont_len:
                            found_complete = True
                            break

                if found_complete:
                    used_depth = depth
                    break  # Found complete solution

            # Get the original first move and continuation from polgar.pgn
            pgn_first_move = pgn_moves[0] if pgn_moves else None
            pgn_continuation = pgn_moves[1:] if len(pgn_moves) > 1 else []

            def add_line_to_tree(tree, moves):
                """Add a move sequence to the solution tree."""
                if not moves:
                    return
                move = moves[0]
                if move not in tree:
                    tree[move] = {}
                add_line_to_tree(tree[move], moves[1:])

            for pv_info in info:
                score = pv_info.get("score")
                if score and score.is_mate():
                    mate_value = score.relative.mate()
                    if mate_value == mate_count:
                        pv = pv_info.get("pv", [])
                        if pv:
                            first = pv[0].uci()

                            # Prefer polgar.pgn continuation if this is the original first move
                            # AND the PGN has correct length (some PGN entries are incomplete)
                            if first == pgn_first_move and len(pgn_continuation) == expected_cont_len:
                                line = [first] + pgn_continuation
                            else:
                                line = [m.uci() for m in pv]

                            add_line_to_tree(solutions, line)

            # Check for alternative promotions on final move that also result in checkmate
            def find_alt_promotions(tree, path, current_board):
                """Recursively find alternative promotions that result in checkmate."""
                for move, subtree in list(tree.items()):
                    if not subtree:
                        # Terminal node - check if we can add alternative promotions
                        if len(move) == 5:  # Promotion move
                            base_move = move[:4]
                            current_promo = move[4]
                            for promo in ['q', 'r', 'b', 'n']:
                                if promo != current_promo:
                                    alt_move = base_move + promo
                                    if alt_move not in tree:
                                        try:
                                            test_board = current_board.copy()
                                            test_board.push_uci(alt_move)
                                            if test_board.is_checkmate():
                                                tree[alt_move] = {}
                                        except:
                                            pass
                    else:
                        new_board = current_board.copy()
                        new_board.push_uci(move)
                        find_alt_promotions(subtree, path + [move], new_board)

            find_alt_promotions(solutions, [], board)

        return {
            "problemid": problemid,
            "first": title_case(first_move),
            "type": title_case(move_type),
            "fen": fen,
            "solutions": solutions,
            "_depth": used_depth  # Internal: for statistics
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

            # Extract original moves from PGN
            pgn_moves = extract_pgn_moves(g)

            puzzles.append((i, fen, move_type, first_move, mate_count, pgn_moves))

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

    # Sanity checks
    print(f"\nRunning sanity checks...", file=sys.stderr)
    errors = []
    warnings = []

    for p in results:
        pid = p["problemid"]
        solutions = p["solutions"]
        mate_count = parse_mate_count(p["type"])

        # Check: solutions not empty
        if not solutions:
            errors.append(f"Puzzle {pid}: No solutions found")
            continue

        # Check: tree depth matches expected
        # Expected depth: mate_count * 2 - 1 (first move + alternating moves)
        expected_depth = mate_count * 2 - 1 if mate_count else 0

        def get_tree_depth(tree, depth=0):
            """Get the depth of the solution tree."""
            if not tree:
                return depth
            return max(get_tree_depth(subtree, depth + 1) for subtree in tree.values())

        actual_depth = get_tree_depth(solutions)
        if actual_depth != expected_depth:
            actual_mate = (actual_depth + 1) // 2
            number_words = {1: "One", 2: "Two", 3: "Three", 4: "Four"}
            p["type"] = f"Mate in {number_words.get(actual_mate, actual_mate)} (Book: {mate_count})"
            warnings.append(
                f"Puzzle {pid}: Labeled mate in {mate_count}, but found mate in {actual_mate}"
            )

    # Report results
    if errors:
        print(f"\nERRORS ({len(errors)}):", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)

    if warnings:
        print(f"\nWARNINGS ({len(warnings)}):", file=sys.stderr)
        for w in warnings[:20]:  # Show first 20
            print(f"  {w}", file=sys.stderr)
        if len(warnings) > 20:
            print(f"  ... and {len(warnings) - 20} more", file=sys.stderr)

    if not errors and not warnings:
        print("All puzzles passed sanity checks!", file=sys.stderr)
    else:
        print(f"\nSummary: {len(errors)} errors, {len(warnings)} warnings", file=sys.stderr)

    # Depth statistics per mate difficulty
    print(f"\nDepth statistics by mate difficulty:", file=sys.stderr)
    stats = {}  # {mate_count: {depth: count}}
    for p in results:
        mc = parse_mate_count(p["type"]) or 0
        d = p.get("_depth", 0)
        if mc not in stats:
            stats[mc] = {}
        stats[mc][d] = stats[mc].get(d, 0) + 1

    for mate_count in sorted(stats.keys()):
        depth_counts = stats[mate_count]
        total = sum(depth_counts.values())
        print(f"  Mate in {mate_count} ({total} puzzles):", file=sys.stderr)
        for depth in sorted(depth_counts.keys()):
            count = depth_counts[depth]
            pct = 100 * count / total
            print(f"    Depth {depth:2d}: {count:4d} ({pct:5.1f}%)", file=sys.stderr)

    # Remove internal _depth field before output
    for p in results:
        p.pop("_depth", None)

    # Output JSON
    output = {"problems": results}
    print(json.dumps(output, indent=4))


if __name__ == "__main__":
    main()
