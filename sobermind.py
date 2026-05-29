#!/usr/bin/env python3
"""
SoberMind // Python CLI Autopilot Interrupter
============================================
A fully functional terminal-based mindfulness timer designed to intercept
subconscious work-flow distractions (e.g., social media, checking news)
using structured breathing delays.

Usage:
  python sobermind.py [impulse] [--duration 90] [--mode breath|zen]
"""

import sys
import time
import argparse
import datetime

# Color console codes
CYAN = "\033[96m"
MAGENTA = "\033[95m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD = "\033[1m"
CLEAR_LINE = "\033[K"
HIDE_CURSOR = "\033[?25l"
SHOW_CURSOR = "\033[?25h"

def print_banner(impulse):
    print(f"\n{BOLD}{CYAN}🌌 SOBERMIND // Terminal Autopilot Interrupter{RESET}")
    print("=" * 50)
    print(f"⚠️  {BOLD}IMPULSE INTERCEPTED:{RESET} {YELLOW}{impulse}{RESET}")
    print("Give your brain a moment to re-calibrate. Focus on the guide below.")
    print("=" * 50 + "\n")

def get_breath_bubble(state, count):
    # Generates ASCII art breathing guides
    if state == "IN":
        # Grow bubble size
        size = 1 + count
        return f"({'.' * size} o {'.' * size})"
    elif state == "HOLD":
        # Full bubble
        return "(● ● ● HOLD ● ● ●)"
    else: # OUT
        # Shrink bubble
        size = 5 - count
        return f"({'.' * size} . {'.' * size})"

def run_timer(duration, mode):
    # Set console cursor visibility
    sys.stdout.write(HIDE_CURSOR)
    sys.stdout.flush()

    try:
        start_time = time.time()
        time_left = duration

        # Breathing phase states
        breath_state = "IN" # IN, HOLD, OUT
        breath_count = 0

        while time_left > 0:
            # 1. Update breathing guide pacing (4-7-8 rhythm)
            if mode == "breath":
                if breath_state == "IN":
                    breath_count += 1
                    if breath_count >= 4:
                        breath_state = "HOLD"
                        breath_count = 0
                elif breath_state == "HOLD":
                    breath_count += 1
                    if breath_count >= 7:
                        breath_state = "OUT"
                        breath_count = 0
                else: # OUT
                    breath_count += 1
                    if breath_count >= 8:
                        breath_state = "IN"
                        breath_count = 0

                state_color = CYAN if breath_state == "IN" else (MAGENTA if breath_state == "HOLD" else GREEN)
                bubble_art = get_breath_bubble(breath_state, breath_count)
                status_text = f"{state_color}{BOLD}{breath_state:4s}{RESET} {state_color}{bubble_art}{RESET}"
            else:
                status_text = f"{MAGENTA}Allow your thoughts to settle in still silence...{RESET}"

            # Draw progress details
            percent = (time_left / duration)
            progress_bar = "█" * int(percent * 20) + "░" * (20 - int(percent * 20))
            
            # Print ticks carriage return
            sys.stdout.write(f"\r⏳ {BOLD}{time_left:3d}s{RESET} [{progress_bar}] • {status_text}{CLEAR_LINE}")
            sys.stdout.flush()

            time.sleep(1)
            time_left = int(duration - (time.time() - start_time))

        # Finish chime/beep
        sys.stdout.write("\a") # Terminal bell chime
        sys.stdout.flush()
        print(f"\r✨ {BOLD}{GREEN}PAUSE COMPLETE{RESET} [████████████████████] • Dopamine reset complete!{CLEAR_LINE}\n")

    finally:
        sys.stdout.write(SHOW_CURSOR)
        sys.stdout.flush()

def log_reflection(impulse, duration):
    print("=" * 50)
    print(f"{BOLD}What is your conscious choice now?{RESET}")
    print(f"  {BOLD}{CYAN}[p]{RESET} Pivot (Choose a constructive replacement activity)")
    print(f"  {BOLD}{GREEN}[m]{RESET} Proceed Mindfully (Continue with conscious awareness)")
    print(f"  {BOLD}{YELLOW}[s]{RESET} Autopilot Slip (Acknowledge a lapse)")
    print("=" * 50)
    
    choice = ""
    while choice not in ["p", "m", "s"]:
        try:
            choice = input("Enter choice (p/m/s): ").strip().lower()
        except (KeyboardInterrupt, EOFError):
            print("\n")
            choice = "s"

    outcome = "slip"
    pivot_action = None
    if choice == "p":
        outcome = "pivot"
        print(f"\nSelect a healthy replacement pivot:")
        print("  1. Drink a glass of water 💧")
        print("  2. Do somatic stretching/walk 🧘")
        print("  3. Resume a core focus task ⏳")
        pivot_choice = input("Select option (1-3) or type custom: ").strip()
        
        if pivot_choice == "1":
            pivot_action = "Drink Water"
        elif pivot_choice == "2":
            pivot_action = "Somatic Stretching"
        elif pivot_choice == "3":
            pivot_action = "Deep Focus Task"
        else:
            pivot_action = pivot_choice if pivot_choice else "Constructive Pivot"
            
        print(f"\n{BOLD}{GREEN}✓ Bypassed!{RESET} Redirected impulse to: {pivot_action}.\n")
    elif choice == "m":
        outcome = "proceed"
        print(f"\n{BOLD}{GREEN}✓ Bypassed!{RESET} Proceeding mindfully with conscious awareness.\n")
    else:
        print(f"\n{BOLD}{YELLOW}! Slipped.{RESET} Acknowledged relapse to autopilot habits.\n")

    # Write session details into local log file
    try:
        with open("sobermind_cli.log", "a", encoding="utf-8") as f:
            timestamp = datetime.datetime.now().isoformat()
            f.write(f"{timestamp} | {impulse} | {duration}s | {outcome} | {pivot_action}\n")
    except Exception as e:
        print(f"Failed to save log details: {e}")

def main():
    parser = argparse.ArgumentParser(description="SoberMind Terminal Habit Interrupter")
    parser.add_argument("impulse", type=str, nargs="?", default="distracted task switch",
                        help="What automatic behavior are you about to perform?")
    parser.add_argument("--duration", type=int, default=90,
                        help="Duration of interruption in seconds (default: 90)")
    parser.add_argument("--mode", type=str, choices=["breath", "zen"], default="breath",
                        help="Somatic grounding mechanism (default: breath)")

    args = parser.parse_args()
    
    print_banner(args.impulse)
    try:
        run_timer(args.duration, args.mode)
        log_reflection(args.impulse, args.duration)
    except KeyboardInterrupt:
        print(f"\n\n{BOLD}{YELLOW}! Aborted.{RESET} Urge reset cancelled.\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
